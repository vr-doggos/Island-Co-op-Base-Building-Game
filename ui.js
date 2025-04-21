// ui.js

import * as C from './config.js';
import * as U from './utils.js';

// Import necessary game state and functions.
// Using dynamic imports for functions called from UI event handlers to potentially mitigate circular dependency issues.
// Direct imports for state that ui.js reads frequently.
import { player, keysPressed, isGameOver, gameHasStarted, gamePaused, isCraftingMenuOpen, isUpgraderUIOpen, selectedUpgradeInput, isMinimapVisible, bosses, cameraX, cameraY } from './game.js';

console.log("--- ui.js loading ---");

// --- DOM Elements ---
export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');
export const healthValueSpan = document.getElementById('healthValue');
export const maxHealthValueSpan = document.getElementById('maxHealthValue');
export const hungerValueSpan = document.getElementById('hungerValue');
export const dayValueSpan = document.getElementById('dayValue');
export const levelValueSpan = document.getElementById('levelValue');
export const xpValueSpan = document.getElementById('xpValue');
export const debugDiv = document.getElementById('debug');
export const mainHotbarSlots = document.querySelectorAll('#hotbar .hotbar-slot');
export const deathMessageDiv = document.getElementById('deathMessage');
export const craftingMenuDiv = document.getElementById('craftingMenu');
export const craftingMenuTitle = document.getElementById('craftingMenuTitle');
export const closeCraftingButton = document.getElementById('closeCraftingButton');
export const timeUIDiv = document.getElementById('timeUI');
export const minionInfoBar = document.getElementById('minionInfoBar');
// Class Selection Elements
const classSelectionOverlay = document.getElementById('classSelectionOverlay');
const classSelect = document.getElementById('classSelect');
const startGameButton = document.getElementById('startGameButton');
// Perk Selection Elements
export const levelPerkOverlay = document.getElementById('levelPerkOverlay'); // Export needed by game.js applyPerkChoice
const perkDescription = document.getElementById('perkDescription');
const perkChoice1Button = document.getElementById('perkChoice1Button');
const perkChoice2Button = document.getElementById('perkChoice2Button');
// Weapon Choice Elements
export const weaponChoiceOverlay = document.getElementById('weaponChoiceOverlay'); // Export needed by game.js handleWeaponChoice
const weaponChoiceTitle = document.getElementById('weaponChoiceTitle');
const weapon1Name = document.getElementById('weapon1Name');
const weapon1Desc = document.getElementById('weapon1Desc');
const weapon2Name = document.getElementById('weapon2Name');
const weapon2Desc = document.getElementById('weapon2Desc');
const weaponChoice1Button = document.getElementById('weaponChoice1Button');
const weaponChoice2Button = document.getElementById('weaponChoice2Button');
// Pet Choice Elements
export const petChoiceOverlay = document.getElementById('petChoiceOverlay'); // Export needed by game.js applyPetChoice
const petChoice1Button = document.getElementById('petChoice1Button');
const petChoice2Button = document.getElementById('petChoice2Button');
const petChoice3Button = document.getElementById('petChoice3Button');
const petChoice4Button = document.getElementById('petChoice4Button');
const petChoice5Button = document.getElementById('petChoice5Button');
// Upgrade Button (already integrated in crafting menu)
const integratedUpgradeButton = document.getElementById('upgradeItemButton');

// Ensure core elements exist
if (!canvas || !ctx || !craftingMenuDiv || !classSelectionOverlay) {
    console.error("CRITICAL UI ERROR: Core DOM elements not found!");
    alert("Error initializing UI. Please check console.");
}


// --- UI State ---
export let mouseCanvasX = 0;
export let mouseCanvasY = 0;
export let worldMouseX = 0;
export let worldMouseY = 0;
export let isMouseDown = false; // Track mouse button state locally for triggering game actions

// --- Input Handling ---
document.addEventListener('keydown', async (event) => { // Use async for dynamic imports
    // Use imported game state flags directly where possible
    if (isGameOver || !gameHasStarted || gamePaused) return;

    const key = event.key.toLowerCase();
    const code = event.code;
    const game = await import('./game.js'); // Load game module for actions/state modification

    if (key === 'e') {
        toggleCraftingMenu(); // Call the toggle function (exported from this file)
        game.keysPressed[key] = false; // Update shared keysPressed state
        return;
    }
    if (key === 'escape') {
        if (game.isCraftingMenuOpen) { // Use imported flag
            toggleCraftingMenu();
        }
        game.keysPressed[key] = false;
        return;
    }

    // Don't process game keys if menu is open (check again after potential toggle)
    if (game.isCraftingMenuOpen) return;

    if (key === 'm') {
        // Toggle minimap visibility - managed within UI module
        game.isMinimapVisible = !game.isMinimapVisible; // Modify game state directly (alternative: call a function in game.js)
        console.log(`Minimap toggled: ${game.isMinimapVisible ? 'ON' : 'OFF'}`);
        game.keysPressed[key] = false;
        event.preventDefault();
        return;
    }

    if (code === 'Space') {
        game.handleSpacebarPress(); // Call action function from game.js
        event.preventDefault();
        game.keysPressed[' '] = false;
         return;
    }

    game.keysPressed[key] = true; // Update shared state

    // Handle hotbar selection
    if (!isNaN(parseInt(key)) && parseInt(key) >= 1 && parseInt(key) <= C.HOTBAR_SIZE) {
        game.selectHotbar(parseInt(key) - 1); // Call function from game.js
    }
});

document.addEventListener('keyup', async (event) => {
    const game = await import('./game.js');
    game.keysPressed[event.key.toLowerCase()] = false; // Update shared state
    if(event.code === 'Space') game.keysPressed[' '] = false;
});

canvas.addEventListener('mousemove', (event) => {
    // Use imported flags directly
    if (isGameOver || !gameHasStarted || gamePaused) return;
    const rect = canvas.getBoundingClientRect();
    mouseCanvasX = event.clientX - rect.left;
    mouseCanvasY = event.clientY - rect.top;
    // Need cameraX/Y from game state
    const worldCoords = U.canvasToWorld(mouseCanvasX, mouseCanvasY, cameraX, cameraY, canvas.width, canvas.height);
    worldMouseX = worldCoords.x;
    worldMouseY = worldCoords.y;
});

canvas.addEventListener('mousedown', async (event) => {
    // Use imported flags directly
    if (isGameOver || isCraftingMenuOpen || !gameHasStarted || gamePaused) return;
    const game = await import('./game.js');

    if (event.button === 0) { // Left click
        isMouseDown = true; // Update local UI state
        // The actual attack logic based on holding this down is in game.js's update loop
         game.tryAttack(); // Trigger immediate attack attempt on click down
    } else if (event.button === 2) { // Right click
        // Interact action
        if (!player.isInteracting && !player.isAttacking) { // Check player state (imported)
             game.tryInteract(); // Call action from game.js
        }
    }
});

canvas.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Left click
        isMouseDown = false; // Update local UI state
    }
});

canvas.addEventListener('mouseleave', () => { // Stop attacking if mouse leaves canvas
    isMouseDown = false; // Update local UI state
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault()); // Prevent right-click menu

// --- UI Update Function ---
export async function updateUI() {
    // Needs access to player state, dayCount etc (imported from game.js)
    if (!healthValueSpan || !maxHealthValueSpan || !hungerValueSpan || !dayValueSpan || !levelValueSpan || !xpValueSpan || !debugDiv) {
        console.warn("UI elements missing, cannot update stats display.");
        return;
    }
    healthValueSpan.textContent = Math.floor(player.health);
    maxHealthValueSpan.textContent = Math.floor(player.maxHealth);
    hungerValueSpan.textContent = Math.floor(player.hunger);

    // Use dynamic import to get potentially changing game state values like dayCount, isNight etc.
    const game = await import('./game.js');

    dayValueSpan.textContent = game.dayCount;
    levelValueSpan.textContent = player.level;
    xpValueSpan.textContent = `${player.currentXP}/${player.xpToNextLevel}`;

    // Update Minion Info Bar
    if (gameHasStarted && minionInfoBar) {
        if (player.className === 'necromancer') {
            minionInfoBar.style.display = 'block';
            // Access CLASS_DATA correctly if killsToSummon changes
            const killsNeeded = C.CLASS_DATA.necromancer.killsToSummon || C.NECROMANCER_KILLS_TO_SUMMON;
            minionInfoBar.textContent = `Undead: ${game.undeadMinions.length}/${C.MAX_UNDEAD_MINIONS} | Kills: ${player.monsterKillCount % killsNeeded}/${killsNeeded}`;
        } else if (player.className === 'summoner') {
            minionInfoBar.style.display = 'block';
            const currentMaxSlimes = C.MAX_SUMMONED_SLIMES + player.bonusMaxSummons;
            minionInfoBar.textContent = `Slimes: ${game.summonedSlimes.length}/${currentMaxSlimes}`;
        } else {
            minionInfoBar.style.display = 'none';
        }
    } else if (minionInfoBar) {
        minionInfoBar.style.display = 'none';
    }

    // Debug Info
    let debugSpeedPenalty = (!game.isNight && player.daySpeedPenalty < 1.0) ? ` DaySpeed:x${player.daySpeedPenalty.toFixed(2)}` : '';
    let necroKills = player.className === 'necromancer' ? ` NKills:${player.monsterKillCount}` : '';
    // Calculate speed for debug display
    let baseSpeed = C.PLAYER_SPEED * player.speedMultiplier * player.bonusMovementSpeedMult * player.weaponMoveSpeedMult;
     if (!game.isNight && player.daySpeedPenalty < 1.0) { baseSpeed *= (player.daySpeedPenalty * player.bonusDaySpeedPenaltyMult); }
     if (game.isNight && player.bonusNightSpeedMult > 1.0) { baseSpeed *= player.bonusNightSpeedMult; }

    debugDiv.textContent = `World:(${Math.round(player.x)},${Math.round(player.y)})|Mouse:(${Math.round(worldMouseX)},${Math.round(worldMouseY)})|Res:${game.resources.length}|Mon:${game.monsters.length}|Undead:${game.undeadMinions.length}|Summon:${game.summonedSlimes.length}|Boss:${game.bosses.length}|Items:${game.droppedItems.length}|Proj:${game.projectiles.length}|Speed:${baseSpeed.toFixed(2)}${debugSpeedPenalty}${necroKills}|Paused:${game.gamePaused}|Menu:${game.isCraftingMenuOpen}`;
}

// --- Item Drawing (for UI) ---
// Draws item icons onto a canvas context (used for inventory, hotbar)
export function drawItemShape(ctx, itemType, size) {
    const itemData = C.ITEM_DATA[itemType];
    if (!itemData) { // Draw placeholder for unknown items
        ctx.fillStyle = 'magenta';
        ctx.fillRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8);
        ctx.strokeStyle = 'black'; ctx.lineWidth = 1;
        ctx.strokeRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8);
        ctx.beginPath(); ctx.moveTo(size * 0.1, size * 0.1); ctx.lineTo(size * 0.9, size * 0.9);
        ctx.moveTo(size * 0.9, size * 0.1); ctx.lineTo(size * 0.1, size * 0.9); ctx.stroke();
        return;
    }

    ctx.save();
    ctx.translate(size / 2, size / 2); // Center drawing
    ctx.fillStyle = itemData.color || '#FFF';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1; // Base line width

    // Scale drawing based on desired base size (e.g., 30px) vs actual canvas size
    const scale = size / 30;
    ctx.scale(scale, scale);
    ctx.lineWidth /= scale; // Adjust line width for scaling

    const shapeSize = 18; // Base size for drawing primitives before scaling

    switch (itemData.shape) {
        case 'line':
            ctx.beginPath(); ctx.moveTo(0, -shapeSize * 0.6); ctx.lineTo(0, shapeSize * 0.6);
            ctx.lineWidth = Math.max(ctx.lineWidth, 2.5); // Ensure line is thick enough
            ctx.stroke();
            break;
        case 'rect':
            ctx.fillRect(-shapeSize * 0.4, -shapeSize * 0.4, shapeSize * 0.8, shapeSize * 0.8);
            ctx.strokeRect(-shapeSize * 0.4, -shapeSize * 0.4, shapeSize * 0.8, shapeSize * 0.8);
            break;
        case 'torch': {
            const sH = shapeSize * 1.0, sW = shapeSize * 0.2, fH = shapeSize * 0.5;
            // Draw stick part first
            ctx.fillStyle = C.ITEM_DATA['stick']?.color || '#B8860B';
            ctx.fillRect(-sW / 2, sH * 0.1, sW, sH * 0.9);
            // Draw flame part
            ctx.fillStyle = itemData.color; // Flame color
            ctx.beginPath(); ctx.ellipse(0, -sH * 0.25, sW * 1.5, fH, 0, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'sword': {
            const swH = shapeSize * 1.3, swW = shapeSize * 0.15, gW = shapeSize * 0.4;
            // Hilt/Pommel
            ctx.fillStyle = '#444'; ctx.fillRect(-swW * 1.2, swH * 0.2, swW * 2.4, swH * 0.2);
            // Guard
            ctx.fillStyle = '#888'; ctx.fillRect(-gW / 2, swH * 0.1, gW, swW * 2);
            // Blade
            ctx.fillStyle = itemData.color; // Blade color
            ctx.beginPath(); ctx.moveTo(0, -swH * 0.4); ctx.lineTo(-swW, swH * 0.1); ctx.lineTo(swW, swH * 0.1); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.6)'; // Reset strokeStyle potentially changed by other shapes
            ctx.stroke(); // Outline blade
            break;
        }
        case 'axe':
        case 'pickaxe': {
            const hH = shapeSize * 1.2, hW = shapeSize * 0.15, hdW = shapeSize * 0.6, hdH = shapeSize * 0.4;
            // Handle
            ctx.fillStyle = C.ITEM_DATA['stick']?.color || '#B8860B';
            ctx.fillRect(-hW / 2, -hH / 2 + hdH / 2, hW, hH); ctx.strokeRect(-hW / 2, -hH / 2 + hdH / 2, hW, hH);
            // Head
            ctx.fillStyle = itemData.color;
            ctx.fillRect(-hdW / 2, -hH / 2, hdW, hdH); ctx.strokeRect(-hdW / 2, -hH / 2, hdW, hdH);
            break;
        }
        case 'bow':
             // Draw bow body first (filled)
             ctx.beginPath(); ctx.moveTo(0,-shapeSize*0.6); ctx.quadraticCurveTo(-shapeSize*0.7, 0, 0, shapeSize*0.6); ctx.quadraticCurveTo( shapeSize*0.7, 0, 0,-shapeSize*0.6);
             ctx.fill();
             // Draw outline for body
             ctx.lineWidth = Math.max(ctx.lineWidth, 2.0); ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.stroke();
             // Draw string
             ctx.beginPath(); ctx.moveTo(-shapeSize*0.1, -shapeSize*0.5); ctx.lineTo(-shapeSize*0.1, shapeSize*0.5);
             ctx.lineWidth = Math.max(ctx.lineWidth * 0.7, 1.0); ctx.strokeStyle='#eee'; ctx.stroke();
             break;
        case 'cactus':
            const cW = shapeSize * 0.4, cH = shapeSize * 1.3;
            ctx.fillStyle = itemData.color; // Use item color
            ctx.fillRect(-cW / 2, -cH / 2, cW, cH); // Main body
            ctx.fillRect(-cW * 1.2, -cH * 0.1, cW * 2.4, cW * 0.6); // Arm
            ctx.strokeStyle='darkgreen'; ctx.lineWidth = Math.max(ctx.lineWidth, 1.0);
            ctx.strokeRect(-cW / 2, -cH / 2, cW, cH); // Outline main
            ctx.strokeRect(-cW * 1.2, -cH * 0.1, cW * 2.4, cW * 0.6); // Outline arm
            break;
        case 'circle':
        default:
            ctx.beginPath();
            ctx.arc(0, 0, shapeSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke(); // Ensure outline
            break;
    }
    ctx.restore();
}

// --- Inventory/Crafting Menu Functions ---
export async function populateCraftingMenu(nearWorkbench, nearUpgrader) {
    if (!craftingMenuDiv) return;
    const invGrid = document.getElementById('inventoryGrid');
    const hotbarGrid = document.getElementById('hotbarGrid');
    const playerRecipeList = document.getElementById('recipeList');
    const workbenchCtxDiv = document.getElementById('workbenchContext');
    const upgraderCtxDiv = document.getElementById('upgraderContext');
    const workbenchRecipeList = document.getElementById('workbenchRecipeList');

    if (!invGrid || !hotbarGrid || !playerRecipeList || !workbenchCtxDiv || !upgraderCtxDiv || !workbenchRecipeList) {
        console.error("Missing UI elements for combined crafting menu!");
        return;
    }

    // Load game module for actions/state access
    const game = await import('./game.js');

    // Configure grid columns via CSS variables
    invGrid.style.setProperty('--inventory-cols', C.INVENTORY_COLS);
    hotbarGrid.style.setProperty('--hotbar-size', C.HOTBAR_SIZE);

    // Helper to create item canvas
    const createSlotCanvas = (item) => {
        const canvas = document.createElement('canvas');
        canvas.width = 40; canvas.height = 40;
        canvas.classList.add('item-icon');
        const itemCtx = canvas.getContext('2d');
        if (item && item.type) {
            drawItemShape(itemCtx, item.type, canvas.width); // Use exported draw function
        }
        return canvas;
    };

    // Populate Inventory Grid
    invGrid.innerHTML = '';
    player.inventorySlots.forEach((item, index) => {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('inventory-slot');
        slotDiv.dataset.index = index;

        if (item) {
            const itemData = C.ITEM_DATA[item.type] || { name: item.type };
            slotDiv.title = itemData.name; // Tooltip
            slotDiv.appendChild(createSlotCanvas(item));
            if (item.count > 1) {
                const countSpan = document.createElement('span');
                countSpan.classList.add('item-count');
                countSpan.textContent = item.count;
                slotDiv.appendChild(countSpan);
            }
        }

        // Highlight if selected for moving (using player state from game.js)
        if (player.selectedInventoryItem && player.selectedInventoryItem.source === 'inventory' && player.selectedInventoryItem.index === index) {
            slotDiv.classList.add('selected-for-move');
            if (item) slotDiv.style.opacity = '0.5'; // Dim the item being moved
        }

        slotDiv.addEventListener('click', () => game.handleInventorySlotClick(index)); // Call game.js handler
        invGrid.appendChild(slotDiv);
    });

    // Populate Hotbar Grid (in menu)
    hotbarGrid.innerHTML = '';
    player.hotbarSlots.forEach((item, index) => {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('hotbar-menu-slot'); // Different class for menu styling
        slotDiv.dataset.index = index;

        if (item) {
            const itemData = C.ITEM_DATA[item.type] || { name: item.type };
            slotDiv.title = itemData.name; // Tooltip
            slotDiv.appendChild(createSlotCanvas(item));
            if (item.count > 1) {
                const countSpan = document.createElement('span');
                countSpan.classList.add('item-count');
                countSpan.textContent = item.count;
                slotDiv.appendChild(countSpan);
            }
        }

         // Highlight if selected for moving
         if (player.selectedInventoryItem && player.selectedInventoryItem.source === 'hotbar' && player.selectedInventoryItem.index === index) {
            slotDiv.classList.add('selected-for-move');
            if (item) slotDiv.style.opacity = '0.5'; // Dim the item being moved
        }

        slotDiv.addEventListener('click', () => game.handleHotbarSlotClick(index)); // Call game.js handler
        hotbarGrid.appendChild(slotDiv);
    });

    // Populate Player Recipes
    playerRecipeList.innerHTML = '';
    const playerRecipes = C.recipes.filter(r => !r.requiresWorkbench);
    if (playerRecipes.length === 0) {
         playerRecipeList.innerHTML = `<li>No player recipes available.</li>`;
    } else {
        playerRecipes.forEach(recipe => {
            const li = document.createElement('li');
            const canCurrentlyCraft = game.canCraft(recipe); // Use game.js checker

            let ingredientsHTML = '';
            for (const itemId in recipe.input) {
                const requiredCount = recipe.input[itemId];
                const ownedCount = game.getTotalItemCount(itemId); // Use game.js counter
                const missingClass = ownedCount < requiredCount ? 'missing' : '';
                const itemName = (C.ITEM_DATA[itemId]?.name || itemId).replace(/_/g, ' ');
                ingredientsHTML += `<span class="ingredient ${missingClass}">${itemName}: ${ownedCount}/${requiredCount}</span>`;
            }

            li.innerHTML = `
                <div>
                    <strong>${recipe.name}</strong>
                    <div class="recipe-details">${ingredientsHTML}</div>
                </div>
                <button data-recipe-id="${recipe.id}" ${canCurrentlyCraft ? '' : 'disabled'}>Craft</button>
            `;
            const craftBtn = li.querySelector('button');
            if (craftBtn) {
                craftBtn.addEventListener('click', () => {
                    game.doCraft(recipe.id); // Use game.js action
                });
            }
            playerRecipeList.appendChild(li);
        });
    }

    // Show/Hide & Populate Contextual Sections (Workbench / Upgrader)
    workbenchRecipeList.innerHTML = ''; // Clear workbench list initially
    workbenchCtxDiv.style.display = nearWorkbench ? 'block' : 'none';
    upgraderCtxDiv.style.display = nearUpgrader ? 'block' : 'none';

    if (nearWorkbench) {
        populateWorkbenchRecipes(workbenchRecipeList); // Call UI helper below
    }

    if (nearUpgrader) {
        populateUpgraderUI(); // Call UI helper below
    } else {
        // Clear upgrader UI state if not near one
        const upIn = document.getElementById('upgraderInputSlot');
        const upMat = document.getElementById('upgraderMaterialSlot');
        const upOut = document.getElementById('upgraderOutputSlot');
        const upBtn = document.getElementById('upgradeItemButton');
        if (upIn) { upIn.innerHTML = '(Click Tool)'; upIn.style.opacity='0.5'; upIn.classList.remove('has-item'); }
        if (upMat) { upMat.innerHTML = '(Material)'; upMat.style.opacity='0.5'; upMat.classList.remove('has-item'); }
        if (upOut) { upOut.innerHTML = '(Result)'; upOut.style.opacity='0.5'; upOut.classList.remove('has-item'); }
        if (upBtn) upBtn.disabled = true;

        // Reset the selected input if the menu is closed/reopened away from upgrader
        if (game.selectedUpgradeInput.slotIndex !== -1) {
             game.selectedUpgradeInput.slotIndex = -1;
             game.selectedUpgradeInput.source = null;
        }
    }
}

// Toggles the visibility and state of the main crafting/inventory menu
export async function toggleCraftingMenu() {
    // Needs access to gamePaused, isCraftingMenuOpen, player (imported from game.js)
    // Needs access to isNearWorkbench, isNearUpgrader (imported from game.js)
    const game = await import('./game.js');

    game.isCraftingMenuOpen = !game.isCraftingMenuOpen; // Toggle the flag in game state

    if (game.isCraftingMenuOpen) {
        game.gamePaused = true; // Pause game when menu opens

        // Determine context (Workbench, Upgrader, or Player)
        const nearUpgrader = game.isNearUpgrader();
        const nearWorkbench = !nearUpgrader && game.isNearWorkbench();

        let title = 'Inventory & Crafting';
        let activeClass = '';

        // Make sure correct sections are visible
        const workbenchCtxDiv = document.getElementById('workbenchContext');
        const upgraderCtxDiv = document.getElementById('upgraderContext');

        if (nearUpgrader) {
            title = 'Item Upgrader';
            activeClass = 'upgrader-active';
            if(workbenchCtxDiv) workbenchCtxDiv.style.display = 'none';
            if(upgraderCtxDiv) upgraderCtxDiv.style.display = 'block';
        } else if (nearWorkbench) {
            title = 'Workbench Crafting';
            activeClass = 'workbench-active';
            if(workbenchCtxDiv) workbenchCtxDiv.style.display = 'block';
            if(upgraderCtxDiv) upgraderCtxDiv.style.display = 'none';
        } else {
            // Player context (no special station)
             title = 'Inventory & Crafting';
            if(workbenchCtxDiv) workbenchCtxDiv.style.display = 'none';
            if(upgraderCtxDiv) upgraderCtxDiv.style.display = 'none';
        }

        await populateCraftingMenu(nearWorkbench, nearUpgrader); // Populate based on determined context

        craftingMenuDiv.className = 'active ' + activeClass; // Apply classes for styling
        craftingMenuDiv.style.display = 'flex';
        if (craftingMenuTitle) craftingMenuTitle.textContent = title;

    } else {
        // Closing the menu
        craftingMenuDiv.style.display = 'none';
        craftingMenuDiv.className = ''; // Remove context classes

        // Clear selection state when closing menu
        if (player.selectedInventoryItem) {
            player.selectedInventoryItem = null;
        }
         if (game.selectedUpgradeInput.slotIndex !== -1) {
             game.selectedUpgradeInput.slotIndex = -1;
             game.selectedUpgradeInput.source = null;
             // Re-populate briefly to clear the visual state if needed? Usually hiding is enough.
         }
        game.gamePaused = false; // Unpause game when menu closes
    }
}


// --- Workbench/Upgrader UI Population Helpers (Called by populateCraftingMenu) ---
async function populateWorkbenchRecipes(listElement) {
    if (!listElement) return;
    const game = await import('./game.js');
    listElement.innerHTML = ''; // Clear previous content
    const availableRecipes = C.recipes.filter(r => r.requiresWorkbench === true);

    if (availableRecipes.length === 0) {
        listElement.innerHTML = `<li>No workbench recipes available yet.</li>`;
    } else {
        availableRecipes.forEach(recipe => {
            const li = document.createElement('li');
            const canCurrentlyCraft = game.canCraft(recipe);

            let ingredientsHTML = '';
            for (const itemId in recipe.input) {
                const requiredCount = recipe.input[itemId];
                const ownedCount = game.getTotalItemCount(itemId);
                const missingClass = ownedCount < requiredCount ? 'missing' : '';
                const itemName = (C.ITEM_DATA[itemId]?.name || itemId).replace(/_/g, ' ');
                ingredientsHTML += `<span class="ingredient ${missingClass}">${itemName}: ${ownedCount}/${requiredCount}</span>`;
            }

            li.innerHTML = `
                <div>
                    <strong>${recipe.name}</strong>
                    <div class="recipe-details">${ingredientsHTML}</div>
                </div>
                <button data-recipe-id="${recipe.id}" ${canCurrentlyCraft ? '' : 'disabled'}>Craft</button>
            `;
            const craftBtn = li.querySelector('button');
            if (craftBtn) {
                craftBtn.addEventListener('click', () => {
                    game.doCraft(recipe.id);
                });
            }
            listElement.appendChild(li);
        });
    }
}

async function populateUpgraderUI() {
    const inputSlotDiv = document.getElementById('upgraderInputSlot');
    const materialSlotDiv = document.getElementById('upgraderMaterialSlot');
    const outputSlotDiv = document.getElementById('upgraderOutputSlot');
    const upgradeBtn = document.getElementById('upgradeItemButton');

    if (!inputSlotDiv || !materialSlotDiv || !outputSlotDiv || !upgradeBtn) {
        console.error("Missing Upgrader UI elements");
        return;
    }
    const game = await import('./game.js');

     // Helper to create item canvas (reuse code is good)
     const createSlotCanvas = (item) => {
        const canvas = document.createElement('canvas');
        canvas.width = 40; canvas.height = 40;
        canvas.classList.add('item-icon');
        const itemCtx = canvas.getContext('2d');
        if (item && item.type) {
            drawItemShape(itemCtx, item.type, canvas.width);
        }
        return canvas;
    };

    // Clear previous state visuals
    inputSlotDiv.innerHTML = '(Click Tool)'; inputSlotDiv.style.opacity = '0.5'; inputSlotDiv.classList.remove('has-item');
    materialSlotDiv.innerHTML = '(Material)'; materialSlotDiv.style.opacity = '0.5'; materialSlotDiv.classList.remove('has-item');
    outputSlotDiv.innerHTML = '(Result)'; outputSlotDiv.style.opacity = '0.5'; outputSlotDiv.classList.remove('has-item');
    upgradeBtn.disabled = true;

    // Add click listener to input slot if not already added
    if (!inputSlotDiv.dataset.listenerAdded) {
        inputSlotDiv.addEventListener('click', handleUpgraderInputClick); // Use UI helper below
        inputSlotDiv.dataset.listenerAdded = 'true';
    }

    // Get the currently selected tool for upgrade (using selectedUpgradeInput from game.js)
    let currentInputItem = null;
    if (game.selectedUpgradeInput.slotIndex !== -1 && game.selectedUpgradeInput.source) {
        const sourceArray = game.selectedUpgradeInput.source === 'inventory' ? player.inventorySlots : player.hotbarSlots;
        currentInputItem = sourceArray[game.selectedUpgradeInput.slotIndex];
    }

    // Populate based on selected tool
    if (currentInputItem) {
        inputSlotDiv.innerHTML = ''; // Clear placeholder text
        inputSlotDiv.appendChild(createSlotCanvas(currentInputItem));
        inputSlotDiv.style.opacity = '1';
        inputSlotDiv.classList.add('has-item');

        const upgradeRecipe = C.UPGRADER_RECIPES[currentInputItem.type];
        if (upgradeRecipe) {
            // Display material
            materialSlotDiv.innerHTML = '';
            const materialItem = { type: upgradeRecipe.material, count: upgradeRecipe.materialCount };
            materialSlotDiv.appendChild(createSlotCanvas(materialItem));
            const countSpanMat = document.createElement('span');
            countSpanMat.classList.add('item-count');
            countSpanMat.textContent = upgradeRecipe.materialCount;
            materialSlotDiv.appendChild(countSpanMat);
            materialSlotDiv.style.opacity = '1';
            materialSlotDiv.classList.add('has-item');

            // Display output
            outputSlotDiv.innerHTML = '';
            const outputItem = { type: upgradeRecipe.output, count: 1 };
            outputSlotDiv.appendChild(createSlotCanvas(outputItem));
            outputSlotDiv.style.opacity = '1';
            outputSlotDiv.classList.add('has-item');

            // Enable button if materials are sufficient
            const hasMaterials = game.getTotalItemCount(upgradeRecipe.material) >= upgradeRecipe.materialCount;
            upgradeBtn.disabled = !hasMaterials;
        } else {
            // Selected item is not upgradeable or recipe missing
            materialSlotDiv.innerHTML = '(N/A)';
            outputSlotDiv.innerHTML = '(Invalid)';
            upgradeBtn.disabled = true;
        }
    } else {
        // No item selected - ensure button is disabled
        upgradeBtn.disabled = true;
    }
}

// Handles clicks on the Upgrader's input slot
async function handleUpgraderInputClick() {
    // Needs player.selectedInventoryItem & selectedUpgradeInput from game.js
    const game = await import('./game.js');
    const selected = player.selectedInventoryItem; // Item being moved

    if (selected) {
        // If an item is currently selected for moving, try to place it here
        const itemType = selected.type;
        if (C.UPGRADER_RECIPES[itemType]) { // Check if it's an upgradeable tool type
            // Place the item in the upgrader slot state
            game.selectedUpgradeInput.slotIndex = selected.index;
            game.selectedUpgradeInput.source = selected.source;
            player.selectedInventoryItem = null; // Consume the selection (item is no longer "held")
            await populateCraftingMenu(false, true); // Re-populate to show the change in the upgrader UI
        } else {
            // Item selected for move is not valid for upgrader input
            console.log("Cannot place this item in the upgrader.");
            // Optionally provide UI feedback (e.g., shake the slot)
        }
    } else if (game.selectedUpgradeInput.slotIndex !== -1) {
        // If an item is already in the upgrader slot, clicking it again should return it to the "held" state
        const sourceArray = game.selectedUpgradeInput.source === 'inventory' ? player.inventorySlots : player.hotbarSlots;
        const itemToTakeBack = sourceArray[game.selectedUpgradeInput.slotIndex];

        if (itemToTakeBack) { // Ensure item still exists
             player.selectedInventoryItem = {
                 index: game.selectedUpgradeInput.slotIndex,
                 type: itemToTakeBack.type,
                 count: itemToTakeBack.count,
                 source: game.selectedUpgradeInput.source
             };
             // Clear the upgrader slot state
             game.selectedUpgradeInput.slotIndex = -1;
             game.selectedUpgradeInput.source = null;
             await populateCraftingMenu(false, true); // Re-populate to show the change
        } else {
             // Item disappeared? Reset state anyway.
             game.selectedUpgradeInput.slotIndex = -1;
             game.selectedUpgradeInput.source = null;
             await populateCraftingMenu(false, true);
        }
    }
}


// --- Main Hotbar Visual Update ---
// Updates the 5 slots always visible at the bottom of the screen
export function updateMainHotbarVisuals() {
    if (!mainHotbarSlots || mainHotbarSlots.length !== C.HOTBAR_SIZE) {
        console.warn("Main hotbar slots not found or length mismatch.");
        return;
    }
    mainHotbarSlots.forEach((slotDiv, index) => {
        const item = player.hotbarSlots[index]; // Needs player from game.js

        // Clear previous content (safer than relying on innerHTML)
        const existingIcon = slotDiv.querySelector('.item-icon');
        const existingCount = slotDiv.querySelector('.item-count');
        if (existingIcon) slotDiv.removeChild(existingIcon);
        if (existingCount) slotDiv.removeChild(existingCount);

        // Ensure slot number hint is present (only add once)
        let numSpan = slotDiv.querySelector('span.slot-number-hint'); // More specific selector
        if (!numSpan) {
            numSpan = document.createElement('span');
            numSpan.classList.add('slot-number-hint'); // Add class for styling/selection
            // Style directly for simplicity, better to use CSS classes
            numSpan.style.opacity = '0.5';
            numSpan.style.position = 'absolute';
            numSpan.style.top = '5px';
            numSpan.style.left = '5px';
            numSpan.style.fontSize = '0.8em';
            numSpan.style.color = '#eee';
            numSpan.style.zIndex = '-1'; // Behind item icon
            numSpan.textContent = `${index + 1}`;
            slotDiv.appendChild(numSpan);
        }

        // Highlight the selected slot
        slotDiv.classList.toggle('selected', index === player.selectedHotbarSlotIndex);


        if (item) {
            // Create and add item icon canvas
            const itemCanvas = document.createElement('canvas');
            itemCanvas.width = 35; // Slightly smaller for main hotbar
            itemCanvas.height = 35;
            itemCanvas.classList.add('item-icon');
            itemCanvas.style.pointerEvents = 'none'; // Prevent interfering with slot clicks
            const itemCtx = itemCanvas.getContext('2d');
            if (item.type) {
                drawItemShape(itemCtx, item.type, itemCanvas.width); // Use UI helper
            }
            slotDiv.appendChild(itemCanvas);

            // Add count if applicable
            if (item.count > 1) {
                const countSpan = document.createElement('span');
                countSpan.classList.add('item-count');
                countSpan.textContent = item.count;
                slotDiv.appendChild(countSpan);
            }
        }
    });
}

// --- Minimap Drawing --- (Moved here as it's UI)
function worldToMinimap(wx, wy, mapX, mapY, mapWidth, mapHeight) {
    // Clamp world coordinates to prevent drawing outside world bounds on map
    wx = U.clamp(wx, 0, C.WORLD_WIDTH);
    wy = U.clamp(wy, 0, C.WORLD_HEIGHT);
    const scaleX = mapWidth / C.WORLD_WIDTH;
    const scaleY = mapHeight / C.WORLD_HEIGHT;
    return {
        x: mapX + wx * scaleX,
        y: mapY + wy * scaleY
    };
}

// Draws the minimap onto the main canvas context (ctx)
export function drawMinimap() {
    if (!isMinimapVisible) return; // Use imported flag

    ctx.save(); // Save main context state before drawing UI element

    const mapX = canvas.width - C.MINIMAP_WIDTH - C.MINIMAP_PADDING;
    const mapY = canvas.height - C.MINIMAP_HEIGHT - C.MINIMAP_PADDING;

    // Background
    ctx.globalAlpha = C.MINIMAP_ALPHA;
    ctx.fillStyle = '#555'; // Dark grey background
    ctx.fillRect(mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
    ctx.globalAlpha = 1.0; // Reset alpha for border

    // Border
    ctx.strokeStyle = '#FFF'; // White border
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);

    // Clip drawing to minimap bounds
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
    ctx.clip();

    // Draw Biome Backgrounds (Simplified - draw rects based on bounds)
    for (const biomeName in C.BIOME_DATA) {
        const biome = C.BIOME_DATA[biomeName];
        ctx.fillStyle = biome.color;
        let bx = 0, by = 0, bw = C.WORLD_WIDTH, bh = C.WORLD_HEIGHT; // Default to full world

        // Define biome rects based on config bounds
        switch (biomeName) {
            // Order matters for overlaps - draw largest first or handle complex shapes
            case 'frostlands': bx = 0; by = 0; bw = C.WORLD_WIDTH; bh = C.BIOME_BOUNDS.FROSTLANDS_Y_END; break;
            case 'desert':     bx = 0; by = C.BIOME_BOUNDS.DESERT_Y_START; bw = C.WORLD_WIDTH; bh = C.WORLD_HEIGHT - C.BIOME_BOUNDS.DESERT_Y_START; break;
            case 'forest':     bx = 0; by = C.BIOME_BOUNDS.FROSTLANDS_Y_END; bw = C.BIOME_BOUNDS.FOREST_X_END; bh = C.BIOME_BOUNDS.DESERT_Y_START - C.BIOME_BOUNDS.FROSTLANDS_Y_END; break;
            case 'jungle':     bx = C.BIOME_BOUNDS.JUNGLE_X_START; by = C.BIOME_BOUNDS.FROSTLANDS_Y_END; bw = C.WORLD_WIDTH - C.BIOME_BOUNDS.JUNGLE_X_START; bh = C.BIOME_BOUNDS.DESERT_Y_START - C.BIOME_BOUNDS.FROSTLANDS_Y_END; break;
            case 'plains':     bx = C.BIOME_BOUNDS.FOREST_X_END; by = C.BIOME_BOUNDS.FROSTLANDS_Y_END; bw = C.BIOME_BOUNDS.JUNGLE_X_START - C.BIOME_BOUNDS.FOREST_X_END; bh = C.BIOME_BOUNDS.DESERT_Y_START - C.BIOME_BOUNDS.FROSTLANDS_Y_END; break;
             case 'rocky':      bx = 0; by = 0; bw = C.BIOME_BOUNDS.ROCKY_X_END; bh = C.BIOME_BOUNDS.ROCKY_Y_END; break; // Draw corners over larger areas
             case 'swamp':      bx = C.BIOME_BOUNDS.SWAMP_X_START; by = 0; bw = C.WORLD_WIDTH - C.BIOME_BOUNDS.SWAMP_X_START; bh = C.BIOME_BOUNDS.SWAMP_Y_END; break;
             case 'volcano':    bx = 0; by = C.BIOME_BOUNDS.VOLCANO_Y_START; bw = C.BIOME_BOUNDS.VOLCANO_X_END; bh = C.WORLD_HEIGHT - C.BIOME_BOUNDS.VOLCANO_Y_START; break;
             case 'badlands':   bx = C.BIOME_BOUNDS.BADLANDS_X_START; by = C.BIOME_BOUNDS.BADLANDS_Y_START; bw = C.WORLD_WIDTH - C.BIOME_BOUNDS.BADLANDS_X_START; bh = C.WORLD_HEIGHT - C.BIOME_BOUNDS.BADLANDS_Y_START; break;
            default: continue; // Skip if biome name doesn't match specific bounds logic
        }

        const start = worldToMinimap(bx, by, mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
        const end = worldToMinimap(bx + bw, by + bh, mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
        // Clamp drawing coordinates to be safe
        const drawX = Math.max(mapX, start.x);
        const drawY = Math.max(mapY, start.y);
        const drawW = Math.min(mapX + C.MINIMAP_WIDTH, end.x) - drawX;
        const drawH = Math.min(mapY + C.MINIMAP_HEIGHT, end.y) - drawY;

        if (drawW > 0 && drawH > 0) {
            ctx.fillRect(drawX, drawY, drawW, drawH);
        }
    }
    // Draw lake/lava pools on top
    ctx.fillStyle = C.JUNGLE_LAKE.color;
    const lakeStart = worldToMinimap(C.JUNGLE_LAKE.x, C.JUNGLE_LAKE.y, mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
    const lakeEnd = worldToMinimap(C.JUNGLE_LAKE.x + C.JUNGLE_LAKE.width, C.JUNGLE_LAKE.y + C.JUNGLE_LAKE.height, mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
    ctx.fillRect(lakeStart.x, lakeStart.y, lakeEnd.x - lakeStart.x, lakeEnd.y - lakeStart.y);
    C.lavaPools.forEach(p => {
        ctx.fillStyle = p.color;
        const pStart = worldToMinimap(p.x, p.y, mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
        const pEnd = worldToMinimap(p.x + p.width, p.y + p.height, mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
        ctx.fillRect(pStart.x, pStart.y, pEnd.x - pStart.x, pEnd.y - pStart.y);
    });


    ctx.restore(); // Restore clipping context (stop clipping)

    // Draw Player
    const playerPos = worldToMinimap(player.x, player.y, mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
    ctx.fillStyle = C.MINIMAP_PLAYER_COLOR; // Green dot
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.y, C.MINIMAP_PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black'; ctx.lineWidth=0.5; ctx.stroke(); // Thin outline

    // Draw Bosses
    if (bosses.length > 0) {
         bosses.forEach(boss => {
             const bossPos = worldToMinimap(boss.x, boss.y, mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
             ctx.fillStyle = C.MINIMAP_BOSS_COLOR; // Red square
             ctx.fillRect(bossPos.x - 2, bossPos.y - 2, 5, 5); // Small square centered
         });
    }

     // Draw Respawn Point
     const respawnPos = worldToMinimap(player.respawnX, player.respawnY, mapX, mapY, C.MINIMAP_WIDTH, C.MINIMAP_HEIGHT);
     ctx.fillStyle = C.MINIMAP_RESPAWN_COLOR; // Yellow dot
     ctx.beginPath();
     ctx.arc(respawnPos.x, respawnPos.y, C.MINIMAP_PLAYER_SIZE - 1, 0, Math.PI * 2); // Slightly smaller
     ctx.fill();
     ctx.strokeStyle = 'black'; ctx.lineWidth=0.5; ctx.stroke(); // Thin outline


    ctx.restore(); // Restore original context state (before minimap drawing)
}


// --- Menu Display Functions (Called by game.js) ---
export async function showLevel3PerkMenu() {
    // Check if elements exist
    if (!levelPerkOverlay || !perkChoice1Button || !perkChoice2Button || !perkDescription) {
        console.error("Level 3 Perk Menu DOM elements not found!");
        return;
    }
    console.log("Showing Level 3 Perk Menu");
    const game = await import('./game.js');
    game.gamePaused = true; // Pause game

    let choice1Text = "Perk 1";
    let choice2Text = "Perk 2";
    let descText = "Choose your path!";

    // Customize based on player class (needs player.className from game.js)
    switch (player.className) {
        case 'knight': choice1Text = "+20 Max HP"; choice2Text = "+15 Sword Damage"; descText = "Strengthen your Resolve or your Blade?"; break;
        case 'archer': choice1Text = "+10% Move Speed"; choice2Text = "+10% Bow Attack Speed"; descText = "Become Swifter or Shoot Faster?"; break;
        case 'scout': choice1Text = "+10 Max HP"; choice2Text = "+15 Melee Damage (All)"; descText = "Bolster your Health or Enhance All Melee Strikes?"; break;
        case 'tank': choice1Text = "+50 Max HP"; choice2Text = "+20 Melee Damage / -15% Speed"; descText = "Become an Immovable Object or a Destructive Force?"; break;
        case 'vampire': choice1Text = "+2.5 Lifesteal"; choice2Text = "+15% Move Speed"; descText = "Enhance your Vampiric Drain or gain Celerity?"; break;
        case 'necromancer': choice1Text = "Kills needed per Undead -1"; choice2Text = "+20% Undead Health"; descText = "Improve your Necrotic Rituals or Fortify your Minions?"; break;
        case 'summoner': choice1Text = "+1 Max Slime"; choice2Text = "+25% Slime Health"; descText = "Expand your Legion or Empower your existing Summons?"; break;
        default: console.warn("Unknown class for perk menu:", player.className); choice1Text = "Generic Perk 1"; choice2Text = "Generic Perk 2"; break;
    }

    perkDescription.textContent = descText;
    perkChoice1Button.textContent = choice1Text;
    perkChoice2Button.textContent = choice2Text;

    // Re-attach event listeners to prevent duplicates (clone and replace method)
    const oldButton1 = perkChoice1Button;
    const oldButton2 = perkChoice2Button;
    const newButton1 = oldButton1.cloneNode(true);
    const newButton2 = oldButton2.cloneNode(true);
    oldButton1.parentNode.replaceChild(newButton1, oldButton1);
    oldButton2.parentNode.replaceChild(newButton2, oldButton2);

    // Add listeners to the *new* buttons
    newButton1.addEventListener('click', () => game.applyPerkChoice(1), { once: true }); // Call game.js function
    newButton2.addEventListener('click', () => game.applyPerkChoice(2), { once: true }); // Call game.js function

    levelPerkOverlay.style.display = 'flex'; // Show the menu
}

export async function showWeaponChoiceMenu() {
    if (!weaponChoiceOverlay || !weaponChoice1Button || !weaponChoice2Button || !weapon1Name || !weapon1Desc || !weapon2Name || !weapon2Desc) {
        console.error("Weapon Choice Menu DOM elements not found!");
        return;
    }
    const game = await import('./game.js');
    // Needs gamePaused, player.className from game.js
    if (game.gamePaused) return; // Don't show if already paused for something else

    console.log("Showing Weapon Choice Menu for class:", player.className);
    game.gamePaused = true; // Pause game

    const choices = C.CLASS_WEAPON_CHOICES[player.className] || C.CLASS_WEAPON_CHOICES.default;
    if (!choices || choices.length < 2) {
        console.error("Weapon choices not defined correctly for class:", player.className);
        game.gamePaused = false; // Unpause if error
        return;
    }

    weaponChoiceTitle.textContent = "Choose Your Weapon";
    weapon1Name.textContent = choices[0].name;
    weapon1Desc.textContent = choices[0].desc;
    weapon2Name.textContent = choices[1].name;
    weapon2Desc.textContent = choices[1].desc;

    // Store weapon ID in dataset for the handler
    weaponChoice1Button.dataset.weaponId = choices[0].id;
    weaponChoice2Button.dataset.weaponId = choices[1].id;

    // Re-attach listeners using clone/replace
    const oldWButton1 = weaponChoice1Button;
    const oldWButton2 = weaponChoice2Button;
    const newWButton1 = oldWButton1.cloneNode(true);
    const newWButton2 = oldWButton2.cloneNode(true);
    oldWButton1.parentNode.replaceChild(newWButton1, oldWButton1);
    oldWButton2.parentNode.replaceChild(newWButton2, oldWButton2);

    newWButton1.addEventListener('click', game.handleWeaponChoice, { once: true }); // Call game.js handler
    newWButton2.addEventListener('click', game.handleWeaponChoice, { once: true }); // Call game.js handler

    weaponChoiceOverlay.style.display = 'flex';
}

export async function showPetChoiceMenu() {
    const petButtons = [petChoice1Button, petChoice2Button, petChoice3Button, petChoice4Button, petChoice5Button];
    if (!petChoiceOverlay || petButtons.some(b => !b)) {
         console.error("Pet Choice Menu DOM elements not found!");
         return;
    }
    const game = await import('./game.js');
    // Needs gamePaused, player.pet from game.js
    if (game.gamePaused || player.pet) return; // Don't show if paused or already has pet

    console.log("Showing Pet Choice Menu");
    game.gamePaused = true; // Pause game

    // Set button text from config
    const petTypes = ['frog', 'cat', 'beetle', 'bird', 'dog'];
    petButtons.forEach((button, index) => {
        const petType = petTypes[index];
        if (C.PET_DATA[petType]) {
            button.textContent = C.PET_DATA[petType].name;
        } else {
            button.textContent = "???"; // Placeholder if data missing
        }
    });


    // Re-attach listeners using clone/replace
    petButtons.forEach((button, index) => {
        const oldButton = button;
        const newButton = oldButton.cloneNode(true);
        oldButton.parentNode.replaceChild(newButton, oldButton); // Replace in DOM
        newButton.addEventListener('click', () => game.applyPetChoice(petTypes[index]), { once: true }); // Call game.js function
    });

    petChoiceOverlay.style.display = 'flex';
}


// --- Event Listeners for UI Buttons ---

// Close Crafting Menu Button
if (closeCraftingButton) {
    closeCraftingButton.addEventListener('click', async () => {
        const game = await import('./game.js');
        // Clear selection state if closing via button
        if (player.selectedInventoryItem) {
            player.selectedInventoryItem = null;
        }
        if (game.selectedUpgradeInput.slotIndex !== -1) {
            game.selectedUpgradeInput.slotIndex = -1;
            game.selectedUpgradeInput.source = null;
        }
        toggleCraftingMenu(); // Now call the toggle function
    });
} else { console.warn("Close Crafting Button not found."); }

// Close crafting menu if clicking outside content area
if (craftingMenuDiv) {
    craftingMenuDiv.addEventListener('click', (event) => {
        if (event.target === craftingMenuDiv && isCraftingMenuOpen) { // Check if click is on the overlay background
            toggleCraftingMenu();
        }
    });
} // Already checked craftingMenuDiv at top

// Class Selection Listeners
if (classSelect && startGameButton && classSelectionOverlay) {
    classSelect.addEventListener('change', () => {
        startGameButton.disabled = !(classSelect.value && C.CLASS_DATA[classSelect.value]);
    });

    startGameButton.addEventListener('click', async () => {
        const selectedClass = classSelect.value;
        if (!selectedClass || !C.CLASS_DATA[selectedClass]) {
            alert("Please select a valid class!");
            return;
        }
        const game = await import('./game.js');
        game.applyClassStats(selectedClass); // Call function from game.js
        classSelectionOverlay.style.display = 'none'; // Hide selection screen
        game.initializeGame(); // Call function from game.js to start everything
    });
} else { console.warn("Class selection elements not found."); }

// Upgrader button listener
if (integratedUpgradeButton) {
    integratedUpgradeButton.addEventListener('click', async () => {
         const game = await import('./game.js');
         game.doUpgrade(); // Call game.js function
    });
} else { console.warn("Integrated Upgrade Button not found."); }

console.log("--- ui.js loaded and initialized ---");