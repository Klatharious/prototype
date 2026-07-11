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
    
    // Update Debug Coordinates UI if active
    if (window.coordTracker) window.coordTracker.innerText = `Your Location - X: ${Math.round(player.x)} | Z: ${Math.round(player.z)}`;
    
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
