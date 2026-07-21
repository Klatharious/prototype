// ============================================================================
// HUD.JS - ISOLATED DUMMY EDITOR SYSTEM
// ============================================================================
window.IS_EDITING_HUD = false;

// The exact HTML IDs of the UI elements we are allowed to drag
const editableElements = [
 'ui', 'hp-ui', 'btn-camera', 'btn-backpack', 'btn-system-menu', 'btn-action', 'hotbar'
];

// FIX: Wipe corrupted memory on script load if it got messy previously
if (!localStorage.getItem('empire_hud_fixed')) {
 localStorage.removeItem('empire_hud_layout');
 localStorage.setItem('empire_hud_fixed', 'true');
}

window.toggleHUDMode = function(e) {
 if (e) e.preventDefault();
 window.IS_EDITING_HUD = true;
 
 // Hide Main Menu
 const menu = document.getElementById('main-menu');
 if (menu) menu.style.display = 'none';
 
 // 1. Create a transparent Editor Layer that sits on top of the entire game
 let editorLayer = document.getElementById('hud-editor-layer');
 if (!editorLayer) {
  editorLayer = document.createElement('div');
  editorLayer.id = 'hud-editor-layer';
  editorLayer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 10000; pointer-events: none;';
  document.body.appendChild(editorLayer);
 }
 editorLayer.style.display = 'block';
 editorLayer.innerHTML = ''; // Clear previous dummies
 
 // 2. Generate the Draggable Modal (Reset / Save Buttons)
 const modal = document.createElement('div');
 modal.id = 'hud-edit-modal';
 modal.className = 'draggable-dummy'; // Makes it draggable!
 modal.style.cssText = `
        position: absolute; top: 15%; left: 50%; transform: translateX(-50%);
        padding: 15px; background: rgba(0,0,0,0.9); border: 2px dashed #3498db;
        color: white; border-radius: 8px; text-align: center;
        pointer-events: auto; display: flex; flex-direction: column; gap: 10px;
        box-shadow: 0px 10px 20px rgba(0,0,0,0.8);
    `;
 modal.innerHTML = `
        <h4 style="margin:0; pointer-events:none;">Drag Me!</h4>
        <div style="display:flex; gap:10px;">
            <button id="btn-hud-reset" class="hud-btn" style="background:#e74c3c; padding:8px 12px; font-size:12px;">Reset</button>
            <button id="btn-hud-save" class="hud-btn" style="background:#2ecc71; padding:8px 12px; font-size:12px;">Save</button>
        </div>
    `;
 editorLayer.appendChild(modal);
 
 // Bind Modal Buttons
 document.getElementById('btn-hud-reset').addEventListener('click', resetHUDLayout);
 document.getElementById('btn-hud-reset').addEventListener('touchstart', resetHUDLayout, { passive: false });
 document.getElementById('btn-hud-save').addEventListener('click', saveAndExitHUD);
 document.getElementById('btn-hud-save').addEventListener('touchstart', saveAndExitHUD, { passive: false });
 
 // 3. Create Duplicate Dummy Boxes for the Original UI
 editableElements.forEach(id => {
  const realEl = document.getElementById(id);
  if (!realEl) return;
  
  // Temporarily force element visible to accurately measure its size
  let wasHidden = window.getComputedStyle(realEl).display === 'none';
  if (wasHidden) realEl.style.display = 'flex';
  
  const rect = realEl.getBoundingClientRect();
  
  if (wasHidden) realEl.style.display = 'none'; // Put it back
  
  // Create the Dummy
  const dummy = document.createElement('div');
  dummy.className = 'draggable-dummy';
  dummy.setAttribute('data-target', id);
  
  // Apply bounds and styling for the duplicate
  dummy.style.cssText = `
            position: absolute;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background-color: rgba(241, 196, 15, 0.5);
            border: 2px dashed #f1c40f;
            color: white; font-weight: bold; font-size: 14px;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto; box-sizing: border-box; text-shadow: 1px 1px 2px black;
            transform: none; margin: 0;
        `;
  dummy.innerText = id.replace('btn-', '').toUpperCase();
  editorLayer.appendChild(dummy);
 });
 
 // 4. Activate dragging logic for dummies
 bindDummyDragging();
};

// Unified dragging logic for touch and mouse
function bindDummyDragging() {
 const dummies = document.querySelectorAll('.draggable-dummy');
 let activeDummy = null;
 let startX, startY, initialLeft, initialTop;
 
 const startDrag = (e) => {
  if (e.target.tagName.toLowerCase() === 'button') return; // Don't drag if clicking Save/Reset
  e.preventDefault();
  activeDummy = e.currentTarget;
  const touch = e.type.includes('touch') ? e.touches[0] : e;
  startX = touch.clientX;
  startY = touch.clientY;
  
  // Strip CSS transforms from the modal when dragging starts so the math perfectly matches the pointer
  if (activeDummy.id === 'hud-edit-modal') {
   const rect = activeDummy.getBoundingClientRect();
   activeDummy.style.transform = 'none';
   activeDummy.style.left = rect.left + 'px';
   activeDummy.style.top = rect.top + 'px';
  }
  
  initialLeft = parseFloat(activeDummy.style.left) || 0;
  initialTop = parseFloat(activeDummy.style.top) || 0;
  activeDummy.style.zIndex = 10005;
 };
 
 const doDrag = (e) => {
  if (!activeDummy) return;
  e.preventDefault();
  const touch = e.type.includes('touch') ? e.touches[0] : e;
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;
  activeDummy.style.left = (initialLeft + dx) + 'px';
  activeDummy.style.top = (initialTop + dy) + 'px';
 };
 
 const endDrag = () => {
  if (activeDummy) activeDummy.style.zIndex = 10001;
  activeDummy = null;
 };
 
 dummies.forEach(dummy => {
  dummy.addEventListener('mousedown', startDrag);
  dummy.addEventListener('touchstart', startDrag, { passive: false });
 });
 document.addEventListener('mousemove', doDrag);
 document.addEventListener('touchmove', doDrag, { passive: false });
 document.addEventListener('mouseup', endDrag);
 document.addEventListener('touchend', endDrag);
}

function saveAndExitHUD(e) {
 if (e) e.preventDefault();
 
 let newLayout = {};
 const dummies = document.querySelectorAll('.draggable-dummy[data-target]');
 
 // Copy the absolute coordinates from the Dummies
 dummies.forEach(dummy => {
  const targetId = dummy.getAttribute('data-target');
  newLayout[targetId] = {
   top: dummy.style.top,
   left: dummy.style.left
  };
 });
 
 localStorage.setItem('empire_hud_layout', JSON.stringify(newLayout));
 
 // Hide Editor Layer & Return to Main Menu
 document.getElementById('hud-editor-layer').style.display = 'none';
 window.IS_EDITING_HUD = false;
 document.getElementById('main-menu').style.display = 'flex';
 
 applySavedLayout();
}

function resetHUDLayout(e) {
 if (e) e.preventDefault();
 localStorage.removeItem('empire_hud_layout');
 
 // Hide Editor Layer & Return to Main Menu
 document.getElementById('hud-editor-layer').style.display = 'none';
 window.IS_EDITING_HUD = false;
 
 // Force a page reload to cleanly wipe all injected styles and restore the original default UI
 window.location.reload();
}

window.applySavedLayout = function() {
 const saved = localStorage.getItem('empire_hud_layout');
 if (!saved) return;
 
 try {
  const layout = JSON.parse(saved);
  Object.keys(layout).forEach(id => {
   const el = document.getElementById(id);
   if (el) {
    // CRITICAL FIX: Erase original vector conflicts before applying custom coordinates
    el.style.bottom = 'auto';
    el.style.right = 'auto';
    el.style.transform = 'none';
    el.style.margin = '0';
    
    // Apply the saved dragged coordinates
    el.style.top = layout[id].top;
    el.style.left = layout[id].left;
   }
  });
 } catch (err) {
  console.error("Corrupted HUD layout:", err);
  localStorage.removeItem('empire_hud_layout');
 }
};

// Automatically apply custom layout on boot
window.addEventListener('load', applySavedLayout);

// ============================================================================
// CONFIG.JS - GLOBAL STATE & SETTINGS
// ============================================================================
// This file acts as the primary data store and configuration hub. It defines 
// player stats, inventory systems, environmental variables, and game state 
// flags used across engine.js, world.js, and controls.js.
// ============================================================================

// --- Movement & Camera Config ---
const MOVEMENT_SPEED = 2;            // Base velocity for player translation
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
    x: -300,
    z: -200,
    moveVectorX: 0,                  // Current movement direction on X-axis
    moveVectorZ: 0,                  // Current movement direction on Z-axis
    cameraAngle: Math.PI / 4,        // Horizontal rotation (Yaw)
    cameraPitch: 0,                  // Vertical rotation (Pitch)
    birdsEyePitch: Math.PI / 4,      // Fixed pitch for overhead camera mode
    speed: MOVEMENT_SPEED,
    gold: 50,
    hp: 100
};

// --- World Interaction ---
const INTERACT_DISTANCE = 4.5;       // Radial distance within which player can trigger NPCs/Objects

// --- Mobile Control Config ---
let isJoystickFixed = false;         // Determines if joystick stays at origin or follows touch
let isJoystickInvisible = false;     // Visibility toggle for touch UI

// --- Inventory & Hotbar System ---
let hotbarMap = ['shovel', 'tomato_seed', 'crop', 'torch']; // Slots definition
let activeHotbarItem = 'shovel';                   // Currently selected tool/item ID

let farmInventory = { 
    tomato_seed: 5, corn_seed: 0, carrot_seed: 0, wheat_seed: 0, 
    tomato: 0, corn: 0, carrot: 0, wheat: 0, 
    axe: 0, shovel: 1, wood: 0, torch: 1 
}; 


let toolDurability = { axe: 20, shovel: 20, torch: 100};      // Tracks usage before tool breakage

// --- Farming System ---
const CROP_GROW_TIME = 200;          // Seconds required for a crop to transition to harvestable state
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
let timeSpeed = 0.3;                 // Progression rate of the in-game clock

// --- Game Engine Lifecycle ---
// Valid states: 'MENU', 'PLAYING', 'PAUSED', 'DIALOGUE', 'SHOP'
window.GAME_STATE = 'MENU';

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
    'land.glb', 
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
    'singletree.glb',
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

        
        
        /**
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
                health: 3,             // Standard chop iterations required to extract wood resources
                respawnTimer: 3000,   // Delay flag parameter allocated for respawn intervals
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
            window.spawnTree(0, -1149, -420);
            window.spawnTree(0, -1151, -403);
            window.spawnTree(0, -1162, -409);
            window.spawnTree(0, -1160, -412);
            window.spawnTree(0, -1163, -415);
            window.spawnTree(0, -1135, -425);
            
            //
            window.spawnTree(0, -1160, -412);
            window.spawnTree(0, -1155, -412);
            window.spawnTree(0, -1150, -412);
            window.spawnTree(0, -1145, -412);
            window.spawnTree(0, -1140, -412);
            window.spawnTree(0, -1135, -412);
            window.spawnTree(0, -1131, -412);
            
            //
            window.spawnTree(0, -1160, -387);
            window.spawnTree(0, -1155, -387);
            window.spawnTree(0, -1150, -387);
            window.spawnTree(0, -1145, -387);
            window.spawnTree(0, -1140, -387);
            window.spawnTree(0, -1135, -387);
            window.spawnTree(0, -1130, -387);
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
campfireGroup.position.set(5, -770, -419); // Spawn offset coordinate point placeholder
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

fbxLoader.load('environment/campfire.fbx', (object) => {
 campfireGroup.remove(fireCube); // Pop out emergency primitive box once data arrives safely
 object.scale.set(0.01, 0.01, 0.01);
 campfireGroup.add(object);
}, undefined, () => console.log("Waiting for campfire model..."));

// --- Execute Startup Routines ---
// Synchronize visual state flags with inventory vectors on program execution start
window.updateEquippedTool(activeHotbarItem);



// ============================================================================
// CONTROLS.JS - INPUT TRACKING SYSTEM & UI MANAGER
// ============================================================================
// This file handles all player inputs (touch, keyboard, mouse), manages the UI/HUD 
// elements, processes inventory management (drag-and-drop), and drives the raycasting 
// logic for interacting with the 3D world (farming, chopping, fighting, building).
// ============================================================================

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

// ============================================================================
// UI & INVENTORY MANAGEMENT
// ============================================================================

/**
 * Synchronizes the visual HTML HUD with the underlying game state data.
 * Updates player HP, backpack inventory slots, hotbar items, tool durability bars,
 * and gold balances across both the HUD and the Shop UI.
 */
window.updateFarmHUD = function() {
    // Update Player HP
    let hpText = document.getElementById('hp-text');
    if (hpText) hpText.innerText = player.hp;

    // Refresh Backpack Inventory
    const allItems = [
        'tomato_seed', 'corn_seed', 'carrot_seed', 'wheat_seed', 
        'tomato', 'corn', 'carrot', 'wheat', 
        'axe', 'shovel', 'wood', 'torch'
    ];

    
    allItems.forEach(item => {
        let invSlot = document.querySelector(`.inv-slot[data-item="${item}"]`);
        if (invSlot) {
            if (hotbarMap.includes(item) || !farmInventory[item] || farmInventory[item] <= 0) {
                invSlot.style.display = 'none'; 
            } else {
                invSlot.style.display = 'flex'; 
                let badge = document.getElementById(`inv-${item}`);
                if (badge) badge.innerText = farmInventory[item] || 0;
            }
        }
    });
    
    // Refresh Hotbar Slots (0 through 3)
    for (let i = 0; i < 4; i++) {
        let itemType = hotbarMap[i];
        let slot = document.getElementById('hb-' + i);
        let nameSpan = document.getElementById('hb-name-' + i);
        let countSpan = document.getElementById('hb-count-' + i);
        let durBg = slot.querySelector('.durability-bg');
        let durFill = document.getElementById('hb-durability-' + i);
        
        if (itemType) {
            slot.setAttribute('data-item', itemType);
            // Format "tomato_seed" to "Tomato Seed" cleanly
            nameSpan.innerText = itemType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); 
            nameSpan.style.display = 'block'; 

            
            // Render Tool Durability (Axe/Shovel/Torch)
            if (itemType === 'axe' || itemType === 'shovel' || itemType === 'torch') {
                countSpan.style.display = 'none'; // Hide live counter for tools
               
                if(farmInventory[itemType] > 0) {
                    if (durBg) durBg.style.display = 'block';
                    
                    // Dynamically calculate based on tool type to prevent UI bleed
                    let maxDurability = (itemType === 'torch') ? 100 : 20;
                    let pct = Math.min((toolDurability[itemType] / maxDurability) * 100, 100); 


                    if (durFill) {
                        durFill.style.width = pct + '%';
                        // Color-code durability bar: Green -> Yellow -> Red
                        if(pct > 50) durFill.style.background = '#2ecc71'; 
                        else if(pct > 20) durFill.style.background = '#f1c40f'; 
                        else durFill.style.background = '#e74c3c'; 
                    
                } else {
                    if (durBg) durBg.style.display = 'none';
                }
            }                       } else {
                // Render Standard Resource Quantities
                if (durBg) durBg.style.display = 'none';
                countSpan.innerText = farmInventory[itemType] || 0;
            }


        } else {
            // Empty Hotbar Slot
            slot.setAttribute('data-item', '');
            nameSpan.innerText = '';
            nameSpan.style.display = 'none';
            countSpan.innerText = '';
            countSpan.style.display = 'none';
            if(durBg) durBg.style.display = 'none';
        }
    }
    
    // Update Currency Displays
    let caravanGold = document.getElementById('ui');
    if (caravanGold) caravanGold.innerText = 'Gold: ' + player.gold;
    
    let shopGold = document.getElementById('caravan-gold');
    if (shopGold) shopGold.innerText = player.gold;
};


// --- Hotbar Selection & Drag-and-Drop System ---

const hotbarSlots = document.querySelectorAll('.hotbar-slot');
const allDraggables = document.querySelectorAll('.inv-slot, .hotbar-slot');

let draggedItem = null, dragGhost = null, holdTimer = null, dragSourceSlot = null;

let dragStartX = 0, dragStartY = 0, dragTouchID = null;


            allDraggables.forEach(item => {
                // 1. Touch Start (Initiate Drag or Tap)
                item.addEventListener('touchstart', (e) => {
                    const touch = e.changedTouches[0];
                    let type = item.getAttribute('data-item');
                    if (!type) return; // Do nothing if slot is completely empty
                    
                    // Lock onto the exact finger tapping the item
                    dragStartX = touch.clientX;
                    dragStartY = touch.clientY;
                    dragTouchID = touch.identifier;
                    
                    // 300ms hold timer to pick up the item for dragging
                    holdTimer = setTimeout(() => {
                        draggedItem = type;
                        dragSourceSlot = item;
                        
                        dragGhost = document.createElement('div');
                        dragGhost.className = 'inv-slot dragging';
                        dragGhost.innerText = type.charAt(0).toUpperCase() + type.slice(1);
                        document.body.appendChild(dragGhost);
                        
                        dragGhost.style.left = dragStartX - 45 + 'px';
                        dragGhost.style.top = dragStartY - 25 + 'px';
                        dragGhost.style.position = 'fixed';
                        dragGhost.style.zIndex = '9999';
                    }, 300); 
                }, {passive: false});

                // 2. Touch Move (Update Drag Visuals or Cancel Tap)
                item.addEventListener('touchmove', (e) => {
                    // Extract only the specific finger assigned to this inventory slot
                    let touch = null;
                    for (let i = 0; i < e.changedTouches.length; i++) {
                        if (e.changedTouches[i].identifier === dragTouchID) {
                            touch = e.changedTouches[i];
                            break;
                        }
                    }
                    if (!touch) return; // Ignore multi-touch bleed from joystick/camera
                    
                    if (dragGhost) {
                        e.preventDefault(); // Stop screen scrolling while dragging an item
                        dragGhost.style.left = touch.clientX - 45 + 'px';
                        dragGhost.style.top = touch.clientY - 25 + 'px';
                    } else if (holdTimer) {
                        // 15px Deadzone: Only cancel tap if the finger actually swipes
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
            
            // QUICK TAP LOGIC: If we didn't drag, and it's a hotbar slot, select/equip it!
            if (!dragGhost && item.classList.contains('hotbar-slot')) {
                e.preventDefault(); // Prevents mobile from firing duplicate 'click' event
                
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
        
        // DROP LOGIC: We successfully dragged an item and released it
        if (dragGhost) {
            e.preventDefault(); 
            const touch = e.changedTouches[0];
            dragGhost.remove(); 
            dragGhost = null;
            
            // Determine what DOM element the user dropped the item onto
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetHotbar = dropTarget ? dropTarget.closest('.hotbar-slot') : null;
            const targetBackpack = dropTarget ? dropTarget.closest('.backpack-grid, .inv-slot') : null;
            
            if (targetHotbar) {
                let targetIndex = targetHotbar.getAttribute('data-index');
                if (dragSourceSlot.classList.contains('hotbar-slot')) {
                    // SWAP: Hotbar slot to another Hotbar slot
                    let sourceIndex = dragSourceSlot.getAttribute('data-index');
                    let temp = hotbarMap[targetIndex];
                    hotbarMap[targetIndex] = draggedItem;
                    hotbarMap[sourceIndex] = temp;
                } else {
                    // EQUIP: Backpack to Hotbar slot
                    hotbarMap[targetIndex] = draggedItem; 
                }
            } else if (targetBackpack && dragSourceSlot.classList.contains('hotbar-slot')) {
                // UNEQUIP: Hotbar to Backpack
                let sourceIndex = dragSourceSlot.getAttribute('data-index');
                hotbarMap[sourceIndex] = '';
                
                // If we unequipped the item we are currently holding visually, remove it
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


// --- Modal Open/Close Handlers ---
document.getElementById('btn-backpack').addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation(); updateFarmHUD();
    document.getElementById('backpack-modal').style.display = 'flex';
});

document.getElementById('close-backpack').addEventListener('click', () => {
    document.getElementById('backpack-modal').style.display = 'none';
});

document.getElementById('close-caravan').addEventListener('click', () => {
    document.getElementById('caravan-modal').style.display = 'none';
});

// ============================================================================
// CARAVAN MERCHANT / SHOP LOGIC
// ============================================================================
const tabBuy = document.getElementById('tab-buy');
const tabSell = document.getElementById('tab-sell');
const secBuy = document.getElementById('caravan-buy-section');
const secSell = document.getElementById('caravan-sell-section');

// Tab Switching
tabBuy.addEventListener('click', () => {
    secBuy.style.display = 'flex'; 
    secSell.style.display = 'none';
    tabBuy.style.backgroundColor = '#2ecc71';
    tabSell.style.backgroundColor = 'transparent';
});

tabSell.addEventListener('click', () => {
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
    let btn = document.getElementById(`buy-${shopItem.id}`);
    if (btn) {
        btn.addEventListener('click', () => {
            if (player.gold >= shopItem.price) { 
                player.gold -= shopItem.price; 
                farmInventory[shopItem.item] = (farmInventory[shopItem.item] || 0) + 1; 
                updateFarmHUD(); 
            }
        });
    }
});

document.getElementById('buy-axe').addEventListener('click', () => {
    if (player.gold >= 50) { 
        player.gold -= 50; 
        farmInventory.axe++; 
        if(farmInventory.axe === 1) toolDurability.axe = 20; 
        updateFarmHUD(); 
    }
});
document.getElementById('buy-shovel').addEventListener('click', () => {
    if (player.gold >= 50) { 
        player.gold -= 50; 
        farmInventory.shovel++; 
        if(farmInventory.shovel === 1) toolDurability.shovel = 20; 
        updateFarmHUD(); 
    }
});

// --- Sell Actions ---
const SELL_PRICES = { 
    tomato: 15, corn: 20, carrot: 25, wheat: 30, 
    tomato_seed: 5, corn_seed: 8, carrot_seed: 10, wheat_seed: 12, 
    axe: 25, shovel: 25, torch: 10 
};

document.getElementById('sell-item').addEventListener('click', () => { 
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

document.getElementById('sell-all-crops').addEventListener('click', () => {
    let totalEarned = 0;
    const cropTypes = ['tomato', 'corn', 'carrot', 'wheat'];
    cropTypes.forEach(crop => {
        if (farmInventory[crop] && farmInventory[crop] > 0) {
            totalEarned += farmInventory[crop] * SELL_PRICES[crop];
            farmInventory[crop] = 0;
        }
    });
    if (totalEarned > 0) {
        player.gold += totalEarned;
        updateFarmHUD();
    }
});

document.getElementById('sell-all-items').addEventListener('click', () => {
    let totalEarned = 0;
    const cropTypes = ['tomato', 'corn', 'carrot', 'wheat'];
    for (let item in SELL_PRICES) {
        if (!cropTypes.includes(item) && farmInventory[item] && farmInventory[item] > 0) {
            totalEarned += farmInventory[item] * SELL_PRICES[item];
            farmInventory[item] = 0; 
            if (toolDurability[item] !== undefined) toolDurability[item] = (item === 'torch') ? 100 : 20;
        }
    }
    if (totalEarned > 0) {
        player.gold += totalEarned;
        updateFarmHUD();
    }
});

document.getElementById('sell-everything').addEventListener('click', () => {
    let totalEarned = 0;
    for (let item in SELL_PRICES) {
        if (farmInventory[item] && farmInventory[item] > 0) {
            totalEarned += farmInventory[item] * SELL_PRICES[item];
            farmInventory[item] = 0; 
            if (toolDurability[item] !== undefined) toolDurability[item] = (item === 'torch') ? 100 : 20;
        }
    }
    if (totalEarned > 0) {
        player.gold += totalEarned;
        updateFarmHUD();
    }
});

document.getElementById('close-sell').addEventListener('click', () => {
    document.getElementById('caravan-modal').style.display = 'none';
});

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

btnSystemMenu.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation();
    systemMenu.style.display = 'flex';
}, false);

const closeSystemMenu = (e) => {
    if(e) { e.preventDefault(); e.stopPropagation(); }
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
    if(e) { e.preventDefault(); e.stopPropagation(); }
    isFirstPerson = !isFirstPerson; 
    if (isFirstPerson) toggleCameraView.classList.add('active'); 
    else toggleCameraView.classList.remove('active'); 
};
toggleCameraView.addEventListener('touchstart', handleCameraToggle, { passive: false });
toggleCameraView.addEventListener('click', handleCameraToggle);

const handleJoystickTypeToggle = (e) => {
    if(e) { e.preventDefault(); e.stopPropagation(); }
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
    if(e) { e.preventDefault(); e.stopPropagation(); }
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

// --- Left Pad: Movement Joystick ---
padLeft.addEventListener('touchstart', (e) => {
            if (window.IS_EDITING_HUD) return;
            e.preventDefault();
            settingsMenu.style.display = 'none';
            
    const touch = e.changedTouches[0];
    touchLeftId = touch.identifier;
    
    // Determine joystick origin center
    if (isJoystickFixed) {
        const rect = joyBase.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
    } else {
        startX = touch.clientX; startY = touch.clientY;
        joyBase.style.display = 'block'; joyBase.style.left = startX + 'px'; joyBase.style.top = startY + 'px';
    }
    joyKnob.style.transform = 'translate(-50%, -50%)';
}, false);

padLeft.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchLeftId) {
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
    e.preventDefault(); touchLeftId = null; player.moveVectorX = 0; player.moveVectorZ = 0;
    joyKnob.style.transform = 'translate(-50%, -50%)';
    if (!isJoystickFixed) joyBase.style.display = 'none';
};

padLeft.addEventListener('touchend', clearLeftTrack, false);
padLeft.addEventListener('touchcancel', clearLeftTrack, false);

// ============================================================================
// WORLD INTERACTION / RAYCASTING
// Central logic for tapping the screen to build, chop, farm, or attack.
// ============================================================================

const SHARED_WALL_GEO = new THREE.BoxGeometry(2, 3, 0.5);
const SHARED_WALL_MAT = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });

// PERFORMANCE FIX: Zero-Allocation Object Pool for screen tapping
const TAP_RAYCASTER = new THREE.Raycaster();
const TAP_TARGET = new THREE.Vector3();
const TAP_VEC2 = new THREE.Vector2();

function handleScreenTap(clientX, clientY) {
    if (window.GAME_STATE === 'MENU') return; // Stop interaction while menu is open
    if (!activeHotbarItem) return;

    // Convert screen coordinates to Normalized Device Coordinates (NDC) for Raycaster
    TAP_VEC2.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    TAP_RAYCASTER.setFromCamera(TAP_VEC2, camera);
    
    let target = TAP_TARGET;
    let hitValid = false;

    // 1. FIRST: Check if the player tapped a physical object (like a tall tree trunk)
    if (window.collidables) {
        let colIntersects = TAP_RAYCASTER.intersectObjects(window.collidables, true);

        for (let i = 0; i < colIntersects.length; i++) {
            if (colIntersects[i].object.position.y > -500) { // Ignore deleted/chopped objects
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
        if (m.visible && Math.sqrt((placeX - m.position.x)**2 + (placeZ - m.position.z)**2) < 3.0) {
            tappedMonsterIndex = i; break;
        }
    }

    if (tappedMonsterIndex !== -1 && activeHotbarItem === 'axe') {
        let m = monsters[tappedMonsterIndex];
        m.visible = false;
        m.position.y = -1000; // Banished to the shadow realm (removes from active pool)
        player.gold += window.MONSTER_KILL_REWARD || 5; // FIX: Dynamic Monster Loot!

        updateFarmHUD();
        return; // Stop interaction here, prioritize killing over chopping/farming
    }

    // --- 2. CHECK FOR TREE CHOPPING ---
    let tappedTreeIndex = -1;
    if (window.treePositions) {
        for (let i = 0; i < window.treePositions.length; i++) {
            let t = window.treePositions[i];
            // Uses radius + 1.5 buffer for easier tapping
            if (t && Math.sqrt((placeX - t.x)**2 + (placeZ - t.z)**2) < (t.radius || 2.5) + 1.5) {
                tappedTreeIndex = i; break;
            }
        }
    }

    if (tappedTreeIndex !== -1 && activeHotbarItem === 'axe' && farmInventory.axe > 0) {
        toolDurability.axe--;
        farmInventory.wood = (farmInventory.wood || 0) + 3; // Give 3 Wood upon harvest
        
        let tx = window.treePositions[tappedTreeIndex].x;
        let tz = window.treePositions[tappedTreeIndex].z;
        
        // Hide visually by finding it in spawnedTrees (bypasses the double-push bug in Instancing)
        if (window.spawnedTrees) {
            window.spawnedTrees.forEach(st => {
                if (st.position && Math.abs(st.position.x - tx) < 0.1 && Math.abs(st.position.z - tz) < 0.1) {
                    if (st.updateY) st.updateY(-1000);
                    else st.position.y = -1000;
                }
            });
        }
        
        // Remove physical collider & mark as chopped by moving it away
        if (window.collidables[tappedTreeIndex]) window.collidables[tappedTreeIndex].position.y = -1000;
        window.treePositions[tappedTreeIndex] = {x: 9999, z: 9999};

        // Break Axe logic
        if (toolDurability.axe <= 0) {
            farmInventory.axe--;
            if (farmInventory.axe > 0) toolDurability.axe = 20; // Reset for backpack reserve
            
            // ALWAYS unequip visually and logically when the active tool breaks
            activeHotbarItem = null;
            if (window.updateEquippedTool) window.updateEquippedTool(null);
            hotbarSlots.forEach(s => s.classList.remove('active'));
            for (let i = 0; i < 4; i++)
                if (hotbarMap[i] === 'axe') hotbarMap[i] = '';
        }
        updateFarmHUD();
        return; 
    }
    
    // --- 3. CHECK FOR BASE BUILDING (Placing Wooden Walls) ---
    if (activeHotbarItem === 'wood' && farmInventory.wood > 0) {
        farmInventory.wood--;
        
        const wall = new THREE.Mesh(SHARED_WALL_GEO, SHARED_WALL_MAT);
        
        // Snap rotation orthogonally based on player facing direction (Yaw)
        if (Math.abs(Math.sin(player.cameraAngle)) > Math.abs(Math.cos(player.cameraAngle))) {
            wall.rotation.y = Math.PI / 2; // Face X axis
        }
        
        wall.position.set(placeX, target.y + 1.5, placeZ);
        scene.add(wall);
        
        window.collidables = window.collidables || [];
        window.collidables.push(wall); // Make it solid so vampires hit it!
        
        updateFarmHUD();
        return;
    }

    // --- 4. CHECK FOR FARMING (Planting, Harvesting, Shoveling) ---
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
                if (oldChild.geometry) oldChild.geometry.dispose();
                if (oldChild.material) {
                    if (Array.isArray(oldChild.material)) oldChild.material.forEach(m => m.dispose());
                    else oldChild.material.dispose();
                }
                tappedPatch.crop.remove(oldChild);
            }
            
            
            // Auto-unequip if out of seeds
            if (farmInventory[activeHotbarItem] <= 0) {
                let emptyItem = activeHotbarItem;
                activeHotbarItem = null;
                if (window.updateEquippedTool) window.updateEquippedTool(null);
                hotbarSlots.forEach(s => s.classList.remove('active'));
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
            farmInventory[cropYield] = (farmInventory[cropYield] || 0) + 1;
            
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
                    toolDurability.shovel = 10; 
                } else {
                    activeHotbarItem = null;
                    if(window.updateEquippedTool) window.updateEquippedTool(null);
                    hotbarSlots.forEach(s => s.classList.remove('active'));
                    for(let i=0; i<4; i++) if(hotbarMap[i] === 'shovel') hotbarMap[i] = ''; 
                }
            }
        }
    }
    updateFarmHUD();
}

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
            // --- ADD + 0.5 TO THESE TWO LINES! --- (elevates player slightly above geometry)
            builderCursor.position.y = groundHeight + 0.5;
            
            // Save this as our new "safe" spot
            player.lastValidX = player.x;
            player.lastValidZ = player.z;
            player.lastValidY = groundHeight + 0.5;
        }
    }
};

// Debug Coordinate Tracker UI
window.coordTracker = document.createElement('div');
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
padRight.addEventListener('mousedown', (e) => {
    mouseRightDown = true;
    lastMouseX = e.clientX; lastMouseY = e.clientY;
    rightMouseStartX = e.clientX; rightMouseStartY = e.clientY;
    rightMouseStartTime = Date.now();
});

window.addEventListener('mousemove', (e) => {
    if (!mouseRightDown) return;
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
});

window.addEventListener('mouseup', (e) => {
    if (!mouseRightDown) return;
    mouseRightDown = false;
    
    // A quick click (not a drag) on the right pane places/interacts, same as a tap
    if ((Date.now() - rightMouseStartTime) < 250 &&
        Math.sqrt((e.clientX - rightMouseStartX) ** 2 + (e.clientY - rightMouseStartY) ** 2) < 15) {
        handleScreenTap(e.clientX, e.clientY);
    }
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

btnSystemMenu.addEventListener('click', (e) => {
    e.preventDefault();
    systemMenu.style.display = 'flex';
});

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

        // Hide all in‑game modals just in case
        document.querySelectorAll('.game-modal').forEach(m => m.style.display = 'none');
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
        if(e) e.preventDefault();
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
    { menu: 'menu-toggle-coordinates', hud: 'toggle-coordinates' } // Hooked up the new Coordinates toggle!
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


// GLOBAL TOUCH-TO-CLICK DELEGATOR
// Fixes UI buttons not responding when another finger is holding the joystick.
// On mobile, preventDefault() on the joystick suppresses native click events.
// ============================================================================
document.addEventListener('touchstart', (e) => {
            if (window.IS_EDITING_HUD) return; // FIX: Ensure proxy delegator is entirely disabled during edits
            
            const clickable = e.target.closest('button, .hud-btn, .menu-btn, .toggle-circle');
    
    // Ignore joystick areas and hotbar/inventory slots (which have their own touch logic)
    if (clickable && !clickable.id.includes('touch-left') && !clickable.id.includes('touch-right') &&
        !clickable.classList.contains('hotbar-slot') && !clickable.classList.contains('inv-slot')) {
        
        // Add a slight delay to allow any native event to process first
        setTimeout(() => {
            clickable.click();
        }, 50);
        
    }
}, { passive: true });

// Re-apply saved HUD layout for elements generated purely in JS (like coordTracker)
if (typeof applySavedLayout === 'function') {
    applySavedLayout();
}

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
        const uiEl = document.getElementById('ui');
        if (uiEl) uiEl.innerText = 'Gold: ' + player.gold;
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
 * Progresses the growth cycle of planted crops.
 * Growth only occurs during daytime hours.
 */
 
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
        ambientLight.intensity = Math.max(0.1, sunHeight * 0.8 + 0.1);
        if (sunHeight < 0) {
            // Nighttime hue (dark bluish)
            ambientLight.color.setHex(0x222233);
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
function animate() {
    requestAnimationFrame(animate);
    
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
    if (monsterMixer) monsterMixer.update(delta);
    
    // Process environmental changes
    updateDayNightCycle(delta);
    
    // ==========================================
    // ENEMY (MONSTER) AI & MOVEMENT
    // ==========================================
    let isNight = timeOfDay > 18 || timeOfDay < 6;
    if (isNight) {
        monsters.forEach(m => {
            if (m.userData && m.userData.speed) {
                // Calculate next position based on internal speed and direction
                if(!m.visible) return;
                let nextZ = m.position.z + m.userData.speed * m.userData.direction;
                
                // Check distance to player for attack range
                let distToPlayer = Math.sqrt((player.x - m.position.x) ** 2 + (player.z - nextZ) ** 2);
                
                if (distToPlayer < 1.5) {
                    // Attack Player
                    player.hp -= 10;
                    if (player.hp < 0) player.hp = 0;
                    
                    // Bounce the monster back/turn around upon hitting the player
                    m.userData.direction *= -1;
                    m.rotation.y += Math.PI;


                    // Player Death/Respawn Logic
                    
        //DEATH SPAWNER
                    
                    if (player.hp === 0) {
                        player.x = 0;
                        player.z = 0;
                        player.hp = 100;
                    }
                    
                    // Immediately update health bar
                    if (typeof updateFarmHUD === 'function') updateFarmHUD();
                } else {
                    // Normal Patrol Movement
                    m.position.z = nextZ;
                    
                    // Turn around if patrolling beyond 10 units from spawn origin
                    if (Math.abs(m.position.z - m.userData.startZ) > 10) {
                        m.userData.direction *= -1;
                        m.rotation.y += Math.PI;
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
        if (nextX < -2000 || nextX > 2000 || nextZ < -2000 || nextZ > 2000) colliding = true;
        
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
    if (typeof window.snapToTerrain === 'function') {
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
        
        const camDistance = 15; // Distance from camera to player
        
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
    if (window.coordTracker) window.coordTracker.innerText = ` X: ${Math.round(player.x)} | Z: ${Math.round(player.z)}`;
    
    // Final step: draw the frame to the canvas
    renderer.render(scene, camera);
}


/*

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

*/

// --- THIS MUST ALWAYS BE THE VERY LAST THING TO RUN ---
// Kickstarts the infinite recursive loop rendering the game.
animate();
