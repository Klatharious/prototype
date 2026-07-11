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
    x: 0,
    z: 0,
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
let hotbarMap = ['shovel', 'seed', 'crop', 'axe']; // Slots definition
let activeHotbarItem = 'shovel';                   // Currently selected tool/item ID

let farmInventory = { seeds: 5, crops: 0, axe: 1, shovel: 1, wood: 0 }; 
let toolDurability = { axe: 20, shovel: 20 };      // Tracks usage before tool breakage

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
let timeSpeed = 0.1;                 // Progression rate of the in-game clock

// --- Game Engine Lifecycle ---
// Valid states: 'MENU', 'PLAYING', 'PAUSED', 'DIALOGUE', 'SHOP'
window.GAME_STATE = 'MENU';
