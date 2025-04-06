console.log("--- game.js started ---");

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthValueSpan = document.getElementById('healthValue');
const hungerValueSpan = document.getElementById('hungerValue');
const dayValueSpan = document.getElementById('dayValue');
const debugDiv = document.getElementById('debug');
const mainHotbarSlots = document.querySelectorAll('#hotbar .hotbar-slot'); // Select main game hotbar slots
const deathMessageDiv = document.getElementById('deathMessage');
// --- Combined Crafting Menu Elements ---
const craftingMenuDiv = document.getElementById('craftingMenu');
const craftingMenuTitle = document.getElementById('craftingMenuTitle'); // Reference to the title H2
// Player Column elements (These might be null if menu isn't displayed yet)
// const playerCraftingColumn = document.getElementById('playerCraftingColumn');
// const inventoryGrid = document.getElementById('inventoryGrid');
// const hotbarGrid = document.getElementById('hotbarGrid');
// const recipeList = document.getElementById('recipeList');
// Workbench Column elements (Might be null)
// const workbenchRecipeSection = document.getElementById('workbenchRecipeSection');
// const workbenchRecipeList = document.getElementById('workbenchRecipeList');
// Close button
const closeCraftingButton = document.getElementById('closeCraftingButton');
// Night overlay ref
const nightOverlay = document.getElementById('nightOverlay');


// --- Game Settings ---
const PLAYER_SPEED = 4;
const PLAYER_RADIUS = 15;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_MAX_HUNGER = 100;
const LIMB_RADIUS = 5;
const HAND_DISTANCE = PLAYER_RADIUS + 10;
const ATTACK_SWING_ARC = Math.PI / 2;
const ATTACK_DURATION = 150;
const INTERACT_DURATION = 100;
const ATTACK_RANGE = 60;
const BASE_ATTACK_POWER = 5; // Base power for hands/unspecified
const BASE_GATHER_POWER = 3; // Base gathering power for hands
const SWORD_MULTIPLIER = 2.0; // Multiplier for swords vs monsters
const AXE_MULTIPLIER = 3.0;   // Multiplier for axes vs trees
const PICKAXE_MULTIPLIER = 4.0; // Multiplier for pickaxes vs rocks
const FLASH_DURATION = 100;
const ITEM_PICKUP_RANGE_SQ = (PLAYER_RADIUS + 10) * (PLAYER_RADIUS + 10);
const DROPPED_ITEM_RADIUS = 5;
const INVENTORY_COLS = 8;
const INVENTORY_ROWS = 4;
const HOTBAR_SIZE = 5;
const MAX_STACK_SIZE = 64;
const PLACE_GRID_SIZE = 20;
const PLACE_RANGE_SQ = (PLAYER_RADIUS + 60) * (PLAYER_RADIUS + 60);
const INTERACT_RANGE_SQ = (PLAYER_RADIUS + 50) * (PLAYER_RADIUS + 50);
const HEAL_AMOUNT = 25; // How much the Healing Salve heals

const WORLD_WIDTH = 2000 * 10;
const WORLD_HEIGHT = 1500 * 10;
const ISLAND_PADDING = 150 * 3;

// Monster Settings
const MONSTER_SPEED = 1.8;
const MONSTER_DETECT_RANGE = 250;
const MONSTER_ATTACK_RANGE = 40;
const MONSTER_ATTACK_COOLDOWN = 1000;
const MONSTER_DAMAGE = 10;

const DAY_LENGTH = 60000; // 60 seconds day/night cycle
const NIGHT_START_PERCENT = 0.5; // Night starts halfway

// Simple lookup for item appearances and properties
const ITEM_DATA = {
    // Resources
    'wood': { color: '#A0522D', name: 'Wood', isPlaceable: false },
    'stone': { color: '#778899', name: 'Stone', isPlaceable: false },
    'plant_fiber': { color: '#9ACD32', name: 'Plant Fiber', isPlaceable: false },
    'monster_goop': { color: '#90EE90', name: 'Monster Goop', isPlaceable: false },
    // Crafted Materials / Placeables
    'stick': { color: '#B8860B', name: 'Stick', isPlaceable: false },
    'wood_plank': { color: '#DEB887', name: 'Wooden Plank', isPlaceable: true, solidRadius: PLACE_GRID_SIZE / 2 },
    'stone_block': { color: '#696969', name: 'Stone Block', isPlaceable: true, solidRadius: PLACE_GRID_SIZE / 2 },
    'workbench': { color: '#D2691E', name: 'Workbench', isPlaceable: true, solidRadius: PLACE_GRID_SIZE },
    // Consumables
    'healing_salve': { color: '#FFC0CB', name: 'Healing Salve', isPlaceable: false, isUsable: true },
    // Tools
    'wood_sword': { color: '#D2B48C', name: 'Wooden Sword', isPlaceable: false, type: 'tool', toolType: 'sword', damageMultiplier: SWORD_MULTIPLIER },
    'wood_axe': { color: '#8B4513', name: 'Wooden Axe', isPlaceable: false, type: 'tool', toolType: 'axe', gatherMultiplier: AXE_MULTIPLIER, target: 'tree'},
    'wood_pickaxe': { color: '#A0522D', name: 'Wooden Pickaxe', isPlaceable: false, type: 'tool', toolType: 'pickaxe', gatherMultiplier: PICKAXE_MULTIPLIER, target: 'rock'},
    'fishing_rod': { color: '#C0C0C0', name: 'Fishing Rod', isPlaceable: false, type: 'tool', toolType: 'fishing_rod' },
};

// --- Game State ---
let mouseCanvasX = 0; let mouseCanvasY = 0;
let worldMouseX = 0; let worldMouseY = 0;
let keysPressed = {};
let resources = []; let monsters = []; let solidObjects = [];
let droppedItems = [];
let gameTime = 0; let dayCount = 1; let isNight = false;
let isGameOver = false; let isCraftingMenuOpen = false; // Only one flag needed
let cameraX = 0; let cameraY = 0;

const player = {
    x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2,
    radius: PLAYER_RADIUS,
    health: PLAYER_MAX_HEALTH, hunger: PLAYER_MAX_HUNGER,
    angle: 0,
    isAttacking: false, attackTimer: 0,
    isInteracting: false, interactTimer: 0,
    inventorySlots: new Array(INVENTORY_COLS * INVENTORY_ROWS).fill(null),
    hotbarSlots: new Array(HOTBAR_SIZE).fill(null),
    selectedHotbarSlotIndex: 0,
    equippedItemType: null,
    selectedInventoryItem: null, // For moving items in 'E' menu
};

// --- Define Recipes ---
const recipes = [
    // Player Craftable
    { id: 'stick', name: "Stick (x4)", output: { type: 'stick', count: 4 }, input: { 'wood': 1 }, requiresWorkbench: false },
    { id: 'wood_plank', name: "Wooden Plank (x4)", output: { type: 'wood_plank', count: 4 }, input: { 'wood': 1 }, requiresWorkbench: false },
    { id: 'stone_block', name: "Stone Block", output: { type: 'stone_block', count: 1 }, input: { 'stone': 2 }, requiresWorkbench: false },
    { id: 'basic_workbench', name: "Workbench", output: { type: 'workbench', count: 1 }, input: { 'wood_plank': 5, 'stick': 2 }, requiresWorkbench: false },
    { id: 'healing_salve', name: "Healing Salve", output: { type: 'healing_salve', count: 1}, input: { 'plant_fiber': 3, 'monster_goop': 1}, requiresWorkbench: false },
    // Workbench Required
    { id: 'wood_sword', name: "Wooden Sword", output: { type: 'wood_sword', count: 1}, input: { 'wood_plank': 2, 'stick': 1}, requiresWorkbench: true },
    { id: 'wood_axe', name: "Wooden Axe", output: { type: 'wood_axe', count: 1}, input: { 'wood_plank': 3, 'stick': 2}, requiresWorkbench: true },
    { id: 'wood_pickaxe', name: "Wooden Pickaxe", output: { type: 'wood_pickaxe', count: 1}, input: { 'wood_plank': 3, 'stick': 2}, requiresWorkbench: true },
    { id: 'fishing_rod', name: "Fishing Rod", output: { type: 'fishing_rod', count: 1}, input: { 'stick': 3, 'plant_fiber': 2}, requiresWorkbench: true },
];

// --- Utility Functions ---
function distanceSq(x1, y1, x2, y2) { const dx = x1 - x2; const dy = y1 - y2; return dx * dx + dy * dy; }
function distance(x1, y1, x2, y2) { return Math.sqrt(distanceSq(x1, y1, x2, y2)); }
function normalizeAngle(angle) { while (angle <= -Math.PI) angle += 2 * Math.PI; while (angle > Math.PI) angle -= 2 * Math.PI; return angle; }
function clampCamera() { const camLeft = player.x - canvas.width / 2; const camTop = player.y - canvas.height / 2; const camRight = player.x + canvas.width / 2; const camBottom = player.y + canvas.height / 2; cameraX = player.x; cameraY = player.y; if (camLeft < 0) cameraX = canvas.width / 2; if (camRight > WORLD_WIDTH) cameraX = WORLD_WIDTH - canvas.width / 2; if (camTop < 0) cameraY = canvas.height / 2; if (camBottom > WORLD_HEIGHT) cameraY = WORLD_HEIGHT - canvas.height / 2; }
function canvasToWorld(canvasX, canvasY) { const worldOriginX = cameraX - canvas.width / 2; const worldOriginY = cameraY - canvas.height / 2; return { x: canvasX + worldOriginX, y: canvasY + worldOriginY }; }

// --- Item Handling Functions ---
function findFirstEmptyInventorySlot() { return player.inventorySlots.findIndex(slot => slot === null); }
function findItemStackableInventorySlot(itemType) { return player.inventorySlots.findIndex(slot => slot !== null && slot.type === itemType && slot.count < MAX_STACK_SIZE); }
function addDroppedItem(x, y, type, count = 1) { for (let i = 0; i < count; i++) { const offsetX = (Math.random() - 0.5) * 15; const offsetY = (Math.random() - 0.5) * 15; droppedItems.push({ id: `item_${Date.now()}_${Math.random()}`, x: x + offsetX, y: y + offsetY, type: type, radius: DROPPED_ITEM_RADIUS, spawnTime: Date.now() }); } }
function addToInventory(itemType, count = 1) { let remainingCount = count; while (remainingCount > 0) { const stackableSlotIndex = findItemStackableInventorySlot(itemType); if (stackableSlotIndex !== -1) { const slot = player.inventorySlots[stackableSlotIndex]; const canAdd = MAX_STACK_SIZE - slot.count; const amountToAdd = Math.min(remainingCount, canAdd); slot.count += amountToAdd; remainingCount -= amountToAdd; } else { break; } } while (remainingCount > 0) { const emptySlotIndex = findFirstEmptyInventorySlot(); if (emptySlotIndex !== -1) { const amountToAdd = Math.min(remainingCount, MAX_STACK_SIZE); player.inventorySlots[emptySlotIndex] = { type: itemType, count: amountToAdd }; remainingCount -= amountToAdd; } else { console.warn(`Inventory full! Could not add ${remainingCount} ${itemType}.`); remainingCount = 0; break; } } if (isCraftingMenuOpen) { populateCraftingMenu(isNearWorkbench()); } updateMainHotbarVisuals(); }
function removeFromInventory(itemType, count = 1) { let remainingToRemove = count; let removedSuccessfully = 0; for (let i = 0; i < player.inventorySlots.length && remainingToRemove > 0; i++) { const slot = player.inventorySlots[i]; if (slot && slot.type === itemType) { const amountToRemoveFromSlot = Math.min(remainingToRemove, slot.count); slot.count -= amountToRemoveFromSlot; remainingToRemove -= amountToRemoveFromSlot; removedSuccessfully += amountToRemoveFromSlot; if (slot.count <= 0) { player.inventorySlots[i] = null; } } } /* Check hotbar too if needed */ if (removedSuccessfully > 0) { if (isCraftingMenuOpen) { populateCraftingMenu(isNearWorkbench()); } updateMainHotbarVisuals(); } if(remainingToRemove > 0) { return false; } return true; }
function getTotalItemCount(itemType) { const invCount = player.inventorySlots.reduce((total, slot) => (slot && slot.type === itemType ? total + slot.count : total), 0); const hotbarCount = player.hotbarSlots.reduce((total, slot) => (slot && slot.type === itemType ? total + slot.count : total), 0); return invCount + hotbarCount; }

// --- Crafting Functions ---
function canCraft(recipe) { for (const itemId in recipe.input) { if (getTotalItemCount(itemId) < recipe.input[itemId]) return false; } return true; }
function doCraft(recipeId) { const recipe = recipes.find(r => r.id === recipeId); if (!recipe) return; if (canCraft(recipe)) { let success = true; const ingredientsToRemove = { ...recipe.input }; for (const itemId in ingredientsToRemove) { if (!removeFromInventory(itemId, ingredientsToRemove[itemId])) { success = false; break; } } if (success) { addToInventory(recipe.output.type, recipe.output.count); console.log(`%cCrafted ${recipe.output.count}x ${recipe.output.type}!`, 'color: cyan; font-weight: bold;'); if (isCraftingMenuOpen) populateCraftingMenu(isNearWorkbench()); } else { console.error(`Crafting failed for ${recipe.name} due to ingredient removal issue.`); } } else { console.log(`Cannot craft ${recipe.name} - missing ingredients.`); } }

// --- UI Interaction ('E' Menu - Item Moving) ---
function handleInventorySlotClick(index) { const clickedSlot = player.inventorySlots[index]; const selected = player.selectedInventoryItem; if (selected) { const originalSourceSlot = selected.source === 'inventory' ? player.inventorySlots : player.hotbarSlots; originalSourceSlot[selected.index] = clickedSlot; player.inventorySlots[index] = { type: selected.type, count: selected.count }; player.selectedInventoryItem = null; } else if (clickedSlot) { player.selectedInventoryItem = { index: index, type: clickedSlot.type, count: clickedSlot.count, source: 'inventory' }; } populateCraftingMenu(isNearWorkbench()); updateMainHotbarVisuals(); }
function handleHotbarSlotClick(index) { const clickedSlot = player.hotbarSlots[index]; const selected = player.selectedInventoryItem; if (selected) { const originalSourceSlot = selected.source === 'inventory' ? player.inventorySlots : player.hotbarSlots; originalSourceSlot[selected.index] = clickedSlot; player.hotbarSlots[index] = { type: selected.type, count: selected.count }; player.selectedInventoryItem = null; } else if (clickedSlot) { player.selectedInventoryItem = { index: index, type: clickedSlot.type, count: clickedSlot.count, source: 'hotbar' }; } populateCraftingMenu(isNearWorkbench()); updateMainHotbarVisuals(); updateEquippedItem(); }

// --- Update Combined Crafting Menu Display ---
function populateCraftingMenu(isNearWorkbench) { // Pass proximity flag
    if (!craftingMenuDiv) return;
    // Grab element references dynamically as they might be inside the hidden menu initially
    const inventoryGrid = document.getElementById('inventoryGrid');
    const hotbarGrid = document.getElementById('hotbarGrid');
    const playerRecipeList = document.getElementById('recipeList');
    const workbenchRecipeList = document.getElementById('workbenchRecipeList');

    if (!inventoryGrid || !hotbarGrid || !playerRecipeList || !workbenchRecipeList) {
        console.error("Missing UI elements for combined crafting menu!"); return;
    }

    inventoryGrid.style.setProperty('--inventory-cols', INVENTORY_COLS);
    hotbarGrid.style.setProperty('--hotbar-size', HOTBAR_SIZE);

    // --- Populate Player Column ---
    // Inventory Grid
    inventoryGrid.innerHTML = '';
    player.inventorySlots.forEach((item, index) => { const slotDiv = document.createElement('div'); slotDiv.classList.add('inventory-slot'); slotDiv.dataset.index = index; if (item) { const itemData = ITEM_DATA[item.type] || { color: 'white', name: item.type }; slotDiv.title = itemData.name; const iconDiv = document.createElement('div'); iconDiv.classList.add('item-icon'); iconDiv.style.backgroundColor = itemData.color; slotDiv.appendChild(iconDiv); if (item.count > 1) { const countSpan = document.createElement('span'); countSpan.classList.add('item-count'); countSpan.textContent = item.count; slotDiv.appendChild(countSpan); } } if (player.selectedInventoryItem && player.selectedInventoryItem.source === 'inventory' && player.selectedInventoryItem.index === index) { slotDiv.classList.add('selected-for-move'); if(item) slotDiv.style.opacity = '0.5'; } slotDiv.addEventListener('click', () => handleInventorySlotClick(index)); inventoryGrid.appendChild(slotDiv); });
    // Hotbar Grid (in Menu)
    hotbarGrid.innerHTML = '';
     player.hotbarSlots.forEach((item, index) => { const slotDiv = document.createElement('div'); slotDiv.classList.add('hotbar-menu-slot'); slotDiv.dataset.index = index; if (item) { const itemData = ITEM_DATA[item.type] || { color: 'white', name: item.type }; slotDiv.title = itemData.name; const iconDiv = document.createElement('div'); iconDiv.classList.add('item-icon'); iconDiv.style.backgroundColor = itemData.color; slotDiv.appendChild(iconDiv); if (item.count > 1) { const countSpan = document.createElement('span'); countSpan.classList.add('item-count'); countSpan.textContent = item.count; slotDiv.appendChild(countSpan); } } if (player.selectedInventoryItem && player.selectedInventoryItem.source === 'hotbar' && player.selectedInventoryItem.index === index) { slotDiv.classList.add('selected-for-move'); if(item) slotDiv.style.opacity = '0.5'; } slotDiv.addEventListener('click', () => handleHotbarSlotClick(index)); hotbarGrid.appendChild(slotDiv); });
    // Player Recipe List
    playerRecipeList.innerHTML = ''; const playerRecipes = recipes.filter(recipe => !recipe.requiresWorkbench); if (playerRecipes.length === 0) { playerRecipeList.innerHTML = `<li>No player recipes available.</li>`; } else { playerRecipes.forEach(recipe => { const li = document.createElement('li'); const canCurrentlyCraft = canCraft(recipe); let ingredientsHTML = ''; for (const itemId in recipe.input) { const required = recipe.input[itemId]; const owned = getTotalItemCount(itemId); const missingClass = owned < required ? 'missing' : ''; const itemName = (ITEM_DATA[itemId]?.name || itemId).replace(/_/g, ' '); ingredientsHTML += `<span class="ingredient ${missingClass}">${itemName}: ${owned}/${required}</span>`; } li.innerHTML = `<div><strong>${recipe.name}</strong><div class="recipe-details">${ingredientsHTML}</div></div><button data-recipe-id="${recipe.id}" ${canCurrentlyCraft ? '' : 'disabled'}>Craft</button>`; const craftButton = li.querySelector('button'); if(craftButton) { craftButton.addEventListener('click', () => { doCraft(recipe.id); }); } playerRecipeList.appendChild(li); }); }

    // --- Populate Workbench Column (Conditionally) ---
    workbenchRecipeList.innerHTML = ''; // Clear workbench list always
    if (isNearWorkbench) {
        const workbenchRecipes = recipes.filter(recipe => recipe.requiresWorkbench === true);
        if (workbenchRecipes.length === 0) { workbenchRecipeList.innerHTML = `<li>No workbench recipes available yet.</li>`; }
        else { workbenchRecipes.forEach(recipe => { const li = document.createElement('li'); const canCurrentlyCraft = canCraft(recipe); let ingredientsHTML = ''; for (const itemId in recipe.input) { const required = recipe.input[itemId]; const owned = getTotalItemCount(itemId); const missingClass = owned < required ? 'missing' : ''; const itemName = (ITEM_DATA[itemId]?.name || itemId).replace(/_/g, ' '); ingredientsHTML += `<span class="ingredient ${missingClass}">${itemName}: ${owned}/${required}</span>`; } li.innerHTML = `<div><strong>${recipe.name}</strong><div class="recipe-details">${ingredientsHTML}</div></div><button data-recipe-id="${recipe.id}" ${canCurrentlyCraft ? '' : 'disabled'}>Craft</button>`; const craftButton = li.querySelector('button'); if (craftButton) { craftButton.addEventListener('click', () => { doCraft(recipe.id); }); } workbenchRecipeList.appendChild(li); }); }
    }
    // CSS class 'workbench-active' handles visibility of the column
}
function toggleCraftingMenu() { isCraftingMenuOpen = !isCraftingMenuOpen; if (isCraftingMenuOpen) { const nearWorkbench = isNearWorkbench(); populateCraftingMenu(nearWorkbench); craftingMenuDiv.classList.toggle('workbench-active', nearWorkbench); craftingMenuDiv.style.display = 'flex'; craftingMenuTitle.textContent = nearWorkbench ? 'Crafting / Workbench' : 'Crafting'; } else { craftingMenuDiv.style.display = 'none'; craftingMenuDiv.classList.remove('workbench-active'); if (player.selectedInventoryItem) { player.selectedInventoryItem = null; } } }

// --- Helper Function to Check Workbench Proximity ---
function isNearWorkbench() { for (const obj of solidObjects) { if (obj.isPlaced && obj.type === 'workbench') { const distSq = distanceSq(player.x, player.y, obj.x, obj.y); if (distSq < INTERACT_RANGE_SQ) { if (distSq > (player.radius + obj.radius - 5) * (player.radius + obj.radius - 5) ) { return true; } } } } return false; }

// --- Update Main Hotbar Visuals ---
function updateMainHotbarVisuals() { mainHotbarSlots.forEach((slotDiv, index) => { const item = player.hotbarSlots[index]; slotDiv.innerHTML = `<span style="opacity: 0.5; position: absolute; top: 5px; left: 5px;">${index + 1}</span>`; if (item) { const itemData = ITEM_DATA[item.type] || { color: 'white', name: item.type }; const iconDiv = document.createElement('div'); iconDiv.classList.add('item-icon'); iconDiv.style.backgroundColor = itemData.color; slotDiv.appendChild(iconDiv); if (item.count > 1) { const countSpan = document.createElement('span'); countSpan.classList.add('item-count'); countSpan.textContent = item.count; slotDiv.appendChild(countSpan); } } }); }

// --- Collision Detection ---
function checkCollision(entityRadius, potentialX, potentialY, checkAgainst = solidObjects) { for (const solid of checkAgainst) { if (solid && typeof solid.x === 'number' && typeof solid.y === 'number' && typeof solid.radius === 'number') { const distSq = distanceSq(potentialX, potentialY, solid.x, solid.y); const radiiSumSq = (entityRadius + solid.radius) * (entityRadius + solid.radius); if (distSq < radiiSumSq) { return solid; } } } return null; }

// --- Initialization ---
function spawnInitialResources() { resources = []; solidObjects = []; const landWidth = WORLD_WIDTH - ISLAND_PADDING * 2; const landHeight = WORLD_HEIGHT - ISLAND_PADDING * 2; const targetResourceDensity = 0.0001; const numResources = Math.floor(landWidth * landHeight * targetResourceDensity); const treeRatio = 0.6; console.log(`Spawning approx ${numResources} resources...`); for (let i = 0; i < numResources; i++) { const isTree = Math.random() < treeRatio; const baseMaxHealth = isTree ? 100 : 150; const resource = { id: `res_${Date.now()}_${Math.random()}`, x: ISLAND_PADDING + Math.random() * landWidth, y: ISLAND_PADDING + Math.random() * landHeight, radius: isTree ? (12 + Math.random() * 6) : (10 + Math.random() * 4), type: isTree ? 'tree' : 'rock', color: isTree ? '#654321' : '#808080', maxHealth: baseMaxHealth * 2, health: baseMaxHealth * 2, flashUntil: 0, isAttackable: true, isSolid: true, isPlaced: false }; if (distanceSq(resource.x, resource.y, player.x, player.y) > (200 * 200)) { resources.push(resource); solidObjects.push(resource); } else { i--; } } console.log(`Spawned ${resources.length} actual resources.`); }
function spawnInitialMonsters() { monsters = []; const landWidth = WORLD_WIDTH - ISLAND_PADDING * 2; const landHeight = WORLD_HEIGHT - ISLAND_PADDING * 2; const targetMonsterDensity = 0.00002; const numMonsters = Math.floor(landWidth * landHeight * targetMonsterDensity); const baseMonsterHealth = 50; console.log(`Spawning approx ${numMonsters} monsters...`); for (let i = 0; i < numMonsters; i++) { const monster = { id: `mon_${Date.now()}_${Math.random()}`, x: ISLAND_PADDING + Math.random() * landWidth, y: ISLAND_PADDING + Math.random() * landHeight, radius: 10 + Math.random() * 5, type: 'slime', color: '#DC143C', maxHealth: baseMonsterHealth * 2, health: baseMonsterHealth * 2, flashUntil: 0, state: 'idle', attackCooldown: MONSTER_ATTACK_COOLDOWN, lastAttackTime: 0, target: null, isAttackable: true, isSolid: false, }; if (distanceSq(monster.x, monster.y, player.x, player.y) > (200 * 200)) { monsters.push(monster); } else { i--; } } console.log(`Spawned ${monsters.length} actual monsters.`); }

// --- Input Handling ---
document.addEventListener('keydown', (event) => { if (isGameOver) return; const key = event.key.toLowerCase(); if (key === 'e') { toggleCraftingMenu(); keysPressed[key] = false; return; } if (key === 'escape') { if (isCraftingMenuOpen) { toggleCraftingMenu(); } keysPressed[key] = false; return; } if (isCraftingMenuOpen) return; keysPressed[key] = true; if (!isNaN(parseInt(key)) && parseInt(key) >= 1 && parseInt(key) <= HOTBAR_SIZE) { selectHotbar(parseInt(key) - 1); } });
document.addEventListener('keyup', (event) => { keysPressed[event.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (event) => { if (isGameOver) return; const rect = canvas.getBoundingClientRect(); mouseCanvasX = event.clientX - rect.left; mouseCanvasY = event.clientY - rect.top; const worldCoords = canvasToWorld(mouseCanvasX, mouseCanvasY); worldMouseX = worldCoords.x; worldMouseY = worldCoords.y; });
canvas.addEventListener('mousedown', (event) => { if (isGameOver || isCraftingMenuOpen) return; if (event.button === 0) { if (!player.isAttacking && !player.isInteracting) { player.isAttacking = true; player.attackTimer = Date.now(); tryAttack(); } } else if (event.button === 2) { if (!player.isInteracting && !player.isAttacking) { player.isInteracting = true; player.interactTimer = Date.now(); tryInteract(); } } });
closeCraftingButton.addEventListener('click', () => { if (player.selectedInventoryItem) { player.selectedInventoryItem = null; } toggleCraftingMenu(); });
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

// --- Action Functions ---
function findNearestObject(x, y, rangeSq, filterFn = () => true) { let closestObject = null; let minDistanceSq = rangeSq; for (const obj of solidObjects) { if (obj.isPlaced && filterFn(obj)) { const distSq = distanceSq(x, y, obj.x, obj.y); if (distSq < minDistanceSq && distSq < (obj.radius + PLAYER_RADIUS) * (obj.radius + PLAYER_RADIUS)) { minDistanceSq = distSq; closestObject = obj; } } } return closestObject; }
function decrementHotbarItem(index) { const slot = player.hotbarSlots[index]; if (!slot) return false; slot.count--; if (slot.count <= 0) { player.hotbarSlots[index] = null; } updateMainHotbarVisuals(); updateEquippedItem(); if (isCraftingMenuOpen) { populateCraftingMenu(isNearWorkbench()); } return true; }
function tryAttack() { let bestTarget = null; let minTargetDistSq = (ATTACK_RANGE + player.radius) * (ATTACK_RANGE + player.radius); const attackables = [...monsters, ...resources]; const attackCheckX = player.x + Math.cos(player.angle) * (player.radius); const attackCheckY = player.y + Math.sin(player.angle) * (player.radius); for (const target of attackables) { if (!target || target.health <= 0) continue; const distSq = distanceSq(attackCheckX, attackCheckY, target.x, target.y); if (distSq < minTargetDistSq && distSq < (target.radius + ATTACK_RANGE) * (target.radius + ATTACK_RANGE) ) { const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x); const angleDiff = Math.abs(normalizeAngle(player.angle - angleToTarget)); if (angleDiff < ATTACK_SWING_ARC / 2 + 0.5) { minTargetDistSq = distSq; bestTarget = target; } } } if (bestTarget) { bestTarget.flashUntil = Date.now() + FLASH_DURATION; let damageDealt = 0; const equippedItemSlot = player.hotbarSlots[player.selectedHotbarSlotIndex]; const equippedItemType = equippedItemSlot ? equippedItemSlot.type : null; const equippedItemData = equippedItemType ? ITEM_DATA[equippedItemType] : null; const targetIsMonster = monsters.some(m => m.id === bestTarget.id); const targetIsTree = bestTarget.type === 'tree'; const targetIsRock = bestTarget.type === 'rock'; const targetIsPlaced = bestTarget.isPlaced; if (equippedItemData && equippedItemData.type === 'tool') { if (targetIsMonster && equippedItemData.toolType === 'sword') { damageDealt = BASE_ATTACK_POWER * equippedItemData.damageMultiplier; } else if (targetIsTree && equippedItemData.toolType === 'axe') { damageDealt = BASE_GATHER_POWER * equippedItemData.gatherMultiplier; } else if (targetIsRock && equippedItemData.toolType === 'pickaxe') { damageDealt = BASE_GATHER_POWER * equippedItemData.gatherMultiplier; } else if (targetIsPlaced && (equippedItemData.toolType === 'axe' || equippedItemData.toolType === 'pickaxe')) { damageDealt = BASE_GATHER_POWER * 2.0; } else { damageDealt = BASE_ATTACK_POWER / 2; } } else { damageDealt = targetIsMonster ? BASE_ATTACK_POWER : BASE_GATHER_POWER; } bestTarget.health -= damageDealt; console.log(`${bestTarget.type} hit for ${damageDealt.toFixed(1)} damage. Health: ${bestTarget.health.toFixed(1)}/${bestTarget.maxHealth}`); if (bestTarget.health <= 0) { console.log(`%cDestroyed ${bestTarget.type}!`, 'color: orange; font-weight: bold;'); const dropX = bestTarget.x; const dropY = bestTarget.y; let itemsToDrop = []; if (bestTarget.type === 'tree') { itemsToDrop.push({ type: 'wood', count: 1 + Math.floor(Math.random() * 3) }); if (Math.random() < 0.2) itemsToDrop.push({ type: 'plant_fiber', count: 1 }); } else if (bestTarget.type === 'rock') { itemsToDrop.push({ type: 'stone', count: 1 + Math.floor(Math.random() * 2) }); } else if (targetIsMonster) { itemsToDrop.push({ type: 'monster_goop', count: 1 }); if (Math.random() < 0.1) itemsToDrop.push({ type: 'healing_salve', count: 1}); } else if (targetIsPlaced) { itemsToDrop.push({ type: bestTarget.type, count: 1}); } itemsToDrop.forEach(drop => { addDroppedItem(dropX, dropY, drop.type, drop.count); }); if (bestTarget.isSolid) { solidObjects = solidObjects.filter(s => s.id !== bestTarget.id); } if (targetIsMonster) { monsters = monsters.filter(m => m.id !== bestTarget.id); } else { resources = resources.filter(r => r.id !== bestTarget.id); } } } }
function tryInteract() { const equippedItem = player.hotbarSlots[player.selectedHotbarSlotIndex]; const itemType = equippedItem ? equippedItem.type : null; const itemData = itemType ? ITEM_DATA[itemType] : null; if (equippedItem && itemData && itemData.isUsable) { if (itemType === 'healing_salve') { if (player.health < PLAYER_MAX_HEALTH) { player.health += HEAL_AMOUNT; player.health = Math.min(player.health, PLAYER_MAX_HEALTH); console.log(`Used Healing Salve. Health: ${Math.floor(player.health)}/${PLAYER_MAX_HEALTH}`); decrementHotbarItem(player.selectedHotbarSlotIndex); return; } else { return; } } return; } /* Removed workbench check */ if (equippedItem && itemData && itemData.isPlaceable) { const gridX = Math.round(worldMouseX / PLACE_GRID_SIZE) * PLACE_GRID_SIZE; const gridY = Math.round(worldMouseY / PLACE_GRID_SIZE) * PLACE_GRID_SIZE; if (distanceSq(player.x, player.y, gridX, gridY) > PLACE_RANGE_SQ) { return; } const collisionRadius = itemData.solidRadius || PLACE_GRID_SIZE / 2; if (checkCollision(collisionRadius, gridX, gridY)) { return; } if (distanceSq(player.x, player.y, gridX, gridY) < (player.radius + collisionRadius) * (player.radius + collisionRadius)) { return; } const placedObject = { id: `placed_${Date.now()}_${Math.random()}`, x: gridX, y: gridY, radius: collisionRadius, type: itemType, color: itemData.color, maxHealth: 100, health: 100, flashUntil: 0, isAttackable: true, isSolid: true, isPlaced: true, }; resources.push(placedObject); solidObjects.push(placedObject); decrementHotbarItem(player.selectedHotbarSlotIndex); return; } }
function selectHotbar(index) { if (index < 0 || index >= HOTBAR_SIZE) return; player.selectedHotbarSlotIndex = index; mainHotbarSlots.forEach((slot, i) => { slot.classList.toggle('selected', i === index); }); updateEquippedItem(); }
function updateEquippedItem() { const equippedSlotContent = player.hotbarSlots[player.selectedHotbarSlotIndex]; player.equippedItemType = equippedSlotContent ? equippedSlotContent.type : null; }

// --- Update Functions ---
function updatePlayer(deltaTime) { if (isGameOver || isCraftingMenuOpen ) return; let dx = 0; let dy = 0; if (keysPressed['w']) dy -= 1; if (keysPressed['s']) dy += 1; if (keysPressed['a']) dx -= 1; if (keysPressed['d']) dx += 1; const magnitude = Math.sqrt(dx * dx + dy * dy); if (magnitude > 0) { dx = (dx / magnitude) * PLAYER_SPEED; dy = (dy / magnitude) * PLAYER_SPEED; } else { dx = 0; dy = 0; } let potentialX = player.x + dx; let potentialY = player.y + dy; if (dx !== 0 && checkCollision(player.radius, potentialX, player.y)) { potentialX = player.x; dx = 0; } if (dy !== 0 && checkCollision(player.radius, potentialX, potentialY)) { potentialY = player.y; dy = 0; } player.x = potentialX; player.y = potentialY; player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x)); player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y)); for (let i = droppedItems.length - 1; i >= 0; i--) { const item = droppedItems[i]; const distSq = distanceSq(player.x, player.y, item.x, item.y); if (distSq < ITEM_PICKUP_RANGE_SQ) { addToInventory(item.type, 1); droppedItems.splice(i, 1); } } const aimDx = worldMouseX - player.x; const aimDy = worldMouseY - player.y; player.angle = Math.atan2(aimDy, aimDx); const now = Date.now(); if (player.isAttacking && now - player.attackTimer > ATTACK_DURATION) { player.isAttacking = false; } if (player.isInteracting && now - player.interactTimer > INTERACT_DURATION) { player.isInteracting = false;} if (player.health <= 0 && !isGameOver) { isGameOver = true; deathMessageDiv.style.display = 'block'; console.error("Player Died!"); } }
function updateMonsters(deltaTime) { if (isGameOver || isCraftingMenuOpen ) return; const now = Date.now(); monsters.forEach(monster => { if (monster.health <= 0) return; const distToPlayerSq = distanceSq(monster.x, monster.y, player.x, player.y); const angleToPlayer = Math.atan2(player.y - monster.y, player.x - monster.x); if (distToPlayerSq > MONSTER_DETECT_RANGE * MONSTER_DETECT_RANGE) { monster.state = 'idle'; monster.target = null; } else if (distToPlayerSq <= MONSTER_ATTACK_RANGE * MONSTER_ATTACK_RANGE) { monster.state = 'attacking'; monster.target = player; } else { monster.state = 'chasing'; monster.target = player; } let dx = 0; let dy = 0; if (monster.state === 'chasing') { dx = Math.cos(angleToPlayer) * MONSTER_SPEED; dy = Math.sin(angleToPlayer) * MONSTER_SPEED; } if (dx !== 0 || dy !== 0) { let potentialX = monster.x + dx; let potentialY = monster.y + dy; if (dx !== 0 && checkCollision(monster.radius, potentialX, monster.y)) { potentialX = monster.x; dx = 0; } if (dy !== 0 && checkCollision(monster.radius, potentialX, potentialY)) { potentialY = monster.y; dy = 0; } monster.x = potentialX; monster.y = potentialY; } if (monster.state === 'attacking') { if (now - monster.lastAttackTime > monster.attackCooldown) { player.health -= MONSTER_DAMAGE; player.health = Math.max(0, player.health); monster.lastAttackTime = now; document.getElementById('gameContainer').style.boxShadow = 'inset 0 0 30px 10px rgba(255,0,0,0.5)'; setTimeout(()=> { document.getElementById('gameContainer').style.boxShadow = ''; }, 150); } } monster.x = Math.max(monster.radius, Math.min(WORLD_WIDTH - monster.radius, monster.x)); monster.y = Math.max(monster.radius, Math.min(WORLD_HEIGHT - monster.radius, monster.y)); }); }
function updateWorld(deltaTime) { if (isGameOver || isCraftingMenuOpen ) return; gameTime += deltaTime; const cycleTime = gameTime % DAY_LENGTH; const newDayCount = Math.floor(gameTime / DAY_LENGTH) + 1; if (newDayCount > dayCount) { dayCount = newDayCount; console.log(`Starting Day ${dayCount}`); } const wasNight = isNight; isNight = cycleTime > DAY_LENGTH * NIGHT_START_PERCENT; if (isNight && !wasNight) { nightOverlay.classList.add('active'); /* console.log("Night begins!"); */ } else if (!isNight && wasNight) { nightOverlay.classList.remove('active'); /* console.log("Day begins!"); */ } }
function updateUI() { healthValueSpan.textContent = Math.floor(player.health); hungerValueSpan.textContent = Math.floor(player.hunger); dayValueSpan.textContent = dayCount; debugDiv.textContent = `World: (${Math.round(player.x)}, ${Math.round(player.y)}) | Mouse: (${Math.round(worldMouseX)}, ${Math.round(worldMouseY)}) | Res: ${resources.length} | Mon: ${monsters.length} | Items: ${droppedItems.length}`; }
function update(deltaTime) { if (isGameOver) return; if (!deltaTime) return; updatePlayer(deltaTime); updateMonsters(deltaTime); updateWorld(deltaTime); clampCamera(); updateUI(); }

// --- Draw Functions ---
function drawWorldBackground() { ctx.fillStyle = '#8FBC8F'; ctx.fillRect(ISLAND_PADDING, ISLAND_PADDING, WORLD_WIDTH - ISLAND_PADDING * 2, WORLD_HEIGHT - ISLAND_PADDING * 2); }
function drawResources() { const now = Date.now(); resources.forEach(res => { ctx.save(); ctx.translate(res.x, res.y); if (res.health < res.maxHealth && res.health > 0 && res.isAttackable) { const barWidth = res.radius * 1.5; const barHeight = 5; const barY = -res.radius - barHeight - 3; ctx.fillStyle = '#666'; ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight); let healthColor = res.type === 'tree' ? '#228B22' : (res.type === 'rock' ? '#A9A9A9' : '#DDD'); ctx.fillStyle = healthColor; ctx.fillRect(-barWidth / 2, barY, barWidth * (res.health / res.maxHealth), barHeight); } const baseColor = res.color || ITEM_DATA[res.type]?.color || 'magenta'; if (res.flashUntil > now) { ctx.fillStyle = (Math.floor(now / 50) % 2 === 0) ? '#FFFFFF' : baseColor; } else { ctx.fillStyle = baseColor; } if(res.type === 'workbench' || res.type === 'stone_block' || res.type === 'wood_plank') { ctx.fillRect(-res.radius, -res.radius, res.radius * 2, res.radius * 2); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(-res.radius, -res.radius, res.radius * 2, res.radius * 2); } else { ctx.beginPath(); ctx.arc(0, 0, res.radius, 0, Math.PI * 2); ctx.fill(); if (res.type === 'tree') { ctx.fillStyle = '#A0522D'; const trunkWidth = res.radius * 0.4; const trunkHeight = res.radius * 0.6; ctx.fillRect(-trunkWidth / 2, 0, trunkWidth, trunkHeight); } } ctx.restore(); }); }
function drawMonsters() { const now = Date.now(); monsters.forEach(mon => { ctx.save(); ctx.translate(mon.x, mon.y); if (mon.health < mon.maxHealth && mon.health > 0) { const barWidth = mon.radius * 1.5; const barHeight = 4; const barY = -mon.radius - barHeight - 2; ctx.fillStyle = '#550000'; ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight); ctx.fillStyle = '#FF0000'; ctx.fillRect(-barWidth / 2, barY, barWidth * (mon.health / mon.maxHealth), barHeight); } if (mon.flashUntil > now) { ctx.fillStyle = (Math.floor(now / 50) % 2 === 0) ? '#FFFFFF' : mon.color; } else { ctx.fillStyle = mon.color; } ctx.beginPath(); ctx.arc(0, 0, mon.radius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "black"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }); }
function drawDroppedItems() { ctx.save(); droppedItems.forEach(item => { ctx.beginPath(); switch (item.type) { case 'wood': ctx.fillStyle = '#A0522D'; break; case 'stone': ctx.fillStyle = '#778899'; break; case 'wood_plank': ctx.fillStyle = '#DEB887'; break; case 'stone_block': ctx.fillStyle = '#696969'; break; case 'monster_goop': ctx.fillStyle = '#90EE90'; break; case 'plant_fiber': ctx.fillStyle = '#9ACD32'; break; case 'workbench': ctx.fillStyle = '#D2691E'; break; case 'healing_salve': ctx.fillStyle = '#FFC0CB'; break; case 'stick': ctx.fillStyle = '#B8860B'; break; case 'wood_sword': ctx.fillStyle = '#D2B48C'; break; case 'wood_axe': ctx.fillStyle = '#8B4513'; break; case 'wood_pickaxe': ctx.fillStyle = '#A0522D'; break; case 'fishing_rod': ctx.fillStyle = '#C0C0C0'; break; default: ctx.fillStyle = '#FFFFFF'; } ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'black'; ctx.lineWidth = 1; ctx.stroke(); }); ctx.restore(); }
function drawPlayer() { ctx.save(); ctx.translate(player.x, player.y); ctx.fillStyle = '#87CEEB'; ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#4682B4'; ctx.lineWidth = 2; ctx.stroke(); let handBaseAngle = player.angle; let handDist = HAND_DISTANCE; let currentHandAngle = handBaseAngle; let rightHandRelativeAngle = handBaseAngle + Math.PI / 4; if (player.isAttacking) { const attackProgress = (Date.now() - player.attackTimer) / ATTACK_DURATION; const swing = Math.sin(attackProgress * Math.PI) * ATTACK_SWING_ARC; currentHandAngle = handBaseAngle + swing - ATTACK_SWING_ARC / 2; rightHandRelativeAngle = currentHandAngle + Math.PI / 4; } else if (player.isInteracting) { const interactProgress = (Date.now() - player.interactTimer) / INTERACT_DURATION; const pulse = Math.sin(interactProgress * Math.PI) * 5; handDist += pulse; currentHandAngle = handBaseAngle; rightHandRelativeAngle = currentHandAngle + Math.PI / 4; } const handAngleOffset = Math.PI / 4; const leftHandX = Math.cos(currentHandAngle - handAngleOffset) * handDist; const leftHandY = Math.sin(currentHandAngle - handAngleOffset) * handDist; const rightHandX = Math.cos(currentHandAngle + handAngleOffset) * handDist; const rightHandY = Math.sin(currentHandAngle + handAngleOffset) * handDist; ctx.fillStyle = '#FFDAB9'; ctx.beginPath(); ctx.arc(leftHandX, leftHandY, LIMB_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(rightHandX, rightHandY, LIMB_RADIUS, 0, Math.PI * 2); ctx.fill(); if (player.equippedItemType) { const itemData = ITEM_DATA[player.equippedItemType]; if (itemData) { ctx.save(); const itemSize = 10; const itemDist = handDist + LIMB_RADIUS + itemSize * 0.6; const itemX = Math.cos(rightHandRelativeAngle) * itemDist; const itemY = Math.sin(rightHandRelativeAngle) * itemDist; ctx.translate(itemX, itemY); ctx.rotate(rightHandRelativeAngle); ctx.fillStyle = itemData.color; ctx.fillRect(-itemSize / 2, -itemSize / 2, itemSize, itemSize); ctx.strokeStyle = 'black'; ctx.lineWidth = 1; ctx.strokeRect(-itemSize / 2, -itemSize / 2, itemSize, itemSize); ctx.restore(); } } ctx.restore(); }
function draw() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(canvas.width / 2 - cameraX, canvas.height / 2 - cameraY); drawWorldBackground(); drawResources(); drawMonsters(); drawDroppedItems(); drawPlayer(); ctx.restore(); }

// --- Game Loop ---
let lastTime = 0;
function gameLoop(timestamp) { const deltaTime = timestamp - lastTime; lastTime = timestamp; update(deltaTime || 0); draw(); if (!isGameOver) { requestAnimationFrame(gameLoop); } }

// --- Start Game ---
spawnInitialResources(); spawnInitialMonsters();
selectHotbar(0);
updateMainHotbarVisuals();
clampCamera(); updateUI();
requestAnimationFrame(gameLoop);