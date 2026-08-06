// ============================================================================
// CONFIG.JS - GLOBAL STATE & SETTINGS
// ============================================================================
// This file acts as the primary data store and configuration hub. It defines 
// player stats, inventory systems, environmental variables, and game state 
// flags used across engine.js, world.js, and controls.js.
// ============================================================================

// --- Movement & Camera Config ---
const MOVEMENT_SPEED = 0.5;            // Base velocity for player translation
const MAX_JOYSTICK_RADIUS = 40;      // Pixel distance from origin for max input
let CAMERA_SENSITIVITY = 0.02;       // Multiplier for mouse/touch rotation delta

let isFirstPerson = true;            // Camera mode toggle (true: FP, false: Third-person)

// --- Three.js Animation State ---
const clock = new THREE.Clock();     // Global timer for frame-independent delta calculations
let characterMixer = null;           // AnimationMixer for player skeletal animations
let walkAction = null;               // Reference to the walk cycle animation clip
let characterModel = null;           // Reference to the loaded player GLTF/FBX object

// --- Player State Object ---
// Aggregates core transform, input vectors, and survival stats
const player = {
    //Starter spawn point
    x: -280,
    z: -300,
    moveVectorX: 0,                  // Current movement direction on X-axis
    moveVectorZ: 0,                  // Current movement direction on Z-axis
    cameraAngle: Math.PI / 4,        // Horizontal rotation (Yaw)
    cameraPitch: 0,                  // Vertical rotation (Pitch)
    birdsEyePitch: Math.PI / 4,      // Fixed pitch for overhead camera mode
    speed: MOVEMENT_SPEED,
    gold: 100,
    hp: 100
};

// --- World Interaction ---
const INTERACT_DISTANCE = 4.5;       // Radial distance within which player can trigger NPCs/Objects

// --- Mobile Control Config ---
let isJoystickFixed = false;         // Determines if joystick stays at origin or follows touch
let isJoystickInvisible = false;     // Visibility toggle for touch UI

// --- Inventory & Hotbar System ---
let hotbarMap = ['shovel', 'tomato_seed', 'axe', 'torch']; // Slots definition
let activeHotbarItem = 'shovel';                   // Currently selected tool/item ID

let farmInventory = { 
    tomato_seed: 5, corn_seed: 0, carrot_seed: 0, wheat_seed: 0, 
    tomato: 0, corn: 0, carrot: 0, wheat: 0, 
    axe: 1, shovel: 1, wood: 0, torch: 1 
}; 


let toolDurability = { axe: 20, shovel: 20, torch: 100};      // Tracks usage before tool breakage

// --- Farming System ---
const CROP_GROW_TIME = 300;          // Seconds required for a crop to transition to harvestable state
let activePatch = null;              // Reference to the currently targeted farm plot
const farmPatches = [];              // Array containing references to all active plot instances
const CROP_NAMES = ['tomato', 'corn', 'carrot', 'wheat']; // Randomization pool for plant types

// --- NPC & AI ---
const npcs = [];                     // Collection of NPC instances in the world
let activeNpc = null;                // Reference for active dialogue interaction

// --- Combat/Monster System ---
const monsters = [];                 // Array of hostile entity instances
let monsterMixer = null;             // AnimationMixer for shared monster animations
window.MONSTER_KILL_REWARD = 5;      // Global gold reward granted to player upon monster death

// --- Environment & Time System ---
let timeOfDay = 8;                   // Current in-game hour (0-24)
let timeSpeed = 0.1;                 // Progression rate of the in-game clock

// --- Game Engine Lifecycle ---
// Valid states: 'MENU', 'PLAYING', 'PAUSED', 'DIALOGUE', 'SHOP'
window.GAME_STATE = 'MENU';

// ============================================================================
// HUD.JS - CUSTOMIZABLE UI LAYOUT MANAGER
// ============================================================================

window.IS_EDITING_HUD = false;

// IDs of all elements that can be dragged
// IDs of all elements that can be dragged
const HUD_ELEMENTS = [
    'ui', 'hp-ui', 'btn-camera', 'btn-backpack',
    'btn-action', 'btn-system-menu', 'btn-settings', 'hotbar',
    'fps-display', 'coord-tracker'
];

let draggingEl = null;
let dragOffsetX = 0, dragOffsetY = 0;

// Apply saved positions on game load
function applySavedLayout() { 
    const savedString = localStorage.getItem('empire_hud_layout');
    if (!savedString) return;
    
    const saved = JSON.parse(savedString);
    Object.keys(saved).forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            el.style.top = saved[id].top;
            el.style.left = saved[id].left;
            
            // CRITICAL FIX: Nullify legacy CSS when loading absolute saved coords
            el.style.right = saved[id].right || 'auto';
            el.style.bottom = saved[id].bottom || 'auto';
            el.style.transform = saved[id].transform || 'none';
        }
    });
}

// Ensure it remains globally accessible to other files
window.applySavedLayout = applySavedLayout;


// Enter Edit Mode (Made global so controls.js can securely trigger it)
window.toggleHUDMode = function(e) {
        if (e) { e.preventDefault();
            e.stopPropagation(); }
            
    if (window.IS_EDITING_HUD) return; // FIX: Prevent double-execution from the global mobile delegator
    
        window.IS_EDITING_HUD = true;
    
    // Hide the Main Menu so the player can actually see the game UI
    document.getElementById('main-menu').style.display = 'none';
    document.body.classList.add('hud-edit-mode');

const activeElements = [...HUD_ELEMENTS];

activeElements.forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            el.classList.add('draggable-hud');
            
            // CRITICAL FIX: Force UI to render visibly so bounding boxes aren't 0,0!
            if (id === 'hotbar') el.style.display = 'flex';
            else el.style.display = 'block';
            
            // Give Action button temporary mass so it isn't an invisible dot
            if (id === 'btn-action') {
                el.innerText = 'ACTION';
                el.style.backgroundColor = '#3498db';
            }
        }
    });


    // Generate Contextual UI Buttons
    const controls = document.createElement('div');
    controls.id = 'hud-layout-controls';
    controls.innerHTML = `
<div id="hud-edit-modal" class="hud-box hud-element draggable-hud" style="display: flex; position: absolute; top: 15%; left: 50%; transform: translateX(-50%); padding: 15px; text-align: center; z-index: 10001; cursor: move; touch-action: none;">
   
    <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="btn-hud-reset" class="hud-btn" style="width: auto; padding: 10px 15px; font-size: 12px; background-color: #7f1d1d;">Reset Defaults</button>
        <button id="btn-hud-save" class="hud-btn" style="width: auto; padding: 10px 15px; font-size: 12px; background-color: #166534;">Save Layout</button>
    </div>
</div>`;
    document.body.appendChild(controls);
    
    // Bind Button Events
    document.getElementById('btn-hud-reset').addEventListener('click', resetHUDLayout);
    document.getElementById('btn-hud-reset').addEventListener('touchstart', resetHUDLayout, { passive: false });
    
    document.getElementById('btn-hud-save').addEventListener('click', saveAndExitHUD);
    document.getElementById('btn-hud-save').addEventListener('touchstart', saveAndExitHUD, { passive: false });
    
    // Attach CPU-heavy drag listeners exclusively during edit mode
    if (window.attachDragListeners) window.attachDragListeners();
}

    
    // FIX: Added the missing reset function and mapped the strict default layouts to your ACTUAL HTML IDs!
    function resetHUDLayout(e) {
        if (e) { e.preventDefault();
            e.stopPropagation(); }
        
        // Wipe corrupted memory coordinates
        localStorage.removeItem('empire_hud_layout');
        
        // Strict Default Layout Map
        const defaultLayout = {
            'ui': { top: '20px', left: '20px', right: '', bottom: '', transform: 'none' },
            'hp-ui': { top: '20px', left: '50%', right: '', bottom: '', transform: 'translateX(-50%)' },
            'btn-settings': { top: '20px', left: '', right: '20px', bottom: '', transform: 'none' },
            'btn-camera': { top: '20px', left: '', right: '75px', bottom: '', transform: 'none' },
            'btn-system-menu': { top: '20px', left: '', right: '130px', bottom: '', transform: 'none' },
            'btn-backpack': { top: '65px', left: '', right: '20px', bottom: '', transform: 'none' },
            'btn-action': { top: '', left: '', right: '30px', bottom: '90px', transform: 'none' },
          'hotbar': { top: '', left: '50%', right: '', bottom: '10px', transform: 'translateX(-50%)' },
'hud-edit-modal': { top: '15%', left: '50%', right: '', bottom: '', transform: 'translateX(-50%)' },
'fps-display': { top: '5px', left: '5px', right: 'auto', bottom: 'auto', transform: 'none' },
'coord-tracker': { top: '50px', left: '20px', right: 'auto', bottom: 'auto', transform: 'none' }
};

        
        // Loop through and enforce original positioning safely
        Object.keys(defaultLayout).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                Object.assign(el.style, defaultLayout[id]);
            }
        });
    }
    

function saveAndExitHUD(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    window.IS_EDITING_HUD = false;
    document.body.classList.remove('hud-edit-mode');
    
    let newLayout = {};
    const elements = document.querySelectorAll('.draggable-hud');
    
            elements.forEach(el => {
        el.classList.remove('draggable-hud');
        if (el.id) {
            // CRITICAL FIX: Read exact hardware pixel position. Do not rely on blank inline styles!
            const rect = el.getBoundingClientRect();
            newLayout[el.id] = {
                top: rect.top + 'px',
                left: rect.left + 'px',
                right: 'auto',
                bottom: 'auto',
                transform: 'none'
            };
        }
        // FIX: Hide elements again so they don't clutter the Main Menu screen
        el.style.display = 'none';
        
        // Restore Action button to its game-ready visual state
        if (el.id === 'btn-action') {
            el.innerText = 'TALK';
            el.style.backgroundColor = '';
        }
    });

        localStorage.setItem('empire_hud_layout', JSON.stringify(newLayout));

    const controls = document.getElementById('hud-layout-controls');
    if (controls) {
        // Prevent Memory Leak: Unbind dynamic modal listeners before destroying node
        document.getElementById('btn-hud-reset').removeEventListener('click', resetHUDLayout);
        document.getElementById('btn-hud-reset').removeEventListener('touchstart', resetHUDLayout);
        document.getElementById('btn-hud-save').removeEventListener('click', saveAndExitHUD);
        document.getElementById('btn-hud-save').removeEventListener('touchstart', saveAndExitHUD);
        controls.remove();
    }
    
    // Dynamically detach global drag listeners to return CPU to idle
    if (window.detachDragListeners) window.detachDragListeners();

// UX Fix: Return to Main Menu ONLY if we were not actively playing a game
if (window.GAME_STATE === 'MENU' || !window.GAME_STATE) {
    document.getElementById('main-menu').style.display = 'flex';
} else {
    // Re-enable necessary gameplay UI layouts natively
    HUD_ELEMENTS.forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            if (id === 'hotbar' || id === 'ui') el.style.display = 'flex';
            else if (id === 'btn-action') el.style.display = 'none';
            else if (id === 'fps-display') el.style.display = window.SHOW_FPS ? 'block' : 'none';
            else if (id === 'coord-tracker') {
                const tgl = document.getElementById('toggle-coordinates');
                el.style.display = (tgl && tgl.classList.contains('active')) ? 'block' : 'none';
            }
            else el.style.display = 'block';
        }
    });
    if (window.updateFarmHUD) window.updateFarmHUD();
}

// GHOST CLICK FIX: Block synthetic clicks for 500ms after closing the HUD modal
// Prevents buttons underneath the modal from accidentally triggering.
window._HUD_EXIT_TIME = Date.now();
}



// ============================================================================
// DRAG HANDLERS (TOUCH & MOUSE)
// ============================================================================

function grabElement(clientX, clientY, target) {
    draggingEl = target;
    const rect = target.getBoundingClientRect();
    
    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;
    
    // CRITICAL FIX: Convert CSS from right/bottom to explicit left/top so dragging is 1:1
    target.style.right = 'auto';
    target.style.bottom = 'auto';
    target.style.transform = 'none'; // Clears centered layout conflicts (e.g., HP bar)
    
    // Lock into exact current pixel position so it doesn't jump
    target.style.left = rect.left + 'px';
    target.style.top = rect.top + 'px';
}


function moveElement(clientX, clientY) {
    if (!draggingEl) return;
    draggingEl.style.left = (clientX - dragOffsetX) + 'px';
    draggingEl.style.top = (clientY - dragOffsetY) + 'px';
}

// --- UI Lockdown & Drag Interceptor (Mobile + Desktop) ---
// Encapsulated to prevent global listener leakage and save battery during gameplay

const handleDragTouchStart = (e) => {
    if (!window.IS_EDITING_HUD) return;
    let btn = e.target.closest('#hud-layout-controls button');
    if (btn) { btn.click(); e.stopPropagation(); return; }
    const target = e.target.closest('.draggable-hud');
    if (target) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        grabElement(e.touches[0].clientX, e.touches[0].clientY, target);
    } else if (!e.target.closest('#hud-layout-controls')) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
    }
};

const handleDragTouchMove = (e) => {
    if (!window.IS_EDITING_HUD || !draggingEl) return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    moveElement(e.touches[0].clientX, e.touches[0].clientY);
};

const handleDragEnd = (e) => {
    if (window.IS_EDITING_HUD && !e.target.closest('#hud-layout-controls')) e.stopPropagation();
    draggingEl = null;
};

const handleGhostClick = (e) => {
    if (window.IS_EDITING_HUD && !e.target.closest('#hud-layout-controls')) {
        e.preventDefault(); e.stopPropagation();
    }
    // GHOST CLICK FIX: Intercept delayed synthetic clicks after exiting HUD mode
    if (window._HUD_EXIT_TIME && Date.now() - window._HUD_EXIT_TIME < 500) {
        e.preventDefault(); e.stopPropagation();
    }
};

const handleDragMouseStart = (e) => {
    if (!window.IS_EDITING_HUD) return;
    let btn = e.target.closest('#hud-layout-controls button');
    if (btn) { btn.click(); e.stopPropagation(); return; }
    const target = e.target.closest('.draggable-hud');
    if (target) {
        e.stopPropagation();
        grabElement(e.clientX, e.clientY, target);
    } else if (!e.target.closest('#hud-layout-controls')) {
        e.stopPropagation();
    }
};

const handleDragMouseMove = (e) => {
    if (!window.IS_EDITING_HUD || !draggingEl) return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    moveElement(e.clientX, e.clientY);
};

// Expose attach/detach API to the window for lifecycle management
// GHOST CLICK FIX: Permanently attach the click interceptor so it survives after detachDragListeners is called
document.addEventListener('click', handleGhostClick, { capture: true });

window.attachDragListeners = function() {
    document.addEventListener('touchstart', handleDragTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', handleDragTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleDragEnd, { capture: true });
    document.addEventListener('mousedown', handleDragMouseStart, { capture: true });
    document.addEventListener('mousemove', handleDragMouseMove, { capture: true });
    document.addEventListener('mouseup', handleDragEnd, { capture: true });
};

window.detachDragListeners = function() {
    document.removeEventListener('touchstart', handleDragTouchStart, { capture: true });
    document.removeEventListener('touchmove', handleDragTouchMove, { capture: true });
    document.removeEventListener('touchend', handleDragEnd, { capture: true });
    document.removeEventListener('mousedown', handleDragMouseStart, { capture: true });
    document.removeEventListener('mousemove', handleDragMouseMove, { capture: true });
    document.removeEventListener('mouseup', handleDragEnd, { capture: true });
};

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
// Configures the WebGL renderer for mobile/desktop displays.
// PERFORMANCE FIX: Disable antialiasing on mobile and cap pixel ratio to 1.5 to prevent GPU fill-rate bottlenecks.
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));


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
                    snapOrigin.set(meshGroup.position.x, 500, meshGroup.position.z);
                    
                    // Cast a ray from above the camera view straight down to find the floor utilizing the cached vector
                    snapRay.set(snapOrigin, downVec);


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
const SHARED_RAY_ORIGIN = new THREE.Vector3(); // CACHED: Prevents GC spikes during patch spawning


/**
 * Creates a soil patch at the specified X/Z coordinates, calculates terrain height,
 * and initializes a placeholder group for future crops.
 * * @param {number} x - Target world X coordinate.
 * @param {number} z - Target world Z coordinate.
 */
function spawnSoilPatch(x, z) {
    let y = 0;
    
    // Perform a synchronous raycast to find ground level if terrain is already loaded
        // Perform a synchronous raycast to find ground level if terrain is already loaded
    if (window.worldTerrain) {
        SHARED_RAY_ORIGIN.set(x, 10000, z); // Update cached vector
        SHARED_RAYCASTER.set(SHARED_RAY_ORIGIN, SHARED_DOWN_VEC);
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


// ============================================================================
// WORLD INTERACTION / RAYCASTING
// Central logic for tapping the screen to build, chop, farm, or attack.
// ============================================================================


// PERFORMANCE FIX: Zero-Allocation Object Pool for screen tapping
const TAP_RAYCASTER = new THREE.Raycaster();
const TAP_TARGET = new THREE.Vector3();
const TAP_VEC2 = new THREE.Vector2();


function handleScreenTap(clientX, clientY) {
    if (window.GAME_STATE === 'MENU') return; // Stop interaction while menu is open
    
    
    //Stops the wood from being deployed
    if (activeHotbarItem == 'wood') return;
    // Convert screen coordinates to Normalized Device Coordinates (NDC) for Raycaster
    TAP_VEC2.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    TAP_RAYCASTER.setFromCamera(TAP_VEC2, camera);
    
    let target = TAP_TARGET;
    let hitValid = false;

// 1. FIRST: Check if the player tapped a physical object (like a tall tree trunk or monster)
let checkObjects = [];
if (window.collidables) checkObjects.push(...window.collidables);
if (typeof monsters !== 'undefined') checkObjects.push(...monsters);

if (checkObjects.length > 0) {
    let colIntersects = TAP_RAYCASTER.intersectObjects(checkObjects, true);
    for (let i = 0; i < colIntersects.length; i++) {
        // Traverse up to ensure the root object isn't buried/hidden
        let root = colIntersects[i].object;
        let isBuried = false;
        while (root) {
            if (root.position && root.position.y <= -500) isBuried = true;
            if (root.visible === false) isBuried = true;
            root = root.parent;
        }
        if (!isBuried) {
            target.copy(colIntersects[i].point);
            hitValid = true;
            break;
        }
    }
} 
    // 2. SECOND: If no tall object was tapped, fall back to finding the terrain ground point
    if (!hitValid && window.worldTerrain) {
        let intersects = TAP_RAYCASTER.intersectObject(window.worldTerrain, true);
        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].object.visible) {
                target.copy(intersects[i].point);
                hitValid = true;
                break;
            }
        }
    }

    // Fallback: If terrain isn't loaded or missed, intersect against mathematical Y=0 plane
    // CACHED PLANE: Avoids allocating a new Plane object every tap
    if (!window.TAP_MATH_PLANE) window.TAP_MATH_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    if (!hitValid) {
        if (!TAP_RAYCASTER.ray.intersectPlane(window.TAP_MATH_PLANE, target)) return;
    }
    
    // Prevent interacting too far away (Max Distance = 9 units)
    let dx = target.x - player.x, dz = target.z - player.z;
    let dist = Math.sqrt(dx*dx + dz*dz);
    let placeX = target.x, placeZ = target.z;
    if (dist > 9) { 
        placeX = player.x + (dx / dist) * 9; 
        placeZ = player.z + (dz / dist) * 9; 
    }
    
// --- 1. CHECK FOR VAMPIRE SLAYING ---
    let tappedMonsterIndex = -1;
    for(let i = 0; i < monsters.length; i++) {
        let m = monsters[i];
        let tapDist = Math.sqrt((placeX - m.position.x)**2 + (placeZ - m.position.z)**2);
        let playerDist = Math.sqrt((player.x - m.position.x)**2 + (player.z - m.position.z)**2);
        
        // FIX: Ensure tap is on the monster AND player is close enough to melee (gap is not wide)
        if (m.visible && tapDist < 3.0 && playerDist < 4.5) {
            tappedMonsterIndex = i; break;
        }
    }

    if (tappedMonsterIndex !== -1 && activeHotbarItem === 'axe' && farmInventory.axe > 0) {
        // Deduct Axe Durability
        toolDurability.axe--;
        if (toolDurability.axe <= 0) {
            farmInventory.axe--;
            if (farmInventory.axe > 0) toolDurability.axe = 20;
        }

        let m = monsters[tappedMonsterIndex];
        
        // Deduct Monster Health (Axe deals 10 damage per hit)
        m.userData.hp = (m.userData.hp || 30) - 10;
        
        if (m.userData.hp <= 0) {
            // ARCHITECTURAL FIX: Completely remove and dispose of the monster
            scene.remove(m);
            m.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
                    else child.material.dispose();
                }
            });
            monsters.splice(tappedMonsterIndex, 1); // Remove from active AI pool
            player.gold += window.MONSTER_KILL_REWARD || 5;
        }

        updateFarmHUD();
        return; // Stop interaction here, prioritize killing over chopping/farming
    }
    
    
// --- 2. CHECK FOR TREE CHOPPING ---
    let tappedTreeIndex = -1;
    if (window.treePositions) {
        for (let i = 0; i < window.treePositions.length; i++) {
            let t = window.treePositions[i];
            // Uses radius + 1.5 buffer for easier tapping. Ignore already chopped trees.
            if (t && !t.isChopped && Math.sqrt((placeX - t.x)**2 + (placeZ - t.z)**2) < (t.radius || 2.5) + 1.5) {
                tappedTreeIndex = i; break;
            }
        }
    }

    if (tappedTreeIndex !== -1 && activeHotbarItem === 'axe' && farmInventory.axe > 0) {
        toolDurability.axe--;
        
        let t = window.treePositions[tappedTreeIndex];
        t.health--;

        if (t.health <= 0) {
    t.isChopped = true;
    
    // Random wood reward between 3 and 5
    let woodReward = Math.floor(Math.random() * 3) + 3;
    window.gainItem('wood', woodReward);
    
    let tx = t.x;
    let tz = t.z;
    let groundY = t.originalY; // CRITICAL FIX: Cache the true ground elevation before hiding
    
    // Hide visually by finding it in spawnedTrees
    if (window.spawnedTrees) {
        window.spawnedTrees.forEach(st => {
            if (st.position && Math.abs(st.position.x - tx) < 0.1 && Math.abs(st.position.z - tz) < 0.1) {
                if (st.updateY) st.updateY(-1000);
                else st.position.y = -1000;
            }
        });
    }
    
    // Hide the physical collider by moving it underground instead of destroying it
    if (t.collider) {
        t.collider.position.y = -1000;
    }
    
    // Respawn Logic
    setTimeout(() => {
        t.isChopped = false;
        t.health = Math.floor(Math.random() * 3) + 3; // Generate new random HP
        
        // Restore visual position using the cached ground elevation
        if (window.spawnedTrees) {
            window.spawnedTrees.forEach(st => {
                if (st.position && Math.abs(st.position.x - tx) < 0.1 && Math.abs(st.position.z - tz) < 0.1) {
                    if (st.updateY) st.updateY(groundY);
                    else st.position.y = groundY;
                }
            });
        }
        
        // Restore physical collider position
        if (t.collider) {
            t.collider.position.y = groundY + (t.collider.geometry.parameters.height / 2);
        }
    }, t.respawnTimer || 15000);
}


        // Break Axe logic
        if (toolDurability.axe <= 0) {
            farmInventory.axe--;
            if (farmInventory.axe > 0) {
                toolDurability.axe = 20; // Reset for backpack reserve
            }
        }
        
        updateFarmHUD();
        return; 
    }
    

    // --- 3. CHECK FOR FARMING (Planting, Harvesting, Shoveling) ---
    let tappedPatch = null;
    farmPatches.forEach(patch => { if (Math.sqrt((placeX - patch.x)**2 + (placeZ - patch.z)**2) < 1.5) tappedPatch = patch; });
    
    if (tappedPatch) {
        
        // Plant Specific Seed
        if (tappedPatch.state === 'empty' && activeHotbarItem && activeHotbarItem.endsWith('_seed') && farmInventory[activeHotbarItem] > 0) {
            farmInventory[activeHotbarItem]--;
            tappedPatch.state = 'growing';
            tappedPatch.progress = 0;
            
            // Extract crop name from seed name (e.g., 'tomato_seed' -> 'tomato')
            let cropType = activeHotbarItem.replace('_seed', '');
            
// Clean up any old geometry before adding new crop template (WITH VRAM DISPOSAL)
while (tappedPatch.crop.children.length > 0) {
    let oldChild = tappedPatch.crop.children[0];
    oldChild.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
        }
    });
    tappedPatch.crop.remove(oldChild);
}
            
            
// Auto-unequip if out of seeds
if (farmInventory[activeHotbarItem] <= 0) {
    let emptyItem = activeHotbarItem;
    activeHotbarItem = null;
    if (window.updateEquippedTool) window.updateEquippedTool(null);
    document.querySelectorAll('.hotbar-slot').forEach(s => s.classList.remove('active'));
    for (let i = 0; i < 4; i++)
        if (hotbarMap[i] === emptyItem) hotbarMap[i] = '';
}
                        let newCrop = cropTemplates[cropType].clone();

            tappedPatch.crop.add(newCrop); tappedPatch.crop.visible = true; tappedPatch.crop.scale.set(0.1, 0.1, 0.1);
            
            // --- HARVEST MEMORY: Remember what we planted ---
            tappedPatch.plantedCrop = cropType;
        
    // Harvest Grown Crop
    } else if (tappedPatch.state === 'grown') {
        // Read memory and give the exact crop to the player
        let cropYield = tappedPatch.plantedCrop || 'tomato';
        window.gainItem(cropYield, 1);
        
        tappedPatch.state = 'empty'; 

            
            tappedPatch.crop.visible = false;
            tappedPatch.plantedCrop = null; // Clear memory
        }

    } else {
        // Dig new Soil Patch if holding Shovel and no patch exists there
        if (activeHotbarItem === 'shovel' && farmInventory.shovel > 0) { 
            toolDurability.shovel--; 
            spawnSoilPatch(placeX, placeZ); 
            
            // Break Shovel Logic
            if (toolDurability.shovel <= 0) {
                farmInventory.shovel--;
                if (farmInventory.shovel > 0) {
                    toolDurability.shovel = 20; // Reset for backpack reserve
                }
            }

        }
    }
    updateFarmHUD();
} 


//===ENTITIES>

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
 * @param {string} toolName - The identifier of the tool to equip (e.g., 'axe', 'shovel').
 * @returns {void}
 */
window.updateEquippedTool = function(toolName) {
    window.toolLoadSequence++;
    const currentSeq = window.toolLoadSequence; // Snapshot sequence state for this invocation

    // Explicitly unmount and dispose of the existing tool mesh to prevent
    // memory leaks. (FIXED: Added mandatory geometric disposal traversal).
    if (currentToolMesh) { 
        currentToolMesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        playerHand.remove(currentToolMesh);
        currentToolMesh = null; 
    }
  
    // Guard clause: Early exit if no valid equippable tool is selected 
    if (!toolName || (toolName !== 'axe' && toolName !== 'shovel' && toolName !== 'torch')) return;

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
        if (toolName === 'axe' || toolName === 'shovel') { 
            currentToolMesh.scale.set(1, 1, 1);
            currentToolMesh.rotation.set(0, -Math.PI / 2, 0);
        } else if (toolName === 'torch') {
            currentToolMesh.scale.set(0.4, 0.4, 0.4);
            currentToolMesh.rotation.set(Math.PI / 4, 0, 0); // Angles forward in the hand
            
            // Generate Emissive visual flame tip
            const fireGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
            const fireMesh = new THREE.Mesh(fireGeo, fireMat);
            fireMesh.position.set(0, 1, 0);
            currentToolMesh.add(fireMesh);
            
            // Generate PointLight mapping natively to the player's hand space
            const torchLight = new THREE.PointLight(0xffaa00, 1.2, 25);
            torchLight.position.set(0, 1, 0);
            currentToolMesh.add(torchLight);
        } else {
            currentToolMesh.scale.set(0.01, 0.01, 0.01);
            currentToolMesh.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        }
        playerHand.add(currentToolMesh); 
    }; // <-- THIS RESTORES THE MISSING BRACE!

    // If the tool is a torch, we don't need to load a 3D model pack.
    // We just build the procedural glowing torch and stop execution!
    if (toolName === 'torch') {
        buildEmergencyTool();
        return;
    }

    let packPath = 'item/tool.glb';

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
fbxLoader.load('animation/remy.fbx', (object) => {
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

// --- Load Monster (Modular Manual & Automatic Spawner) ---
// Spawns the enemy AI mesh, injects primitive tracking data, and starts the idle loop.

/**
 * Dynamically spawns a vampire enemy entity at the specified world coordinates.
 * @param {number} [exactX=-315] - Target world coordinate along the X axis.
 * @param {number} [exactZ=-305] - Target world coordinate along the Z axis.
 */
window.spawnVampire = function(exactX = -315, exactZ = -305) {
    
    // Calculate ground elevation using terrain raycaster fallback
    let startY = 10000;
    if (window.worldTerrain) {
        const ray = new THREE.Raycaster(new THREE.Vector3(exactX, 10000, exactZ), new THREE.Vector3(0, -1, 0));
        const hits = ray.intersectObject(window.worldTerrain, true);
        if (hits.length > 0 && hits[0].object.visible) startY = hits[0].point.y;
    }
    
// ARCHITECTURAL FIX: Load FBX per instance to prevent SkinnedMesh bone-sharing bugs.
// Cloning a SkinnedMesh without SkeletonUtils binds all clones to the original skeleton at (0,0,0).
// The browser caches the network request, so this only incurs a minor CPU parsing cost.
fbxLoader.load('animation/vampire.fbx', (monsterModel) => {
            const entityContainer = new THREE.Group();
            entityContainer.position.set(exactX, startY, exactZ);
            
            // Scale the actual model so the bones scale correctly, leave container at scale 1
            monsterModel.scale.set(0.02, 0.02, 0.02);
            monsterModel.position.set(0, 0, 0);
            monsterModel.rotation.set(0, 0, 0);
            
            monsterModel.traverse((child) => {
                if (child.isMesh || child.isSkinnedMesh) {
                    child.frustumCulled = false;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.visible = true;
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                        child.material.depthWrite = true;
                    }
                }
            });
            
            entityContainer.add(monsterModel);
            
            const kinematicData = {
                speed: 0.1,
                direction: 1,
                startZ: exactZ,
                startX: exactX,
                mixer: null,
                hp: 30
            };
            entityContainer.userData = { ...kinematicData };
            
            if (monsterModel.animations && monsterModel.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(monsterModel);
                entityContainer.userData.mixer = mixer;
                
                const mWalk = mixer.clipAction(monsterModel.animations[0]);
                mWalk.setLoop(THREE.LoopRepeat, Infinity);
                mWalk.play();
            }
        scene.add(entityContainer);

// CRITICAL FIX: Push directly to the 'monsters' const array defined in config.js.
// Overwriting window.monsters does not change the local const used by engine.js!
if (typeof monsters !== 'undefined' && Array.isArray(monsters)) {
    if (!monsters.includes(entityContainer)) {
        monsters.push(entityContainer);
    }
}

// ASYNC SNAPPING FIX: Ensure the vampire snaps to the ground if terrain loads after spawning
        
        if (window.forceSnapToDirt) {
            window.forceSnapToDirt(entityContainer, 'Vampire');
        }
        
        console.log(`[Entities] Vampire spawned at (${exactX}, ${startY}, ${exactZ})`);
    }, undefined, (error) => console.error("Error loading monster", error));
};



// SPAWNING THE VAMPIRE
window.spawnVampire(-310, -290);
window.spawnVampire(-315, -305);

// ============================================================================
// INSTANCED VEGETATION OPTIMIZATION SYSTEM
// Parsers and memory managers for massive object distribution fields.
// Instancing allows thousands of high-poly meshes to be drawn with a single draw call.
// ============================================================================

const MAX_TREES = 500;   // Buffer upper limit assigned to GPUs for InstancedMesh bounds allocations
const treeTypes = [];    // Structure storing instanced transformation metadata groups

gltfLoader.load(
    'environment/tree.glb',
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
        
// PERFORMANCE FIX: Zero-allocation memory pool for tree raycasting
const SHARED_TREE_RAYCASTER = new THREE.Raycaster();
const SHARED_TREE_DOWN_VEC = new THREE.Vector3(0, -1, 0);
const SHARED_TREE_ORIGIN = new THREE.Vector3();

/**
 * Procedurally spawns an interactive tree within the instancing context.
 * Generates deterministic properties, builds invisible physical colliders,
 * and manages asynchronous surface matching configurations.
 * @param {number} typeIndex - Unused placeholder for selecting tree type variations.
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
                SHARED_TREE_ORIGIN.set(exactX, 1000, exactZ);
                SHARED_TREE_RAYCASTER.set(SHARED_TREE_ORIGIN, SHARED_TREE_DOWN_VEC);
                let hits = SHARED_TREE_RAYCASTER.intersectObject(window.worldTerrain, true);
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
    health: Math.floor(Math.random() * 3) + 3, // Random HP between 3 and 5
    respawnTimer: 15000, // 15 seconds respawn interval
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
                    SHARED_TREE_ORIGIN.set(exactX, 500, exactZ);
                    SHARED_TREE_RAYCASTER.set(SHARED_TREE_ORIGIN, SHARED_TREE_DOWN_VEC);
                    let hits = SHARED_TREE_RAYCASTER.intersectObject(window.worldTerrain, true);
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
            window.spawnTree(0, 183, -15);
            
            //==FOREST==//
            window.spawnTree(0, 1050, -200);
            window.spawnTree(0, 1040, -200);
            
            window.spawnTree(0, 1050, -210);
            window.spawnTree(0, 1050, -220);
            window.spawnTree(0, 1025, -226);
            window.spawnTree(0, 1032, -217);
            window.spawnTree(0, 1032, -208);
            window.spawnTree(0, 1032, -227);
            window.spawnTree(0, 1039, -217);
            window.spawnTree(0, 1054, -207);
            
    // ========================================================================
    // RANDOM FOREST SPAWNER
    // INSTRUCTIONS:
    // 1. TOTAL_TREES: Change this to increase/decrease the forest size (Max 500).
    // 2. MIN_GAP: Minimum distance between trees. 25 ensures a 20-30 unit walking gap.
    // 3. WORLD_BOUNDS: The X and Z coordinate limits for spawning (-1000 to 1000).
    // Note: In Three.js, the ground plane uses X and Z coordinates (Y is up/down).
    // ========================================================================
    const TOTAL_TREES = 100;
    const MIN_GAP = 25;
    const WORLD_BOUNDS = 1000;
    
    // Store coordinates to check distances against
    const placedCoords = [
        { x: -315, z: -320 },
        { x: 183, z: -15 }
    ];
    
    let attempts = 0;
    let spawnedCount = 0;
    
    // Loop until we reach 100 trees or hit the safety limit (prevents infinite loops)
    while (spawnedCount < TOTAL_TREES && attempts < 3000) {
        attempts++;
        
        // Generate random X and Z within the world boundaries
        let randX = (Math.random() * (WORLD_BOUNDS * 2)) - WORLD_BOUNDS;
        let randZ = (Math.random() * (WORLD_BOUNDS * 2)) - WORLD_BOUNDS;
        
        let isValidSpace = true;
        
        // Check distance against all previously placed trees
        for (let i = 0; i < placedCoords.length; i++) {
            let dx = randX - placedCoords[i].x;
            let dz = randZ - placedCoords[i].z;
            let distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < MIN_GAP) {
                isValidSpace = false;
                break; // Too close to another tree, reject this coordinate
            }
        }
        
        // If the spot is clear, spawn the tree and save its coordinates
        if (isValidSpace) {
            placedCoords.push({ x: randX, z: randZ });
            window.spawnTree(0, randX, randZ);
            spawnedCount++;
        }
    }
    console.log(`[Spawner] Successfully generated ${spawnedCount} random trees.`);
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
 * @param {number} exactX - Target absolute grid index placement on horizontal X axis.
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

let campfireTemplate = null;
window.spawnedCampfires = window.spawnedCampfires || [];

/**
 * Dynamically spawns an interactive campfire entity at the specified coordinates.
 * Generates primitive glowing fallbacks, loads FBX geometry asynchronously, and disposes temporary primitives.
 * @param {number} [exactX=5] - Target world coordinate along the X axis.
 * @param {number} [exactZ=-299] - Target world coordinate along the Z axis.
 * @returns {THREE.Group} The instantiated campfire root group.
 */
window.spawnCampfire = function(exactX = 5, exactZ = -299) {
    // Calculate ground elevation using terrain raycaster fallback
    let startY = -370;
    if (window.worldTerrain) {
        const ray = new THREE.Raycaster(new THREE.Vector3(exactX, 10000, exactZ), new THREE.Vector3(0, -1, 0));
        const hits = ray.intersectObject(window.worldTerrain, true);
        if (hits.length > 0 && hits[0].object.visible) startY = hits[0].point.y;
    }
    
    const campfireGroup = new THREE.Group();
    campfireGroup.position.set(exactX, startY, exactZ);
    scene.add(campfireGroup);
    
    // Expose primary pointers for legacy HUD and Auto-Snapper compatibility
    window.campfireMesh = campfireGroup;
    
    // PointLight configuration setup handling emission radius and falloff attenuation curves
    const campLight = new THREE.PointLight(0xff7700, 0, 20);
    campLight.position.set(0, 1, 0);
    campfireGroup.add(campLight);
    window.campfireLight = campLight;
    
    // Emergency procedural fire primitive while high-poly asset loads
    const fireCubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const fireCubeMat = new THREE.MeshStandardMaterial({ color: 0xcc4400, emissive: 0x552200 });
    const fireCube = new THREE.Mesh(fireCubeGeo, fireCubeMat);
    fireCube.position.y = 0.5;
    campfireGroup.add(fireCube);
    
    const attachCampfireModel = (modelTemplate) => {
        // Remove emergency primitive and dispose geometry/material to prevent WebGL memory leaks
        campfireGroup.remove(fireCube);
        fireCubeGeo.dispose();
        fireCubeMat.dispose();
        const modelInstance = modelTemplate.clone();
        modelInstance.scale.set(0.01, 0.01, 0.01);
        campfireGroup.add(modelInstance);
    };
    
    if (campfireTemplate) {
    attachCampfireModel(campfireTemplate);
} else {
    fbxLoader.load('environment/campfire.fbx', (object) => {
        campfireTemplate = object;
        attachCampfireModel(campfireTemplate);
    }, undefined, () => console.log("Waiting for campfire model..."));
}

    window.spawnedCampfires.push(campfireGroup);
    console.log(`[Entities] Campfire spawned at (${exactX}, ${startY}, ${exactZ})`);
    return campfireGroup;
};

// Instantiate default initial campfire
window.spawnCampfire(-384, -471);
window.spawnCampfire(-288, -299);


// --- Execute Startup Routines ---
// Synchronize visual state flags with inventory vectors on program execution start
window.updateEquippedTool(activeHotbarItem);


//=== UI.Js ===//

// ============================================================================
// UI.JS 
//UI and INVENTORY MANAGEMENT
// ============================================================================

window.gainItem = function(item, amount) {
    farmInventory[item] = (farmInventory[item] || 0) + amount;
    
    // Auto-fill hotbar if item isn't in it and there is an empty slot
    if (!hotbarMap.includes(item)) {
        let emptySlot = hotbarMap.findIndex(slot => !slot || slot === '');
        if (emptySlot !== -1) {
            hotbarMap[emptySlot] = item;
        }
    }
};

/**
 * Synchronizes the visual HTML HUD with the underlying game state data.
*/
const HUD_CACHE = {
    hpText: null, uiGold: null, shopGold: null,
    invSlots: {}, hbSlots: [], hbNames: [], hbCounts: [], hbDurBgs: [], hbDurFills: []
};
let hudCacheInitialized = false;

// PERFORMANCE FIX: Single static allocation to avoid heap allocations during UI updates
const ALL_ITEM_KEYS = ['tomato_seed', 'corn_seed', 'carrot_seed', 'wheat_seed', 'tomato', 'corn', 'carrot', 'wheat', 'axe', 'shovel', 'wood', 'torch'];

window.updateFarmHUD = function() {
  
// 1. One-time DOM query caching (Zero-allocation layout access)
if (!hudCacheInitialized) {
  HUD_CACHE.hpText = document.getElementById('hp-text');
  // STRICT SRP: Target ONLY #gold-text. Never fall back to #ui, or the image will be destroyed.
  HUD_CACHE.uiGold = document.getElementById('gold-text');
  HUD_CACHE.shopGold = document.getElementById('caravan-gold');
  
        ALL_ITEM_KEYS.forEach(item => {
            HUD_CACHE.invSlots[item] = {
                slot: document.querySelector(`.inv-slot[data-item="${item}"]`),
                badge: document.getElementById(`inv-${item}`)
            };
        });
        
        for (let i = 0; i < 4; i++) {
            let slot = document.getElementById('hb-' + i);
            HUD_CACHE.hbSlots[i] = slot;
            HUD_CACHE.hbNames[i] = document.getElementById('hb-name-' + i);
            HUD_CACHE.hbCounts[i] = document.getElementById('hb-count-' + i);
            HUD_CACHE.hbDurBgs[i] = slot ? slot.querySelector('.durability-bg') : null;
            HUD_CACHE.hbDurFills[i] = document.getElementById('hb-durability-' + i);
        }
        hudCacheInitialized = true;
    }

    // 2. Direct property updates without triggering Reflow/DOM queries
    if (HUD_CACHE.hpText) HUD_CACHE.hpText.innerText = player.hp;
    ALL_ITEM_KEYS.forEach(item => {
        
        let cached = HUD_CACHE.invSlots[item];
        if (cached && cached.slot) {
            
            // BUG FIX: Ensure the image node actually exists in the backpack
            let iconImg = cached.slot.querySelector('.item-icon');
            if (!iconImg) {
                iconImg = document.createElement('img');
                iconImg.className = 'item-icon';
                cached.slot.insertBefore(iconImg, cached.slot.firstChild);
                
                // Hide any legacy text nodes
                let span = cached.slot.querySelector('span:not(.badge)');
                if (span) span.style.display = 'none';
            }
                        // CSS SIZING DELEGATION: Stripped inline layout rules.
            // Sizing and centering are now strictly managed by CSS Flexbox to prevent grid blowout.
            iconImg.style.cssText = ''; 
            iconImg.style.pointerEvents = 'none';


            // BUG FIX: Load all icons dynamically, intentionally skipping 'torch'
            if (item === 'torch') {
                iconImg.style.display = 'none';
            } else {
                iconImg.src = `icon/${item}.png`;
                iconImg.style.display = 'block';
            }

            if (hotbarMap.includes(item) || !farmInventory[item] || farmInventory[item] <= 0) {
                cached.slot.style.display = 'none'; 
            } else {
                cached.slot.style.display = 'flex'; 
                if (cached.badge) cached.badge.innerText = farmInventory[item] || 0;
            }
        }
    });

    
    for (let i = 0; i < 4; i++) {
        let itemType = hotbarMap[i];
        let slot = HUD_CACHE.hbSlots[i];
        let nameSpan = HUD_CACHE.hbNames[i];
        let countSpan = HUD_CACHE.hbCounts[i];
        let durBg = HUD_CACHE.hbDurBgs[i];
        let durFill = HUD_CACHE.hbDurFills[i];
        
        if (itemType && (!farmInventory[itemType] || farmInventory[itemType] <= 0)) {
    if (activeHotbarItem === itemType) {
        activeHotbarItem = null;
        if (window.updateEquippedTool) window.updateEquippedTool(null);
        // Safely use the cached DOM nodes instead of relying on bottom-file const declarations
        HUD_CACHE.hbSlots.forEach(s => { if (s) s.classList.remove('active'); });
    }
    hotbarMap[i] = '';
    itemType = '';
}

        
        let iconImg = slot ? slot.querySelector('.hb-icon') : null;
        
        if (itemType) {
            slot.setAttribute('data-item', itemType);
            if (nameSpan) nameSpan.style.display = 'none'; 
            
            if (!iconImg && slot) {
                iconImg = document.createElement('img');
                iconImg.className = 'hb-icon item-icon';
                slot.insertBefore(iconImg, slot.firstChild);
            }
            
            if (iconImg) {
        // CSS SIZING DELEGATION: Stripped inline layout rules.
        // Sizing and centering are now strictly managed by CSS Flexbox to prevent grid blowout.
        iconImg.style.cssText = '';
        iconImg.style.pointerEvents = 'none';

                // Load all icons dynamically, intentionally skipping 'torch'
                if (itemType === 'torch') {
                    iconImg.style.display = 'none';
                } else {
                    iconImg.src = `icon/${itemType}.png`;
                    iconImg.style.display = 'block';
                }
            }
            
            if (itemType === 'axe' || itemType === 'shovel' || itemType === 'torch') {
                if (countSpan) countSpan.style.display = 'none';
                if (durBg) durBg.style.display = 'block';
                let maxDurability = (itemType === 'torch') ? 100 : 20;
                let pct = Math.min((toolDurability[itemType] / maxDurability) * 100, 100); 

                if (durFill) {
                    durFill.style.width = pct + '%';
                    if (pct > 50) durFill.style.background = '#2ecc71'; 
                    else if (pct > 20) durFill.style.background = '#f1c40f'; 
                    else durFill.style.background = '#e74c3c'; 
                }
            } else {
                if (durBg) durBg.style.display = 'none';
                if (countSpan) {
                    countSpan.style.display = 'block';
                    countSpan.innerText = farmInventory[itemType] || 0;
                }
            }
        } else {
            if (slot) slot.setAttribute('data-item', '');
            if (nameSpan) {
                nameSpan.innerText = '';
                nameSpan.style.display = 'none';
            }
            if (countSpan) {
                countSpan.innerText = '';
                countSpan.style.display = 'none';
            }
            if (durBg) durBg.style.display = 'none';
            if (slot) slot.classList.remove('active');
            if (iconImg) iconImg.style.display = 'none';
        }
    }

// SINGLE RESPONSIBILITY: Set numeric value only; icon is rendered by HTML/CSS
if (HUD_CACHE.uiGold) HUD_CACHE.uiGold.innerText = player.gold;
if (HUD_CACHE.shopGold) HUD_CACHE.shopGold.innerText = player.gold;
};

// --- Hotbar Selection & Drag-and-Drop System ---

const hotbarSlots = document.querySelectorAll('.hotbar-slot');
const allDraggables = document.querySelectorAll('.inv-slot, .hotbar-slot');

let draggedItem = null, holdTimer = null, dragSourceSlot = null;
let dragStartX = 0, dragStartY = 0, dragTouchID = null;

// DOM Object Pool: Avoids GC spikes by reusing a single DOM node for dragging
let cachedDragGhost = null;

function getDragGhost() {
    if (!cachedDragGhost) {
        cachedDragGhost = document.createElement('div');
        // FIX: Removed 'inv-slot' class to prevent inheriting 'width: 100%' from the backpack grid
        cachedDragGhost.className = 'dragging';
        cachedDragGhost.style.position = 'fixed';
        cachedDragGhost.style.width = '60px'; // Absolute finger-sized bounds
        cachedDragGhost.style.height = '60px'; // Absolute finger-sized bounds
        cachedDragGhost.style.backgroundColor = 'rgba(30, 30, 30, 0.7)';
        cachedDragGhost.style.border = '2px solid rgba(220, 220, 220, 0.4)';
        cachedDragGhost.style.borderRadius = '8px';
        cachedDragGhost.style.zIndex = '9999';
        cachedDragGhost.style.pointerEvents = 'none'; // Critical: Prevents ghost from blocking raycasts/drops
        document.body.appendChild(cachedDragGhost);
    }
    return cachedDragGhost;
}

allDraggables.forEach(item => {
    // 1. Touch Start (Initiate Drag or Tap)
    item.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        let type = item.getAttribute('data-item');
        if (!type) return; 
        
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
        dragTouchID = touch.identifier;
        
holdTimer = setTimeout(() => {
  draggedItem = type;
  dragSourceSlot = item;
  
  let ghost = getDragGhost();
  // FIXED: Single DOM assignment and styling for drag ghost; CSS handles icon wrapper sizing
  ghost.innerHTML = `<div class="icon-wrapper"><img src="icon/${type}.png" class="item-icon"></div>`;
  ghost.style.display = 'flex';
  ghost.style.alignItems = 'center';
  ghost.style.justifyContent = 'center';
  ghost.style.left = (dragStartX - 30) + 'px';
  ghost.style.top = (dragStartY - 30) + 'px';
}, 300);


    }, {passive: false});

    // 2. Touch Move (Update Drag Visuals or Cancel Tap)
    item.addEventListener('touchmove', (e) => {
        let touch = null;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === dragTouchID) {
                touch = e.changedTouches[i];
                break;
            }
        }
        if (!touch) return; 
        
        if (draggedItem && cachedDragGhost && cachedDragGhost.style.display !== 'none') {
            e.preventDefault(); 
            cachedDragGhost.style.left = touch.clientX - 45 + 'px';
            cachedDragGhost.style.top = touch.clientY - 25 + 'px';
        } else if (holdTimer) {
            let dist = Math.sqrt((touch.clientX - dragStartX)**2 + (touch.clientY - dragStartY)**2);
            if (dist > 15) {
                clearTimeout(holdTimer); 
                holdTimer = null;
            }
        }
    }, {passive: false});

    // 3. Touch End (Process Drop Target OR Quick Tap)
    item.addEventListener('touchend', (e) => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
            
            if (!draggedItem && item.classList.contains('hotbar-slot')) {
                e.preventDefault(); 
                
                if (item.classList.contains('active')) {
                    item.classList.remove('active');
                    activeHotbarItem = null;
                    if(window.updateEquippedTool) window.updateEquippedTool(null); 
                } else {
                    hotbarSlots.forEach(s => s.classList.remove('active'));
                    item.classList.add('active');
                    activeHotbarItem = item.getAttribute('data-item');
                    if(window.updateEquippedTool) window.updateEquippedTool(activeHotbarItem); 
                }
            }
        }
        
      // DROP LOGIC
if (draggedItem) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    
    // Hide the ghost visually, returning it to the pool instead of destroying it
    if (cachedDragGhost) cachedDragGhost.style.display = 'none';
    
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetHotbar = dropTarget ? dropTarget.closest('.hotbar-slot') : null;
    // FIX: Include the entire #backpack-modal so dropping works even if the grid is empty/collapsed
    const targetBackpack = dropTarget ? dropTarget.closest('#backpack-modal, .backpack-grid, .inv-slot') : null;
    
    
            if (targetHotbar) {
                let targetIndex = targetHotbar.getAttribute('data-index');
                if (dragSourceSlot.classList.contains('hotbar-slot')) {
                    let sourceIndex = dragSourceSlot.getAttribute('data-index');
                    let temp = hotbarMap[targetIndex];
                    hotbarMap[targetIndex] = draggedItem;
                    hotbarMap[sourceIndex] = temp;
                } else {
                    hotbarMap[targetIndex] = draggedItem; 
                }
            } else if (targetBackpack && dragSourceSlot.classList.contains('hotbar-slot')) {
                let sourceIndex = dragSourceSlot.getAttribute('data-index');
                hotbarMap[sourceIndex] = '';
                
                if (activeHotbarItem === draggedItem) {
                    activeHotbarItem = null;
                    if (window.updateEquippedTool) window.updateEquippedTool(null);
                    hotbarSlots.forEach(s => s.classList.remove('active'));
                }
            }
            
            draggedItem = null;
            dragSourceSlot = null;
            updateFarmHUD();
        }
    });
});


// Debug Coordinate Tracker UI
window.coordTracker = document.createElement('div');
window.coordTracker.id = 'coord-tracker'; // FIX: Added ID for HUD Layout targeting
window.coordTracker.style.color = '#2ecc71';
window.coordTracker.style.fontSize = '16px';
window.coordTracker.style.fontWeight = 'bold';
window.coordTracker.style.textAlign = 'center';

// Moves tracker to absolute game HUD, positioning it right below the Gold text
window.coordTracker.style.position = 'fixed';
window.coordTracker.style.top = '50px';
window.coordTracker.style.left = '20px';
window.coordTracker.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
window.coordTracker.style.zIndex = '10';
window.coordTracker.innerText = "X: 0 | Z: 0";
document.body.appendChild(window.coordTracker);


//===NPC.JS===//

// ============================================================================
// NPC.JS ENTIRE LOGIC OF NPC
// ============================================================================

// ============================================================================
// CARAVAN MERCHANT / SHOP LOGIC
// ============================================================================
const tabBuy = document.getElementById('tab-buy');
const tabSell = document.getElementById('tab-sell');
const secBuy = document.getElementById('caravan-buy-section');
const secSell = document.getElementById('caravan-sell-section');

// Utility to bind instant touch responses, bypassing 300ms mobile click delay
function bindCaravanBtn(id, callback) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
        if (e.cancelable !== false) e.preventDefault();
        e.stopPropagation();
        callback();
    }, { passive: false });
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        callback();
    });
}

// Tab Switching
bindCaravanBtn('tab-buy', () => {
    secBuy.style.display = 'flex'; 
    secSell.style.display = 'none';
    tabBuy.style.backgroundColor = '#2ecc71';
    tabSell.style.backgroundColor = 'transparent';
});

bindCaravanBtn('tab-sell', () => {
    secBuy.style.display = 'none';
    secSell.style.display = 'flex'; 
    tabSell.style.backgroundColor = '#2ecc71';
    tabBuy.style.backgroundColor = 'transparent';
});

// --- Buy Actions ---
const BUY_CONFIG = [
    { id: 'tomato-seed', item: 'tomato_seed', price: 10 },
    { id: 'corn-seed', item: 'corn_seed', price: 15 },
    { id: 'carrot-seed', item: 'carrot_seed', price: 20 },
    { id: 'wheat-seed', item: 'wheat_seed', price: 25 }
];

BUY_CONFIG.forEach(shopItem => {
    bindCaravanBtn(`buy-${shopItem.id}`, () => {
        if (player.gold >= shopItem.price) { 
            player.gold -= shopItem.price; 
            window.gainItem(shopItem.item, 1); 
            updateFarmHUD(); 
        }
    });
});

bindCaravanBtn('buy-axe', () => {
    if (player.gold >= 50) { 
        player.gold -= 50; 
        window.gainItem('axe', 1); 
        if (farmInventory.axe === 1) toolDurability.axe = 20; 
        updateFarmHUD(); 
    }
});

bindCaravanBtn('buy-shovel', () => {
    if (player.gold >= 50) { 
        player.gold -= 50; 
        window.gainItem('shovel', 1); 
        if (farmInventory.shovel === 1) toolDurability.shovel = 20; 
        updateFarmHUD(); 
    }
});

// --- Sell Actions ---
const SELL_PRICES = { 
    tomato: 15, corn: 20, carrot: 25, wheat: 30, 
    tomato_seed: 5, corn_seed: 8, carrot_seed: 10, wheat_seed: 12, 
    axe: 25, shovel: 25, torch: 10, wood: 3
};

bindCaravanBtn('sell-item', () => { 
    if (activeHotbarItem && farmInventory[activeHotbarItem] > 0) { 
        let price = SELL_PRICES[activeHotbarItem] || 0;
        if (price > 0) { 
            player.gold += price;
            farmInventory[activeHotbarItem] -= 1;
            if (farmInventory[activeHotbarItem] === 0 && toolDurability[activeHotbarItem] !== undefined) {
                toolDurability[activeHotbarItem] = (activeHotbarItem === 'torch') ? 100 : 20; 
            }
            updateFarmHUD(); 
        } 
    } 
});

// --- Modular Bulk Selling Processor ---
function processBulkSale(filterPredicate) {
    let totalEarned = 0;
    for (let item in SELL_PRICES) {
        if (filterPredicate(item) && farmInventory[item] && farmInventory[item] > 0) {
            totalEarned += farmInventory[item] * SELL_PRICES[item];
            farmInventory[item] = 0;
            if (toolDurability[item] !== undefined) {
                toolDurability[item] = (item === 'torch') ? 100 : 20;
            }
        }
    }
    if (totalEarned > 0) {
        player.gold += totalEarned;
        updateFarmHUD();
    }
}

const CROP_TYPES = ['tomato', 'corn', 'carrot', 'wheat'];

bindCaravanBtn('sell-all-crops', () => processBulkSale(item => CROP_TYPES.includes(item)));
bindCaravanBtn('sell-all-items', () => processBulkSale(item => !CROP_TYPES.includes(item)));
bindCaravanBtn('sell-everything', () => processBulkSale(() => true));

bindCaravanBtn('close-sell', () => {
    document.getElementById('caravan-modal').style.display = 'none';
});


//===PHYSICS.JS===//

// ============================================================================
// PHYSICS.JS
// ============================================================================

// ============================================================================
// TERRAIN SNAPPING LOGIC (GRAVITY / HILL WALKING)
// Raycasts downward every frame to map player height to uneven geometry.
// ============================================================================

const terrainRaycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
const SNAPPING_ORIGIN = new THREE.Vector3(); // MEMORY POOL: Prevents GC spikes

window.snapToTerrain = function() {
    if (!window.worldTerrain || typeof builderCursor === 'undefined') return;
    
    // Update cached vector instead of allocating new memory via 'new Vector3'
    SNAPPING_ORIGIN.set(player.x, 10000, player.z);
    
    // Cast ray from high above the player straight down
    terrainRaycaster.set(SNAPPING_ORIGIN, downVector);
    
    const intersects = terrainRaycaster.intersectObject(window.worldTerrain, true);
    
    let validHit = null;
    for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].object.visible) {
            validHit = intersects[i];
            break;
        }
    }
    
    if (validHit) {
        let groundHeight = validHit.point.y;
        
        // Prevent walking up sheer cliffs (step height limitation)
        if (player.lastValidY !== undefined && (groundHeight - player.lastValidY) > 1.5) {
            // Revert to last valid position if slope is too steep
            player.x = player.lastValidX;
            player.z = player.lastValidZ;
            builderCursor.position.x = player.x;
            builderCursor.position.z = player.z;
        }
        else {
            // HILL WALKING (Walk upward/downward)
            // FIX: Removed the + 0.5 offset so the character's feet touch the ground perfectly.
            builderCursor.position.y = groundHeight;
            
            // Save this as our new "safe" spot
            player.lastValidX = player.x;
            player.lastValidZ = player.z;
            player.lastValidY = groundHeight;
        }
    }
};


//===CONTROL.JS===//

// ============================================================================
// CONTROLS.JS - INPUT TRACKING SYSTEM & UI MANAGER
// ============================================================================
// This file handles all player inputs (touch, keyboard, mouse), manages the UI/HUD 
// elements, processes inventory management (drag-and-drop)

// --- DOM Element References: Mobile Input & Menus ---
const btnCamera = document.getElementById('btn-camera');
const padLeft = document.getElementById('touch-left');      // Movement joystick area
const padRight = document.getElementById('touch-right');    // Camera look area
const joyBase = document.getElementById('joystick-base');   // Visual joystick container
const joyKnob = document.getElementById('joystick-knob');   // Visual joystick thumb
const btnAction = document.getElementById('btn-action');    // General interact button

const btnSystemMenu = document.getElementById('btn-system-menu');
const systemMenu = document.getElementById('system-menu');

const btnCloseSystem = document.getElementById('btn-close-system');
const btnSettings = document.getElementById('btn-settings');

const settingsMenu = document.getElementById('settings-menu');

// --- DOM Element References: Settings Toggles ---
const toggleCameraView = document.getElementById('toggle-camera-view');
const toggleJoystickType = document.getElementById('toggle-joystick-type');

const toggleJoystickVisible = document.getElementById('toggle-joystick-visible');
const toggleCoordinates = document.getElementById('toggle-coordinates');

const toggleFullscreen = document.getElementById('toggle-fullscreen');
const inputSensitivity = document.getElementById('input-sensitivity');

// --- Touch Tracking State Variables ---
let touchLeftId = null, touchRightId = null; // Stores unique touch IDs to support multi-touch
let startX = 0, startY = 0, lastRightX = 0, lastRightY = 0; 
let rightTouchStartTime = 0, rightTouchStartX = 0, rightTouchStartY = 0;

// --- Modal Open/Close Handlers ---
document.getElementById('btn-backpack').addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation(); updateFarmHUD();
    document.getElementById('backpack-modal').style.display = 'flex';
});

// FIXED: Added multi-touch support so modals can be closed while joystick/camera is held
const closeBackpackHandler = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.getElementById('backpack-modal').style.display = 'none';
};
document.getElementById('close-backpack').addEventListener('touchstart', closeBackpackHandler, { passive: false });
document.getElementById('close-backpack').addEventListener('click', closeBackpackHandler);

const closeCaravanHandler = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.getElementById('caravan-modal').style.display = 'none';
};
document.getElementById('close-caravan').addEventListener('touchstart', closeCaravanHandler, { passive: false });
document.getElementById('close-caravan').addEventListener('click', closeCaravanHandler);

// SRP CLEANUP: Removed duplicate sell-item and processBulkSale logic from controls.js.
// All caravan trading and NPC transaction logic is strictly owned by npc.js.

// ============================================================================
// SYSTEM MENUS & SETTINGS
// ============================================================================

// Mobile Action Button (Opens shop or dialogue depending on nearby activeNpc)
btnAction.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation(); 
    if (activeNpc) {
        if (activeNpc.name === "Caravan Merchant") {
            updateFarmHUD(); 
            document.getElementById('caravan-modal').style.display = 'flex';
            
            // Reset to default buy tab on open
            document.getElementById('caravan-buy-section').style.display = 'flex';
            document.getElementById('caravan-sell-section').style.display = 'none';
            document.getElementById('tab-buy').style.backgroundColor = '#2ecc71';
            document.getElementById('tab-sell').style.backgroundColor = 'transparent';
        } else {
            const dBox = document.getElementById('dialogue-box');
            if (dBox.style.display === 'block') dBox.style.display = 'none';
            else {
                document.getElementById('dialogue-speaker').innerText = activeNpc.name;
                document.getElementById('dialogue-text').innerText = "Greetings!";
                dBox.style.display = 'block';
            }
        }
    }
}, false);

// FIXED: Extracted to a unified handler with an Auto-Heal routine for corrupted HUD Editor states
const openSystemMenu = (e) => {
    if (e) { 
        e.preventDefault();
        e.stopPropagation(); 
    }
    systemMenu.style.display = 'flex';
    
    // AUTO-HEAL: If the HUD Layout tool accidentally appended 'display: none' 
    // or a rogue absolute position to the Settings button, forcefully strip it here.
    if (btnSettings) {
        btnSettings.style.display = 'block';
        btnSettings.style.position = 'static';
        btnSettings.style.visibility = 'visible';
        btnSettings.style.opacity = '1';
    }
};

btnSystemMenu.addEventListener('touchstart', openSystemMenu, { passive: false });

const closeSystemMenu = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    systemMenu.style.display = 'none';
};

btnCloseSystem.addEventListener('touchstart', closeSystemMenu, { passive: false });
btnCloseSystem.addEventListener('click', closeSystemMenu);

btnSettings.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation();
    systemMenu.style.display = 'none'; 
    settingsMenu.style.display = 'flex';
}, false);

document.getElementById('close-settings').addEventListener('click', () => {
    settingsMenu.style.display = 'none';
});

// --- Settings Toggles ---

inputSensitivity.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) CAMERA_SENSITIVITY = val;
});

// Fullscreen API with cross-browser compatibility and landscape lock attempts
toggleFullscreen.addEventListener('touchstart', (e) => e.stopPropagation(), false);
toggleFullscreen.addEventListener('click', (e) => {
    let elem = document.documentElement;
    let isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFullscreen) {
        if (elem.requestFullscreen) elem.requestFullscreen().then(() => {
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(e => console.log(e));
        }).catch(e => console.log(e));
        else if (elem.webkitRequestFullscreen) { 
            elem.webkitRequestFullscreen();
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(e => console.log(e));
        }
        toggleFullscreen.classList.add('active'); 
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
        toggleFullscreen.classList.remove('active'); 
    }
}, false);

const handleCameraToggle = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    isFirstPerson = !isFirstPerson; 
    if (isFirstPerson) toggleCameraView.classList.add('active'); 
    else toggleCameraView.classList.remove('active'); 
};
toggleCameraView.addEventListener('touchstart', handleCameraToggle, { passive: false });
toggleCameraView.addEventListener('click', handleCameraToggle);

const handleJoystickTypeToggle = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    isJoystickFixed = !isJoystickFixed; 
    if (isJoystickFixed) {
        toggleJoystickType.classList.add('active');
        joyBase.classList.add('joystick-fixed'); 
    } else {
        toggleJoystickType.classList.remove('active');
        joyBase.classList.remove('joystick-fixed'); 
        joyBase.style.display = 'none'; 
    }
};
toggleJoystickType.addEventListener('touchstart', handleJoystickTypeToggle, { passive: false });
toggleJoystickType.addEventListener('click', handleJoystickTypeToggle);

const handleJoystickVisibleToggle = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    isJoystickInvisible = !isJoystickInvisible; 
    if (isJoystickInvisible) {
        toggleJoystickVisible.classList.add('active');
        joyBase.classList.add('joystick-invisible'); 
    } else {
        toggleJoystickVisible.classList.remove('active');
        joyBase.classList.remove('joystick-invisible'); 
    } 
};
toggleJoystickVisible.addEventListener('touchstart', handleJoystickVisibleToggle, { passive: false });
toggleJoystickVisible.addEventListener('click', handleJoystickVisibleToggle);

// NEW: Toggle logic for the Coordinates HUD
toggleCoordinates.addEventListener('click', (e) => {
    e.stopPropagation();
    if (toggleCoordinates.classList.contains('active')) {
        toggleCoordinates.classList.remove('active');
        window.coordTracker.style.display = 'none';
    } else {
        toggleCoordinates.classList.add('active');
        window.coordTracker.style.display = 'block';
    }
});

// FPS Toggle Logic
const toggleFps = document.getElementById('toggle-fps');
const fpsDisplay = document.getElementById('fps-display');
toggleFps.addEventListener('click', (e) => {
    e.stopPropagation();
    window.SHOW_FPS = !window.SHOW_FPS;
    if (window.SHOW_FPS) {
        toggleFps.classList.add('active');
        fpsDisplay.style.display = 'block';
    } else {
        toggleFps.classList.remove('active');
        fpsDisplay.style.display = 'none';
    }
});

// Resets camera pitch to a comfortable default angle
btnCamera.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation();
    player.cameraAngle = Math.PI / 4;
    player.birdsEyePitch = Math.PI / 4;
    player.cameraPitch = 0;
}, false);

// ============================================================================
// TOUCH CONTROLS - VIRTUAL JOYSTICK & CAMERA LOOK
// ============================================================================
let activeJoystickTouchId = null;

// --- Left Pad: Movement Joystick ---
padLeft.addEventListener('touchstart', (e) => {
    if (window.IS_EDITING_HUD) return;
    e.preventDefault();
    settingsMenu.style.display = 'none';
    
    // Hardware Lock: If joystick is already in use by a thumb, ignore new touches!
    if (activeJoystickTouchId !== null) return;
    
    const touch = e.changedTouches[0];
    activeJoystickTouchId = touch.identifier; // Lock onto this specific finger
    touchLeftId = touch.identifier;
    
    // Determine joystick origin center
    if (isJoystickFixed) {
        const rect = joyBase.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
    } else {
        startX = touch.clientX;
        startY = touch.clientY;
        joyBase.style.display = 'block';
        joyBase.style.left = startX + 'px';
        joyBase.style.top = startY + 'px';
    }
    joyKnob.style.transform = 'translate(-50%, -50%)';
}, false);

padLeft.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    // Only move if the exact finger that started the joystick is moving
    for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeJoystickTouchId) {
            let dx = e.touches[i].clientX - startX;
            let dy = e.touches[i].clientY - startY;
            
            // Clamp joystick visual bounds and movement vectors
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > MAX_JOYSTICK_RADIUS) {
                dx = (dx / dist) * MAX_JOYSTICK_RADIUS;
                dy = (dy / dist) * MAX_JOYSTICK_RADIUS;
            }
            
            joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            
            // Normalize vectors for engine.js consumption
            player.moveVectorX = dx / MAX_JOYSTICK_RADIUS;
            player.moveVectorZ = dy / MAX_JOYSTICK_RADIUS;
        }
    }
}, false);

const clearLeftTrack = (e) => {
    e.preventDefault();
    
    // Check if the finger lifting up is actually our joystick finger
    let joystickLifted = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeJoystickTouchId) {
            joystickLifted = true;
            break;
        }
    }
    
    if (joystickLifted) {
        activeJoystickTouchId = null;
        touchLeftId = null;
        player.moveVectorX = 0;
        player.moveVectorZ = 0;
        joyKnob.style.transform = 'translate(-50%, -50%)';
        if (!isJoystickFixed) joyBase.style.display = 'none';
    }
};

padLeft.addEventListener('touchend', clearLeftTrack, false);
padLeft.addEventListener('touchcancel', clearLeftTrack, false);

// --- Right Pad: Camera Look & Tap-to-Interact ---
padRight.addEventListener('touchstart', (e) => {
    if (window.IS_EDITING_HUD) return;
    e.preventDefault(); const touch = e.changedTouches[0]; touchRightId = touch.identifier;
    
    touchRightId = touch.identifier;
    lastRightX = touch.clientX; lastRightY = touch.clientY; 
    
    // Record start data to distinguish between a "swipe" (look) and a "tap" (interact)
    rightTouchStartX = touch.clientX; rightTouchStartY = touch.clientY; rightTouchStartTime = Date.now();
}, false);

padRight.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchRightId) {
            let deltaX = e.touches[i].clientX - lastRightX, deltaY = e.touches[i].clientY - lastRightY;
            
            // Apply horizontal rotation (Yaw)
            player.cameraAngle -= deltaX * CAMERA_SENSITIVITY;
            
            // Apply vertical rotation (Pitch) clamped to view modes
            if (isFirstPerson) {
                player.cameraPitch -= deltaY * CAMERA_SENSITIVITY;
                player.cameraPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, player.cameraPitch));
            } else {
                player.birdsEyePitch += deltaY * CAMERA_SENSITIVITY;
                player.birdsEyePitch = Math.max(0.1, Math.min(Math.PI / 2.2, player.birdsEyePitch));
            }
            lastRightX = e.touches[i].clientX; lastRightY = e.touches[i].clientY;
        }
    }
}, false);

const clearRightTrack = (e) => {
    e.preventDefault();
    if (touchRightId !== null) {
        let touch = null;
        for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === touchRightId) touch = e.changedTouches[i];
        if (touch) {
            // If touch lasted < 250ms and barely moved (< 15px), it's considered a Tap!
            if ((Date.now() - rightTouchStartTime) < 250 && Math.sqrt((touch.clientX - rightTouchStartX)**2 + (touch.clientY - rightTouchStartY)**2) < 15) {
                handleScreenTap(touch.clientX, touch.clientY);
            }
        }
    }
    touchRightId = null;
};
padRight.addEventListener('touchend', clearRightTrack, false);
padRight.addEventListener('touchcancel', clearRightTrack, false);

updateFarmHUD();

// ============================================================================
// DESKTOP CONTROLS - KEYBOARD & MOUSE SUPPORT
// ============================================================================
// Mirrors the existing touch logic so engine.js/world.js/entities.js/config.js
// never need to know whether input came from touch, keyboard, or mouse.
// ============================================================================

let keysPressed = {};
let mouseRightDown = false;
let lastMouseX = 0, lastMouseY = 0;
let rightMouseStartTime = 0, rightMouseStartX = 0, rightMouseStartY = 0;

// --- KEYBOARD MOVEMENT (WASD + Arrow Keys) ---
window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
    updateKeyboardVector();
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
    updateKeyboardVector();
});

function updateKeyboardVector() {
    // Only drive movement from keyboard if no touch joystick is currently active,
    // so this never fights with mobile input.
    if (touchLeftId !== null) return;

    let vx = 0, vz = 0;
    if (keysPressed['w'] || keysPressed['arrowup']) vz -= 1;
    if (keysPressed['s'] || keysPressed['arrowdown']) vz += 1;
    if (keysPressed['a'] || keysPressed['arrowleft']) vx -= 1;
    if (keysPressed['d'] || keysPressed['arrowright']) vx += 1;

    if (vx !== 0 && vz !== 0) {
        // Normalize diagonal movement to match joystick max magnitude of 1
        // (prevents moving faster diagonally)
        const len = Math.sqrt(vx * vx + vz * vz);
        vx /= len; vz /= len;
    }

    player.moveVectorX = vx;
    player.moveVectorZ = vz;
}

// --- MOUSE LOOK (drag on right half = camera rotation, mirrors touch) ---
// Extracted dynamically to eliminate global event listener spam on idle movement
const handleDesktopMouseMove = (e) => {
    let deltaX = e.clientX - lastMouseX, deltaY = e.clientY - lastMouseY;
    
    player.cameraAngle -= deltaX * CAMERA_SENSITIVITY;
    
    if (isFirstPerson) {
        player.cameraPitch -= deltaY * CAMERA_SENSITIVITY;
        player.cameraPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, player.cameraPitch));
    } else {
        player.birdsEyePitch += deltaY * CAMERA_SENSITIVITY;
        player.birdsEyePitch = Math.max(0.1, Math.min(Math.PI / 2.2, player.birdsEyePitch));
    }
    lastMouseX = e.clientX; lastMouseY = e.clientY;
};

const handleDesktopMouseUp = (e) => {
    // Dynamically detach listeners when not dragging
    window.removeEventListener('mousemove', handleDesktopMouseMove);
    window.removeEventListener('mouseup', handleDesktopMouseUp);
    mouseRightDown = false;
    
    // A quick click (not a drag) on the right pane places/interacts, same as a tap
    if ((Date.now() - rightMouseStartTime) < 250 &&
        Math.sqrt((e.clientX - rightMouseStartX) ** 2 + (e.clientY - rightMouseStartY) ** 2) < 15) {
        handleScreenTap(e.clientX, e.clientY);
    }
};

padRight.addEventListener('mousedown', (e) => {
    mouseRightDown = true;
    lastMouseX = e.clientX; lastMouseY = e.clientY;
    rightMouseStartX = e.clientX; rightMouseStartY = e.clientY;
    rightMouseStartTime = Date.now();
    
    // Only bind mouse tracking while actively holding down the button
    window.addEventListener('mousemove', handleDesktopMouseMove);
    window.addEventListener('mouseup', handleDesktopMouseUp);
});

// --- DESKTOP CLICK FALLBACKS FOR TOUCH-ONLY BUTTONS ---
// These reuse the exact same handler logic as their touchstart counterparts.
btnAction.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeNpc) {
        if (activeNpc.name === "Caravan Merchant") {
            updateFarmHUD();
            document.getElementById('caravan-modal').style.display = 'flex';
            document.getElementById('caravan-buy-section').style.display = 'flex';
            document.getElementById('caravan-sell-section').style.display = 'none';
            document.getElementById('tab-buy').style.backgroundColor = '#2ecc71';
            document.getElementById('tab-sell').style.backgroundColor = 'transparent';
        } else {
            const dBox = document.getElementById('dialogue-box');
            if (dBox.style.display === 'block') dBox.style.display = 'none';
            else {
                document.getElementById('dialogue-speaker').innerText = activeNpc.name;
                document.getElementById('dialogue-text').innerText = "Greetings!";
                dBox.style.display = 'block';
            }
        }
    }
});

btnSystemMenu.addEventListener('click', openSystemMenu);

btnSettings.addEventListener('click', (e) => {
    e.preventDefault();
    systemMenu.style.display = 'none';
    settingsMenu.style.display = 'flex';
});

btnCamera.addEventListener('click', (e) => {
    e.preventDefault();
    player.cameraAngle = Math.PI / 4;
    player.birdsEyePitch = Math.PI / 4;
    player.cameraPitch = 0;
});

document.getElementById('btn-backpack').addEventListener('click', () => {
    updateFarmHUD();
    document.getElementById('backpack-modal').style.display = 'flex';
});

hotbarSlots.forEach(slot => {
    slot.addEventListener('click', (e) => {
        if (slot.classList.contains('active')) {
            slot.classList.remove('active');
            activeHotbarItem = null;
            if (window.updateEquippedTool) window.updateEquippedTool(null);
        } else {
            hotbarSlots.forEach(s => s.classList.remove('active'));
            slot.classList.add('active');
            activeHotbarItem = slot.getAttribute('data-item');
            if (window.updateEquippedTool) window.updateEquippedTool(activeHotbarItem);
        }
    });
});

['buy-seed', 'buy-axe', 'buy-shovel', 'sell-item', 'sell-all-crops',
 'sell-all-items', 'sell-everything'].forEach(id => {
    // These already have 'click' listeners attached above in this file, so nothing
    // further is needed here — left as a comment for clarity on coverage.
});

// --- DESKTOP CURSOR LOOK MODE (pointer lock while holding right mouse button) ---
// Optional UX nicety: prevents the cursor from leaving the window while dragging to look.
padRight.addEventListener('mousedown', () => {
    if (padRight.requestPointerLock) padRight.requestPointerLock();
});
window.addEventListener('mouseup', () => {
    if (document.exitPointerLock) document.exitPointerLock();
});

// ============================================================================
// MAIN MENU LOGIC
// ============================================================================

// Extra safety: force main menu to be visible on load and after any orientation change
function enforceMenuVisibility() {
    const menu = document.getElementById('main-menu');
    // FIX: Do not force the menu back open if the player is currently editing the HUD
    if (menu && window.GAME_STATE === 'MENU' && !window.IS_EDITING_HUD) {
        menu.style.display = 'flex';

        // Hide all in-game modals just in case
        document.querySelectorAll('.game-modal').forEach(m => m.style.display = 'none');
        
        // CRITICAL FIX: Hide the HUD elements so they don't bleed into the Main Menu
        const uiElements = ['ui', 'hp-ui', 'btn-camera', 'btn-backpack', 'btn-system-menu', 'hotbar', 'btn-action'];
        uiElements.forEach(id => {
            let el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        if (window.coordTracker) window.coordTracker.style.display = 'none';
    }
}

window.addEventListener('load', enforceMenuVisibility);
window.addEventListener('orientationchange', () => setTimeout(enforceMenuVisibility, 100));

window.addEventListener('resize', () => setTimeout(enforceMenuVisibility, 100));

// Universal tap handler to fix mobile responsiveness
function handleMenuTap(btnId, callback) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    let lastExecution = 0;
    
    const strictCallback = (e) => {
        // Halt bubbling and prevent native browser ghost-clicks safely
        if (e) {
            if (e.cancelable !== false) e.preventDefault();
            e.stopPropagation();
        }

        // EXTREME FIX: 200ms temporal deadzone. 
        // Physically blocks twin-execution loops caused by the clash 
        // between native touch events and the global synthetic click delegator.
        const now = Date.now();
        if (now - lastExecution < 200) return;
        lastExecution = now;

        callback(e);
    };

    btn.addEventListener('click', strictCallback);
    btn.addEventListener('touchstart', strictCallback, { passive: false });
}

// --- 1. Core Menu Navigation ---
handleMenuTap('btn-play', () => {
    document.getElementById('main-menu').style.display = 'none';
    window.GAME_STATE = 'PLAYING';
    // Make absolutely sure no modal leftovers are shown
    document.querySelectorAll('.game-modal').forEach(m => m.style.display = 'none');

    // CRITICAL FIX: Restore HUD visibility when entering PLAYING state
    const uiElements = ['ui', 'hp-ui', 'btn-camera', 'btn-backpack', 'btn-system-menu', 'hotbar'];
    uiElements.forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            // FIXED: Preserve flexbox for Camera and Backpack so text/emojis remain perfectly centered
            if (id === 'hotbar' || id === 'btn-system-menu' || id === 'btn-camera' || id === 'btn-backpack') {
                el.style.display = 'flex';
            } else {
                el.style.display = 'block';
            }
        }
    });

    // Ensure coord tracker respects its setting toggle
    if (window.coordTracker) {
        const coordToggle = document.getElementById('toggle-coordinates');
        window.coordTracker.style.display = (coordToggle && coordToggle.classList.contains('active')) ? 'block' : 'none';
    }
});

// NEW: Bulletproof hook for HUD Layout using the stable menu tap system
handleMenuTap('btn-menu-hud-layout', (e) => {
    if (typeof window.toggleHUDMode === 'function') window.toggleHUDMode(e);
});

handleMenuTap('btn-menu-settings', () => {
    document.getElementById('menu-main-buttons').style.display = 'none';
    document.getElementById('menu-settings-panel').style.display = 'flex';
});

function closeMenuSettingsPanel() {
    document.getElementById('menu-settings-panel').style.display = 'none';
    document.getElementById('menu-main-buttons').style.display = 'flex';
}

handleMenuTap('btn-menu-settings-back', closeMenuSettingsPanel);
handleMenuTap('btn-menu-settings-close', closeMenuSettingsPanel);

// HUD Exit to Menu Button 
const btnExitMenu = document.getElementById('btn-exit-menu');
if (btnExitMenu) { 
    const exitToMenu = (e) => { 
        if (e) e.preventDefault();
        systemMenu.style.display = 'none'; 
        window.GAME_STATE = 'MENU';
        
        // --- REVERSE SYNCHRONIZATION (System Menu -> Main Menu) ---
        const syncToggles = [
            { state: isFirstPerson, id: 'menu-toggle-camera-view' },
            { state: isJoystickFixed, id: 'menu-toggle-joystick-type' },
            { state: isJoystickInvisible, id: 'menu-toggle-joystick-visible' }
        ];

        syncToggles.forEach(item => {
            const mBtn = document.getElementById(item.id);
            if (mBtn) item.state ? mBtn.classList.add('active') : mBtn.classList.remove('active');
        });

        const hCoord = document.getElementById('toggle-coordinates');
        const mCoord = document.getElementById('menu-toggle-coordinates');
        if (hCoord && mCoord) hCoord.classList.contains('active') ? mCoord.classList.add('active') : mCoord.classList.remove('active');

        const hFull = document.getElementById('toggle-fullscreen');
        const mFull = document.getElementById('menu-toggle-fullscreen');
        if (hFull && mFull) hFull.classList.contains('active') ? mFull.classList.add('active') : mFull.classList.remove('active');

        const mSens = document.getElementById('menu-input-sensitivity');
        if (mSens) mSens.value = CAMERA_SENSITIVITY;
        // ----------------------------------------------------------

        document.getElementById('main-menu').style.display = 'flex'; 
        enforceMenuVisibility(); // CRITICAL FIX: Re-hide the HUD when returning to Main Menu
    };
    btnExitMenu.addEventListener('click', exitToMenu);
    btnExitMenu.addEventListener('touchstart', exitToMenu, { passive: false }); 
}

// MAIN MENU EXIT GAME BUTTON (True Browser Exit & Portrait Reset)
const btnExitGame = document.getElementById('btn-exit');
if (btnExitGame) {
    btnExitGame.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('portrait');
        } catch (err) {
            console.warn("Hardware lock override prevented by browser:", err);
        }
        
        // Smooth Fade Out & Hide any annoying rotation warnings
        const landLock = document.getElementById('landscape-lock');
        if (landLock) landLock.style.display = 'none';
        
        document.body.style.transition = 'opacity 1s ease';
        document.body.style.opacity = '0';
        
        // Unload WebGL Context and Exit
        setTimeout(() => { 
            // Try to close the tab (Works natively in Spck testing environment)
            if (window.opener || window.top !== window.self) {
                window.close();
            } else {
                // Hard-kills the game engine, returning the browser to default portrait layout
                window.location.href = "about:blank"; 
            }
        }, 1000);
    });
}

// --- 2. Settings Synchronization (Mirrors existing HUD logic perfectly) ---
// Syncs the sensitivity slider in the main menu to the global setting
document.getElementById('menu-input-sensitivity').addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
        CAMERA_SENSITIVITY = val;
        document.getElementById('input-sensitivity').value = val; // Keep HUD synced
    }
});

// Map Main Menu settings buttons to their In-Game HUD counterparts
const menuSyncMap = [
    { menu: 'menu-toggle-fullscreen', hud: 'toggle-fullscreen' },
    { menu: 'menu-toggle-camera-view', hud: 'toggle-camera-view' },
    { menu: 'menu-toggle-joystick-type', hud: 'toggle-joystick-type' },
    { menu: 'menu-toggle-joystick-visible', hud: 'toggle-joystick-visible' },
    { menu: 'menu-toggle-coordinates', hud: 'toggle-coordinates' },
    { menu: 'menu-toggle-fps', hud: 'toggle-fps' }
];

menuSyncMap.forEach(sync => { 
    handleMenuTap(sync.menu, () => { 
        let mBtn = document.getElementById(sync.menu); 
        let hBtn = document.getElementById(sync.hud);
        
        // 1. Trigger the in-game HUD button's native logic
        if (hBtn) hBtn.click();
        
        // 2. Sync safely by copying the exact state from the master HUD button
        if (mBtn && hBtn) {
            if (hBtn.classList.contains('active')) {
                mBtn.classList.add('active');
            } else {
                mBtn.classList.remove('active');
            }
        }
    }); 
});


//===ENGINE.JS===//

// ============================================================================
// ENGINE.JS - THE CORE GAME LOOP
// ============================================================================
// This file drives the entire game. It contains the main rendering loop,
// entity updates, collision detection, environmental systems (day/night),
// and connects the visual state to the underlying data models.
// ============================================================================

/**
 * Checks proximity to NPCs and manages the state of the interaction UI.
 * It optimizes DOM updates by tracking previous values.
 */

function handleInteractions() {
  // STATE TRACKER: Only hit the DOM if the gold value actually changes.
  // This prevents expensive, continuous DOM repaints every single frame.
  if (window._LAST_UI_GOLD !== player.gold) {
    window._LAST_UI_GOLD = player.gold;
    // STRICT SRP: Target ONLY #gold-text. Never fall back to #ui.
    const uiEl = document.getElementById('gold-text');
    if (uiEl) uiEl.innerText = player.gold;
  }

  // Reset active NPC before calculating distances
  activeNpc = null;
  let minNpcDist = INTERACT_DISTANCE;

  // Find the closest NPC within the interactable distance threshold
  npcs.forEach(npc => {
    let nDist = Math.sqrt((player.x - npc.x) ** 2 + (player.z - npc.z) ** 2);
    if (nDist < minNpcDist) {
      activeNpc = npc;
    }
  });

  // Toggle the contextual action button based on the nearby NPC
  if (activeNpc) {
    btnAction.style.display = 'block';
    if (activeNpc.name === "Caravan Merchant") {
      btnAction.innerText = 'OPEN CARAVAN';
    } else {
      btnAction.innerText = 'TALK';
    }
    btnAction.style.backgroundColor = '#3498db'; // Highlight color indicating readiness
  } else {
    // Hide UI elements if the player walks away from the NPC
    btnAction.style.display = 'none';
    document.getElementById('dialogue-box').style.display = 'none';
  }
}

/**
 * Drains the equipped torch's durability over time.
 * If the torch burns out completely, it forcefully unequips the item
 * and fetches a backup if available.
 * @param {number} delta - Time elapsed since the last frame.
 */
function handleTorchDrain(delta) {
  if (typeof activeHotbarItem !== 'undefined' && activeHotbarItem === 'torch' && farmInventory.torch > 0) {
    // Drain 1 durability per second
    toolDurability.torch -= delta * 1.0;

    if (toolDurability.torch <= 0) {
      farmInventory.torch--;
      if (farmInventory.torch > 0) {
        toolDurability.torch = 100; // Reset for backpack reserve
      } else {
        // ALWAYS unequip visually and logically when the active tool breaks
        activeHotbarItem = null;
        if (window.updateEquippedTool) window.updateEquippedTool(null);

        // Update UI DOM safely
        const hotbarSlots = document.querySelectorAll('.hotbar-slot');
        if (hotbarSlots) hotbarSlots.forEach(s => s.classList.remove('active'));

        if (typeof hotbarMap !== 'undefined') {
          for (let i = 0; i < 4; i++) {
            if (hotbarMap[i] === 'torch') hotbarMap[i] = '';
          }
        }
      }
      if (typeof updateFarmHUD === 'function') updateFarmHUD();
    } else {
      // STATE TRACKER: Only query and update the DOM when the integer value changes
      // Prevents massive GC spikes and frame-blocking DOM repaints
      if (window._LAST_TORCH_DURABILITY !== Math.floor(toolDurability.torch)) {
        window._LAST_TORCH_DURABILITY = Math.floor(toolDurability.torch);
        if (typeof updateFarmHUD === 'function') updateFarmHUD();
      }
    }
  }
}

/**
 * Progresses the growth cycle of planted crops.
 * Growth only occurs during daytime hours.
 */
function handleCropGrowth() {
  // Define daytime as 6:00 AM (6) to 6:00 PM (18)
  let isDayTime = timeOfDay >= 6 && timeOfDay <= 18;

  farmPatches.forEach(patch => {
    // Only progress crops that are currently 'growing' and if the sun is up
    if (patch.state === 'growing' && isDayTime) {
      patch.progress++;

      // Visually scale the crop mesh based on its growth progress
      // Max scale multiplier is 0.8 to prevent it from getting too large
      let scaleRatio = (patch.progress / CROP_GROW_TIME) * 0.8;
      patch.crop.scale.set(scaleRatio, scaleRatio, scaleRatio);

      // Mark as harvestable once progress hits the threshold
      if (patch.progress >= CROP_GROW_TIME) {
        patch.state = 'grown';
      }
    }
  });
}

// Pre-allocate color object to avoid garbage collection stutter in the main loop
const SHARED_SKY_COLOR = new THREE.Color();

/**
 * Manages the transition of time, adjusting lighting and sky colors.
 * Also handles the spawning/despawning of nocturnal monsters.
 * @param {number} delta - Time elapsed since the last frame.
 */
function updateDayNightCycle(delta) {
  // Advance internal clock
  timeOfDay += timeSpeed * delta;
  if (timeOfDay >= 24) timeOfDay = 0; // Wrap around at midnight

  // Calculate sun elevation using a sine wave.
  // Shifted by 6 hours so peak sun (1.0) is at noon (12) and midnight is -1.0.
  let sunAngle = ((timeOfDay - 6) / 24) * Math.PI * 2;
  let sunHeight = Math.sin(sunAngle);

  // 1. Update Global Ambient Lighting
  if (typeof ambientLight !== 'undefined') {
    // Minimum light is 0.1 so the scene is never pitch black
    ambientLight.intensity = Math.max(0.4, sunHeight * 0.7 + 0.4);
    if (sunHeight < 0) {
      // Nighttime hue (dark bluish)
      ambientLight.color.setHex(0x444455);
    } else {
      // Daytime hue (pure white)
      ambientLight.color.setHex(0xffffff);
    }
  }

  // 2. Update Skybox Background Color based on sun height thresholds
  if (sunHeight > 0.3) {
    SHARED_SKY_COLOR.setHex(0x87CEEB); // Sky Blue (Day)
  } else if (sunHeight > -0.1) {
    SHARED_SKY_COLOR.setHex(0xfd5e53); // Orange/Red (Sunrise/Sunset)
  } else {
    SHARED_SKY_COLOR.setHex(0x050508); // Deep Black (Night)
  }
  // Smoothly transition the sky color rather than snapping instantly
  scene.background.lerp(SHARED_SKY_COLOR, delta * 0.5);

  // 3. Update Campfire/Local Lighting
  if (window.campfireLight) {
    if (sunHeight < 0) {
      // Campfire burns brighter the darker it gets (max intensity 2)
      window.campfireLight.intensity = Math.min(2, Math.abs(sunHeight) * 3);
    } else {
      // Extinguish/hide campfire light during the day
      window.campfireLight.intensity = 0;
    }
  }

  // 4. Toggle Monster Visibility based on time
  let isNight = timeOfDay > 18 || timeOfDay < 6;
  monsters.forEach(m => m.visible = isNight);
}

/**
 * The core render loop. Runs every frame, synchronized with screen refresh rate.
 */
/**
 * The core render loop. Runs every frame, synchronized with screen refresh rate.
 */
function animate() {
  requestAnimationFrame(animate);
  
  // PERFORMANCE FIX: Universal FPS Tracking (Runs even in Main Menu)
  if (typeof window._frameCount === 'undefined') {
    window._frameCount = 0;
    window._lastFpsTime = performance.now();
    window.SHOW_FPS = false;
  }
  
  window._frameCount++;
  let now = performance.now();
  if (now - window._lastFpsTime >= 1000) {
    if (window.SHOW_FPS) {
      const fpsEl = document.getElementById('fps-display');
      if (fpsEl) fpsEl.innerText = `FPS: ${window._frameCount}`;
    }
    window._frameCount = 0;
    window._lastFpsTime = now;
  }
  
  // Calculate time since last frame to ensure smooth movement regardless of framerate
  let delta = clock.getDelta();
  
  
  // ==========================================
  // UI / MENU STATE MANAGEMENT
  // ==========================================
  // STATE TRACKER: Only query and update the DOM when the state actually changes!
  if (window.GAME_STATE !== window._PREVIOUS_GAME_STATE) {
    window._PREVIOUS_GAME_STATE = window.GAME_STATE;

    const mainMenu = document.getElementById('main-menu');
    const hotbar = document.getElementById('hotbar');
    const ui = document.getElementById('ui');
    const hpUi = document.getElementById('hp-ui');

    if (window.GAME_STATE === 'MENU') {
      // Show main menu, hide game UI
      if (mainMenu) mainMenu.style.display = 'flex';
      if (hotbar) hotbar.style.display = 'none';
      if (ui) ui.style.display = 'none';
      if (hpUi) hpUi.style.display = 'none';
    } else {
      // Hide main menu, show game UI
      if (mainMenu) mainMenu.style.display = 'none';
      if (hotbar) hotbar.style.display = 'flex';
      if (ui) ui.style.display = 'block';
      if (hpUi) hpUi.style.display = 'block';
    }
  }

  // Freeze game logic and only render the background if sitting in the main menu
  if (window.GAME_STATE === 'MENU') {
    renderer.render(scene, camera);
    return;
  }

// ==========================================
// 3D ANIMATION MIXERS
// ==========================================
// Update skeletal animations (running, idle, monster walks)
if (characterMixer) characterMixer.update(delta);

// ARCHITECTURAL FIX: Iterate through all monsters to update their individual animation mixers.
// This ensures all spawned vampires animate their walk cycles correctly instead of T-posing.
if (typeof monsters !== 'undefined') {
  monsters.forEach(m => {
    if (m.userData && m.userData.mixer) {
      m.userData.mixer.update(delta);
    }
  });
}

// Process environmental changes
updateDayNightCycle(delta);

// ==========================================
// ENEMY (MONSTER) AI & MOVEMENT
// ==========================================
let isNight = timeOfDay > 18 || timeOfDay < 6;
if (isNight) {
  monsters.forEach(m => {
    if (m.userData && m.userData.speed) {
      if (!m.visible) return;
      
      // --- AI STATE MACHINE INITIALIZATION ---
      if (m.userData.phase === undefined) {
        // Assign 1 of 4 random patterns to this specific monster
        m.userData.pattern = Math.floor(Math.random() * 4);
        m.userData.phase = 0; // 0:Walk1, 1:Stop1, 2:Walk2, 3:Stop2, 4:Return, 5:Stop3
        m.userData.timer = 0;
        
        // 4 Different Patterns (15 units straight, 10 units side)
        const offsets = [
          [{ x: 0, z: 15 }, { x: 10, z: 0 }], // Pattern 0: North then East
          [{ x: 0, z: -15 }, { x: -10, z: 0 }], // Pattern 1: South then West
          [{ x: 15, z: 0 }, { x: 0, z: -10 }], // Pattern 2: East then South
          [{ x: -15, z: 0 }, { x: 0, z: 10 }] // Pattern 3: West then North
        ];
        
        let p = m.userData.pattern;
        let sx = m.userData.startX;
        let sz = m.userData.startZ;
        
        m.userData.waypoints = [
          { x: sx + offsets[p][0].x, z: sz + offsets[p][0].z }, // Waypoint 1 (15 units)
          { x: sx + offsets[p][0].x + offsets[p][1].x, z: sz + offsets[p][0].z + offsets[p][1].z }, // Waypoint 2 (10 units)
          { x: sx, z: sz } // Waypoint 3 (Return to origin)
        ];
      }
      
      // Check distance to player for attack range
      let distToPlayer = Math.sqrt((player.x - m.position.x) ** 2 + (player.z - m.position.z) ** 2);
      
      if (distToPlayer < 1.5) {
        // Attack Player
        player.hp -= 10;
        if (player.hp < 0) player.hp = 0;
        
        // Bounce the monster back slightly upon hitting the player
        m.position.x -= Math.sin(m.rotation.y) * 1.0;
        m.position.z -= Math.cos(m.rotation.y) * 1.0;
        
        // Player Death/Respawn Logic
        if (player.hp === 0) {
          player.x = -300;
          player.z = -200;
          player.hp = 100;
        }
        
        // Immediately update health bar
        if (typeof updateFarmHUD === 'function') updateFarmHUD();
      } else {
        // --- PATTERN MOVEMENT LOGIC ---
        let phase = m.userData.phase;
        
        if (phase % 2 === 1) {
          // STOPPED PHASE (1, 3, 5)
          m.userData.timer += delta;
          if (m.userData.mixer) m.userData.mixer.timeScale = 0; // Pause walk animation
          
          if (m.userData.timer > 1.0) { // Stop for 1 seconds
            m.userData.timer = 0;
            m.userData.phase = (phase + 1) % 6; // Move to next phase, loop back to 0 after 5
          }
        } else {
          // WALKING PHASE (0, 2, 4)
          if (m.userData.mixer) m.userData.mixer.timeScale = 1; // Resume walk animation
          
          let targetIndex = Math.floor(phase / 2);
          let tx = m.userData.waypoints[targetIndex].x;
          let tz = m.userData.waypoints[targetIndex].z;
          
          let dx = tx - m.position.x;
          let dz = tz - m.position.z;
          let distToTarget = Math.sqrt(dx * dx + dz * dz);
          
          if (distToTarget < 0.5) {
            // Reached waypoint, transition to stop phase
            m.userData.phase++;
          } else {
            // Move towards target and rotate to face it
            m.rotation.y = Math.atan2(dx, dz);
            m.position.x += (dx / distToTarget) * m.userData.speed;
            m.position.z += (dz / distToTarget) * m.userData.speed;
          }
        }
      }
    }
  });
}


  // ==========================================
  // PLAYER MOVEMENT & COLLISION
  // ==========================================
  const isMoving = player.moveVectorX !== 0 || player.moveVectorZ !== 0;

  if (isMoving) {
    // Resume character walk animation
    if (walkAction) walkAction.timeScale = 1;

    // Transform the 2D joystick vector into a 3D vector relative to the camera's angle.
    // This ensures pressing "up" moves the player where the camera is facing.
    let forwardX = Math.sin(player.cameraAngle);
    let forwardZ = Math.cos(player.cameraAngle);
    let rightX = Math.sin(player.cameraAngle + Math.PI / 2);
    let rightZ = Math.cos(player.cameraAngle + Math.PI / 2);

    // Calculate the intended movement direction
    let moveX = (rightX * player.moveVectorX + forwardX * player.moveVectorZ);
    let moveZ = (rightZ * player.moveVectorX + forwardZ * player.moveVectorZ);

    // Apply player speed to determine the proposed next position
    let nextX = player.x + moveX * player.speed;
    let nextZ = player.z + moveZ * player.speed;

    let colliding = false;

    // 1. Outer World Boundary Collision
    if (nextX < -1200 || nextX > 1200 || nextZ < -1200 || nextZ > 1200) colliding = true;

    // 2. Static Object Collision (Trees, Walls, Buildings)
    // Update the loop to check the physical collidables array
    if (!colliding && window.collidables) {
      for (let i = 0; i < window.collidables.length; i++) {
        let obj = window.collidables[i];
        let dist = Math.sqrt((nextX - obj.position.x) ** 2 + (nextZ - obj.position.z) ** 2);
        let colRadius = obj.userData.collisionRadius || 1.5; // FIX: Uses correct object size
        if (dist < colRadius) {
          colliding = true;
          break;
        }
      }
    }

    // 3. NPC Collision
    if (!colliding) {
      npcs.forEach(npc => {
        if (Math.sqrt((nextX - npc.x) ** 2 + (nextZ - npc.z) ** 2) < 1.5) colliding = true;
      });
    }

    // 4. Monster Collision
    if (!colliding) {
      monsters.forEach(m => {
        if (m.visible && Math.sqrt((nextX - m.position.x) ** 2 + (nextZ - m.position.z) ** 2) < 1.5) colliding = true;
      });
    }

    // Apply movement if the path is clear
    if (!colliding) {
      player.x = nextX;
      player.z = nextZ;
    }

    // Move the physical 3D mesh wrapper (builderCursor) to match data logic
    builderCursor.position.x = player.x;
    builderCursor.position.z = player.z;

    // Rotate the character model to face the direction of movement (Third Person Only)
    if (!isFirstPerson) {
      builderCursor.rotation.y = Math.atan2(moveX, moveZ);
    }
  } else {
    // Pause walk animation when standing still
    if (walkAction) walkAction.timeScale = 0;
  }

// Execute gravity/terrain height mapping (imported from world.js/controls.js)
// PERFORMANCE FIX: Only cast expensive terrain rays when the player is actively moving
if (isMoving && typeof window.snapToTerrain === 'function') {
  window.snapToTerrain();
}

  // ==========================================
  // CAMERA POSITIONING
  // ==========================================

  // In first person, lock character rotation to exactly match the camera look angle
  if (isFirstPerson) {
    builderCursor.rotation.y = player.cameraAngle + Math.PI;
  }

  let currentHeight = builderCursor.position.y;

  if (isFirstPerson) {
    builderCursor.visible = true;

    // Position camera inside/slightly above the character's head
    let headHeight = currentHeight + 3.3;
    let forwardOffset = 0.4; // Push camera slightly forward to prevent clipping into model

    let camX = player.x - Math.sin(player.cameraAngle) * forwardOffset;
    let camZ = player.z - Math.cos(player.cameraAngle) * forwardOffset;

    camera.position.set(camX, headHeight, camZ);

    // Calculate point in space 10 units away for the camera to 'look at' based on pitch/yaw
    let targetX = camera.position.x - Math.sin(player.cameraAngle) * Math.cos(player.cameraPitch) * 10;
    let targetY = camera.position.y + Math.sin(player.cameraPitch) * 10;
    let targetZ = camera.position.z - Math.cos(player.cameraAngle) * Math.cos(player.cameraPitch) * 10;

    camera.lookAt(targetX, targetY, targetZ);
  } else {
    // Third Person / Bird's Eye View
    builderCursor.visible = true;

    const camDistance = 20; // Distance from camera to player

    // Orbit math using spherical coordinates relative to the player
    let orbitX = player.x + Math.sin(player.cameraAngle) * Math.cos(player.birdsEyePitch) * camDistance;
    let orbitY = currentHeight + Math.sin(player.birdsEyePitch) * camDistance;
    let orbitZ = player.z + Math.cos(player.cameraAngle) * Math.cos(player.birdsEyePitch) * camDistance;

    camera.position.set(orbitX, orbitY, orbitZ);
    camera.lookAt(player.x, currentHeight, player.z); // Always stare at player
  }

  // Execute interaction and farming logic checks
  handleInteractions();
  handleCropGrowth();
  handleTorchDrain(delta);

  // Update Debug Coordinates UI if active

  // Update Debug Coordinates UI if active
  if (window.coordTracker) {
    let currentX = Math.round(player.x);
    let currentZ = Math.round(player.z);
    if (window._LAST_COORD_X !== currentX || window._LAST_COORD_Z !== currentZ) {
      window._LAST_COORD_X = currentX;
      window._LAST_COORD_Z = currentZ;
      window.coordTracker.innerText = ` X: ${currentX} | Z: ${currentZ}`;
    }
  }

// Final step: draw the frame to the canvas
renderer.render(scene, camera);
}


// ==========================================
// LOCAL STORAGE SAVE SYSTEM
// ==========================================
// Handles persistent data saving to the browser's localStorage API.
// Extracts critical player attributes and inventory states into a JSON string.

function saveGame() {
    const gameData = {
        gold: player.gold,
        inventory: farmInventory,
        durability: toolDurability,
        hotbar: hotbarMap,
        x: player.x,
        z: player.z,
        timeOfDay: timeOfDay
    };
    localStorage.setItem('empireSurvivalSave', JSON.stringify(gameData));
}

// Parses JSON from localStorage, safely applying defaults if values are missing or corrupt.
function loadGame() {
    const saved = localStorage.getItem('empireSurvivalSave');
    if (saved) {
        const gameData = JSON.parse(saved);
        player.gold = gameData.gold !== undefined ? gameData.gold : 50;
        farmInventory = gameData.inventory || { seeds: 5, crops: 0, axe: 0, shovel: 1, wood: 0 };
        toolDurability = gameData.durability || { axe: 10, shovel: 10 };
        hotbarMap = gameData.hotbar || ['shovel', 'seed', 'crop', 'axe'];
        player.x = gameData.x || 0;
        player.z = gameData.z || 0;
        timeOfDay = gameData.timeOfDay || 8;
        if(typeof updateFarmHUD === 'function') updateFarmHUD();
    }
}

// Automatically load game on startup
loadGame();

// Auto-save silently every 5 seconds
setInterval(saveGame, 5000);



// --- THIS MUST ALWAYS BE THE VERY LAST THING TO RUN ---
// Kickstarts the infinite recursive loop rendering the game.


animate();