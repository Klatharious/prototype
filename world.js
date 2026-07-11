// ============================================================================
// WORLD.JS - ENVIRONMENT & LIGHTING SETUP
// ============================================================================
// Initializes the Three.js 3D rendering context, camera, and basic lighting.
// Handles asynchronous loading of the terrain mesh and manages the physics 
// raycasting required to snap dynamic objects (NPCs, campfires, crops) to 
// the varying elevation of the ground mesh.
// ============================================================================

// --- Scene Initialization ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14141f); // Dark night/twilight background color

// --- Camera Setup ---
// Uses a 55-degree FOV, dynamic aspect ratio, and a far clipping plane of 5000 units.
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);

// --- Renderer Setup ---
// Configures the WebGL renderer for mobile/desktop displays. Antialiasing is enabled
// to smooth jagged edges, and pixel ratio is locked to device specs for crispness.
const renderer = new THREE.WebGLRenderer({ antialias: true }); 
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Global Lighting ---
// Provides a flat baseline illumination so unlit areas aren't pitch black.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

// ============================================================================
// TERRAIN LOADING & COLLISION PREPARATION
// ============================================================================
const worldGltfLoader = new THREE.GLTFLoader();

worldGltfLoader.load(
    'environment/land.glb', 
    (gltf) => {
        const landModel = gltf.scene;
        landModel.position.set(0, -15, 0); // Offset to align with game coordinate space
        landModel.scale.set(400, 400, 400);
        
        // Traverse all child meshes to enforce collision and rendering standards
        landModel.traverse((child) => {
            if (child.isMesh) {
                // Ensure terrain is visible from underneath
                child.material.side = THREE.DoubleSide; 
                
                // EXTREME FIX: Force bounding box/sphere recalculation to ensure
                // vertical raycasting never misses the terrain geometry.
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
            }
        });
        
        landModel.updateMatrixWorld(true);
        window.worldTerrain = landModel; // Expose globally for other scripts to reference
        scene.add(landModel);

        // ============================================================================
        // ASYNCHRONOUS OBJECT SNAPPING SYSTEM
        // Handles the race condition where objects (trees, npcs) spawn before the 
        // high-poly terrain finishes loading.
        // ============================================================================
        const snapRay = new THREE.Raycaster();
        const downVec = new THREE.Vector3(0, -1, 0);

        // Memory Management: Cache Vector3 to prevent Garbage Collection (GC) pauses
        // during the continuous polling interval.
        const snapOrigin = new THREE.Vector3(); 

        /**
         * Repeatedly attempts to snap a mesh group to the terrain floor using a raycast.
         * Polls indefinitely until the terrain is fully loaded and a hit is detected.
         * * @param {THREE.Group|THREE.Mesh} meshGroup - The 3D object to snap.
         * @param {string} name - Identifier used for debugging/logging.
         */
        window.forceSnapToDirt = function(meshGroup, name) {
            let trySnap = setInterval(() => {
                // Only attempt if terrain is loaded and the target object exists
                if (window.worldTerrain && meshGroup) {
                    
                    // Update cached vector instead of allocating new memory via 'new Vector3'
                    snapOrigin.set(meshGroup.position.x, 10000, meshGroup.position.z);
                    
                    // Cast a ray from above the camera view straight down to find the floor
                    snapRay.set(new THREE.Vector3(meshGroup.position.x, 500, meshGroup.position.z), downVec);

                    let hits = snapRay.intersectObject(window.worldTerrain, true);

                    if (hits.length > 0 && hits[0].object.visible) {
                        meshGroup.position.y = hits[0].point.y;
                        console.log(`[SUCCESS] Snapped ${name} to Y: ${hits[0].point.y}`);
                        clearInterval(trySnap); // Target successfully snapped, terminate loop
                    }
                }
            }, 1000); // Poll every 1 second
        };

        // --- Apply Snapping to Pre-existing Entities ---
        if (window.spawnedCaravans) {
            window.spawnedCaravans.forEach((c, i) => window.forceSnapToDirt(c, 'Caravan_'+i));
        }
        if (window.campfireMesh) window.forceSnapToDirt(window.campfireMesh, 'Campfire');
        
        // Safety net for legacy tree instances that lack internal update logic
        if (window.spawnedTrees) {
            window.spawnedTrees.forEach(tree => {
                if (!tree.updateY) window.forceSnapToDirt(tree, 'LegacyTree');
            });
        }
    }, 
    undefined, 
    (err) => console.error("CRITICAL ERROR LOADING LAND:", err)
);

// --- Base Visuals ---
// Adds a debug/aesthetic grid beneath the map layer.
const mapGrid = new THREE.GridHelper(2000, 200, 0x333344, 0x222228);
mapGrid.position.y = -14.9; 
scene.add(mapGrid);

// ============================================================================
// FARMING SYSTEM - SOIL INSTANCING
// Defines how agricultural plots are generated and snapped to the ground.
// ============================================================================

// Memory Optimization: Share a single geometry and material instance across 
// all soil patches to drastically reduce draw calls and memory overhead.
const SHARED_SOIL_GEO = new THREE.PlaneGeometry(2, 2);
const SHARED_SOIL_MAT = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 1 });

const SHARED_RAYCASTER = new THREE.Raycaster();
const SHARED_DOWN_VEC = new THREE.Vector3(0, -1, 0);

/**
 * Creates a soil patch at the specified X/Z coordinates, calculates terrain height,
 * and initializes a placeholder group for future crops.
 * * @param {number} x - Target world X coordinate.
 * @param {number} z - Target world Z coordinate.
 */
function spawnSoilPatch(x, z) {
    let y = 0;
    
    // Perform a synchronous raycast to find ground level if terrain is already loaded
    if (window.worldTerrain) {
        SHARED_RAYCASTER.set(new THREE.Vector3(x, 10000, z), SHARED_DOWN_VEC);
        let hits = SHARED_RAYCASTER.intersectObject(window.worldTerrain, true);
        for (let i = 0; i < hits.length; i++) {
            if (hits[i].object.visible) { y = hits[i].point.y; break; }
        }
    }

    let mesh = new THREE.Mesh(SHARED_SOIL_GEO, SHARED_SOIL_MAT);

    // Rotate plane to lie flat on the ground
    mesh.rotation.x = -Math.PI / 2;
    // Add small Y-offset (0.05) to prevent Z-fighting with the underlying terrain
    mesh.position.set(x, y + 0.05, z); 
    scene.add(mesh);

    // Create an invisible container for the eventual crop model
    let crop = new THREE.Group();
    crop.position.set(x, y + 0.4, z); // Slightly elevated above the soil
    crop.visible = false;
    scene.add(crop);

    // Register patch into global state
    farmPatches.push({
        id: Date.now(),
        x: x,
        z: z,
        state: 'empty',
        progress: 0,
        mesh: mesh,
        crop: crop
    });
}

// Initial default farm plots
spawnSoilPatch(5, 5);
spawnSoilPatch(-5, 5);

// ============================================================================
// RENDER PIPELINE - RESIZE HANDLER
// ============================================================================
// Ensures the WebGL canvas and camera frustum adapt dynamically when the 
// browser window or mobile device orientation changes.
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
