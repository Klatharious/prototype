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
    // Hides items that have 0 quantity or are currently equipped in the hotbar
    const allItems = ['seed', 'crop', 'axe', 'shovel', 'wood'];
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
            nameSpan.innerText = itemType.charAt(0).toUpperCase() + itemType.slice(1); 
            nameSpan.style.display = 'block'; 
            countSpan.style.display = 'block'; 
            
            // Render Tool Durability (Axe/Shovel)
            if (itemType === 'axe' || itemType === 'shovel') {
                countSpan.innerText = farmInventory[itemType] || 0;
                if(farmInventory[itemType] > 0) {
                    if (durBg) durBg.style.display = 'block';
                    let pct = (toolDurability[itemType] / 10) * 100; // Assuming max durability is 10
                    if (durFill) {
                        durFill.style.width = pct + '%';
                        // Color-code durability bar: Green -> Yellow -> Red
                        if(pct > 50) durFill.style.background = '#2ecc71'; 
                        else if(pct > 20) durFill.style.background = '#f1c40f'; 
                        else durFill.style.background = '#e74c3c'; 
                    }
                } else {
                    if (durBg) durBg.style.display = 'none';
                }
            } else {
                // Render Standard Resource Quantities
                if (durBg) durBg.style.display = 'none';
                if (itemType === 'seed') countSpan.innerText = farmInventory.seeds;
                else if (itemType === 'crop') countSpan.innerText = farmInventory.crops;
                else countSpan.innerText = farmInventory[itemType] || 0;
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

// --- Hotbar Selection Logic ---
// Toggles the active state of hotbar slots and triggers 3D model equipping
const hotbarSlots = document.querySelectorAll('.hotbar-slot');
hotbarSlots.forEach(slot => {
    slot.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        
        if (slot.classList.contains('active')) {
            // Deselect currently active item
            slot.classList.remove('active');
            activeHotbarItem = null;
            if(window.updateEquippedTool) window.updateEquippedTool(null); 
        } else {
            // Select new item, deselect others
            hotbarSlots.forEach(s => s.classList.remove('active'));
            slot.classList.add('active');
            activeHotbarItem = slot.getAttribute('data-item');
            if(window.updateEquippedTool) window.updateEquippedTool(activeHotbarItem); 
        }
    }, false);
});

// ============================================================================
// INVENTORY DRAG AND DROP SYSTEM
// Handles moving items from the backpack into the hotbar slots.
// ============================================================================
let draggedItem = null, dragGhost = null, holdTimer = null;

document.querySelectorAll('.inv-slot').forEach(item => {
    // 1. Touch Start (Initiate Drag)
    item.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        let type = item.getAttribute('data-item');
        // Require a 300ms long-press to begin dragging (prevents accidental drags while scrolling)
        holdTimer = setTimeout(() => {
            draggedItem = type;
            dragGhost = document.createElement('div');
            dragGhost.className = 'inv-slot dragging';
            dragGhost.innerText = type.charAt(0).toUpperCase() + type.slice(1);
            document.body.appendChild(dragGhost);
            dragGhost.style.left = touch.clientX - 45 + 'px';
            dragGhost.style.top = touch.clientY - 25 + 'px';
            dragGhost.style.position = 'fixed';
            dragGhost.style.zIndex = '9999';
        }, 300); 
    }, {passive: false});

    // 2. Touch Move (Update Drag Visuals)
    item.addEventListener('touchmove', (e) => {
        if (dragGhost) {
            e.preventDefault(); 
            const touch = e.touches[0];
            // Keep the drag ghost element centered on the user's finger
            dragGhost.style.left = touch.clientX - 45 + 'px';
            dragGhost.style.top = touch.clientY - 25 + 'px';
        } else if (holdTimer) {
            // Cancel the drag initiation if the user moves their finger before 300ms
            clearTimeout(holdTimer); holdTimer = null;
        }
    }, {passive: false});

    // 3. Touch End (Process Drop Target)
    item.addEventListener('touchend', (e) => {
        if (holdTimer) clearTimeout(holdTimer);
        if (dragGhost) {
            const touch = e.changedTouches[0];
            dragGhost.remove(); dragGhost = null;
            
            // Determine what DOM element the user dropped the item onto
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            const slot = dropTarget ? dropTarget.closest('.hotbar-slot') : null;
            
            // If dropped on a valid hotbar slot, update the mapping array
            if (slot) {
                let index = slot.getAttribute('data-index');
                hotbarMap[index] = draggedItem; 
                updateFarmHUD();
            }
            draggedItem = null;
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
document.getElementById('buy-seed').addEventListener('click', () => {
    if (player.gold >= 10) { player.gold -= 10; farmInventory.seeds++; updateFarmHUD(); }
});
document.getElementById('buy-axe').addEventListener('click', () => {
    if (player.gold >= 50) { 
        player.gold -= 50; 
        farmInventory.axe++; 
        if(farmInventory.axe === 1) toolDurability.axe = 10; // Restore durability if buying first axe
        updateFarmHUD(); 
    }
});
document.getElementById('buy-shovel').addEventListener('click', () => {
    if (player.gold >= 50) { 
        player.gold -= 50; 
        farmInventory.shovel++; 
        if(farmInventory.shovel === 1) toolDurability.shovel = 10; 
        updateFarmHUD(); 
    }
});

// --- Sell Actions ---
const SELL_PRICES = { crop: 20, axe: 25, shovel: 25, seed: 5 };

document.getElementById('sell-item').addEventListener('click', () => {
    if (activeHotbarItem && farmInventory[activeHotbarItem] > 0) {
        let qty = farmInventory[activeHotbarItem];
        let price = SELL_PRICES[activeHotbarItem] || 0;
        if (price > 0) {
            player.gold += (qty * price);
            farmInventory[activeHotbarItem] = 0; 
            if (toolDurability[activeHotbarItem] !== undefined) toolDurability[activeHotbarItem] = 10;
            updateFarmHUD();
        }
    }
});

document.getElementById('sell-all-crops').addEventListener('click', () => {
    if (farmInventory.crops && farmInventory.crops > 0) {
        player.gold += farmInventory.crops * SELL_PRICES.crop;
        farmInventory.crops = 0;
        updateFarmHUD();
    }
});

document.getElementById('sell-all-items').addEventListener('click', () => {
    let totalEarned = 0;
    for (let item in SELL_PRICES) {
        if (item !== 'crop' && farmInventory[item] && farmInventory[item] > 0) {
            totalEarned += farmInventory[item] * SELL_PRICES[item];
            farmInventory[item] = 0; 
            if (toolDurability[item] !== undefined) toolDurability[item] = 10;
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
            if (toolDurability[item] !== undefined) toolDurability[item] = 10;
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

toggleCameraView.addEventListener('click', (e) => {
    e.stopPropagation();
    isFirstPerson = !isFirstPerson; // Swap between FP and Top-Down Birds Eye
    if (isFirstPerson) toggleCameraView.classList.add('active');
    else toggleCameraView.classList.remove('active');
});

toggleJoystickType.addEventListener('click', (e) => {
    e.stopPropagation();
    isJoystickFixed = !isJoystickFixed; // Swap between floating and static joystick
    if (isJoystickFixed) {
        toggleJoystickType.classList.add('active');
        joyBase.classList.add('joystick-fixed');
    } else {
        toggleJoystickType.classList.remove('active');
        joyBase.classList.remove('joystick-fixed');
        joyBase.style.display = 'none';
    }
});

toggleJoystickVisible.addEventListener('click', (e) => {
    e.stopPropagation();
    isJoystickInvisible = !isJoystickInvisible;
    if (isJoystickInvisible) {
        toggleJoystickVisible.classList.add('active');
        joyBase.classList.add('joystick-invisible');
    } else {
        toggleJoystickVisible.classList.remove('active');
        joyBase.classList.remove('joystick-invisible');
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

function handleScreenTap(clientX, clientY) {
    if (window.GAME_STATE === 'MENU') return; // Stop interaction while menu is open
    if (!activeHotbarItem) return;

    // Convert screen coordinates to Normalized Device Coordinates (NDC) for Raycaster
    let ndcX = (clientX / window.innerWidth) * 2 - 1;
    let ndcY = -(clientY / window.innerHeight) * 2 + 1;
    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    
    let target = new THREE.Vector3();
    let hitValid = false;

    // Project ray into the 3D scene to find the terrain hit point
    if (window.worldTerrain) {
        let intersects = raycaster.intersectObject(window.worldTerrain, true);
        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].object.visible) {
                target.copy(intersects[i].point);
                hitValid = true;
                break;
            }
        }
    }
    
    // Fallback: If terrain isn't loaded or missed, intersect against mathematical Y=0 plane
    if (!hitValid) {
        let plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        if (!raycaster.ray.intersectPlane(plane, target)) return;
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
            if (farmInventory.axe > 0) toolDurability.axe = 10;
            else {
                // Out of axes, unequip visually and logically
                activeHotbarItem = null;
                if(window.updateEquippedTool) window.updateEquippedTool(null);
                hotbarSlots.forEach(s => s.classList.remove('active'));
                for(let i=0; i<4; i++) if(hotbarMap[i] === 'axe') hotbarMap[i] = ''; 
            }
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
        // Plant Seed
        if (tappedPatch.state === 'empty' && activeHotbarItem === 'seed' && farmInventory.seeds > 0) {
            farmInventory.seeds--; tappedPatch.state = 'growing'; tappedPatch.progress = 0;
            let randomType = CROP_NAMES[Math.floor(Math.random() * CROP_NAMES.length)];
            
            // Clean up any old geometry before adding new crop template
            while(tappedPatch.crop.children.length > 0) tappedPatch.crop.remove(tappedPatch.crop.children[0]); 
            
            let newCrop = cropTemplates[randomType].clone();
            tappedPatch.crop.add(newCrop); tappedPatch.crop.visible = true; tappedPatch.crop.scale.set(0.1, 0.1, 0.1);
        
        // Harvest Grown Crop
        } else if (tappedPatch.state === 'grown') {
            farmInventory.crops++; tappedPatch.state = 'empty'; tappedPatch.crop.visible = false;
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
    e.preventDefault(); const touch = e.changedTouches[0]; touchRightId = touch.identifier;
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

window.snapToTerrain = function() {
    if (!window.worldTerrain || typeof builderCursor === 'undefined') return;
    
    // Cast ray from high above the player straight down
    terrainRaycaster.set(new THREE.Vector3(player.x, 10000, player.z), downVector);
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
window.coordTracker.style.marginTop = '15px';
window.coordTracker.innerText = "X: 0 | Z: 0";
if (settingsMenu) settingsMenu.appendChild(window.coordTracker);

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
    if (menu && window.GAME_STATE === 'MENU') {
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
    btn.addEventListener('click', callback);
    btn.addEventListener('touchstart', (e) => { e.preventDefault();
        callback(e); }, { passive: false });
}

// --- 1. Core Menu Navigation ---
handleMenuTap('btn-play', () => {
    document.getElementById('main-menu').style.display = 'none';
    window.GAME_STATE = 'PLAYING';
    // Make absolutely sure no modal leftovers are shown
    document.querySelectorAll('.game-modal').forEach(m => m.style.display = 'none');
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
    { menu: 'menu-toggle-joystick-visible', hud: 'toggle-joystick-visible' }
];

menuSyncMap.forEach(sync => {
    handleMenuTap(sync.menu, () => {
        let mBtn = document.getElementById(sync.menu);
        let hBtn = document.getElementById(sync.hud);
        
        // Magically trigger the original HUD button's click logic!
        hBtn.click();
        
        // Sync the visual green circle state across both UI layers
        if (mBtn.classList.contains('active')) mBtn.classList.remove('active');
        else mBtn.classList.add('active');
    });
});
