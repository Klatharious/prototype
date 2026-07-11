// ============================================================================
// ENTITIES.JS - 3D MODELS, ASSET MANAGEMENT, & INSTANCING
// ============================================================================
// Core asset management subsystem. Handles asynchronous loading of FBX/GLTF
// models, animation mixers, procedural fallback geometry generation, and
// memory-optimized InstancedMesh management for heavy environment assets.
// ============================================================================

// --- Hierarchical Scene Anchors ---
// builderCursor serves as the root transformation group for the player entity.
// It acts as an invisible spatial anchor, ensuring that the model, collision
// boundaries, and camera tracking targets remain structurally unified.
const builderCursor = new THREE.Group();
builderCursor.position.set(player.x, 0, player.z);
scene.add(builderCursor);

// playerHand represents a relative offset node within the player's local space.
// Used as a mounting socket for equipping tools, mapping assets directly to 
// the character's anatomical skeleton coordinates.
const playerHand = new THREE.Group();
playerHand.position.set(0.6, 3, 2);
builderCursor.add(playerHand);
let currentToolMesh = null; // Tracks the active visual tool instance in the hand group

// --- Core Loaders ---
const fbxLoader = new THREE.FBXLoader();
const gltfLoader = new THREE.GLTFLoader();

// Thread Protection: Global counter used to track and cancel stale asynchronous
// file reads when the player rapidly toggles or scrolls through the hotbar.
window.toolLoadSequence = 0;

/**
 * Dynamically updates the player's equipped tool mesh. Handles resource cleanup,
 * asynchronous asset loading, race-condition mitigation, and primitive mesh fallbacks.
 * * @param {string} toolName - The identifier of the tool to equip (e.g., 'axe', 'shovel').
 * @returns {void}
 */
window.updateEquippedTool = function(toolName) {
    window.toolLoadSequence++;
    const currentSeq = window.toolLoadSequence; // Snapshot sequence state for this invocation

    // Explicitly unmount and dispose of the existing tool mesh to prevent memory leaks
    if (currentToolMesh) {
        playerHand.remove(currentToolMesh);
        currentToolMesh = null;
    }
 
    // Guard clause: Early exit if no valid equippable tool is selected
    if (!toolName || (toolName !== 'axe' && toolName !== 'shovel')) return;
 
    /**
     * Internal procedural fallback mechanism. Generates low-overhead primitive meshes
     * if the requested asset package fails to load or encounters network/disk lag.
     * Prevents game breaking when external assets are missing.
     */
    const buildEmergencyTool = () => {
        if (currentSeq !== window.toolLoadSequence) return; // Discard if a newer request took over
        console.warn(`[RESTORED] Generating backup mesh for: ${toolName}`);
        
        const geo = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        const mat = new THREE.MeshStandardMaterial({ color: toolName === 'axe' ? 0x888888 : 0x8b4513 });
        currentToolMesh = new THREE.Mesh(geo, mat);
        
        // Match approximate tool ergonomics using standard transform offsets
        if (toolName === 'axe') currentToolMesh.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
        else currentToolMesh.rotation.set(0, Math.PI / 2, 0);
        playerHand.add(currentToolMesh);
    };

    let packPath = 'tool.glb';
 
    // Initiate asynchronous load pipeline
    gltfLoader.load(packPath, (gltf) => {
        // Race Condition Guard: If the user changed slots while this file was loading,
        // immediately abort execution to prevent overlapping meshes in the hand.
        if (currentSeq !== window.toolLoadSequence) return; 

        let extractedTool = null;
        
        // Precise string matching inside the composite GLTF scene graph hierarchy
        if (toolName === 'axe') {
            extractedTool = gltf.scene.getObjectByName("Stone_Axe__0");
        } else if (toolName === 'shovel') {
            extractedTool = gltf.scene.getObjectByName("Stone_Shovel__0");
        }
        
        // Structural Fallback: If targeted naming conventions fail, harvest the first available mesh node
        if (!extractedTool) {
            gltf.scene.traverse((child) => { if (child.isMesh && !extractedTool) extractedTool = child; });
        }
        
        if (extractedTool) {
            if (currentToolMesh) playerHand.remove(currentToolMesh);

            // Clone the shared cached asset geometry to preserve original loader data integrity
            currentToolMesh = extractedTool.clone();
            currentToolMesh.position.set(0, 0, 0);
            
            // Normalize scale and orientation profiles for generic models missing uniform defaults
            if (toolName !== 'axe' && toolName !== 'shovel') {
                currentToolMesh.scale.set(0.01, 0.01, 0.01);
                currentToolMesh.rotation.set(0, Math.PI / 2, 0);
            }
            playerHand.add(currentToolMesh);
        } else {
            buildEmergencyTool(); 
        }
    }, undefined, (err) => {
        console.error(`Error loading ${toolName}:`, err);
        buildEmergencyTool(); 
    });
};

// ============================================================================
// CHARACTER & HOSTILE ENTITY LOADERS
// ============================================================================

// --- Load Player Character ---
// Spawns the main skeletal mesh player model and hooks up the primary animation pipeline.
fbxLoader.load('remy.fbx', (object) => {
 characterModel = object;
 characterModel.scale.set(0.01, 0.01, 0.01); // Bring external FBX units into Three.js scale metric
 
 if (object.animations && object.animations.length > 0) {
  // Bind skeletal structure to the global animation update thread loop
  characterMixer = new THREE.AnimationMixer(characterModel);
  walkAction = characterMixer.clipAction(object.animations[0]);
  walkAction.setLoop(THREE.LoopRepeat, Infinity);
  walkAction.play();
  walkAction.timeScale = 0; // Freeze initial animation frame until active input occurs
 }
 builderCursor.add(characterModel);
}, undefined, (error) => console.error("Error loading character", error));

// --- Load Monster ---
// Spawns the enemy AI mesh, injects primitive tracking data, and starts the idle loop.
fbxLoader.load('vampire.fbx', (object) => {
 let monsterModel = object;
 monsterModel.scale.set(0.02, 0.02, 0.02);
 monsterModel.position.set(15, 0, 15);
 
 // Injects explicit pathing variables directly into the object state for clean access in engine loops
 monsterModel.userData = { speed: 0.03, direction: 1, startZ: 15 };
 
 if (object.animations && object.animations.length > 0) {
  monsterMixer = new THREE.AnimationMixer(monsterModel);
  let mWalk = monsterMixer.clipAction(object.animations[0]);
  mWalk.setLoop(THREE.LoopRepeat, Infinity);
  mWalk.play();
 }
 scene.add(monsterModel);
 monsters.push(monsterModel);
}, undefined, (error) => console.error("Error loading monster", error));

// ============================================================================
// INSTANCED VEGETATION OPTIMIZATION SYSTEM
// Parsers and memory managers for massive object distribution fields.
// Instancing allows thousands of high-poly meshes to be drawn with a single draw call.
// ============================================================================

const MAX_TREES = 500;   // Buffer upper limit assigned to GPUs for InstancedMesh bounds allocations
const treeTypes = [];    // Structure storing instanced transformation metadata groups

gltfLoader.load(
    'tree.glb',
    (gltf) => {
        // Asset Cleanup: Prune camera, lighting rigs, planes, and skyboxes present in model exports
        const badNames = ['plane', 'floor', 'wall', 'bg', 'background', 'ground'];
        const garbage = [];
        gltf.scene.traverse((child) => {
            if (child.isMesh && badNames.some((bad) => (child.name || '').toLowerCase().includes(bad))) garbage.push(child);
        });
        garbage.forEach(mesh => { if (mesh.parent) mesh.parent.remove(mesh); });
        
        // 1. Dynamic Single-Tree Extractor
        const treeBounds = new THREE.Box3();
        let hasMeshes = false;
        
        // Scan composite sub-meshes (leaves, trunk, bark) to calculate overall scale profiles
        gltf.scene.traverse((node) => {
            if (!node.isMesh) return;
            hasMeshes = true;
            node.updateMatrixWorld(true);
            node.geometry.computeBoundingBox();
            const geomBounds = node.geometry.boundingBox.clone();
            geomBounds.applyMatrix4(node.matrixWorld);
            treeBounds.union(geomBounds);
        });
        
        if (!hasMeshes) {
            console.warn("No meshes found in tree.glb");
            return;
        }
        
        // 2. Perfect Pivot Centering
        // Realigns pivot roots. Essential for handling Z-up axis remapping from different modeling suites.
        const centerX = (treeBounds.max.x + treeBounds.min.x) / 2;
        const centerY = (treeBounds.max.y + treeBounds.min.y) / 2; 
        const minZ = treeBounds.min.z; // Base of trunk coordinate index
        
        // Translation matrix forces model root directly to standard ground elevation level (Y=0)
        const offsetMatrix = new THREE.Matrix4().makeTranslation(-centerX, -centerY, -minZ);
        
        const parts = []; // Array tracking individual material/geometry pairs within the compound mesh
        
        // Group individual components into specialized multi-instanced structural nodes
        gltf.scene.traverse((node) => {
            if (!node.isMesh) return;
            
            const localMatrix = node.matrixWorld.clone();
            localMatrix.premultiply(offsetMatrix); // Apply uniform pivot stabilization corrections
            
            const instanced = new THREE.InstancedMesh(node.geometry, node.material, MAX_TREES);
            instanced.count = 0; // Initialize with zero rendering objects on scene graph mount
            instanced.frustumCulled = false; // Prevents pop-in errors from offset bounding boxes
            scene.add(instanced);
            
            parts.push({ instancedMesh: instanced, localMatrix: localMatrix });
        });
        
        const treeHeight = treeBounds.max.y - treeBounds.min.y;
        const trunkWidth = Math.max(treeBounds.max.x - treeBounds.min.x, treeBounds.max.z - treeBounds.min.z);
        
        // Store metadata definition mapping profiles used for entity logic generation
        treeTypes.push({
            name: 'Interactive Single Tree',
            parts: parts,
            count: 0,
            trunkRadius: Math.max(trunkWidth / 4, 0.5),
            height: treeHeight || 10
        });
        
        console.log(`Optimized Tree Loaded: Bound as ${parts.length} unified meshes.`);
        
        window.treePositions = window.treePositions || [];
        window.collidables = window.collidables || [];
        
        /**
         * Procedurally spawns an interactive tree within the instancing context.
         * Generates deterministic properties, builds invisible physical colliders,
         * and manages asynchronous surface matching configurations.
         * * @param {number} typeIndex - Unused placeholder for selecting tree type variations.
         * @param {number} exactX - Target world coordinate placement along the horizontal X axis.
         * @param {number} exactZ - Target world coordinate placement along the depth Z axis.
         * @returns {void}
         */
        window.spawnTree = function(typeIndex, exactX, exactZ) {
            if (!treeTypes[0]) return;
            const treeData = treeTypes[0];
            if (treeData.count >= MAX_TREES) return;

            const index = treeData.count;
            
            // Deterministic Optimization: Generates identical scale and rotation vectors based
            // solely on coordinate strings. Avoids storing thousands of transform nodes inside save state arrays.
            const seed = Math.abs(exactX * 13.37 + exactZ * 73.13);
            const pseudoRandom = seed - Math.floor(seed); 

            const randomScale = 3.0 + (pseudoRandom * 2.0); // Procedural scaling deviation
            const rotationY = pseudoRandom * Math.PI * 2;   // Full 360 degree rotational sweep variance

            let startY = 10000; // Sky placeholder flag triggered prior to complete ground parsing loops
            if (window.worldTerrain) {
                const ray = new THREE.Raycaster();
                ray.set(new THREE.Vector3(exactX, 1000, exactZ), new THREE.Vector3(0, -1, 0));
                let hits = ray.intersectObject(window.worldTerrain, true);
                if (hits.length > 0 && hits[0].object.visible) startY = hits[0].point.y;
            }
            
            const wrapperDummy = new THREE.Object3D();
            wrapperDummy.position.set(exactX, startY === 10000 ? 0 : startY, exactZ);
            wrapperDummy.rotation.y = rotationY;
            wrapperDummy.scale.setScalar(randomScale);
            
            // Extend the invisible physics cylinder boundaries far above the visual tree height 
            // to trap boundary vectors securely during vertical movement loops.
            const colHeight = (treeData.height * randomScale) * 10; 
            const baseTrunkRadius = 0.50; 
            const colRadius = baseTrunkRadius * randomScale;
            
            // --- Build Invisible Physics Boundary Node ---
            const col = new THREE.Mesh(
                new THREE.CylinderGeometry(colRadius, colRadius, colHeight, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            col.position.set(exactX, wrapperDummy.position.y + colHeight / 2, exactZ);
            col.userData.isPhysical = true;
            col.userData.collisionRadius = colRadius;
            scene.add(col);
            window.collidables.push(col);
            
            // --- Entity Logic Data Structure Configuration ---
            const treeState = {
                x: exactX,
                z: exactZ,
                originalX: exactX,
                originalZ: exactZ,
                originalY: startY,
                collider: col,
                radius: colRadius,
                health: 3,             // Standard chop iterations required to extract wood resources
                respawnTimer: 30000,   // Delay flag parameter allocated for respawn intervals
                scale: randomScale,
                rotation: rotationY,
                isChopped: false
            };
            
            window.treePositions.push(treeState);
            
            // Correction Matrix: Pitches external asset orientation vectors 90 degrees upright
            const cloneDummy = new THREE.Object3D();
            cloneDummy.rotation.set(-Math.PI / 2, 0, 0); 
            cloneDummy.updateMatrix();

            /**
             * Updates instanced matrix coordinates across all split sub-mesh layers simultaneously.
             * @param {number} newY - Elevated ground match coordinate computed by raycasts.
             */
            const updateGraphics = (newY) => {
                wrapperDummy.position.y = newY;
                wrapperDummy.updateMatrix();
                col.position.y = newY + colHeight / 2;
                treeState.originalY = newY; 

                treeData.parts.forEach(part => {
                    // Chain the spatial wrappers together to output standard transformation data matrices
                    const finalMatrix = new THREE.Matrix4().multiplyMatrices(wrapperDummy.matrix, cloneDummy.matrix);
                    finalMatrix.multiply(part.localMatrix);
                    part.instancedMesh.setMatrixAt(index, finalMatrix);

                    // Notify the GPU data pipes that instance coordinates were altered
                    part.instancedMesh.instanceMatrix.needsUpdate = true;
                    part.instancedMesh.count = Math.max(part.instancedMesh.count, index + 1);
                });
            };
            
            updateGraphics(wrapperDummy.position.y);
            
            // Register a public abstraction hook interface used by background landscape thread layers
            window.spawnedTrees = window.spawnedTrees || [];
            const treeReference = {
                position: { x: exactX, z: exactZ, y: startY },
                updateY: (newY) => { startY = newY; updateGraphics(newY); }
            };
            window.spawnedTrees.push(treeReference);
            
            // Asynchronous Snapping Engine Connection Loop
            let snapInterval = setInterval(() => {
                if (window.worldTerrain && startY === 10000) {
                    const ray = new THREE.Raycaster();
                    ray.set(new THREE.Vector3(exactX, 500, exactZ), new THREE.Vector3(0, -1, 0));
                    let hits = ray.intersectObject(window.worldTerrain, true);
                    if (hits.length > 0 && hits[0].object.visible) {
                        treeReference.updateY(hits[0].point.y);
                        clearInterval(snapInterval);
                    }
                } else if (startY !== 10000) {
                    clearInterval(snapInterval);
                }
            }, 1000);
            
            treeData.count++;
        };
        
        // Spawn default single tree asset instance
        if (!window.singleTreeSpawned) {
            window.singleTreeSpawned = true;
            window.spawnTree(0, -315, -320);
        }
    },
    undefined,
    (err) => console.error('Error loading tree asset:', err)
);

// ============================================================================
// FARMING & VEGETATION LAYER
// Prefabricates geometry fallbacks and dynamically handles asynchronous 
// loading for high-fidelity crop components.
// ============================================================================

const cropTemplates = {};
const CROP_COLORS = { 'tomato': 0xe74c3c, 'corn': 0xf1c40f, 'carrot': 0xe67e22, 'wheat': 0xf39c12 };

CROP_NAMES.forEach(type => {
 let fallbackGeo;
 // Anatomy remapping loops mapping shapes to unique vegetable types
 if (type === 'carrot') { 
  fallbackGeo = new THREE.ConeGeometry(0.4, 1.2, 8);
  fallbackGeo.rotateX(Math.PI); // Flips cone tip straight down into soil paths
 }
 else if (type === 'tomato') fallbackGeo = new THREE.SphereGeometry(0.5, 8, 8);
 else fallbackGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
 
 let fallbackMat = new THREE.MeshStandardMaterial({ color: CROP_COLORS[type] });
 cropTemplates[type] = new THREE.Mesh(fallbackGeo, fallbackMat);
 
 // Asynchronously replace primitive bounding boxes with true modeled graphics assets once downloaded
 fbxLoader.load(`animation/${type}.fbx`, (object) => {
  object.scale.set(0.01, 0.01, 0.01);
  cropTemplates[type] = object;
 }, undefined, (error) => console.log(`Waiting for ${type}.fbx...`));
});

// ============================================================================
// COMMERCE MERCHANTS & INFRASTRUCTURE BUILDERS
// Handles dynamic point initialization for stationary interactive trading nodes.
// ============================================================================

window.spawnedCaravans = [];

/**
 * Spawns a trade station point instance in the scene graph layout.
 * Includes asynchronous retry protection guards that delay execution until 
 * terrain rendering data models become available.
 * * @param {number} exactX - Target absolute grid index placement on horizontal X axis.
 * @param {number} exactZ - Target absolute grid index placement on depth Z axis.
 * @returns {void}
 */
function spawnCaravan(exactX, exactZ) {
    // Asynchronous Safety Guard: If the ground thread hasn't finished loading, 
    // self-terminate and schedule a check loop to preserve structural alignment stability.
    if (!window.worldTerrain) {
        setTimeout(() => spawnCaravan(exactX, exactZ), 500);
        return;
    }

    let startY = 0;
    const ray = new THREE.Raycaster();
    ray.set(new THREE.Vector3(exactX, 10000, exactZ), new THREE.Vector3(0, -1, 0));
    let hits = ray.intersectObject(window.worldTerrain, true);
    if (hits.length > 0 && hits[0].object.visible) {
        startY = hits[0].point.y;
    }

    const npcGroup = new THREE.Group();
    npcGroup.position.set(exactX, startY, exactZ); 

    const bodyGeo = new THREE.CylinderGeometry(1, 1, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3498db });
    const npcBody = new THREE.Mesh(bodyGeo, bodyMat);
    npcBody.position.y = 2; // Elevate object origin node center point above raw baseline
    
    npcGroup.add(npcBody);
    scene.add(npcGroup);

    // Register properties globally into standard detection lookup stacks
    npcs.push({ x: exactX, z: exactZ, name: "Caravan Merchant" });
    window.spawnedCaravans.push(npcGroup);
}

// Instantiate default world trade vendor node
spawnCaravan(-251, -318);

// ============================================================================
// SYSTEM ARCHITECTURE UTILITIES & OBJECT INITIALIZATION
// Manages secondary structural elements and fires off baseline startup functions.
// ============================================================================

const campfireGroup = new THREE.Group();
campfireGroup.position.set(5, -366, -268); // Spawn offset coordinate point placeholder
window.campfireMesh = campfireGroup;        // Expose root pointer element to Auto-Snapper systems
scene.add(campfireGroup);

// PointLight configuration setup handling emission radius and falloff attenuation curves
window.campfireLight = new THREE.PointLight(0xff7700, 0, 20);
window.campfireLight.position.set(0, 1, 0);
campfireGroup.add(window.campfireLight);

const fireCubeGeo = new THREE.BoxGeometry(1, 1, 1);
const fireCubeMat = new THREE.MeshStandardMaterial({ color: 0xcc4400, emissive: 0x552200 });
const fireCube = new THREE.Mesh(fireCubeGeo, fireCubeMat);
fireCube.position.y = 0.5;
campfireGroup.add(fireCube);

fbxLoader.load('campfire.fbx', (object) => {
 campfireGroup.remove(fireCube); // Pop out emergency primitive box once data arrives safely
 object.scale.set(0.01, 0.01, 0.01);
 campfireGroup.add(object);
}, undefined, () => console.log("Waiting for campfire model..."));

// --- Execute Startup Routines ---
// Synchronize visual state flags with inventory vectors on program execution start
window.updateEquippedTool(activeHotbarItem);
