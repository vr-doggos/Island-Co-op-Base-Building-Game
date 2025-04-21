import * as C from './config.js';
import * as U from './utils.js';
// Import UI functions needed by game logic (e.g., showing menus, updating display)
import {
    updateUI, showLevel3PerkMenu, showWeaponChoiceMenu, showPetChoiceMenu,
    populateCraftingMenu, updateMainHotbarVisuals, drawMinimap,
    levelPerkOverlay, // Needed for applyPerkChoice
    weaponChoiceOverlay, // Needed for handleWeaponChoice
    petChoiceOverlay, // Needed for applyPetChoice
    ctx, canvas, // Canvas context and element for drawing
    isMouseDown // Import mouse state for attack logic
} from './ui.js';

console.log("--- game.js loading ---");

// --- Game State ---
// Export state variables needed by ui.js or potentially other modules
export let keysPressed = {}; // Shared input state (modified by ui.js)
export let resources = [];
export let monsters = [];
export let solidObjects = []; // Includes walls, placed items, bosses, player
export let bosses = [];
export let walls = []; // Specific array for wall geometry/LOS checks/tier removal
export let projectiles = [];
export let droppedItems = [];
export let undeadMinions = [];
export let summonedSlimes = [];
export let gameTime = 0;
export let dayCount = 1;
export let isNight = false;
export let currentNightOpacity = 0;
export let isGameOver = false;
export let isCraftingMenuOpen = false; // UI state, but affects game pause
export let isUpgraderUIOpen = false;   // Derived state, not directly set often
export let selectedUpgradeInput = { slotIndex: -1, source: null }; // State for upgrader UI logic
export let cameraX = C.WORLD_WIDTH / 2;
export let cameraY = C.WORLD_HEIGHT / 2;
export let isMinimapVisible = true; // UI state, controlled by ui.js potentially
export let gameHasStarted = false;
export let forestWolfDefeated = false; // Boss progression flag
export let gamePaused = false; // Controls pausing for menus


// --- Player Object ---
// Exported because many functions/modules need to read/write player properties
export const player = {
    x: C.WORLD_WIDTH / 2, y: C.WORLD_HEIGHT / 2, radius: C.PLAYER_RADIUS, id: 'player',
    health: C.PLAYER_MAX_HEALTH, maxHealth: C.PLAYER_MAX_HEALTH, hunger: C.PLAYER_MAX_HUNGER,
    level: 1, currentXP: 0, xpToNextLevel: C.BASE_XP_FOR_LEVEL_2,
    monsterKillCount: 0, // Used by Necromancer
    hasChosenLevel3Perk: false,
    pet: null, // Holds the pet object if chosen
    // Class specific base stats (applied by applyClassStats)
    className: null,
    speedMultiplier: 1.0,
    swordMultiplierBoost: 1.0,
    bowMultiplierBoost: 1.0,
    lifesteal: 0,
    daySpeedPenalty: 1.0,
    // Perks (applied by applyPerkChoice)
    bonusMaxHealth: 0, // Temporary storage before applying to maxHealth
    bonusSwordDamage: 0,
    bonusMeleeDamage: 0, // Generic melee bonus
    bonusMovementSpeedMult: 1.0,
    bonusBowAttackSpeedMult: 1.0,
    bonusLifesteal: 0,
    bonusNightSpeedMult: 1.0,
    bonusDaySpeedPenaltyMult: 1.0,
    bonusNecromancyChance: 0, // Example placeholder
    bonusUndeadHealthMult: 1.0,
    bonusMaxSummons: 0, // Shared by Necro/Summoner
    bonusSummonHealthMult: 1.0, // Summoner specific
    bonusSummonDamageMult: 1.0, // Summoner specific
    // Weapon Choice Effects (applied by applyWeaponEffects)
    chosenWeaponId: null,
    weaponAttackSpeedMult: 1.0,
    weaponDamageMult: 1.0,
    weaponMoveSpeedMult: 1.0,
    weaponRangeMult: 1.0,
    weaponOnKillHeal: 0,
    // Pet Timers/States
    lastPetHealTime: 0, // Frog
    lastBlockTime: 0, // Beetle (used instead of beetleBlockCooldownTime)
    // Rest of player state
    angle: 0,
    isAttacking: false, attackTimer: 0, lastAttackTime: 0, // Melee/Animation timers
    isInteracting: false, interactTimer: 0,
    inventorySlots: new Array(C.INVENTORY_COLS * C.INVENTORY_ROWS).fill(null),
    hotbarSlots: new Array(C.HOTBAR_SIZE).fill(null),
    selectedHotbarSlotIndex: 0,
    equippedItemType: null, // Derived from selected hotbar slot
    selectedInventoryItem: null, // For moving items in UI
    respawnX: C.WORLD_WIDTH / 2, respawnY: C.WORLD_HEIGHT / 2,
    lastBowShotTime: 0, // Bow cooldown timer
};

// --- Collision Detection ---
// Checks if an entity at potentialX/Y with entityRadius collides with anything in checkAgainst array.
// ignoreId prevents self-collision checks.
function checkCollision(entityRadius, potentialX, potentialY, ignoreId = null, checkAgainst = [...solidObjects, ...monsters, ...bosses, ...undeadMinions, ...summonedSlimes, player]) {
    for (const solid of checkAgainst) {
        // Ensure solid exists, is not the entity checking itself, and meets collision criteria
        if (solid && solid.id !== ignoreId &&
            (solid.isWall ||                                  // Is it a wall?
             (solid.isSolid && (solid.health === undefined || solid.health > 0)) || // Is it marked solid and alive/not breakable?
             solid.id === player.id ||                        // Is it the player?
             solid.isBoss)                                    // Is it a boss (treat bosses as solid)?
           )
        {
            if (solid.isWall) {
                // Rectangle collision check (Axis-Aligned Bounding Box)
                const closestX = U.clamp(potentialX, solid.x, solid.x + solid.width);
                const closestY = U.clamp(potentialY, solid.y, solid.y + solid.height);
                // Check distance from circle center to closest point on rectangle
                if (U.distanceSq(potentialX, potentialY, closestX, closestY) < entityRadius * entityRadius) {
                    return solid; // Collision with wall
                }
            } else if (typeof solid.radius === 'number') {
                // Circle collision check for other entities
                 const totalRadius = entityRadius + solid.radius;
                 if (U.distanceSq(potentialX, potentialY, solid.x, solid.y) < totalRadius * totalRadius) {
                     return solid; // Collision with circular object
                 }
            } else {
                // Optional: Handle entities without radius (e.g., point collision?)
                // console.warn("Collision check encountered entity without radius:", solid);
            }
        }
    }
    return null; // No collision detected
}


// --- Initialization Functions ---

// Creates wall segments based on config and adds them to state arrays
function createWalls() {
    walls = []; // Clear existing walls
    solidObjects = solidObjects.filter(obj => !obj.isWall); // Remove old walls from collision objects
    console.log("Creating biome walls...");

    const addWall = (id, x, y, w, h, tier) => {
        const wall = {
            id: id, x: x, y: y, width: w, height: h,
            color: C.WALL_COLOR, isWall: true, tier: tier,
            isSolid: true, isAttackable: false, // Walls aren't typically 'attackable' in the damage system
            health: Infinity, // Indestructible by normal means
             // Provide a representative radius for broad phase collision if needed elsewhere, based on larger dimension
             radius: Math.max(w, h) / 2
        };
        walls.push(wall);
        solidObjects.push(wall); // Walls are solid collision objects
    };

    // Define wall segments using BIOME_BOUNDS from config
    const T = C.WALL_THICKNESS;
    const B = C.BIOME_BOUNDS;
    const WW = C.WORLD_WIDTH;
    const WH = C.WORLD_HEIGHT;

    // Vertical Walls (Order matters if they overlap slightly, though thickness should prevent issues)
    addWall('wall_f_p', B.FOREST_X_END - T / 2, B.FROSTLANDS_Y_END, T, B.DESERT_Y_START - B.FROSTLANDS_Y_END, 1);
    addWall('wall_j_p', B.JUNGLE_X_START - T / 2, B.FROSTLANDS_Y_END, T, B.DESERT_Y_START - B.FROSTLANDS_Y_END, 1);
    addWall('wall_r_f', B.ROCKY_X_END - T / 2, 0, T, B.ROCKY_Y_END, 2);
    addWall('wall_s_j', B.SWAMP_X_START - T / 2, 0, T, B.SWAMP_Y_END, 2);
    addWall('wall_v_f', B.VOLCANO_X_END - T / 2, B.VOLCANO_Y_START, T, WH - B.VOLCANO_Y_START, 3);
    addWall('wall_b_j', B.BADLANDS_X_START - T / 2, B.BADLANDS_Y_START, T, WH - B.BADLANDS_Y_START, 3);

    // Horizontal Walls
    addWall('wall_fr_pl', B.FOREST_X_END, B.FROSTLANDS_Y_END - T / 2, B.JUNGLE_X_START - B.FOREST_X_END, T, 4);
    addWall('wall_d_pl', B.FOREST_X_END, B.DESERT_Y_START - T / 2, B.JUNGLE_X_START - B.FOREST_X_END, T, 4);
    addWall('wall_r_fr', 0, B.ROCKY_Y_END - T / 2, B.ROCKY_X_END, T, 4);
    addWall('wall_s_fr', B.SWAMP_X_START, B.SWAMP_Y_END - T / 2, WW - B.SWAMP_X_START, T, 4);
    addWall('wall_v_d', 0, B.VOLCANO_Y_START - T / 2, B.VOLCANO_X_END, T, 4);
    addWall('wall_b_d', B.BADLANDS_X_START, B.BADLANDS_Y_START - T / 2, WW - B.BADLANDS_X_START, T, 4);

    console.log(`Created ${walls.length} wall segments.`);
}

// Spawns initial resource nodes like trees, rocks based on biome config
function spawnInitialResources() {
    resources = []; // Clear existing resources
    // Keep non-resource solid objects (player, bosses will be added later, walls added by createWalls)
    solidObjects = solidObjects.filter(o => o.id === player.id || o.isWall || o.isBoss);

    let resourceCount = 0;
    let attempts = 0;
    const MAX_TOTAL_ATTEMPTS = 50000; // Limit total attempts for all resources

    console.log("Spawning initial resources...");

    // Iterate through potential spawn locations or use density maps
    // This is a simplified density-based approach: try random points
    const TARGET_RESOURCES = 8000; // Target total number of resources
    while (resourceCount < TARGET_RESOURCES && attempts < MAX_TOTAL_ATTEMPTS) {
        attempts++;
        const x = Math.random() * C.WORLD_WIDTH;
        const y = Math.random() * C.WORLD_HEIGHT;

        // --- Basic Exclusion Zones ---
        if ((x > C.JUNGLE_LAKE.x && x < C.JUNGLE_LAKE.x + C.JUNGLE_LAKE.width && y > C.JUNGLE_LAKE.y && y < C.JUNGLE_LAKE.y + C.JUNGLE_LAKE.height) || // Inside lake
            C.lavaPools.some(p => x > p.x && x < p.x + p.width && y > p.y && y < p.y + p.height) || // Inside lava
            (x < C.ISLAND_PADDING || x > C.WORLD_WIDTH - C.ISLAND_PADDING || y < C.ISLAND_PADDING || y > C.WORLD_HEIGHT - C.ISLAND_PADDING) || // Too near edge
            U.distanceSq(x, y, C.WORLD_CENTER_X, C.WORLD_CENTER_Y) < 400 * 400) // Too close to player start
        {
            continue; // Skip invalid location
        }

        // Determine biome and resource type based on density
        const biomeName = U.getBiomeAt(x, y);
        const biomeData = C.BIOME_DATA[biomeName];
        if (!biomeData) continue; // Should not happen if getBiomeAt is correct

        const rand = Math.random();
        let spawnType = null;
        let typeData = null;
        let variant = null;

        // Calculate cumulative density
        let cumulativeDensity = 0;
        const treeDensity = biomeData.treeDensity || 0; cumulativeDensity += treeDensity;
        const rockDensity = biomeData.rockDensity || 0; cumulativeDensity += rockDensity;
        const cactusDensity = biomeData.cactusDensity || 0; cumulativeDensity += cactusDensity;
        const boneTreeDensity = biomeName === 'badlands' ? 0.1 : 0; cumulativeDensity += boneTreeDensity; // Example fixed density

        if (cumulativeDensity <= 0) continue; // No resources defined here

        // Roll the dice based on cumulative density
        const densityRoll = Math.random() * cumulativeDensity;

        if (densityRoll < treeDensity) {
            spawnType = 'tree';
            if (biomeName === 'frostlands') variant = 'snowy';
        } else if (densityRoll < treeDensity + rockDensity) {
            spawnType = 'rock';
        } else if (densityRoll < treeDensity + rockDensity + cactusDensity && biomeName === 'desert') { // Only spawn cactus in desert
            spawnType = 'cactus';
        } else if (densityRoll < cumulativeDensity && biomeName === 'badlands') { // Only spawn bone trees in badlands
            spawnType = 'bone_tree';
            variant = 'bone';
        }

        // If a valid type was chosen, try to spawn it
        if (spawnType) {
            typeData = C.ITEM_DATA[spawnType];
            if (!typeData) continue;

            const radius = typeData.radius || (typeData.shape === 'tree' ? 15 : 12); // Default radii
            const health = typeData.health || 100;
            const resource = {
                id: `res_${spawnType}_${Date.now()}_${Math.random()}`, x: x, y: y, radius: radius, type: spawnType,
                color: typeData.color, maxHealth: health, health: health, flashUntil: 0,
                isAttackable: typeData.isAttackable ?? true,
                isSolid: typeData.isSolid ?? true,
                isPlaced: false, // Naturally spawned
                variant: variant
            };

            // Check collision ONLY against already added solid objects (incl previously spawned resources)
            if (!checkCollision(radius, x, y, null, solidObjects)) {
                 resources.push(resource);
                 if (resource.isSolid) solidObjects.push(resource);
                 resourceCount++;
            }
        }
    } // End while loop

    if(attempts >= MAX_TOTAL_ATTEMPTS) console.warn("Max attempts reached spawning initial resources.");
    console.log(`Spawned ${resourceCount} resource nodes.`);
}

// Spawns initial batch of monsters
function spawnInitialMonsters() {
    monsters = []; // Clear existing
    let attempts = 0;
    const MAX_ATTEMPTS = C.INITIAL_MONSTER_COUNT * 10; // Increase attempts allowance
    console.log(`Spawning target ${C.INITIAL_MONSTER_COUNT} initial monsters...`);
    let count = 0;

    while (count < C.INITIAL_MONSTER_COUNT && attempts < MAX_ATTEMPTS) {
        attempts++;
        const x = Math.random() * C.WORLD_WIDTH;
        const y = Math.random() * C.WORLD_HEIGHT;
        const monsterRadius = 10 + Math.random() * 5;

        // Exclusion zones (similar to resources)
        if ((x > C.JUNGLE_LAKE.x && x < C.JUNGLE_LAKE.x + C.JUNGLE_LAKE.width && y > C.JUNGLE_LAKE.y && y < C.JUNGLE_LAKE.y + C.JUNGLE_LAKE.height) ||
            C.lavaPools.some(p => x > p.x && x < p.x + p.width && y > p.y && y < p.y + p.height) ||
            (x < C.ISLAND_PADDING || x > C.WORLD_WIDTH - C.ISLAND_PADDING || y < C.ISLAND_PADDING || y > C.WORLD_HEIGHT - C.ISLAND_PADDING) ||
            U.distanceSq(x, y, C.WORLD_CENTER_X, C.WORLD_CENTER_Y) < (C.MONSTER_DETECT_RANGE * 3) ** 2 || // Keep further from start
            checkCollision(monsterRadius, x, y, null, solidObjects)) // Check against walls/resources
        {
            continue;
        }

        const health = 50 + Math.random() * 20; // Randomize health slightly
        const monster = {
            id: `mon_${Date.now()}_${Math.random()}`, x: x, y: y,
            radius: monsterRadius, type: 'slime', // Default type
            color: '#DC143C', maxHealth: health, health: health, flashUntil: 0,
            state: 'idle',
            attackCooldown: C.MONSTER_ATTACK_COOLDOWN, lastAttackTime: 0, target: null,
            isAttackable: true, isSolid: false // Monsters usually aren't solid obstacles
        };
        monsters.push(monster);
        count++;
    }

    if (attempts >= MAX_ATTEMPTS && count < C.INITIAL_MONSTER_COUNT) {
        console.warn(`Max spawn attempts reached for initial monsters. Spawned: ${count}`);
    }
    console.log(`Spawned ${count} initial monsters.`);
}

// Spawns initial bosses
function spawnBosses() {
    bosses = []; // Clear existing
    solidObjects = solidObjects.filter(obj => !obj.isBoss); // Remove old bosses from collision
    const MAX_BOSS_SPAWN_ATTEMPTS = 50;

    // --- Spawn Plains Boss ---
    const plainsEdgeBuffer = 150;
    let spawnX_plains, spawnY_plains;
    let attempts_plains = 0;
    do {
        spawnX_plains = C.BIOME_BOUNDS.FOREST_X_END + plainsEdgeBuffer + Math.random() * (C.BIOME_BOUNDS.JUNGLE_X_START - C.BIOME_BOUNDS.FOREST_X_END - 2 * plainsEdgeBuffer);
        spawnY_plains = C.BIOME_BOUNDS.FROSTLANDS_Y_END + plainsEdgeBuffer + Math.random() * (C.BIOME_BOUNDS.DESERT_Y_START - C.BIOME_BOUNDS.FROSTLANDS_Y_END - 2 * plainsEdgeBuffer);
        attempts_plains++;
        // Check against solids BUT NOT the player initially
    } while (checkCollision(C.PLAINS_BOSS_RADIUS, spawnX_plains, spawnY_plains, player.id, solidObjects) && attempts_plains < MAX_BOSS_SPAWN_ATTEMPTS);

    if (attempts_plains >= MAX_BOSS_SPAWN_ATTEMPTS) {
        console.error("Could not find valid spawn location for Plains Boss! Placing near center.");
        spawnX_plains = C.WORLD_CENTER_X + 200; spawnY_plains = C.WORLD_CENTER_Y + 200; // Offset from exact center
    }

    const plainsBoss = {
        id: `boss_plains_${Date.now()}`, x: spawnX_plains, y: spawnY_plains,
        radius: C.PLAINS_BOSS_RADIUS, type: 'plains_boss', color: '#665A48', angle: 0,
        maxHealth: C.PLAINS_BOSS_HEALTH, health: C.PLAINS_BOSS_HEALTH, flashUntil: 0,
        state: 'patrolling', attackCooldown: C.PLAINS_BOSS_ATTACK_COOLDOWN, lastAttackTime: 0,
        attackTarget: null, speed: C.PLAINS_BOSS_SPEED, detectRangeSq: C.PLAINS_BOSS_DETECT_RANGE_SQ,
        attackRange_hit: C.BOSS_HIT_RANGE, attackRange_smash: C.BOSS_SMASH_RANGE, attackRange_spin: C.BOSS_SPIN_RANGE,
        patrolTargetX: null, patrolTargetY: null, attackAnimationTimer: 0,
        attackChoiceCooldown: C.PLAINS_BOSS_ATTACK_CHOICE_COOLDOWN, lastAttackChoiceTime: 0,
        currentAttack: null, smashLanded: false, lastSpinDamageTime: 0,
        isAttackable: true, isSolid: true, isPlaced: false, isBoss: true, lootDropped: false
    };
    bosses.push(plainsBoss);
    solidObjects.push(plainsBoss);
    console.log("Spawned Plains Boss at", Math.round(spawnX_plains), Math.round(spawnY_plains));

    // --- Spawn Forest Wolf Boss ---
    const forestEdgeBuffer = 100;
    let spawnX_wolf, spawnY_wolf;
    let attempts_wolf = 0;
    do {
        spawnX_wolf = forestEdgeBuffer + Math.random() * (C.BIOME_BOUNDS.FOREST_X_END - 2 * forestEdgeBuffer);
        spawnY_wolf = C.BIOME_BOUNDS.FROSTLANDS_Y_END + forestEdgeBuffer + Math.random() * (C.BIOME_BOUNDS.DESERT_Y_START - C.BIOME_BOUNDS.FROSTLANDS_Y_END - 2 * forestEdgeBuffer);
        attempts_wolf++;
        // Check collision against non-tree solids and non-player
    } while (checkCollision(C.FOREST_WOLF_RADIUS, spawnX_wolf, spawnY_wolf, player.id, solidObjects.filter(o => !o.isPlaced || o.type !== 'tree')) && attempts_wolf < MAX_BOSS_SPAWN_ATTEMPTS);

    if (attempts_wolf >= MAX_BOSS_SPAWN_ATTEMPTS) {
        console.error("Could not find valid spawn location for Forest Wolf! Placing near center of forest.");
        spawnX_wolf = C.BIOME_BOUNDS.FOREST_X_END / 2;
        spawnY_wolf = (C.BIOME_BOUNDS.FROSTLANDS_Y_END + C.BIOME_BOUNDS.DESERT_Y_START) / 2;
    }
    const forestWolf = {
        id: `boss_wolf_${Date.now()}`, x: spawnX_wolf, y: spawnY_wolf,
        radius: C.FOREST_WOLF_RADIUS, type: 'forest_wolf', color: '#696969', angle: Math.random() * Math.PI * 2,
        maxHealth: C.FOREST_WOLF_HEALTH, health: C.FOREST_WOLF_HEALTH, flashUntil: 0,
        state: 'moving_to_corner', speedMultiplier: C.FOREST_WOLF_SPEED_MULT,
        contactDamage: C.FOREST_WOLF_CONTACT_DAMAGE, enemyContactDamage: C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE,
        targetCorner: null, lastCornerChangeTime: 0, detectRangeSq: C.FOREST_WOLF_RADIUS**2, // Wolf doesn't actively 'detect' targets
        isAttackable: true, isSolid: true, isPlaced: false, isBoss: true, lootDropped: false
    };
    U.pickNewForestCornerTarget(forestWolf); // Assign initial corner target
    bosses.push(forestWolf);
    solidObjects.push(forestWolf);
    console.log("Spawned Forest Wolf at", Math.round(spawnX_wolf), Math.round(spawnY_wolf));

    // Jungle boss is spawned later when wolf is defeated via spawnJungleBoss()
}

// Spawns the Jungle Boss, typically called after Forest Wolf defeat
function spawnJungleBoss() {
    if (!forestWolfDefeated || bosses.some(b => b.type === 'jungle_boss')) return; // Pre-conditions

    console.log("Spawning Jungle Lake Boss...");
    const spawnX = C.JUNGLE_LAKE.x + C.JUNGLE_LAKE.width / 2;
    const spawnY = C.JUNGLE_LAKE.y + C.JUNGLE_LAKE.height / 2;

    // Basic check if center is blocked (might need refinement)
    if (checkCollision(C.JUNGLE_BOSS_RADIUS, spawnX, spawnY, null, solidObjects)) {
        console.error("Cannot spawn Jungle Boss - Lake center seems blocked?");
        return;
    }

    const jungleBoss = {
        id: `boss_jungle_${Date.now()}`, x: spawnX, y: spawnY,
        radius: C.JUNGLE_BOSS_RADIUS, type: 'jungle_boss', color: '#008B8B', angle: 0,
        maxHealth: C.JUNGLE_BOSS_HEALTH, health: C.JUNGLE_BOSS_HEALTH, flashUntil: 0,
        state: 'active', attackCooldown: C.JUNGLE_BOSS_ATTACK_COOLDOWN, lastAttackTime: 0,
        projectileDamage: C.JUNGLE_BOSS_PROJECTILE_DAMAGE,
        detectRangeSq: (C.JUNGLE_LAKE.width)**2, // Detect across the lake maybe?
        isAttackable: true, isSolid: true, isPlaced: false, isBoss: true, lootDropped: false,
        lakeBounds: { ...C.JUNGLE_LAKE } // Store bounds for movement constraint
    };
    bosses.push(jungleBoss);
    solidObjects.push(jungleBoss);
    console.log("Spawned Jungle Lake Boss at", Math.round(spawnX), Math.round(spawnY));
}

// --- Game Initialization ---
// Called after class selection to set up the world and start the game
export function initializeGame() {
    console.log("--- Initializing Game World ---");
    // Reset Player State (position, health, inventory etc.)
    player.health = player.maxHealth;
    player.hunger = C.PLAYER_MAX_HUNGER;
    player.x = C.WORLD_CENTER_X; player.y = C.WORLD_CENTER_Y;
    player.respawnX = C.WORLD_CENTER_X; player.respawnY = C.WORLD_CENTER_Y;
    player.currentXP = 0; player.level = 1;
    player.monsterKillCount = 0; player.hasChosenLevel3Perk = false; player.pet = null;
    player.chosenWeaponId = null;
    player.inventorySlots.fill(null);
    player.hotbarSlots.fill(null);
    player.xpToNextLevel = U.calculateXPForNextLevel(player.level);

    // --- Starting Gear ---
    player.hotbarSlots[0] = { type: 'wood_sword', count: 1 };
    player.hotbarSlots[1] = { type: 'wood_pickaxe', count: 1 };
    player.hotbarSlots[2] = { type: 'wood_axe', count: 1 };
    // player.hotbarSlots[3] = { type: 'torch', count: 5 }; // Optional starting torches

    // --- Clear World State ---
    resources = []; monsters = []; bosses = []; walls = [];
    projectiles = []; droppedItems = []; undeadMinions = []; summonedSlimes = [];
    solidObjects = [player]; // Start solid objects with just the player

    // --- Reset Game Time/Flags ---
    gameTime = 0; dayCount = 1; isNight = false; currentNightOpacity = 0;
    isGameOver = false; isCraftingMenuOpen = false; gamePaused = false;
    forestWolfDefeated = false; // Reset boss progression

    // --- Spawn World Elements ---
    spawnInitialResources(); // Adds resources to resources and solidObjects
    createWalls();         // Adds walls to walls and solidObjects
    spawnInitialMonsters();  // Adds monsters to monsters
    spawnBosses();         // Adds bosses to bosses and solidObjects

    // --- Final UI Setup ---
    selectHotbar(0);         // Select first hotbar slot
    updateEquippedItem();    // Update player's equipped item based on hotbar
    clampCamera();           // Center camera on player start
    updateMainHotbarVisuals(); // Draw initial hotbar items
    updateUI();              // Update HUD elements

    gameHasStarted = true;   // Enable game logic in update loop
    console.log("--- Game Ready! ---");
}


// --- Camera Clamp ---
// Keeps the camera centered on the player but prevents showing areas outside the world bounds.
function clampCamera() {
    const halfW = canvas.width / 2;
    const halfH = canvas.height / 2;

    // Target camera on player
    cameraX = player.x;
    cameraY = player.y;

    // Clamp camera position so world edges don't go past canvas edges
    cameraX = U.clamp(cameraX, halfW, C.WORLD_WIDTH - halfW);
    cameraY = U.clamp(cameraY, halfH, C.WORLD_HEIGHT - halfH);
}

// --- Global Boss Death Handler ---
// Central function to process consequences when ANY boss health reaches <= 0.
// Ensures loot/XP/wall removal happens exactly once per boss instance.
function handleBossDeath(bossEntity) {
    // Validate input and check if loot already dropped
    if (!bossEntity || !bossEntity.isBoss || bossEntity.lootDropped) {
        return;
    }

    console.log(`%cHandling death consequences for boss: ${bossEntity.type} (ID: ${bossEntity.id})`, "color: magenta; font-weight: bold;");

    let xpReward = 0;
    let drops = [];
    let removeWallsOfTier = -1;

    // Define rewards/consequences based on boss type
    switch (bossEntity.type) {
        case 'plains_boss':
            xpReward = C.PLAINS_BOSS_XP_REWARD;
            drops.push({ type: 'gold_coin', count: 10 + Math.floor(Math.random() * 16) });
            drops.push({ type: 'stone', count: 5 + Math.floor(Math.random() * 11) });
            drops.push({ type: 'iron_ore', count: 15 });
            if (Math.random() < 0.2) drops.push({ type: 'healing_salve', count: 2 });
            if (Math.random() < 0.1) drops.push({ type: 'mystical_orb', count: 1 }); // Increased chance maybe?
            removeWallsOfTier = C.BOSS_WALL_TIER_MAP[bossEntity.type] ?? -1;
            break;

        case 'forest_wolf':
            xpReward = C.PLAINS_BOSS_XP_REWARD * 0.75;
            drops.push({ type: 'mystical_orb', count: 1 }); // Guaranteed orb drop
            drops.push({ type: 'gold_coin', count: 10 });
            drops.push({ type: 'wood', count: 20 + Math.floor(Math.random() * 11)});
            if (Math.random() < 0.1) drops.push({ type: 'monster_goop', count: 5 });
            forestWolfDefeated = true; // Set progression flag
            console.log("%cForest Wolf defeated! The lake stirs...", "color: cyan; font-weight: bold;");
            spawnJungleBoss(); // Trigger next boss spawn
            removeWallsOfTier = C.BOSS_WALL_TIER_MAP[bossEntity.type] ?? -1; // Check if wolf removes walls
            break;

        case 'jungle_boss':
             xpReward = C.PLAINS_BOSS_XP_REWARD * 1.5;
             drops.push({ type: 'gold_coin', count: 25 + Math.floor(Math.random() * 26)});
             drops.push({ type: 'cobalt_ore', count: 10 + Math.floor(Math.random() * 6)}); // Example drop
             drops.push({ type: 'plant_fiber', count: 15 + Math.floor(Math.random() * 11)});
             if (Math.random() < 0.3) drops.push({ type: 'healing_salve', count: 3 });
             console.log("%cJungle Boss Defeated!", "color: blue; font-weight: bold;");
             removeWallsOfTier = C.BOSS_WALL_TIER_MAP[bossEntity.type] ?? -1;
             break;
        // Add cases for other bosses here
    }

    // Grant XP to player
    if (xpReward > 0) {
        gainXP(xpReward);
    }

    // Spawn drop items at boss location
    drops.forEach(d => addDroppedItem(bossEntity.x, bossEntity.y, d.type, d.count));

    // Remove associated walls if specified
    if (removeWallsOfTier > 0) {
        const wallCountBefore = walls.length;
        walls = walls.filter(w => w.tier !== removeWallsOfTier);
        // Also remove from the main collision array
        solidObjects = solidObjects.filter(s => !(s.isWall && s.tier === removeWallsOfTier));
        const removedCount = wallCountBefore - walls.length;
        if (removedCount > 0) {
            console.log(`%cTier ${removeWallsOfTier} walls (${removedCount}) removed!`, 'color:blue;font-weight:bold;');
        } else {
            console.log(`%cBoss ${bossEntity.type} defeated, but no Tier ${removeWallsOfTier} walls found to remove.`, 'color:gray;');
        }
    }

    // Mark loot as dropped to prevent this function running again for this boss instance
    bossEntity.lootDropped = true;
    console.log(`Boss ${bossEntity.id} (${bossEntity.type}) death consequences processed.`);

    // IMPORTANT: The actual removal of the boss object from the `bosses` and `solidObjects` arrays
    // happens in the update loop or attack function where the health check <= 0 occurs.
    // This function only handles the *results* of the death.
}


// --- Action Functions ---

// Spawns items on the ground
export function addDroppedItem(x, y, type, count = 1) {
    for (let i = 0; i < count; i++) {
        const offsetX = (Math.random() - 0.5) * 20; // Scatter drops slightly more
        const offsetY = (Math.random() - 0.5) * 20;
        droppedItems.push({
            id: `item_${Date.now()}_${Math.random().toString(36).substring(7)}`, // More unique ID
            x: U.clamp(x + offsetX, C.DROPPED_ITEM_RADIUS, C.WORLD_WIDTH - C.DROPPED_ITEM_RADIUS), // Clamp position
            y: U.clamp(y + offsetY, C.DROPPED_ITEM_RADIUS, C.WORLD_HEIGHT - C.DROPPED_ITEM_RADIUS),
            type: type,
            radius: C.DROPPED_ITEM_RADIUS,
            spawnTime: Date.now()
        });
    }
}

// Finds the first completely empty slot in the main inventory
export function findFirstEmptyInventorySlot() {
    return player.inventorySlots.findIndex(slot => slot === null);
}

// Finds the first slot in inventory that contains the itemType and has space
export function findItemStackableInventorySlot(itemType) {
    return player.inventorySlots.findIndex(slot =>
        slot !== null && slot.type === itemType && slot.count < C.MAX_STACK_SIZE
    );
}

// Adds an item to the player's inventory, trying to stack first.
export function addToInventory(itemType, count = 1) {
    let remaining = count;

    // 1. Try stacking in inventory
    while (remaining > 0) {
        const stackableSlotIndex = findItemStackableInventorySlot(itemType);
        if (stackableSlotIndex !== -1) {
            const slot = player.inventorySlots[stackableSlotIndex];
            const canAdd = C.MAX_STACK_SIZE - slot.count;
            const amountToAdd = Math.min(remaining, canAdd);
            slot.count += amountToAdd;
            remaining -= amountToAdd;
        } else {
            break; // No more stackable slots in inventory
        }
    }

     // 2. Try stacking in hotbar (if not fully stacked in inventory)
     if (remaining > 0) {
          for(let i = 0; i < C.HOTBAR_SIZE && remaining > 0; i++) {
               const slot = player.hotbarSlots[i];
               if (slot && slot.type === itemType && slot.count < C.MAX_STACK_SIZE) {
                    const canAdd = C.MAX_STACK_SIZE - slot.count;
                    const amountToAdd = Math.min(remaining, canAdd);
                    slot.count += amountToAdd;
                    remaining -= amountToAdd;
               }
          }
     }


    // 3. Try adding to new inventory slots
    while (remaining > 0) {
        const emptySlotIndex = findFirstEmptyInventorySlot();
        if (emptySlotIndex !== -1) {
            const amountToAdd = Math.min(remaining, C.MAX_STACK_SIZE);
            player.inventorySlots[emptySlotIndex] = { type: itemType, count: amountToAdd };
            remaining -= amountToAdd;
        } else {
            // Inventory is full
            console.warn(`Inventory full! Could not add ${remaining}x ${itemType}. Dropping on ground.`);
            addDroppedItem(player.x + (Math.random()-0.5)*10, player.y + (Math.random()-0.5)*10, itemType, remaining);
            remaining = 0; // Stop trying to add
            break;
        }
    }

    // Refresh UI if needed (always update hotbar visuals)
    if (isCraftingMenuOpen) {
        populateCraftingMenu(isNearWorkbench(), isNearUpgrader()); // Update crafting UI counts
    }
    updateMainHotbarVisuals(); // Update hotbar display
}

// Removes a specified count of an item type from inventory/hotbar. Returns true if successful.
export function removeFromInventory(itemType, count = 1) {
    let remainingToRemove = count;
    let totalRemoved = 0;

    // Iterate backwards through inventory first
    for (let i = player.inventorySlots.length - 1; i >= 0 && remainingToRemove > 0; i--) {
        const slot = player.inventorySlots[i];
        if (slot && slot.type === itemType) {
            const amountToRemoveFromSlot = Math.min(remainingToRemove, slot.count);
            slot.count -= amountToRemoveFromSlot;
            remainingToRemove -= amountToRemoveFromSlot;
            totalRemoved += amountToRemoveFromSlot;
            if (slot.count <= 0) player.inventorySlots[i] = null;
        }
    }

     // Then check hotbar if needed
     if (remainingToRemove > 0) {
         for (let i = player.hotbarSlots.length - 1; i >= 0 && remainingToRemove > 0; i--) {
             const slot = player.hotbarSlots[i];
             if (slot && slot.type === itemType) {
                 const amountToRemoveFromSlot = Math.min(remainingToRemove, slot.count);
                 slot.count -= amountToRemoveFromSlot;
                 remainingToRemove -= amountToRemoveFromSlot;
                 totalRemoved += amountToRemoveFromSlot;
                 if (slot.count <= 0) {
                      player.hotbarSlots[i] = null;
                      // If the removed item was equipped, update the equipped state
                      if (player.selectedHotbarSlotIndex === i) updateEquippedItem();
                 }
             }
         }
     }

    // Update UI if any items were removed
    if (totalRemoved > 0) {
        if (isCraftingMenuOpen) {
            populateCraftingMenu(isNearWorkbench(), isNearUpgrader());
        }
        updateMainHotbarVisuals();
    }

    if (remainingToRemove > 0) {
        console.warn(`Could not remove required ${count}x ${itemType} (Removed: ${totalRemoved}, Still needed: ${remainingToRemove}).`);
    }

    return remainingToRemove <= 0; // Return true if the full requested amount was removed
}

// Calculates the total count of an item across inventory and hotbar
export function getTotalItemCount(itemType) {
    const inventoryCount = player.inventorySlots.reduce((total, slot) => {
        return (slot && slot.type === itemType) ? total + slot.count : total;
    }, 0);
    const hotbarCount = player.hotbarSlots.reduce((total, slot) => {
        return (slot && slot.type === itemType) ? total + slot.count : total;
    }, 0);
    return inventoryCount + hotbarCount;
}

// Checks if the player has the required ingredients to craft a recipe
export function canCraft(recipe) {
    if (!recipe || !recipe.input) return false;
    for (const itemId in recipe.input) {
        if (getTotalItemCount(itemId) < recipe.input[itemId]) {
            return false; // Not enough of this ingredient
        }
    }
    return true; // Has all ingredients
}

// Attempts to craft a recipe by removing inputs and adding output
export function doCraft(recipeId) {
    const recipe = C.recipes.find(r => r.id === recipeId);
    if (!recipe) {
        console.error(`Recipe not found: ${recipeId}`);
        return;
    }

    // Re-check if craftable just before execution
    if (canCraft(recipe)) {
        // Attempt to remove all ingredients first
        let removalSuccess = true;
        for (const itemId in recipe.input) {
            if (!removeFromInventory(itemId, recipe.input[itemId])) {
                // This *shouldn't* happen if canCraft was accurate, but handle defensively
                console.error(`Failed to remove ${recipe.input[itemId]}x ${itemId} during crafting ${recipe.name}!`);
                removalSuccess = false;
                // TODO: Consider rolling back any previously removed ingredients if this fails mid-way (complex)
                break;
            }
        }

        if (removalSuccess) {
            // Add the crafted item
            addToInventory(recipe.output.type, recipe.output.count);
            console.log(`%cCrafted ${recipe.output.count}x ${C.ITEM_DATA[recipe.output.type]?.name || recipe.output.type}!`, 'color: cyan; font-weight: bold;');

            // Re-populate crafting menu to reflect changes immediately (if open)
            if (isCraftingMenuOpen) {
                populateCraftingMenu(isNearWorkbench(), isNearUpgrader());
            }
        } else {
             console.error(`Crafting ${recipe.name} aborted due to ingredient removal failure.`);
             // Rollback would go here if implemented
        }
    } else {
        console.log(`Cannot craft ${recipe.name} - missing ingredients (checked again).`);
        // Update UI just in case state changed and button should be disabled now
         if (isCraftingMenuOpen) {
             populateCraftingMenu(isNearWorkbench(), isNearUpgrader());
         }
    }
}

// Handles clicks on inventory slots within the crafting menu for item moving/stacking
export function handleInventorySlotClick(index) {
    const clickedSlot = player.inventorySlots[index];
    const selected = player.selectedInventoryItem; // Item currently being "held" by cursor

    if (selected) { // If holding an item, try to place/swap/stack it
        const originalSourceArray = selected.source === 'inventory' ? player.inventorySlots : player.hotbarSlots;

        // Case 1: Clicked the same slot holding the item - Deselect
        if (selected.source === 'inventory' && selected.index === index) {
             player.selectedInventoryItem = null;
        }
        // Case 2: Clicked slot is empty - Place item
        else if (!clickedSlot) {
            player.inventorySlots[index] = { type: selected.type, count: selected.count };
            originalSourceArray[selected.index] = null; // Clear original slot
            player.selectedInventoryItem = null;
        }
        // Case 3: Clicked slot has same item type & space - Stack
        else if (clickedSlot.type === selected.type && clickedSlot.count < C.MAX_STACK_SIZE) {
            const canAdd = C.MAX_STACK_SIZE - clickedSlot.count;
            const amountToAdd = Math.min(selected.count, canAdd);

            clickedSlot.count += amountToAdd;
            selected.count -= amountToAdd;

            if (selected.count <= 0) {
                originalSourceArray[selected.index] = null; // Clear original slot fully stacked
                player.selectedInventoryItem = null;
            } else {
                 // Update the count in the original slot (shouldn't happen if MAX_STACK_SIZE logic is right elsewhere)
                 originalSourceArray[selected.index].count = selected.count;
                  player.selectedInventoryItem = null; // Deselect after stacking attempt
            }
        }
        // Case 4: Clicked slot has different item - Swap
        else {
            originalSourceArray[selected.index] = clickedSlot; // Put clicked item in original slot
            player.inventorySlots[index] = { type: selected.type, count: selected.count }; // Put held item in clicked slot
            player.selectedInventoryItem = null;
        }

    } else if (clickedSlot) { // If not holding an item, pick up the clicked item
        player.selectedInventoryItem = { index: index, type: clickedSlot.type, count: clickedSlot.count, source: 'inventory' };
        // Don't clear the original slot until the item is placed somewhere else
    }

    // Refresh UI after any action
    populateCraftingMenu(isNearWorkbench(), isNearUpgrader());
    updateMainHotbarVisuals(); // Update hotbar in case it was involved in a swap
}

// Handles clicks on hotbar slots within the crafting menu for item moving/stacking
export function handleHotbarSlotClick(index) {
    const clickedSlot = player.hotbarSlots[index];
    const selected = player.selectedInventoryItem;

    if (selected) { // If holding an item...
        const originalSourceArray = selected.source === 'inventory' ? player.inventorySlots : player.hotbarSlots;

        // Case 1: Clicked same slot - Deselect
        if (selected.source === 'hotbar' && selected.index === index) {
             player.selectedInventoryItem = null;
        }
        // Case 2: Clicked hotbar slot is empty - Place item
        else if (!clickedSlot) {
             player.hotbarSlots[index] = { type: selected.type, count: selected.count };
             originalSourceArray[selected.index] = null;
             player.selectedInventoryItem = null;
        }
         // Case 3: Clicked hotbar slot has same item type & space - Stack
         else if (clickedSlot.type === selected.type && clickedSlot.count < C.MAX_STACK_SIZE) {
            const canAdd = C.MAX_STACK_SIZE - clickedSlot.count;
            const amountToAdd = Math.min(selected.count, canAdd);

            clickedSlot.count += amountToAdd;
            selected.count -= amountToAdd;

            if (selected.count <= 0) {
                originalSourceArray[selected.index] = null;
                player.selectedInventoryItem = null;
            } else {
                 originalSourceArray[selected.index].count = selected.count;
                 player.selectedInventoryItem = null; // Deselect after stacking attempt
            }
        }
         // Case 4: Clicked hotbar slot has different item - Swap
         else {
             originalSourceArray[selected.index] = clickedSlot;
             player.hotbarSlots[index] = { type: selected.type, count: selected.count };
             player.selectedInventoryItem = null;
         }

    } else if (clickedSlot) { // If not holding an item, pick it up
        player.selectedInventoryItem = { index: index, type: clickedSlot.type, count: clickedSlot.count, source: 'hotbar' };
    }

    // Refresh UI
    populateCraftingMenu(isNearWorkbench(), isNearUpgrader());
    updateMainHotbarVisuals();
    updateEquippedItem(); // Update equipped item state as hotbar changed
}

// Checks if the player is close enough to a Workbench
export function isNearWorkbench() {
    // Check against resources array as placed items are stored there
    for (const obj of resources) {
        if (obj.isPlaced && obj.type === 'workbench' &&
            U.distanceSq(player.x, player.y, obj.x, obj.y) < C.INTERACT_RANGE_SQ )
            {
            return true;
        }
    }
    return false;
}

// Checks if the player is close enough to an Item Upgrader
export function isNearUpgrader() {
    for (const obj of resources) { // Check placed items in resources array
         if (obj.isPlaced && obj.type === 'item_upgrader_t1' &&
             U.distanceSq(player.x, player.y, obj.x, obj.y) < C.INTERACT_RANGE_SQ)
              {
             return true;
         }
    }
    return false;
}

// Executes the item upgrade logic
export function doUpgrade() {
    if (selectedUpgradeInput.slotIndex === -1 || !selectedUpgradeInput.source) {
        console.warn("No tool selected in the upgrader slot.");
        return;
    }

    const sourceArray = selectedUpgradeInput.source === 'inventory' ? player.inventorySlots : player.hotbarSlots;
    const toolToUpgrade = sourceArray[selectedUpgradeInput.slotIndex];

    if (!toolToUpgrade) {
        console.error("Selected tool for upgrade seems to have disappeared!");
        selectedUpgradeInput = { slotIndex: -1, source: null };
        if(isCraftingMenuOpen) populateCraftingMenu(false, true); // Update UI
        return;
    }

    const upgradeRecipe = C.UPGRADER_RECIPES[toolToUpgrade.type];
    if (!upgradeRecipe) {
        console.error("Cannot upgrade: No recipe found for tool:", toolToUpgrade.type);
        return;
    }

    // Check materials *again* right before consuming
    if (getTotalItemCount(upgradeRecipe.material) >= upgradeRecipe.materialCount) {
        // Attempt to remove materials *first*
        if (removeFromInventory(upgradeRecipe.material, upgradeRecipe.materialCount)) {
            // Remove the original tool from its slot *after* materials are confirmed removed
             sourceArray[selectedUpgradeInput.slotIndex] = null;

            // Add the upgraded item
            addToInventory(upgradeRecipe.output, 1);
            console.log(`%cUpgraded ${C.ITEM_DATA[toolToUpgrade.type]?.name} to ${C.ITEM_DATA[upgradeRecipe.output]?.name}!`, "color: lightblue; font-weight: bold;");

            // Reset upgrader state AFTER successful upgrade
            selectedUpgradeInput = { slotIndex: -1, source: null };

            // Update UI fully
            updateMainHotbarVisuals();
            updateEquippedItem();
            if (isCraftingMenuOpen) populateCraftingMenu(false, true); // Refresh the upgrader UI section

        } else {
            console.warn(`Upgrade failed: Could not remove required material ${upgradeRecipe.material}.`);
            // Materials not removed, so tool remains in its slot. No rollback needed.
            if (isCraftingMenuOpen) populateCraftingMenu(false, true); // Refresh UI to show button state maybe changed
        }
    } else {
        console.warn(`Upgrade failed: Not enough ${upgradeRecipe.material}. (Button click registered despite lack?)`);
        if (isCraftingMenuOpen) populateCraftingMenu(false, true); // Refresh UI
    }
}


// Decrements the count of an item in a specific hotbar slot. Removes if count reaches 0.
export function decrementHotbarItem(index) {
    if (index < 0 || index >= C.HOTBAR_SIZE) return false;
    const slot = player.hotbarSlots[index];
    if (!slot) return false; // Slot already empty

    slot.count--;
    if (slot.count <= 0) {
        player.hotbarSlots[index] = null; // Remove item
    }

    updateMainHotbarVisuals(); // Update the main hotbar display
    updateEquippedItem(); // Update equipped item if it changed

    // Also update the crafting menu if it's open
    if (isCraftingMenuOpen) {
        populateCraftingMenu(isNearWorkbench(), isNearUpgrader());
    }
    return true;
}

// Finds the nearest interactable object within range
function findNearestInteractableObject(x, y, rangeSq) {
    let closestObject = null;
    let minDistanceSq = rangeSq;

    // Check placed items (stored in resources array)
    for (const obj of resources) {
        if (!obj.isPlaced || !C.ITEM_DATA[obj.type]?.isInteractable) continue;

        const dSq = U.distanceSq(x, y, obj.x, obj.y);
         // Check if within range AND closer than the current closest
        if (dSq < minDistanceSq) {
             // Optional: Check if the player can actually reach it (not inside the object)
             // if (dSq > (player.radius + obj.radius - 5)**2) {
                 minDistanceSq = dSq;
                 closestObject = obj;
             // }
        }
    }
    // Future: check NPCs or other interactables here
    return closestObject;
}

// Handles the player's attack action (melee or bow)
export function tryAttack() {
    if (!gameHasStarted || gamePaused || isCraftingMenuOpen || player.isInteracting) return;

    const now = Date.now();
    const equippedItemSlot = player.hotbarSlots[player.selectedHotbarSlotIndex];
    const equippedItemType = equippedItemSlot ? equippedItemSlot.type : null;
    const equippedItemData = equippedItemType ? C.ITEM_DATA[equippedItemType] : null;

    // --- Bow Attack ---
    if (equippedItemData?.type === 'tool' && equippedItemData.toolType === 'bow') {
        const currentBowCooldown = C.BOW_COOLDOWN * player.bonusBowAttackSpeedMult * player.weaponAttackSpeedMult;
        if (now - player.lastBowShotTime >= currentBowCooldown) {
            player.isAttacking = true; // Show animation
            player.attackTimer = now;
            player.lastBowShotTime = now; // Reset cooldown timer

            const projSpeed = C.PROJECTILE_SPEED;
            const projRange = (equippedItemData.range || C.PROJECTILE_RANGE) * player.weaponRangeMult;
            const projDamage = ((equippedItemData.damage || 10) * player.bowMultiplierBoost) * player.weaponDamageMult;

            const proj = {
                id: `proj_${player.id}_${now}`, ownerId: player.id,
                x: player.x + Math.cos(player.angle) * (player.radius + 5),
                y: player.y + Math.sin(player.angle) * (player.radius + 5),
                vx: Math.cos(player.angle) * projSpeed, vy: Math.sin(player.angle) * projSpeed,
                damage: projDamage, range: projRange, traveled: 0,
                radius: C.PROJECTILE_RADIUS, color: '#F5F5DC', type: 'arrow_projectile'
            };
            projectiles.push(proj);
             // console.log(`Fired arrow (Dmg:${projDamage.toFixed(1)})`); // Reduce console spam
        }
        return; // Don't proceed to melee logic
    }

    // --- Melee Attack ---
    const currentMeleeCooldown = C.MELEE_ATTACK_COOLDOWN * player.weaponAttackSpeedMult;
    if (now - player.lastAttackTime < currentMeleeCooldown) {
        // If holding mouse, keep animation active
        if (isMouseDown && player.isAttacking && equippedItemData?.toolType !== 'bow') {
            player.attackTimer = now; // Keep resetting animation timer while holding
        }
        return; // Still on cooldown
    }

    // Execute Melee Swing
    player.isAttacking = true;
    player.attackTimer = now;
    player.lastAttackTime = now;

    let bestTarget = null;
    let minTargetDistSq = (C.ATTACK_RANGE + C.PLAYER_RADIUS) ** 2; // Max distance for check
    const attackOriginX = player.x + Math.cos(player.angle) * (C.PLAYER_RADIUS * 0.5); // Origin near player edge
    const attackOriginY = player.y + Math.sin(player.angle) * (C.PLAYER_RADIUS * 0.5);

    // Combine all potential targets
    const attackables = [...monsters, ...resources, ...bosses, ...undeadMinions, ...summonedSlimes];

    for (const target of attackables) {
        if (!target || target.health <= 0 || !target.isAttackable) continue;

        let targetX = target.x;
        let targetY = target.y;
        let targetRadius = target.radius || 0; // Default radius if undefined

        const distSq = U.distanceSq(attackOriginX, attackOriginY, targetX, targetY);
        const combinedRadius = targetRadius + C.ATTACK_RANGE;

        if (distSq < combinedRadius ** 2) { // Is it within range?
            const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x);
            const angleDifference = Math.abs(U.normalizeAngle(player.angle - angleToTarget));

            // Check if within swing arc
            if (angleDifference < C.ATTACK_SWING_ARC / 2 + 0.3) { // Allow some tolerance
                if (distSq < minTargetDistSq) { // Is it the closest valid target so far?
                    minTargetDistSq = distSq;
                    bestTarget = target;
                }
            }
        }
    }

    // --- Apply Damage to Best Target ---
    if (bestTarget) {
        if (bestTarget.isWall) return; // Cannot damage walls with melee

        const targetIsEnemy = monsters.some(m => m.id === bestTarget.id) || bosses.some(b => b.id === bestTarget.id);
        const targetIsMinion = undeadMinions.some(u => u.id === bestTarget.id) || summonedSlimes.some(s => s.id === bestTarget.id);
        const targetIsResource = resources.some(r => r.id === bestTarget.id);
        const targetIsPlaced = targetIsResource && bestTarget.isPlaced;

        bestTarget.flashUntil = now + C.FLASH_DURATION; // Visual feedback

        // --- Calculate Damage ---
        let baseDmg = C.BASE_ATTACK_POWER; // Default for combat
        let multiplier = 1.0;
        let flatBonus = player.bonusMeleeDamage; // Start with generic bonus

        if (equippedItemData?.type === 'tool') {
            const toolType = equippedItemData.toolType;
            if ((targetIsEnemy || targetIsMinion) && toolType === 'sword') {
                multiplier *= equippedItemData.damageMultiplier * player.swordMultiplierBoost * player.weaponDamageMult;
                flatBonus += player.bonusSwordDamage; // Add specific sword bonus
            } else if (targetIsResource && !targetIsPlaced) { // Natural Resource Gathering
                baseDmg = C.BASE_GATHER_POWER;
                flatBonus = 0; // Generic melee bonus doesn't apply to gathering much
                const resourceType = bestTarget.type;
                if (toolType === 'axe' && (resourceType === 'tree' || resourceType === 'cactus' || resourceType === 'bone_tree')) {
                    multiplier = equippedItemData.gatherMultiplier;
                } else if (toolType === 'pickaxe' && resourceType === 'rock') { // Add tier check later
                    multiplier = equippedItemData.gatherMultiplier;
                } else { // Wrong tool for resource
                    multiplier = 0.25; // Heavy penalty
                }
            } else if (targetIsPlaced && (toolType === 'axe' || toolType === 'pickaxe')) { // Breaking placed items
                baseDmg = C.BASE_GATHER_POWER;
                flatBonus = 0;
                multiplier = 2.0; // Decent at breaking placed stuff
            } else { // Wrong tool for target (e.g., sword on rock)
                baseDmg /= 2; // Penalty
                multiplier = player.weaponDamageMult; // Apply generic weapon mult
            }
        } else { // Bare hands or non-tool item
            if (targetIsResource) baseDmg = C.BASE_GATHER_POWER;
            multiplier = player.weaponDamageMult; // Apply generic weapon mult
            if (bestTarget.type === 'rock' || bestTarget.type === 'bone_tree') baseDmg /= 4; // Penalty for bare hands
        }

        let finalDamage = (baseDmg * multiplier) + flatBonus;
        finalDamage = Math.max(0, finalDamage); // Ensure non-negative damage

        // --- Apply Damage & Consequences ---
        if (finalDamage > 0) {
            bestTarget.health -= finalDamage;

            // Lifesteal
            const totalLifesteal = player.lifesteal + player.bonusLifesteal;
            if ((targetIsEnemy || targetIsMinion) && totalLifesteal > 0) {
                player.health = Math.min(player.maxHealth, player.health + totalLifesteal);
                updateUI(); // Update health bar if healed
            }

            // On Kill Heal (Necro Staff)
            if ((targetIsEnemy || targetIsMinion) && player.weaponOnKillHeal > 0 && bestTarget.health <= 0) {
                 player.health = Math.min(player.maxHealth, player.health + player.weaponOnKillHeal);
                 console.log(`Healed ${player.weaponOnKillHeal} HP on kill`);
                 updateUI();
             }


            // --- Target Destroyed ---
            if (bestTarget.health <= 0) {
                console.log(`%cDestroyed ${bestTarget.type || 'entity'}!`, 'color:orange;font-weight:bold;');
                const dropX = bestTarget.x; const dropY = bestTarget.y;
                let drops = [];
                let xpGain = 0;

                // --- Handle Necromancer Kills ---
                 if (monsters.some(m => m.id === bestTarget.id) && player.className === 'necromancer') {
                     player.monsterKillCount++;
                     // console.log(`Necro Kills:${player.monsterKillCount}`); // Reduce spam
                     updateUI(); // Update kill count display
                 }

                 // --- Determine Drops & XP ---
                 if (bestTarget.type === 'tree') { drops.push({ type: 'wood', count: 1 + Math.floor(Math.random() * 3) }); if (Math.random() < 0.3) drops.push({ type: 'stick', count: 1 + Math.floor(Math.random() * 2)}); if (Math.random() < 0.2) drops.push({ type: 'plant_fiber', count: 1 }); }
                 else if (bestTarget.type === 'rock') { drops.push({ type: 'stone', count: 1 + Math.floor(Math.random() * 2) }); if (Math.random() < 0.1) drops.push({ type: 'iron_ore', count: 1}); }
                 else if (bestTarget.type === 'cactus') { drops.push({ type: 'plant_fiber', count: 1 + Math.floor(Math.random() * 2) }); }
                 else if (bestTarget.type === 'bone_tree') { drops.push({ type: 'dust', count: 1 + Math.floor(Math.random() * 3) }); if (Math.random() < 0.02) { drops.push({ type: 'bone_scythe', count: 1 }); console.log("%cDrops Bone Scythe!", "color:magenta;font-weight:bold;"); } }
                 else if (monsters.some(m => m.id === bestTarget.id)) { drops.push({ type: 'monster_goop', count: 1 + Math.floor(Math.random() * 4) }); if (Math.random() < C.GOLD_COIN_DROP_CHANCE) drops.push({ type: 'gold_coin', count: 1 }); if (Math.random() < 0.02) drops.push({ type: 'healing_salve', count: 1 }); xpGain = C.MONSTER_XP_REWARD; }
                 else if (bosses.some(b => b.id === bestTarget.id)) { handleBossDeath(bestTarget); } // Let handler manage drops/XP/walls
                 else if (targetIsPlaced) { drops.push({ type: bestTarget.type, count: 1 }); } // Drop the placed item
                 else if (targetIsMinion) { xpGain = C.MONSTER_XP_REWARD * C.MINION_KILL_XP_MULTIPLIER; } // Grant XP for minion kills

                // Spawn drops
                drops.forEach(d => addDroppedItem(dropX, dropY, d.type, d.count));
                // Grant XP
                if (xpGain > 0) gainXP(xpGain);

                // Remove destroyed entity from relevant arrays
                 if (bestTarget.isSolid) solidObjects = solidObjects.filter(s => s.id !== bestTarget.id);
                 if (monsters.some(m => m.id === bestTarget.id)) monsters = monsters.filter(m => m.id !== bestTarget.id);
                 else if (bosses.some(b => b.id === bestTarget.id)) { bosses = bosses.filter(b => b.id !== bestTarget.id); } // Boss removal handled here now too
                 else if (undeadMinions.some(u => u.id === bestTarget.id)) undeadMinions = undeadMinions.filter(u => u.id !== bestTarget.id);
                 else if (summonedSlimes.some(s => s.id === bestTarget.id)) summonedSlimes = summonedSlimes.filter(s => s.id !== bestTarget.id);
                 else if (resources.some(r => r.id === bestTarget.id)) resources = resources.filter(r => r.id !== bestTarget.id); // Handles placed items too
            }
        }
    }
}

// Handles the player's interaction action (use item, interact with object, place item)
export function tryInteract() {
    if (!gameHasStarted || gamePaused || player.isAttacking || isCraftingMenuOpen) return;

    player.isInteracting = true;
    player.interactTimer = Date.now();

    const equippedItemSlot = player.hotbarSlots[player.selectedHotbarSlotIndex];
    const equippedItemType = equippedItemSlot ? equippedItemSlot.type : null;
    const equippedItemData = equippedItemType ? C.ITEM_DATA[equippedItemType] : null;

    // 1. Use Usable Item in Hand
    if (equippedItemSlot && equippedItemData?.isUsable) {
        let used = false;
        if (equippedItemType === 'healing_salve') {
            if (player.health < player.maxHealth) {
                player.health = Math.min(player.maxHealth, player.health + C.HEAL_AMOUNT);
                decrementHotbarItem(player.selectedHotbarSlotIndex);
                used = true; updateUI();
            }
        } else if (equippedItemType === 'mystical_orb') {
             if (!player.chosenWeaponId) {
                 showWeaponChoiceMenu(); // Call UI function
                 decrementHotbarItem(player.selectedHotbarSlotIndex); // Consume on use
                 used = true;
             } else { console.log("Weapon already chosen."); }
        }
        if (used) return; // Interaction completed
         else player.isInteracting = false; // Cancel interaction state if usable item had no effect
    }

    // 2. Interact with Nearby Object
    const nearbyObject = findNearestInteractableObject(player.x, player.y, C.INTERACT_RANGE_SQ);
    if (nearbyObject) {
        let interacted = false;
        if (nearbyObject.type === 'icky_bed') {
            player.respawnX = nearbyObject.x; player.respawnY = nearbyObject.y;
            console.log(`%cSpawn point set!`, 'color:yellow;');
            nearbyObject.flashUntil = Date.now() + 200; interacted = true;
        } else if (nearbyObject.type === 'workbench' || nearbyObject.type === 'item_upgrader_t1') {
             console.log(`Interacted with ${nearbyObject.type}.`);
             toggleCraftingMenu(); // Let toggle handle context
             interacted = true;
        }
        if (interacted) return;
    }

    // 3. Place Placeable Item
    if (equippedItemSlot && equippedItemData?.isPlaceable) {
        const gridX = Math.round(worldMouseX / C.PLACE_GRID_SIZE) * C.PLACE_GRID_SIZE;
        const gridY = Math.round(worldMouseY / C.PLACE_GRID_SIZE) * C.PLACE_GRID_SIZE;
        const placeRadius = equippedItemData.solidRadius || C.PLACE_GRID_SIZE / 2;

        if (U.distanceSq(player.x, player.y, gridX, gridY) <= C.PLACE_RANGE_SQ) {
            // Check collision against ALL solids + player
            if (!checkCollision(placeRadius - 1, gridX, gridY, null, [...solidObjects, player])) {
                const placedObject = {
                    id: `placed_${Date.now()}_${Math.random()}`, x: gridX, y: gridY,
                    radius: placeRadius, type: equippedItemType, color: equippedItemData.color,
                    maxHealth: equippedItemData.health || 100, health: equippedItemData.health || 100,
                    flashUntil: 0, isAttackable: equippedItemData.isAttackable ?? true,
                    isSolid: equippedItemData.isSolid ?? true, isPlaced: true,
                    lightRadius: equippedItemData.lightRadius || 0,
                    isInteractable: equippedItemData.isInteractable || false
                };
                resources.push(placedObject); // Add to resources array
                if (placedObject.isSolid) solidObjects.push(placedObject);
                decrementHotbarItem(player.selectedHotbarSlotIndex);
                console.log(`Placed ${equippedItemType}`);
                return; // Placement successful
            } else { console.log("Cannot place: blocked."); }
        } else { console.log("Cannot place: too far."); }
    }

    // If no action was taken, reset interaction state
    player.isInteracting = false;
}

// Selects a hotbar slot by index
export function selectHotbar(index) {
    if (index < 0 || index >= C.HOTBAR_SIZE) return;
    player.selectedHotbarSlotIndex = index;
    updateMainHotbarVisuals(); // Update UI selection highlight
    updateEquippedItem();      // Update internal equipped state
}

// Updates the player's equippedItemType based on the selected hotbar slot
export function updateEquippedItem() {
    const slot = player.hotbarSlots[player.selectedHotbarSlotIndex];
    player.equippedItemType = slot ? slot.type : null;
}

// Applies damage to the player, handles beetle block, updates UI, checks for death
export function applyDamageToPlayer(amount, source = "unknown") {
    if (isGameOver) return;

    // Check for Beetle Block
    if (player.pet?.type === 'beetle' && player.pet.blockReady) {
        console.log("%cBeetle blocked damage!", "color: brown; font-weight: bold;");
        player.pet.blockReady = false; // Block used
        player.pet.lastBlockTime = Date.now(); // Start cooldown
        player.pet.flashUntil = Date.now() + 200; // Visual cue
        return; // Damage negated
    }

    player.health -= amount;
    player.health = Math.max(0, player.health);
    // console.log(`Player hit by ${source} for ${amount.toFixed(1)}. HP: ${player.health.toFixed(0)}`); // Reduce spam

    // Visual feedback (Screen flash)
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.style.boxShadow = 'inset 0 0 30px 10px rgba(255,0,0,0.5)';
        setTimeout(() => { gameContainer.style.boxShadow = ''; }, 150);
    }

    updateUI(); // Update health bar

    // Check for death
    if (player.health <= 0 && !isGameOver) {
         handlePlayerDeath();
    }
}

// Handles the sequence of events when player health reaches zero
function handlePlayerDeath() {
     isGameOver = true;
     console.error("Player Died!");
     deathMessageDiv.style.display = 'block'; // Show death message

     const deathX = player.x, deathY = player.y; // Record location for item drop

      // Class specific death effects
      if (player.className === 'summoner') summonedSlimes = [];
      // Necro minions persist for now

     // Respawn delay
     setTimeout(() => {
         // --- Item Drop ---
         const slotsWithItems = [
             ...player.inventorySlots.map((item, index) => item ? { item: item, index: index, source: 'inventory' } : null),
             ...player.hotbarSlots.map((item, index) => item ? { item: item, index: index, source: 'hotbar' } : null)
         ].filter(Boolean);

         if (slotsWithItems.length > 0) {
             const slotToDrop = slotsWithItems[Math.floor(Math.random() * slotsWithItems.length)];
             addDroppedItem(deathX, deathY, slotToDrop.item.type, slotToDrop.item.count);
             if (slotToDrop.source === 'inventory') player.inventorySlots[slotToDrop.index] = null;
             else player.hotbarSlots[slotToDrop.index] = null;
             console.log(`%cDropped ${slotToDrop.item.count}x ${slotToDrop.item.type} on death!`, "color:orange");
         }

         // --- Respawn ---
         player.health = player.maxHealth;
         player.hunger = C.PLAYER_MAX_HUNGER; // Reset hunger?
         player.x = player.respawnX; player.y = player.respawnY;
         player.isAttacking = false; player.isInteracting = false;
         projectiles = projectiles.filter(p => p.ownerId !== player.id); // Remove player projectiles

         // --- Reset UI/State ---
         deathMessageDiv.style.display = 'none';
         isGameOver = false; // Player is alive again
         clampCamera();
         updateUI();
         updateMainHotbarVisuals(); // Refresh hotbar potentially cleared by drop
         updateEquippedItem();
         console.log("Player Respawned.");

     }, 3000); // Respawn delay
}


// --- XP and Leveling ---

// Adds XP to the player and handles level ups and perk/pet choices
export function gainXP(amount) {
    if (isGameOver || amount <= 0 || !gameHasStarted) return;

    player.currentXP += Math.round(amount); // Add rounded XP
    // console.log(`%cGained ${Math.round(amount)} XP! Current: ${player.currentXP}/${player.xpToNextLevel}`, "color: lightgreen;");

    let leveledUp = false;
    // Loop in case of multiple level ups from large XP gain
    while (player.currentXP >= player.xpToNextLevel) {
        leveledUp = true;
        player.level++;
        player.currentXP -= player.xpToNextLevel; // Subtract cost of the level just completed
        player.xpToNextLevel = U.calculateXPForNextLevel(player.level); // Calculate cost for the *new* next level

        console.log(`%cLEVEL UP! Reached Level ${player.level}!`, "color: yellow; font-size: 1.2em; font-weight: bold;");
        console.log(`%cNext level requires ${player.xpToNextLevel} XP. Current XP: ${player.currentXP}`, "color: lightblue;");

        // Heal player slightly on level up?
        player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.25); // Heal 25% of max HP

        // Trigger perk choice at level 3
        if (player.level === 3 && !player.hasChosenLevel3Perk) {
            showLevel3PerkMenu(); // Call UI function
        }
        // Trigger pet choice at level 5
        if (player.level === 5 && !player.pet) {
            showPetChoiceMenu(); // Call UI function
        }
    }

    updateUI(); // Update XP bar and potentially health display
}

// Applies the chosen level 3 perk effects to the player
export function applyPerkChoice(choiceIndex) {
    if (player.hasChosenLevel3Perk || !gameHasStarted || player.level < 3) return;

    console.log(`Applying Perk Choice ${choiceIndex} for class ${player.className}`);
    let appliedPerk = false;
    let healthBonusFromPerk = 0; // Track health gained specifically from this perk

    switch (player.className) {
        case 'knight':
            if (choiceIndex === 1) { healthBonusFromPerk = 20; player.maxHealth += healthBonusFromPerk; }
            else { player.bonusSwordDamage += 15; }
            appliedPerk = true; break;
        case 'archer':
            if (choiceIndex === 1) { player.bonusMovementSpeedMult *= 1.10; }
            else { player.bonusBowAttackSpeedMult *= 0.90; }
            appliedPerk = true; break;
        case 'scout':
            if (choiceIndex === 1) { healthBonusFromPerk = 10; player.maxHealth += healthBonusFromPerk; }
            else { player.bonusMeleeDamage += 15; }
            appliedPerk = true; break;
        case 'tank':
            if (choiceIndex === 1) { healthBonusFromPerk = 50; player.maxHealth += healthBonusFromPerk; }
            else { player.bonusMeleeDamage += 20; player.bonusMovementSpeedMult *= 0.85; }
            appliedPerk = true; break;
        case 'vampire':
            if (choiceIndex === 1) { player.bonusLifesteal += 2.5; }
            else { player.bonusMovementSpeedMult *= 1.15; }
            appliedPerk = true; break;
        case 'necromancer':
             // IMPORTANT: Modify effective value on player, not global config
            if (choiceIndex === 1) {
                // Need a player property to store effective kills needed
                // Example: player.effectiveKillsToSummon = Math.max(1, (player.effectiveKillsToSummon || C.NECROMANCER_KILLS_TO_SUMMON) - 1);
                // For now, modifying config as fallback (less ideal)
                C.CLASS_DATA.necromancer.killsToSummon = Math.max(1, (C.CLASS_DATA.necromancer.killsToSummon || C.NECROMANCER_KILLS_TO_SUMMON) - 1);
                console.log("Necromancer kills needed reduced to:", C.CLASS_DATA.necromancer.killsToSummon);
            } else { player.bonusUndeadHealthMult *= 1.20; }
            appliedPerk = true; break;
        case 'summoner':
            if (choiceIndex === 1) { player.bonusMaxSummons += 1; }
            else { player.bonusSummonHealthMult *= 1.25; }
            appliedPerk = true; break;
    }

    if (appliedPerk) {
        player.hasChosenLevel3Perk = true;
        levelPerkOverlay.style.display = 'none'; // Hide UI

        // Heal player by the amount of max health gained from the perk
        if (healthBonusFromPerk > 0) {
            player.health += healthBonusFromPerk;
            player.health = Math.min(player.health, player.maxHealth); // Clamp to new max
        }

        gamePaused = false; // Unpause
        updateUI();
        console.log("Perk applied.");
    } else {
        console.warn("No perk applied for choice:", choiceIndex, "class:", player.className);
        levelPerkOverlay.style.display = 'none'; // Hide UI anyway
        gamePaused = false; // Unpause
    }
}

// Handles the player selecting a weapon from the Mystical Orb UI
export function handleWeaponChoice(event) {
    const chosenWeaponId = event.target.dataset.weaponId;
    if (!chosenWeaponId) {
        console.error("Weapon choice button missing data-weapon-id!");
        weaponChoiceOverlay.style.display = 'none'; gamePaused = false; return;
    }

    console.log("Weapon chosen:", chosenWeaponId);
    let chosenWeaponData = null;

    // Find the chosen weapon data in config
    for (const classKey in C.CLASS_WEAPON_CHOICES) {
        const weapon = C.CLASS_WEAPON_CHOICES[classKey].find(w => w.id === chosenWeaponId);
        if (weapon) { chosenWeaponData = weapon; break; }
    }

    if (chosenWeaponData) {
        applyWeaponEffects(chosenWeaponData); // Apply stats
        player.chosenWeaponId = chosenWeaponId; // Store ID
        // Orb was consumed when menu opened
    } else {
        console.error("Could not find chosen weapon data for ID:", chosenWeaponId);
    }

    weaponChoiceOverlay.style.display = 'none'; // Hide UI
    gamePaused = false; // Unpause
    updateUI(); // Update stats display
}

// Applies the statistical effects of a chosen weapon to the player
export function applyWeaponEffects(weaponData) {
    console.log("Applying effects for weapon:", weaponData.name);

    // Reset previous weapon-specific modifiers before applying new ones
    player.weaponAttackSpeedMult = 1.0;
    player.weaponDamageMult = 1.0;
    player.weaponMoveSpeedMult = 1.0;
    player.weaponRangeMult = 1.0;
    player.weaponOnKillHeal = 0;
    // Note: Perks are persistent (e.g., player.bonusMeleeDamage) and stack additively here if applicable

    if (!weaponData.effects) {
        console.warn("Weapon data missing 'effects' object:", weaponData.name); return;
    }

    let healthBonusFromWeapon = 0;

    // Apply effects
    for (const effect in weaponData.effects) {
        const value = weaponData.effects[effect];
        console.log(` - Applying ${effect}: ${value}`);
        switch (effect) {
            case 'weaponDamageMult': player.weaponDamageMult *= value; break;
            case 'weaponAttackSpeedMult': player.weaponAttackSpeedMult *= value; break;
            case 'weaponMoveSpeedMult': player.weaponMoveSpeedMult *= value; break; // Stacks with perk mult
            case 'weaponRangeMult': player.weaponRangeMult *= value; break;
            case 'bonusMaxHealth': healthBonusFromWeapon += value; player.maxHealth += value; break;
            case 'bonusMeleeDamage': player.bonusMeleeDamage += value; break; // Stacks additively
            case 'bonusLifesteal': player.bonusLifesteal += value; break; // Stacks additively
            case 'bonusNightSpeedMult': player.bonusNightSpeedMult *= value; break;
            case 'bonusDaySpeedPenaltyMult': player.bonusDaySpeedPenaltyMult *= value; break;
            case 'weaponOnKillHeal': player.weaponOnKillHeal += value; break; // Stacks additively? Or set? Additive for now.
            case 'bonusMaxSummons': player.bonusMaxSummons += value; break;
            case 'bonusUndeadHealthMult': player.bonusUndeadHealthMult *= value; break;
            case 'bonusSummonHealthMult': player.bonusSummonHealthMult *= value; break;
            case 'bonusSummonDamageMult': player.bonusSummonDamageMult *= value; break;
            // Add other effects as needed
        }
    }

    // Heal player by the amount of max health gained from the weapon
    if (healthBonusFromWeapon > 0) {
        player.health += healthBonusFromWeapon;
    }
    player.health = Math.min(player.health, player.maxHealth); // Ensure health doesn't exceed new max

    updateUI(); // Update display
}

// Creates the chosen pet and attaches it to the player
export function applyPetChoice(petType) {
    if (player.pet || !gameHasStarted || player.level < 5) return;

    console.log("Pet chosen:", petType);
    const petBaseData = C.PET_DATA[petType];
    if (!petBaseData) {
        console.error("Invalid pet type selected:", petType);
        petChoiceOverlay.style.display = 'none'; gamePaused = false; return;
    }

    player.pet = {
        type: petType, name: petBaseData.name, color: petBaseData.color, radius: petBaseData.radius,
        x: player.x - player.radius - C.PET_RADIUS - 5, y: player.y, // Initial pos
        target: null, lastAttackTime: 0, lastHealTime: 0, // Timers/State
        blockReady: petType === 'beetle', // Beetle starts ready
        lastBlockTime: 0, flashUntil: 0,
    };

    petChoiceOverlay.style.display = 'none'; // Hide UI
    gamePaused = false; // Unpause
    updateUI();
}

// Applies base stats and resets relevant bonuses when a class is chosen/game starts
export function applyClassStats(selectedClass) {
    const stats = C.CLASS_DATA[selectedClass];
    if (!stats) {
        console.error(`Invalid class selected: ${selectedClass}. Using defaults.`);
        // Apply default stats explicitly if needed, or ensure player object defaults are sufficient
        player.className = 'default'; // Or null
        player.maxHealth = C.PLAYER_MAX_HEALTH;
        player.speedMultiplier = 1.0;
        player.swordMultiplierBoost = 1.0;
        player.bowMultiplierBoost = 1.0;
        player.lifesteal = 0;
        player.daySpeedPenalty = 1.0;
    } else {
        console.log(`Applying stats for class: ${selectedClass}`);
        player.className = stats.className;
        player.maxHealth = C.PLAYER_MAX_HEALTH * stats.healthMult;
        player.speedMultiplier = stats.speedMult;
        player.swordMultiplierBoost = stats.swordBoost;
        player.bowMultiplierBoost = stats.bowBoost;
        player.lifesteal = stats.lifesteal; // Base lifesteal
        player.daySpeedPenalty = stats.daySpeedPenalty;
        // Reset level/weapon/pet bonuses that might persist between games if not resetting fully
        player.bonusMaxHealth= 0; player.bonusSwordDamage= 0; player.bonusMeleeDamage= 0;
        player.bonusMovementSpeedMult= 1.0; player.bonusBowAttackSpeedMult= 1.0;
        player.bonusLifesteal= 0; player.bonusNightSpeedMult= 1.0; player.bonusDaySpeedPenaltyMult= 1.0;
        player.bonusUndeadHealthMult= 1.0; player.bonusMaxSummons= 0; player.bonusSummonHealthMult= 1.0; player.bonusSummonDamageMult= 1.0;
        player.weaponAttackSpeedMult= 1.0; player.weaponDamageMult= 1.0; player.weaponMoveSpeedMult= 1.0;
        player.weaponRangeMult= 1.0; player.weaponOnKillHeal= 0;
        player.chosenWeaponId = null;
        player.hasChosenLevel3Perk = false;
        player.pet = null;


        console.log(` > HP:${Math.floor(player.maxHealth)} Speed:${player.speedMultiplier.toFixed(2)} Sword:${player.swordMultiplierBoost.toFixed(1)} Bow:${player.bowMultiplierBoost.toFixed(1)} Lifesteal:${player.lifesteal.toFixed(1)} DayPenalty:${player.daySpeedPenalty.toFixed(2)}`);
    }
    // Ensure current health matches new max health
    player.health = player.maxHealth;
}


// --- Minion/Summon Functions ---

// Spawns an Undead Minion for the Necromancer
function spawnUndeadMinion(x, y) {
    const baseHealth = 50 * 2; // Example base, adjust as needed
    const undeadHealth = baseHealth * C.UNDEAD_BASE_HEALTH_MULT * player.bonusUndeadHealthMult; // Apply multipliers

    const minion = {
        id: `undead_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        ownerId: player.id, x: x, y: y, radius: C.UNDEAD_RADIUS, type: 'undead_minion',
        color: C.UNDEAD_COLOR, maxHealth: undeadHealth, health: undeadHealth, flashUntil: 0,
        speed: C.UNDEAD_SPEED, state: 'idle', attackTarget: null, targetType: null,
        attackCooldown: C.UNDEAD_ATTACK_COOLDOWN, lastAttackTime: 0, damage: C.UNDEAD_DAMAGE,
        detectRangeSq: C.MONSTER_DETECT_RANGE**2, // Use standard monster detect range?
        attackRange: C.UNDEAD_ATTACK_RANGE, hitBuffer: C.UNDEAD_HIT_BUFFER,
        isSolid: false, isAttackable: true, isBoss: false // Minions aren't bosses
    };
    undeadMinions.push(minion);
    console.log(`Spawned undead ${minion.id} (HP: ${Math.floor(undeadHealth)})`);
    updateUI(); // Update minion count display
}

// Spawns a Slime Minion for the Summoner
function spawnSummonedSlime(x, y) {
    const baseHealth = 50 * 2; // Example base
    // Apply summoner perk multipliers
    const slimeHealth = baseHealth * C.SUMMONED_SLIME_HEALTH_MULT * player.bonusSummonHealthMult;
    const slimeDamage = C.SUMMONED_SLIME_DAMAGE * player.bonusSummonDamageMult;

    const slime = {
        id: `sum_slime_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        ownerId: player.id, x: x, y: y, radius: C.SUMMONED_SLIME_RADIUS, type: 'summoned_slime',
        color: C.SUMMONED_SLIME_COLOR, maxHealth: slimeHealth, health: slimeHealth, flashUntil: 0,
        speed: C.SUMMONED_SLIME_SPEED, state: 'following', // Start following player
        attackTarget: null, targetType: null,
        attackCooldown: C.SUMMONED_SLIME_ATTACK_COOLDOWN, lastAttackTime: 0, damage: slimeDamage,
        detectRangeSq: C.SUMMONED_SLIME_DETECT_RANGE_SQ, attackRange: C.SUMMONED_SLIME_ATTACK_RANGE,
        hitBuffer: C.SUMMONED_SLIME_HIT_BUFFER,
        isSolid: false, isAttackable: true, isBoss: false
    };
    summonedSlimes.push(slime);
    console.log(`Summoned slime ${slime.id} (HP: ${Math.floor(slimeHealth)}, Dmg: ${slimeDamage.toFixed(1)})`);
    updateUI(); // Update slime count display
}

// Necromancer ability: Attempts to summon undead if conditions met
export function trySummonUndead() {
     if (player.className !== 'necromancer') return;
     // Use the potentially modified value from perks
     const killsNeeded = C.CLASS_DATA.necromancer.killsToSummon || C.NECROMANCER_KILLS_TO_SUMMON; // Fallback

     if (player.monsterKillCount >= killsNeeded) {
         if (undeadMinions.length < C.MAX_UNDEAD_MINIONS) {
             console.log("Necromancer summoning undead...");
             const spawnDist = player.radius + C.UNDEAD_RADIUS + 5;
             const spawnAngle = player.angle + (Math.random() - 0.5) * (Math.PI / 2); // Spawn in front arc
             const spawnX = player.x + Math.cos(spawnAngle) * spawnDist;
             const spawnY = player.y + Math.sin(spawnAngle) * spawnDist;
             spawnUndeadMinion(spawnX, spawnY);
             player.monsterKillCount -= killsNeeded; // Consume kills
             updateUI(); // Update kills display
         } else {
             console.log("Max undead minions reached.");
         }
     } else {
         console.log(`Necromancer needs ${killsNeeded - player.monsterKillCount} more kills to summon.`);
     }
}

// Summoner ability: Attempts to summon a slime
export function trySummonSlime() {
     if (player.className !== 'summoner') return;
     const currentMaxSlimes = C.MAX_SUMMONED_SLIMES + player.bonusMaxSummons;

     if (summonedSlimes.length >= currentMaxSlimes) {
         console.log("Max summoned slimes reached. Removing oldest...");
          const removedSlime = summonedSlimes.shift(); // Remove the first (oldest) slime
          if (removedSlime) console.log(`Removed slime ${removedSlime.id}`);
     }

     console.log("Attempting to summon slime...");
     const spawnDist = player.radius + C.SUMMONED_SLIME_RADIUS + 5;
     const spawnAngle = player.angle + (Math.random() - 0.5) * (Math.PI / 2); // Spawn in front arc
     const spawnX = player.x + Math.cos(spawnAngle) * spawnDist;
     const spawnY = player.y + Math.sin(spawnAngle) * spawnDist;
     spawnSummonedSlime(spawnX, spawnY);
 }

// Handles spacebar press based on player class
export function handleSpacebarPress() {
    if (player.className === 'summoner') {
        trySummonSlime();
    } else if (player.className === 'necromancer') {
        trySummonUndead();
    }
    // Add other class abilities here if needed
}

// --- Update Functions ---

function updatePlayer(deltaTime) {
    // >>>>>>>> FULL code for updatePlayer from original main.js <<<<<<<<
    if (isGameOver || isCraftingMenuOpen || !gameHasStarted || gamePaused) return;
    let dx=0,dy=0; let mag=0;
    if(keysPressed['w'])dy-=1; if(keysPressed['s'])dy+=1;
    if(keysPressed['a'])dx-=1; if(keysPressed['d'])dx+=1;
    mag=Math.sqrt(dx*dx+dy*dy);
    let speed=C.PLAYER_SPEED*player.speedMultiplier*player.bonusMovementSpeedMult*player.weaponMoveSpeedMult;
    if(!isNight&&player.daySpeedPenalty<1.0){speed*=player.daySpeedPenalty*player.bonusDaySpeedPenaltyMult;} // Apply penalty multiplier
    if(isNight&&player.bonusNightSpeedMult>1.0){speed*=player.bonusNightSpeedMult;}
    if(mag>0){finalDx=(dx/mag)*speed; finalDy=(dy/mag)*speed;} else {finalDx=0; finalDy=0;}
    let potentialX = player.x + finalDx; let potentialY = player.y + finalDy;
    const collisionEntities = [...solidObjects, ...monsters, ...bosses, ...undeadMinions, ...summonedSlimes];
    let collidedWith = checkCollision(player.radius, potentialX, potentialY, player.id, collisionEntities);
    if (collidedWith && collidedWith.type === 'forest_wolf') { applyDamageToPlayer(collidedWith.contactDamage, 'Forest Wolf Collision'); collidedWith = true; }
    else { collidedWith = checkCollision(player.radius, potentialX, potentialY, player.id, collisionEntities); }
    if (collidedWith) {
        potentialX = player.x + finalDx; potentialY = player.y;
        let collidedX = checkCollision(player.radius, potentialX, potentialY, player.id, collisionEntities);
        if (collidedX && collidedX.type === 'forest_wolf') { applyDamageToPlayer(collidedX.contactDamage / 2, 'Forest Wolf Slide'); collidedX = true; }
        if (!collidedX) { player.x = potentialX; }
        else {
            potentialX = player.x; potentialY = player.y + finalDy;
            let collidedY = checkCollision(player.radius, potentialX, potentialY, player.id, collisionEntities);
            if (collidedY && collidedY.type === 'forest_wolf') { applyDamageToPlayer(collidedY.contactDamage / 2, 'Forest Wolf Slide'); collidedY = true;}
            if (!collidedY) { player.y = potentialY; }
        }
    } else { player.x = potentialX; player.y = potentialY; }
    player.x = U.clamp(player.x, player.radius, C.WORLD_WIDTH - player.radius);
    player.y = U.clamp(player.y, player.radius, C.WORLD_HEIGHT - player.radius);
    for(let i=droppedItems.length-1;i>=0;i--){const item=droppedItems[i];if(U.distanceSq(player.x,player.y,item.x,item.y)<C.ITEM_PICKUP_RANGE_SQ){addToInventory(item.type,1);droppedItems.splice(i,1);}}
    const aimX=worldMouseX-player.x,aimY=worldMouseY-player.y;player.angle=Math.atan2(aimY,aimX);
    const now=Date.now();
    if(player.isAttacking && !isMouseDown && player.equippedItemType && C.ITEM_DATA[player.equippedItemType]?.toolType !== 'bow' && now - player.attackTimer > C.ATTACK_DURATION) { player.isAttacking = false; }
    if(player.isInteracting&&now-player.interactTimer>C.INTERACT_DURATION)player.isInteracting=false;
    // Death check moved to applyDamageToPlayer
}

function updateMonsters(deltaTime) {
    // >>>>>>>> FULL code for updateMonsters from original main.js <<<<<<<<
     if (isGameOver || isCraftingMenuOpen || !gameHasStarted || gamePaused) return;
    const now = Date.now();
    const checkArrays = { player: [player], undead: undeadMinions, slime: summonedSlimes };
    monsters.forEach(monster => {
        if (monster.health <= 0) return;
        let potentialTarget = null; let targetDistSq = Infinity; let targetType = null;
        for (const type in checkArrays) {
            for (const entity of checkArrays[type]) {
                if (!entity || entity.health <= 0) continue;
                const distSq = U.distanceSq(monster.x, monster.y, entity.x, entity.y);
                if (distSq < C.MONSTER_DETECT_RANGE ** 2 && distSq < targetDistSq) {
                    if (!U.isLineObstructed(monster.x, monster.y, entity.x, entity.y, walls)) {
                        potentialTarget = entity; targetDistSq = distSq; targetType = type;
                    }
                }
            }
        }
        if (potentialTarget) {
            monster.target = potentialTarget;
            const attackRangeCheckSq = (C.MONSTER_ATTACK_RANGE + monster.radius + potentialTarget.radius) ** 2;
            if (targetDistSq <= attackRangeCheckSq) { monster.state = 'attacking'; } else { monster.state = 'chasing'; }
        } else { monster.state = 'idle'; monster.target = null; }
        let dx = 0, dy = 0;
        if ((monster.state === 'chasing' || monster.state === 'attacking') && monster.target && monster.target.health > 0) {
            const angle = Math.atan2(monster.target.y - monster.y, monster.target.x - monster.x);
            dx = Math.cos(angle) * C.MONSTER_SPEED; dy = Math.sin(angle) * C.MONSTER_SPEED;
        }
        if (dx !== 0 || dy !== 0) {
            let potentialX = monster.x + dx; let potentialY = monster.y + dy;
            const otherMonsters = monsters.filter(m => m.id !== monster.id);
            const collisionEntities = [...solidObjects, ...otherMonsters, ...bosses, player, ...undeadMinions, ...summonedSlimes];
            let collidedWith = checkCollision(monster.radius, potentialX, potentialY, monster.id, collisionEntities);
            if (collidedWith && collidedWith.type === 'forest_wolf') { monster.health -= C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE; monster.flashUntil = now + C.FLASH_DURATION; collidedWith = true; }
            else { collidedWith = checkCollision(monster.radius, potentialX, potentialY, monster.id, collisionEntities); }
            if (!collidedWith) { monster.x = potentialX; monster.y = potentialY; }
            else {
                potentialX = monster.x + dx; potentialY = monster.y;
                let collidedX = checkCollision(monster.radius, potentialX, potentialY, monster.id, collisionEntities);
                if (collidedX && collidedX.type === 'forest_wolf') { monster.health -= C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE / 2; monster.flashUntil = now + C.FLASH_DURATION; collidedX = true; }
                if (!collidedX) { monster.x = potentialX; }
                else {
                    potentialX = monster.x; potentialY = monster.y + dy;
                    let collidedY = checkCollision(monster.radius, potentialX, potentialY, monster.id, collisionEntities);
                    if (collidedY && collidedY.type === 'forest_wolf') { monster.health -= C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE / 2; monster.flashUntil = now + C.FLASH_DURATION; collidedY = true; }
                    if (!collidedY) { monster.y = potentialY; }
                }
            }
        }
        if (monster.state === 'attacking' && monster.target && monster.target.health > 0) {
            if (now - monster.lastAttackTime > monster.attackCooldown) {
                const contactDistanceSq = (monster.radius + monster.target.radius + C.MONSTER_HIT_BUFFER) ** 2;
                const currentDistToTargetSq = U.distanceSq(monster.x, monster.y, monster.target.x, monster.target.y);
                if (currentDistToTargetSq <= contactDistanceSq) {
                    monster.lastAttackTime = now;
                    if (monster.target.id === player.id) { applyDamageToPlayer(C.MONSTER_DAMAGE, `Monster ${monster.id}`); }
                    else { monster.target.health -= C.MONSTER_DAMAGE; monster.target.health = Math.max(0, monster.target.health); monster.target.flashUntil = now + C.FLASH_DURATION; }
                }
            }
        }
        monster.x = U.clamp(monster.x, monster.radius, C.WORLD_WIDTH - monster.radius);
        monster.y = U.clamp(monster.y, monster.radius, C.WORLD_HEIGHT - monster.radius);
        if (monster.health <= 0) { addDroppedItem(monster.x, monster.y, 'monster_goop', 1); } // Drop if died from collision
    });
    monsters = monsters.filter(m => m.health > 0);
}

function updateBosses(deltaTime) {
    // >>>>>>>> FULL code for updateBosses from original main.js <<<<<<<<
     if(isGameOver||isCraftingMenuOpen||!gameHasStarted||gamePaused)return;
     const now=Date.now();
     for(let i=bosses.length-1;i>=0;i--){
         const boss=bosses[i];
         if(boss.health <= 0) {
              console.log(`Boss ${boss.id} (${boss.type}) removed from update loop (health <= 0).`);
              solidObjects = solidObjects.filter(s=>s.id !== boss.id);
              bosses.splice(i,1);
              continue;
         }
         let potentialTarget=null; let targetDistSq=Infinity; let targetType = null;
         const checkArrays = { player: [player], undead: undeadMinions, slime: summonedSlimes };
         for (const type in checkArrays) {
             for (const entity of checkArrays[type]) {
                 if (!entity || entity.health <= 0) continue;
                 const distSq = U.distanceSq(boss.x, boss.y, entity.x, entity.y);
                 if (distSq < boss.detectRangeSq && distSq < targetDistSq) {
                     if (!U.isLineObstructed(boss.x, boss.y, entity.x, entity.y, walls)) {
                         potentialTarget = entity; targetDistSq = distSq; targetType = type;
                     }
                 }
             }
         }
         boss.attackTarget = potentialTarget;
         if(boss.type==='plains_boss'){
             if(!boss.state.startsWith('attacking_')){
                 if(potentialTarget){
                     boss.angle = Math.atan2(potentialTarget.y - boss.y, potentialTarget.x - boss.x);
                     const targetRadius = (potentialTarget.radius || C.PLAYER_RADIUS);
                     const inHitRange = targetDistSq < (boss.attackRange_hit + targetRadius)**2;
                     const inSmashRange = targetDistSq < (boss.attackRange_smash + targetRadius)**2;
                     const inSpinRange = targetDistSq < (boss.attackRange_spin + targetRadius)**2;
                     if(now - boss.lastAttackChoiceTime > boss.attackChoiceCooldown && now - boss.lastAttackTime > boss.attackCooldown) {
                         let possibleAttacks = [];
                         if(inHitRange) possibleAttacks.push('hit'); if(inSmashRange) possibleAttacks.push('smash'); if(inSpinRange) possibleAttacks.push('spin');
                         if(possibleAttacks.length > 0) {
                             boss.currentAttack = possibleAttacks[Math.floor(Math.random() * possibleAttacks.length)];
                             boss.state = `attacking_${boss.currentAttack}`; boss.attackAnimationTimer = 0; boss.lastAttackTime = now; boss.lastAttackChoiceTime = now;
                             if(boss.currentAttack === 'smash') boss.smashLanded = false; if(boss.currentAttack === 'spin') boss.lastSpinDamageTime = 0;
                         } else { boss.state='chasing'; }
                     } else { if (!boss.state.startsWith('attacking_')) { boss.state = 'chasing'; } }
                 } else { boss.state = 'patrolling'; boss.patrolTargetX = null; }
             }
             let dx=0, dy=0;
             if(boss.state === 'chasing' && boss.attackTarget) { dx = Math.cos(boss.angle) * boss.speed; dy = Math.sin(boss.angle) * boss.speed; }
             else if(boss.state === 'patrolling') {
                 if(boss.patrolTargetX === null || U.distanceSq(boss.x, boss.y, boss.patrolTargetX, boss.patrolTargetY) < 50**2) {
                     const buf = 100; boss.patrolTargetX = C.BIOME_BOUNDS.FOREST_X_END + buf + Math.random() * (C.BIOME_BOUNDS.JUNGLE_X_START - C.BIOME_BOUNDS.FOREST_X_END - 2 * buf);
                     boss.patrolTargetY = C.BIOME_BOUNDS.FROSTLANDS_Y_END + buf + Math.random() * (C.BIOME_BOUNDS.DESERT_Y_START - C.BIOME_BOUNDS.FROSTLANDS_Y_END - 2 * buf);
                 }
                 if(boss.patrolTargetX !== null) { const angleToPatrol = Math.atan2(boss.patrolTargetY - boss.y, boss.patrolTargetX - boss.x); boss.angle = angleToPatrol; dx = Math.cos(angleToPatrol) * boss.speed * 0.6; dy = Math.sin(angleToPatrol) * boss.speed * 0.6; }
             }
              if (dx !== 0 || dy !== 0) {
                  let potentialX = boss.x + dx; let potentialY = boss.y + dy; const otherBosses = bosses.filter(b => b.id !== boss.id);
                  const collisionEntities = [...solidObjects.filter(o => o.id !== boss.id), ...otherBosses, ...monsters, player, ...undeadMinions, ...summonedSlimes];
                  let collidedWith = checkCollision(boss.radius, potentialX, potentialY, boss.id, collisionEntities);
                  if (!collidedWith) { boss.x = potentialX; boss.y = potentialY; } else { /* Sliding */ potentialX = boss.x + dx; potentialY = boss.y; if (!checkCollision(boss.radius, potentialX, potentialY, boss.id, collisionEntities)) { boss.x = potentialX; } else { potentialX = boss.x; potentialY = boss.y + dy; if (!checkCollision(boss.radius, potentialX, potentialY, boss.id, collisionEntities)) { boss.y = potentialY; } } }
              }
              if(boss.state === 'attacking_hit') {
                 boss.attackAnimationTimer += deltaTime;
                 if(boss.attackAnimationTimer >= C.ATTACK_DURATION / 2 && boss.attackAnimationTimer < C.ATTACK_DURATION && boss.attackTarget) {
                     const hitRangeCheckSq = (boss.radius + (boss.attackTarget.radius || C.PLAYER_RADIUS) + 10)**2;
                     if (U.distanceSq(boss.x, boss.y, boss.attackTarget.x, boss.attackTarget.y) < hitRangeCheckSq) {
                         if (boss.attackTarget.id === player.id) { applyDamageToPlayer(C.BOSS_HIT_DAMAGE, 'Plains Boss Hit'); } else { boss.attackTarget.health = Math.max(0, boss.attackTarget.health - C.BOSS_HIT_DAMAGE); boss.attackTarget.flashUntil = now + C.FLASH_DURATION; }
                     } boss.attackAnimationTimer = C.ATTACK_DURATION; // Prevent multi-hit
                 } if (boss.attackAnimationTimer >= C.ATTACK_DURATION) { boss.state = 'chasing'; boss.currentAttack = null; }
             } else if(boss.state === 'attacking_smash') {
                  boss.attackAnimationTimer += deltaTime;
                  if (boss.attackAnimationTimer >= C.BOSS_SMASH_WINDUP && !boss.smashLanded && boss.attackTarget) {
                      boss.smashLanded = true; const smashTargets = [player, ...undeadMinions, ...summonedSlimes];
                      for(const target of smashTargets) { if (!target || target.health <= 0) continue; const smashRangeCheckSq = (C.BOSS_SMASH_RANGE + target.radius)**2; if (U.distanceSq(boss.x, boss.y, target.x, target.y) < smashRangeCheckSq) { if (target.id === player.id) { applyDamageToPlayer(C.BOSS_SMASH_DAMAGE, 'Plains Boss Smash'); } else { target.health = Math.max(0, target.health - C.BOSS_SMASH_DAMAGE); target.flashUntil = now + C.FLASH_DURATION; } } }
                  } if (boss.attackAnimationTimer >= C.BOSS_SMASH_WINDUP + C.BOSS_SMASH_EFFECT_DURATION) { boss.state = 'chasing'; boss.currentAttack = null; }
             } else if(boss.state === 'attacking_spin') {
                 boss.attackAnimationTimer += deltaTime;
                 if (now - boss.lastSpinDamageTime > C.BOSS_SPIN_DAMAGE_INTERVAL) { const spinTargets = [player, ...undeadMinions, ...summonedSlimes];
                      for(const target of spinTargets) { if (!target || target.health <= 0) continue; const spinRangeCheckSq = (C.BOSS_SPIN_RANGE + target.radius)**2; if (U.distanceSq(boss.x, boss.y, target.x, target.y) < spinRangeCheckSq) { if (target.id === player.id) { applyDamageToPlayer(C.BOSS_SPIN_DAMAGE, 'Plains Boss Spin'); } else { target.health = Math.max(0, target.health - C.BOSS_SPIN_DAMAGE); target.flashUntil = now + C.FLASH_DURATION; } } }
                     boss.lastSpinDamageTime = now;
                 } if (boss.attackAnimationTimer >= C.BOSS_SPIN_DURATION) { boss.state = 'chasing'; boss.currentAttack = null; }
             }
         } else if (boss.type === 'forest_wolf') {
            if (boss.state === 'moving_to_corner') {
                if (!boss.targetCorner || U.distanceSq(boss.x, boss.y, boss.targetCorner.x, boss.targetCorner.y) < C.FOREST_WOLF_CORNER_THRESHOLD_SQ) { if (now - boss.lastCornerChangeTime > 1000) { U.pickNewForestCornerTarget(boss); } }
                if (boss.targetCorner) {
                    const angleToTarget = Math.atan2(boss.targetCorner.y - boss.y, boss.targetCorner.x - boss.x); boss.angle = angleToTarget;
                    const wolfSpeed = C.PLAYER_SPEED * boss.speedMultiplier; const dx = Math.cos(angleToTarget) * wolfSpeed; const dy = Math.sin(angleToTarget) * wolfSpeed; let potentialX = boss.x + dx; let potentialY = boss.y + dy;
                    for (let j = resources.length - 1; j >= 0; j--) { const res = resources[j]; if (res.type === 'tree' && res.health > 0) { if (U.distanceSq(potentialX, potentialY, res.x, res.y) < (C.FOREST_WOLF_TREE_DESTROY_RADIUS + res.radius) ** 2) { res.health = 0; addDroppedItem(res.x, res.y, 'wood', 1 + Math.floor(Math.random() * 2)); if (res.isSolid) solidObjects = solidObjects.filter(so => so.id !== res.id); } } } resources = resources.filter(r => r.health > 0);
                    const otherBosses = bosses.filter(b => b.id !== boss.id); const collisionCheckList = [ ...solidObjects.filter(o => o.id !== boss.id && (!o.isPlaced || o.type !== 'tree')), player, ...otherBosses, ...monsters, ...undeadMinions, ...summonedSlimes ]; let collidedWith = null;
                    for (const entity of collisionCheckList) { if (entity && entity.health > 0) { const contactDistSq = (boss.radius + entity.radius)**2; if (U.distanceSq(potentialX, potentialY, entity.x, entity.y) < contactDistSq) { let damageToDeal = (entity.id === player.id) ? C.FOREST_WOLF_CONTACT_DAMAGE : C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE; if (entity.id === player.id) { applyDamageToPlayer(damageToDeal, 'Forest Wolf Collision'); } else { entity.health -= damageToDeal; entity.flashUntil = now + C.FLASH_DURATION; if (entity.health <= 0) { if (entity.isBoss) handleBossDeath(entity); } } collidedWith = entity; } } }
                    collidedWith = checkCollision(boss.radius, potentialX, potentialY, boss.id, collisionCheckList);
                    if (!collidedWith) { boss.x = potentialX; boss.y = potentialY; } else { /* Sliding */ let slideX = boss.x + dx; let slideY = boss.y; if (!checkCollision(boss.radius, slideX, slideY, boss.id, collisionCheckList)) { boss.x = slideX; } else { slideX = boss.x; slideY = boss.y + dy; if (!checkCollision(boss.radius, slideX, slideY, boss.id, collisionCheckList)) { boss.y = slideY; } } }
                }
            }
         } else if (boss.type === 'jungle_boss') {
             const bounds = boss.lakeBounds; let targetX = boss.x; let targetY = boss.y; let needsCorrection = false;
             if (boss.x < bounds.x + boss.radius) { targetX = bounds.x + boss.radius + 1; needsCorrection = true; } if (boss.x > bounds.x + bounds.width - boss.radius) { targetX = bounds.x + bounds.width - boss.radius - 1; needsCorrection = true; } if (boss.y < bounds.y + boss.radius) { targetY = bounds.y + boss.radius + 1; needsCorrection = true; } if (boss.y > bounds.y + bounds.height - boss.radius) { targetY = bounds.y + bounds.height - boss.radius - 1; needsCorrection = true; }
             if (needsCorrection) { const angleToCenter = Math.atan2(targetY - boss.y, targetX - boss.x); const moveSpeed = 1.5; boss.x += Math.cos(angleToCenter) * moveSpeed; boss.y += Math.sin(angleToCenter) * moveSpeed; }
             if (boss.attackTarget && boss.attackTarget.health > 0) {
                 const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x); boss.angle = angleToPlayer;
                 if (now - boss.lastAttackTime >= boss.attackCooldown) {
                     const projX = boss.x + Math.cos(boss.angle) * (boss.radius + C.JUNGLE_BOSS_PROJECTILE_RADIUS + 2); const projY = boss.y + Math.sin(boss.angle) * (boss.radius + C.JUNGLE_BOSS_PROJECTILE_RADIUS + 2);
                     const projectile = { id: `proj_${boss.id}_${now}`, ownerId: boss.id, sourceType: 'jungle_boss', x: projX, y: projY, vx: Math.cos(boss.angle) * C.JUNGLE_BOSS_PROJECTILE_SPEED, vy: Math.sin(boss.angle) * C.JUNGLE_BOSS_PROJECTILE_SPEED, damage: boss.projectileDamage, range: C.JUNGLE_BOSS_PROJECTILE_RANGE, traveled: 0, radius: C.JUNGLE_BOSS_PROJECTILE_RADIUS, color: C.JUNGLE_BOSS_PROJECTILE_COLOR, type: 'boss_projectile' };
                     projectiles.push(projectile); boss.lastAttackTime = now;
                 }
             }
         }
         boss.x = U.clamp(boss.x, boss.radius, C.WORLD_WIDTH - boss.radius); boss.y = U.clamp(boss.y, boss.radius, C.WORLD_HEIGHT - boss.radius);
     } // End boss loop
}

// PASTE updateUndeadMinions(deltaTime) definition here (already complete in previous response)
function updateUndeadMinions(deltaTime) {
     if(!gameHasStarted||undeadMinions.length===0||gamePaused)return;
     const now=Date.now();
     for(let i=undeadMinions.length-1;i>=0;i--){
         const minion=undeadMinions[i];
         if(minion.health<=0){ undeadMinions.splice(i,1); continue; }
         let potentialTarget=null; let minDistSq=minion.detectRangeSq; let targetType = null;
         if (!minion.attackTarget || minion.attackTarget.health <= 0) {
             minion.attackTarget=null; const enemies=[...monsters,...bosses];
             for(const enemy of enemies){ if(!enemy || enemy.health<=0)continue; const distSq=U.distanceSq(minion.x,minion.y,enemy.x,enemy.y); if(distSq<minDistSq){ if(!U.isLineObstructed(minion.x,minion.y,enemy.x,enemy.y,walls)){ minDistSq=distSq; potentialTarget=enemy; targetType=monsters.some(m=>m.id===enemy.id)?'monster':'boss'; } } }
             if(potentialTarget) { minion.attackTarget = potentialTarget; minion.targetType = targetType; }
         }
         const target = minion.attackTarget;
         if (target && target.health > 0) { const currentDistSq = U.distanceSq(minion.x, minion.y, target.x, target.y); const attackRangeCheckSq = (minion.attackRange + minion.radius + target.radius)**2; if (currentDistSq <= attackRangeCheckSq) { minion.state = 'attacking'; } else { minion.state = 'chasing'; } }
         else { minion.state = 'idle'; minion.attackTarget = null; minion.targetType = null; }
         let dx=0, dy=0;
         if (minion.state === 'chasing' && target) { const angle=Math.atan2(target.y-minion.y,target.x-minion.x); dx=Math.cos(angle)*minion.speed; dy=Math.sin(angle)*minion.speed; }
         else if (minion.state === 'attacking' && target) { const angle=Math.atan2(target.y-minion.y,target.x-minion.x); dx=Math.cos(angle)*minion.speed*0.1; dy=Math.sin(angle)*minion.speed*0.1; } // Slow down
          if (dx !== 0 || dy !== 0) {
             let potentialX = minion.x + dx; let potentialY = minion.y + dy; const otherMinions = undeadMinions.filter(u => u.id !== minion.id);
             const collisionEntities = [...solidObjects, player, ...monsters, ...bosses, ...otherMinions, ...summonedSlimes];
             let collidedWith = checkCollision(minion.radius, potentialX, potentialY, minion.id, collisionEntities);
             if (collidedWith && collidedWith.type === 'forest_wolf') { minion.health -= C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE; minion.flashUntil = now + C.FLASH_DURATION; collidedWith = true; } else { collidedWith = checkCollision(minion.radius, potentialX, potentialY, minion.id, collisionEntities); }
             if (!collidedWith) { minion.x = potentialX; minion.y = potentialY; } else { /* Sliding */ potentialX = minion.x + dx; potentialY = minion.y; let collidedX = checkCollision(minion.radius, potentialX, potentialY, minion.id, collisionEntities); if (collidedX && collidedX.type === 'forest_wolf') { minion.health -= C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE/2; minion.flashUntil = now + C.FLASH_DURATION; collidedX = true;} if (!collidedX) { minion.x = potentialX; } else { potentialX = minion.x; potentialY = minion.y + dy; let collidedY = checkCollision(minion.radius, potentialX, potentialY, minion.id, collisionEntities); if (collidedY && collidedY.type === 'forest_wolf') { minion.health -= C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE/2; minion.flashUntil = now + C.FLASH_DURATION; collidedY = true;} if (!collidedY) { minion.y = potentialY; } } }
         }
         if (minion.state === 'attacking' && target && target.health > 0) {
             if (now - minion.lastAttackTime >= minion.attackCooldown) {
                 const contactDistSq = (minion.radius + target.radius + minion.hitBuffer)**2;
                 if (U.distanceSq(minion.x, minion.y, target.x, target.y) <= contactDistSq) {
                     target.health -= minion.damage; target.flashUntil = now + C.FLASH_DURATION; minion.lastAttackTime = now;
                     if (target.health <= 0) { let xpMultiplier = C.MINION_KILL_XP_MULTIPLIER; if (target.isBoss) { handleBossDeath(target); xpMultiplier *= 2; } gainXP((target.isBoss ? C.PLAINS_BOSS_XP_REWARD : C.MONSTER_XP_REWARD) * xpMultiplier); minion.state = 'idle'; minion.attackTarget = null; minion.targetType = null; }
                 }
             }
         }
         minion.x = U.clamp(minion.x, minion.radius, C.WORLD_WIDTH - minion.radius); minion.y = U.clamp(minion.y, minion.radius, C.WORLD_HEIGHT - minion.radius);
         if (minion.health <= 0 && undeadMinions.includes(minion)) { /* Handled by splice */ }
     }
 }

// PASTE updateSummonedSlimes(deltaTime) definition here (already complete)
function updateSummonedSlimes(deltaTime) {
     if(!gameHasStarted||summonedSlimes.length===0||gamePaused)return;
     const now=Date.now();
     for(let i=summonedSlimes.length-1;i>=0;i--){
         const slime=summonedSlimes[i];
         if(slime.health<=0){ summonedSlimes.splice(i,1); continue; }
         let potentialTarget=null; let minDistSq=slime.detectRangeSq; let targetType = null;
         const enemies=[...monsters,...bosses];
         for(const enemy of enemies){ if(!enemy || enemy.health<=0)continue; const distSq=U.distanceSq(slime.x,slime.y,enemy.x,enemy.y); if(distSq<minDistSq){ if(!U.isLineObstructed(slime.x,slime.y,enemy.x,enemy.y,walls)){ minDistSq=distSq; potentialTarget=enemy; targetType=monsters.some(m=>m.id===enemy.id)?'monster':'boss'; } } }
         if (potentialTarget) { slime.attackTarget = potentialTarget; slime.targetType = targetType; const distToTargetSq = minDistSq; const attackRangeCheckSq = (slime.attackRange + slime.radius + potentialTarget.radius)**2; if (distToTargetSq <= attackRangeCheckSq) { slime.state = 'attacking'; } else { slime.state = 'chasing'; } }
         else { slime.attackTarget = null; slime.targetType = null; const distToPlayerSq = U.distanceSq(slime.x, slime.y, player.x, player.y); if (distToPlayerSq > C.SUMMON_FOLLOW_DISTANCE_SQ) { slime.state = 'following'; } else { slime.state = 'idle'; } }
         let dx=0, dy=0; const target = slime.attackTarget;
         if (slime.state === 'chasing' && target) { const angle=Math.atan2(target.y-slime.y,target.x-slime.x); dx=Math.cos(angle)*slime.speed; dy=Math.sin(angle)*slime.speed; }
         else if (slime.state === 'attacking' && target) { const angle=Math.atan2(target.y-slime.y,target.x-slime.x); dx=Math.cos(angle)*slime.speed*0.1; dy=Math.sin(angle)*slime.speed*0.1; }
         else if (slime.state === 'following') { const angleToPlayer=Math.atan2(player.y-slime.y,player.x-slime.x); dx=Math.cos(angleToPlayer)*slime.speed*0.8; dy=Math.sin(angleToPlayer)*slime.speed*0.8; }
          if (dx !== 0 || dy !== 0) {
             let potentialX = slime.x + dx; let potentialY = slime.y + dy; const otherSlimes = summonedSlimes.filter(s => s.id !== slime.id);
             const collisionEntities = [...solidObjects, player, ...monsters, ...bosses, ...otherSlimes, ...undeadMinions];
             let collidedWith = checkCollision(slime.radius, potentialX, potentialY, slime.id, collisionEntities);
             if (collidedWith && collidedWith.type === 'forest_wolf') { slime.health -= C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE; slime.flashUntil = now + C.FLASH_DURATION; collidedWith = true; } else { collidedWith = checkCollision(slime.radius, potentialX, potentialY, slime.id, collisionEntities); }
             if (!collidedWith) { slime.x = potentialX; slime.y = potentialY; } else { /* Sliding */ potentialX = slime.x + dx; potentialY = slime.y; let collidedX = checkCollision(slime.radius, potentialX, potentialY, slime.id, collisionEntities); if (collidedX && collidedX.type === 'forest_wolf') { slime.health -= C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE/2; slime.flashUntil = now + C.FLASH_DURATION; collidedX = true; } if (!collidedX) { slime.x = potentialX; } else { potentialX = slime.x; potentialY = slime.y + dy; let collidedY = checkCollision(slime.radius, potentialX, potentialY, slime.id, collisionEntities); if (collidedY && collidedY.type === 'forest_wolf') { slime.health -= C.FOREST_WOLF_ENEMY_CONTACT_DAMAGE/2; slime.flashUntil = now + C.FLASH_DURATION; collidedY = true; } if (!collidedY) { slime.y = potentialY; } } }
         }
         if (slime.state === 'attacking' && target && target.health > 0) {
             if (now - slime.lastAttackTime >= slime.attackCooldown) {
                 const contactDistSq = (slime.radius + target.radius + slime.hitBuffer)**2;
                 if (U.distanceSq(slime.x, slime.y, target.x, target.y) <= contactDistSq) {
                     target.health -= slime.damage; target.flashUntil = now + C.FLASH_DURATION; slime.lastAttackTime = now;
                     if (target.health <= 0) { let xpMultiplier = C.MINION_KILL_XP_MULTIPLIER; if (target.isBoss) { handleBossDeath(target); xpMultiplier *= 2; } gainXP((target.isBoss ? C.PLAINS_BOSS_XP_REWARD : C.MONSTER_XP_REWARD) * xpMultiplier); slime.state = 'following'; slime.attackTarget = null; slime.targetType = null; }
                 }
             }
         }
         slime.x = U.clamp(slime.x, slime.radius, C.WORLD_WIDTH - slime.radius); slime.y = U.clamp(slime.y, slime.radius, C.WORLD_HEIGHT - slime.radius);
         if (slime.health <= 0 && summonedSlimes.includes(slime)) { /* Handled by splice */ }
     }
 }

// PASTE updatePets(deltaTime) definition here (already complete)
function updatePets(deltaTime) {
    if (!player.pet || gamePaused) return;
    const now = Date.now(); const pet = player.pet;
    const followOffsetX = Math.cos(player.angle + Math.PI) * C.PET_FOLLOW_DISTANCE; const followOffsetY = Math.sin(player.angle + Math.PI) * C.PET_FOLLOW_DISTANCE;
    let targetX = player.x + followOffsetX; let targetY = player.y + followOffsetY; let desiredDx = 0, desiredDy = 0;
    const distSqToTarget = U.distanceSq(pet.x, pet.y, targetX, targetY); const followStopDistSq = (C.PET_FOLLOW_DISTANCE * 0.5)**2;
    if (distSqToTarget > followStopDistSq) { const angleToTarget = Math.atan2(targetY - pet.y, targetX - pet.x); const petSpeed = C.PLAYER_SPEED * player.speedMultiplier * player.bonusMovementSpeedMult * player.weaponMoveSpeedMult; desiredDx = Math.cos(angleToTarget) * petSpeed; desiredDy = Math.sin(angleToTarget) * petSpeed; }
    let petTarget = null; let minDistSqToEnemy = Infinity; const attackPetDetectRangeSq = (C.MONSTER_DETECT_RANGE * 1.1)**2;
    switch (pet.type) {
        case 'frog': if (now - pet.lastHealTime > C.PET_FROG_HEAL_COOLDOWN) { if (player.health < player.maxHealth) { player.health = Math.min(player.maxHealth, player.health + C.PET_FROG_HEAL_AMOUNT); pet.lastHealTime = now; updateUI(); pet.flashUntil = now + 300; } } break;
        case 'cat': case 'dog': const enemies = [...monsters, ...bosses]; for (const enemy of enemies) { if (enemy.health <= 0) continue; const dSq = U.distanceSq(pet.x, pet.y, enemy.x, enemy.y); if (dSq < attackPetDetectRangeSq && dSq < minDistSqToEnemy) { if (!U.isLineObstructed(pet.x, pet.y, enemy.x, enemy.y, walls)) { minDistSqToEnemy = dSq; petTarget = enemy; } } } pet.target = petTarget;
            if (pet.target) { const angleToEnemy = Math.atan2(pet.target.y - pet.y, pet.target.x - pet.x); const petSpeed = C.PLAYER_SPEED * player.speedMultiplier * player.bonusMovementSpeedMult * player.weaponMoveSpeedMult;
                if (pet.type === 'cat') { const idealRangeSq = (C.PET_CAT_PROJECTILE_RANGE * 0.7)**2; if (minDistSqToEnemy > idealRangeSq + 500) { desiredDx = Math.cos(angleToEnemy) * petSpeed; desiredDy = Math.sin(angleToEnemy) * petSpeed; } else if (minDistSqToEnemy < idealRangeSq - 500) { desiredDx = -Math.cos(angleToEnemy) * petSpeed * 0.5; desiredDy = -Math.sin(angleToEnemy) * petSpeed * 0.5; } else { desiredDx = 0; desiredDy = 0; }
                    if (now - pet.lastAttackTime > C.PET_CAT_ATTACK_COOLDOWN) { pet.lastAttackTime = now; const projX = pet.x + Math.cos(angleToEnemy) * (pet.radius + C.PET_CAT_PROJECTILE_RADIUS + 1); const projY = pet.y + Math.sin(angleToEnemy) * (pet.radius + C.PET_CAT_PROJECTILE_RADIUS + 1); const projectile = { id: `proj_pet_${pet.type}_${now}`, ownerId: player.id, sourceType: 'pet_cat', x: projX, y: projY, vx: Math.cos(angleToEnemy) * C.PET_CAT_PROJECTILE_SPEED, vy: Math.sin(angleToEnemy) * C.PET_CAT_PROJECTILE_SPEED, damage: C.PET_CAT_PROJECTILE_DAMAGE, range: C.PET_CAT_PROJECTILE_RANGE, traveled: 0, radius: C.PET_CAT_PROJECTILE_RADIUS, color: '#FF8C00', type: 'pet_projectile' }; projectiles.push(projectile); pet.flashUntil = now + 100; }
                } else { desiredDx = Math.cos(angleToEnemy) * petSpeed; desiredDy = Math.sin(angleToEnemy) * petSpeed; const dogAttackRangeSq = (C.PET_DOG_ATTACK_RANGE + pet.target.radius)**2; if (minDistSqToEnemy <= dogAttackRangeSq) { desiredDx = 0; desiredDy = 0; if (now - pet.lastAttackTime > C.PET_DOG_ATTACK_COOLDOWN) { const dogHitRangeSq = (pet.radius + pet.target.radius + C.MONSTER_HIT_BUFFER)**2; if(minDistSqToEnemy <= dogHitRangeSq) { pet.lastAttackTime = now; pet.target.health -= C.PET_DOG_DAMAGE; pet.target.health = Math.max(0, pet.target.health); pet.target.flashUntil = now + C.FLASH_DURATION; pet.flashUntil = now + 100; if (pet.target.health <= 0) { gainXP((pet.target.isBoss ? C.PLAINS_BOSS_XP_REWARD : C.MONSTER_XP_REWARD) * C.MINION_KILL_XP_MULTIPLIER); if(pet.target.isBoss) handleBossDeath(pet.target); if (monsters.some(m => m.id === pet.target.id)) monsters = monsters.filter(m => m.id !== pet.target.id); else if (bosses.some(b => b.id === pet.target.id)) { bosses = bosses.filter(b => b.id !== pet.target.id); solidObjects = solidObjects.filter(s => s.id !== pet.target.id); } pet.target = null; } } } } }
            } break;
        case 'beetle': if (!pet.blockReady && now - pet.lastBlockTime > C.PET_BEETLE_BLOCK_COOLDOWN) { pet.blockReady = true; pet.flashUntil = now + 150; } break;
        case 'bird': let pickedUpItem = false; for (let j = droppedItems.length - 1; j >= 0; j--) { const item = droppedItems[j]; if (U.distanceSq(pet.x, pet.y, item.x, item.y) < C.PET_BIRD_PICKUP_RANGE_SQ) { addToInventory(item.type, 1); droppedItems.splice(j, 1); pet.flashUntil = now + 100; pickedUpItem = true; break; } } break;
    }
    if (desiredDx !== 0 || desiredDy !== 0) { let potentialX = pet.x + desiredDx; let potentialY = pet.y + dy; const petCollisionCheckList = [ ...walls, ...resources.filter(o => o.isPlaced && o.isSolid) ]; let collidedWith = checkCollision(pet.radius, potentialX, potentialY, null, petCollisionCheckList); if (!collidedWith) { pet.x = potentialX; pet.y = potentialY; } else { potentialX = pet.x + desiredDx; potentialY = pet.y; if (!checkCollision(pet.radius, potentialX, potentialY, null, petCollisionCheckList)) { pet.x = potentialX; } else { potentialX = pet.x; potentialY = pet.y + desiredDy; if (!checkCollision(pet.radius, potentialX, potentialY, null, petCollisionCheckList)) { pet.y = potentialY; } } } pet.x = U.clamp(pet.x, pet.radius, C.WORLD_WIDTH - pet.radius); pet.y = U.clamp(pet.y, pet.radius, C.WORLD_HEIGHT - pet.radius); }
}


// PASTE updateProjectiles(deltaTime) definition here (already complete)
function updateProjectiles(deltaTime) {
    if (!gameHasStarted || gamePaused) return; const now = Date.now();
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i]; const speedRatio = deltaTime / (1000 / 60); const moveX = proj.vx * speedRatio; const moveY = proj.vy * speedRatio; const moveDist = Math.sqrt(moveX*moveX + moveY*moveY);
        proj.x += moveX; proj.y += moveY; proj.traveled += moveDist;
        if (proj.traveled > proj.range || proj.x < 0 || proj.x > C.WORLD_WIDTH || proj.y < 0 || proj.y > C.WORLD_HEIGHT) { projectiles.splice(i, 1); continue; }
        let hitSomething = false;
        const solidCheckList = solidObjects.filter(o => o.id !== proj.ownerId); const solidHit = checkCollision(proj.radius, proj.x, proj.y, proj.ownerId, solidCheckList);
        if (solidHit) { if (solidHit.isWall) { projectiles.splice(i, 1); hitSomething = true; } else if (solidHit.isAttackable && solidHit.health > 0 && C.ITEM_DATA[solidHit.type]) { solidHit.health -= proj.damage; solidHit.flashUntil = now + C.FLASH_DURATION; if (solidHit.health <= 0) { addDroppedItem(solidHit.x, solidHit.y, solidHit.type, 1); resources = resources.filter(r => r.id !== solidHit.id); solidObjects = solidObjects.filter(s => s.id !== solidHit.id); } projectiles.splice(i, 1); hitSomething = true; } }
        if (hitSomething) continue;
        if (proj.ownerId !== player.id) { const distSqPlayer = U.distanceSq(proj.x, proj.y, player.x, player.y); if (distSqPlayer < (proj.radius + player.radius)**2) { applyDamageToPlayer(proj.damage, proj.sourceType || 'Enemy Projectile'); projectiles.splice(i, 1); hitSomething = true; } }
        if (hitSomething) continue;
        if (proj.ownerId === player.id || proj.sourceType === 'pet_cat') { for (let j = monsters.length - 1; j >= 0; j--) { const mon = monsters[j]; if (U.distanceSq(proj.x, proj.y, mon.x, mon.y) < (proj.radius + mon.radius)**2) { mon.health -= proj.damage; mon.flashUntil = now + C.FLASH_DURATION; if (mon.health <= 0) { addDroppedItem(mon.x, mon.y, 'monster_goop', 1 + Math.floor(Math.random() * 4)); if (Math.random() < C.GOLD_COIN_DROP_CHANCE) addDroppedItem(mon.x, mon.y, 'gold_coin', 1); monsters.splice(j, 1); gainXP(C.MONSTER_XP_REWARD); if (player.className === 'necromancer') player.monsterKillCount++; updateUI(); } projectiles.splice(i, 1); hitSomething = true; break; } } }
        if (hitSomething) continue;
        if (proj.ownerId === player.id || proj.sourceType === 'pet_cat') { for (let j = bosses.length - 1; j >= 0; j--) { const boss = bosses[j]; if (U.distanceSq(proj.x, proj.y, boss.x, boss.y) < (proj.radius + boss.radius)**2) { boss.health -= proj.damage; boss.flashUntil = now + C.FLASH_DURATION; if (boss.health <= 0) { handleBossDeath(boss); } projectiles.splice(i, 1); hitSomething = true; break; } } }
    }
}

// PASTE updateWorld(deltaTime) definition here (already complete)
function updateWorld(deltaTime) {
    if (isGameOver || !gameHasStarted || gamePaused) return;
    gameTime += deltaTime; const cycleTime = gameTime % C.DAY_LENGTH; const cyclePercent = cycleTime / C.DAY_LENGTH; const newDay = Math.floor(gameTime / C.DAY_LENGTH) + 1;
    let targetOpacity = 0; let currentPhase = "Day"; let nextPhaseStartTime = C.SUNSET_START_PERCENT * C.DAY_LENGTH; const transitionDuration = C.TRANSITION_DURATION_PERCENT * C.DAY_LENGTH;
    if (cyclePercent >= 0 && cyclePercent < C.SUNSET_START_PERCENT) { isNight = false; currentPhase = "Day"; targetOpacity = 0; nextPhaseStartTime = C.SUNSET_START_PERCENT * C.DAY_LENGTH; }
    else if (cyclePercent >= C.SUNSET_START_PERCENT && cyclePercent < C.NIGHT_START_PERCENT) { isNight = true; currentPhase = "Sunset"; const transitionProgress = (cycleTime - (C.SUNSET_START_PERCENT * C.DAY_LENGTH)) / transitionDuration; targetOpacity = U.clamp(transitionProgress * C.MAX_NIGHT_OPACITY, 0, C.MAX_NIGHT_OPACITY); nextPhaseStartTime = C.NIGHT_START_PERCENT * C.DAY_LENGTH; }
    else if (cyclePercent >= C.NIGHT_START_PERCENT && cyclePercent < C.SUNRISE_START_PERCENT) { isNight = true; currentPhase = "Night"; targetOpacity = C.MAX_NIGHT_OPACITY; nextPhaseStartTime = C.SUNRISE_START_PERCENT * C.DAY_LENGTH; }
    else { isNight = false; currentPhase = "Sunrise"; const transitionProgress = (cycleTime - (C.SUNRISE_START_PERCENT * C.DAY_LENGTH)) / transitionDuration; targetOpacity = U.clamp((1 - transitionProgress) * C.MAX_NIGHT_OPACITY, 0, C.MAX_NIGHT_OPACITY); nextPhaseStartTime = C.DAY_LENGTH; }
    const opacityChangeSpeed = deltaTime / (transitionDuration / 2); if (Math.abs(currentNightOpacity - targetOpacity) > 0.005) { if (currentNightOpacity < targetOpacity) { currentNightOpacity = Math.min(currentNightOpacity + opacityChangeSpeed, targetOpacity); } else { currentNightOpacity = Math.max(currentNightOpacity - opacityChangeSpeed, targetOpacity); } } else { currentNightOpacity = targetOpacity; } currentNightOpacity = U.clamp(currentNightOpacity, 0, C.MAX_NIGHT_OPACITY);
    let timeUntilNextPhase = nextPhaseStartTime - cycleTime; if (timeUntilNextPhase < -10) { timeUntilNextPhase += C.DAY_LENGTH; } if (timeUIDiv) { timeUIDiv.innerHTML = `<span>Phase: ${currentPhase}</span><br><span>~ Left: ${U.formatTime(timeUntilNextPhase)}</span>`; }
    if (newDay > dayCount) { dayCount = newDay; console.log(`Day ${dayCount} has begun!`); }
    if (isNight && currentPhase === "Night" && !player.wasNightFlag) { player.wasNightFlag = true; const currentMonsterCount = monsters.length; const spaceAvailable = C.MAX_MONSTER_COUNT - currentMonsterCount; const monstersToSpawn = Math.min(C.NIGHTLY_MONSTER_SPAWN_COUNT, spaceAvailable);
        if (monstersToSpawn > 0) { let spawnedCount = 0; let spawnAttempts = 0; const MAX_SPAWN_ATTEMPTS = monstersToSpawn * 10;
            while (spawnedCount < monstersToSpawn && spawnAttempts < MAX_SPAWN_ATTEMPTS) { spawnAttempts++; const x = Math.random() * C.WORLD_WIDTH; const y = Math.random() * C.WORLD_HEIGHT; const monsterRadius = 10 + Math.random() * 5; if ((x > C.JUNGLE_LAKE.x && x < C.JUNGLE_LAKE.x + C.JUNGLE_LAKE.width && y > C.JUNGLE_LAKE.y && y < C.JUNGLE_LAKE.y + C.JUNGLE_LAKE.height) || C.lavaPools.some(p => x > p.x && x < p.x + p.width && y > p.y && y < p.y + p.height) || (x < C.ISLAND_PADDING || x > C.WORLD_WIDTH - C.ISLAND_PADDING || y < C.ISLAND_PADDING || y > C.WORLD_HEIGHT - C.ISLAND_PADDING) || U.distanceSq(x, y, player.x, player.y) < (C.MONSTER_DETECT_RANGE * 1.0)**2 || checkCollision(monsterRadius, x, y, null, solidObjects)) { continue; } const health = 50 + Math.random() * 20; const monster = { id: `mon_night_${dayCount}_${Date.now()}_${Math.random()}`, x: x, y: y, radius: monsterRadius, type: 'slime', color: '#A52A2A', maxHealth: health, health: health, flashUntil: 0, state: 'idle', attackCooldown: C.MONSTER_ATTACK_COOLDOWN, lastAttackTime: 0, target: null, isAttackable: true, isSolid: false }; monsters.push(monster); spawnedCount++; }
            console.log(`Spawned ${spawnedCount} new monsters for the night. Total: ${monsters.length}`);
        }
    } else if (!isNight) { player.wasNightFlag = false; }
}

// **** END OF PASTED UPDATE FUNCTION DEFINITIONS ****


// Main update function (calls individual update functions)
function update(deltaTime) {
    if (isGameOver || !gameHasStarted || gamePaused) return;
    if (!deltaTime || deltaTime > 500) deltaTime = 16;

    // Continuous actions check (like holding attack)
    if (isMouseDown && !player.isInteracting) {
        tryAttack(); // Cooldowns handled within tryAttack
    } else {
        // Reset melee animation state if mouse released
        if (player.isAttacking && player.equippedItemType && C.ITEM_DATA[player.equippedItemType]?.toolType !== 'bow' && Date.now() - player.attackTimer > C.ATTACK_DURATION) {
            player.isAttacking = false;
        }
    }

    updatePlayer(deltaTime);
    updateMonsters(deltaTime);
    updateBosses(deltaTime);
    updateUndeadMinions(deltaTime);
    updateSummonedSlimes(deltaTime);
    updatePets(deltaTime);
    updateProjectiles(deltaTime);
    updateWorld(deltaTime);

    clampCamera();
    updateUI();
}


// --- Drawing Functions ---
// PASTE drawWorldBackground() definition here (already complete)
function drawWorldBackground() { ctx.save(); ctx.fillStyle=C.BIOME_DATA.frostlands.color; ctx.fillRect(0, 0, C.WORLD_WIDTH, C.BIOME_BOUNDS.FROSTLANDS_Y_END); ctx.fillStyle=C.BIOME_DATA.desert.color; ctx.fillRect(0, C.BIOME_BOUNDS.DESERT_Y_START, C.WORLD_WIDTH, C.WORLD_HEIGHT - C.BIOME_BOUNDS.DESERT_Y_START); ctx.fillStyle=C.BIOME_DATA.forest.color; ctx.fillRect(0, C.BIOME_BOUNDS.FROSTLANDS_Y_END, C.BIOME_BOUNDS.FOREST_X_END, C.BIOME_BOUNDS.DESERT_Y_START - C.BIOME_BOUNDS.FROSTLANDS_Y_END); ctx.fillStyle=C.BIOME_DATA.jungle.color; ctx.fillRect(C.BIOME_BOUNDS.JUNGLE_X_START, C.BIOME_BOUNDS.FROSTLANDS_Y_END, C.WORLD_WIDTH - C.BIOME_BOUNDS.JUNGLE_X_START, C.BIOME_BOUNDS.DESERT_Y_START - C.BIOME_BOUNDS.FROSTLANDS_Y_END); ctx.fillStyle=C.BIOME_DATA.plains.color; ctx.fillRect(C.BIOME_BOUNDS.FOREST_X_END, C.BIOME_BOUNDS.FROSTLANDS_Y_END, C.BIOME_BOUNDS.JUNGLE_X_START - C.BIOME_BOUNDS.FOREST_X_END, C.BIOME_BOUNDS.DESERT_Y_START - C.BIOME_BOUNDS.FROSTLANDS_Y_END); ctx.fillStyle=C.BIOME_DATA.rocky.color; ctx.fillRect(0, 0, C.BIOME_BOUNDS.ROCKY_X_END, C.BIOME_BOUNDS.ROCKY_Y_END); ctx.fillStyle=C.BIOME_DATA.swamp.color; ctx.fillRect(C.BIOME_BOUNDS.SWAMP_X_START, 0, C.WORLD_WIDTH - C.BIOME_BOUNDS.SWAMP_X_START, C.BIOME_BOUNDS.SWAMP_Y_END); ctx.fillStyle=C.BIOME_DATA.volcano.color; ctx.fillRect(0, C.BIOME_BOUNDS.VOLCANO_Y_START, C.BIOME_BOUNDS.VOLCANO_X_END, C.WORLD_HEIGHT - C.BIOME_BOUNDS.VOLCANO_Y_START); ctx.fillStyle=C.BIOME_DATA.badlands.color; ctx.fillRect(C.BIOME_BOUNDS.BADLANDS_X_START, C.BIOME_BOUNDS.BADLANDS_Y_START, C.WORLD_WIDTH - C.BIOME_BOUNDS.BADLANDS_X_START, C.WORLD_HEIGHT - C.BIOME_BOUNDS.BADLANDS_Y_START); ctx.fillStyle=C.JUNGLE_LAKE.color; ctx.fillRect(C.JUNGLE_LAKE.x, C.JUNGLE_LAKE.y, C.JUNGLE_LAKE.width, C.JUNGLE_LAKE.height); C.lavaPools.forEach(p => { ctx.fillStyle=p.color; ctx.fillRect(p.x, p.y, p.width, p.height); }); ctx.restore(); }
// PASTE drawBiomeWalls() definition here (already complete)
function drawBiomeWalls() { ctx.save(); ctx.fillStyle=C.WALL_COLOR; ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1; walls.forEach(w=>{ ctx.fillRect(w.x,w.y,w.width,w.height); ctx.strokeRect(w.x,w.y,w.width,w.height); }); ctx.restore(); }
// PASTE drawResources() definition here (already complete)
function drawResources() { const now=Date.now();resources.forEach(res=>{ if (res.health <= 0 && !res.isPlaced) return; ctx.save(); ctx.translate(res.x,res.y); if(res.isAttackable&&res.health<res.maxHealth&&res.health>0){ const barWidth=(res.radius||15)*1.5;const barHeight=5; const barY=-(res.radius||15)-barHeight-3; ctx.fillStyle='#666';ctx.fillRect(-barWidth/2,barY,barWidth,barHeight); let healthColor='#DDD'; if(res.type==='tree'||res.type==='bone_tree')healthColor='#228B22'; else if(res.type==='rock')healthColor='#A9A9A9'; else if(res.isPlaced)healthColor='#4682B4'; ctx.fillStyle=healthColor; ctx.fillRect(-barWidth/2,barY,barWidth*(res.health/res.maxHealth),barHeight); } const baseColor=res.color||C.ITEM_DATA[res.type]?.color||'magenta'; ctx.fillStyle=(res.flashUntil>now&&Math.floor(now/50)%2===0)?'#FFF':baseColor; const itemShape=C.ITEM_DATA[res.type]?.shape||'circle'; const drawRadius=res.radius||(itemShape==='tree'?15:12); switch(itemShape){ case 'rect': const size=drawRadius*2;ctx.fillRect(-size/2,-size/2,size,size); ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=1; ctx.strokeRect(-size/2,-size/2,size,size); break; case 'torch': const stickHeight=drawRadius*3;const stickWidth=drawRadius*0.6;const flameHeight=drawRadius*1.5; ctx.fillStyle=C.ITEM_DATA['stick']?.color||'#B8860B'; ctx.fillRect(-stickWidth/2,-stickHeight/2+flameHeight*0.4,stickWidth,stickHeight); ctx.fillStyle=baseColor; ctx.beginPath();ctx.ellipse(0,-stickHeight/2,stickWidth*1.2,flameHeight,0,0,Math.PI*2);ctx.fill(); break; case 'cactus': const cactusWidth=drawRadius*0.6;const cactusHeight=drawRadius*2; ctx.fillStyle=baseColor; ctx.fillRect(-cactusWidth/2,-cactusHeight/2,cactusWidth,cactusHeight); ctx.fillRect(-cactusWidth*1.5,-cactusHeight*0.1,cactusWidth*3,cactusWidth*0.8); ctx.strokeStyle='darkgreen';ctx.lineWidth=1; ctx.strokeRect(-cactusWidth/2,-cactusHeight/2,cactusWidth,cactusHeight); ctx.strokeRect(-cactusWidth*1.5,-cactusHeight*0.1,cactusWidth*3,cactusWidth*0.8); break; case 'tree': ctx.beginPath();ctx.arc(0,0,drawRadius,0,Math.PI*2); ctx.fillStyle=res.variant==='bone'?'#DDD':(res.variant==='snowy'?'#E0FFFF':baseColor); ctx.fill(); ctx.fillStyle=res.variant==='bone'?'#999':'#A0522D'; const trunkWidth=drawRadius*0.4;const trunkHeight=drawRadius*0.6; ctx.fillRect(-trunkWidth/2,0,trunkWidth,trunkHeight); if(res.variant==='snowy'){ ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath();ctx.arc(0,-drawRadius*0.3,drawRadius*0.9,0,Math.PI*2);ctx.fill(); } ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=1;ctx.stroke(); break; case 'circle': default: ctx.beginPath();ctx.arc(0,0,drawRadius,0,Math.PI*2);ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=1;ctx.stroke(); break; } ctx.restore();}); }
// PASTE drawMonsters() definition here (already complete)
function drawMonsters() { const now=Date.now();monsters.forEach(mon=>{ ctx.save(); ctx.translate(mon.x,mon.y); if(mon.health<mon.maxHealth&&mon.health>0){ const barWidth=mon.radius*1.5;const barHeight=4;const barY=-mon.radius-barHeight-2; ctx.fillStyle='#550000';ctx.fillRect(-barWidth/2,barY,barWidth,barHeight); ctx.fillStyle='#FF0000';ctx.fillRect(-barWidth/2,barY,barWidth*(mon.health/mon.maxHealth),barHeight); } ctx.fillStyle=(mon.flashUntil>now&&Math.floor(now/50)%2===0)?'#FFF':mon.color; ctx.beginPath();ctx.arc(0,0,mon.radius,0,Math.PI*2);ctx.fill(); ctx.strokeStyle="black";ctx.lineWidth=1;ctx.stroke(); ctx.restore();}); }
// PASTE drawBosses() definition here (already complete)
function drawBosses() { const now=Date.now();bosses.forEach(boss=>{ if(boss.health<=0)return; ctx.save(); ctx.translate(boss.x,boss.y); if(boss.health<boss.maxHealth){ const barWidth=boss.radius*2.0; const barHeight=8; const barY=-boss.radius-barHeight-10; ctx.fillStyle='#440000'; ctx.fillRect(-barWidth/2,barY,barWidth,barHeight); ctx.fillStyle='#FF3333'; ctx.fillRect(-barWidth/2,barY,barWidth*(boss.health/boss.maxHealth),barHeight); ctx.strokeStyle='black';ctx.lineWidth=1; ctx.strokeRect(-barWidth/2,barY,barWidth,barHeight); } const isFlashing=(boss.flashUntil>now&&Math.floor(now/50)%2===0); const baseColor=isFlashing?'#FFFFFF':boss.color; if(boss.type==='plains_boss'){ ctx.fillStyle=isFlashing?'#FFFFFF':'#776B5D'; ctx.beginPath();ctx.arc(0,0,boss.radius,0,Math.PI*2);ctx.fill(); ctx.fillStyle=isFlashing?'#DDDDDD':'#8B4513'; ctx.beginPath();ctx.ellipse(-boss.radius*0.4,-boss.radius*0.3,boss.radius*0.3,boss.radius*0.5,Math.PI/4,0,Math.PI*2);ctx.fill(); ctx.fillStyle=isFlashing?'#CCCCCC':'#696969'; ctx.beginPath();ctx.ellipse(boss.radius*0.3,boss.radius*0.4,boss.radius*0.4,boss.radius*0.2,-Math.PI/6,0,Math.PI*2);ctx.fill(); ctx.strokeStyle=isFlashing?'#AAAAAA':'#3A3127'; ctx.lineWidth=3;ctx.stroke(); const armRadius=boss.radius*0.3; const armDist=boss.radius+armRadius*0.8; let leftArmAngle=boss.angle-Math.PI/1.5; let rightArmAngle=boss.angle+Math.PI/1.5; if(boss.state==='attacking_hit'){ const progress=boss.attackAnimationTimer/C.ATTACK_DURATION; rightArmAngle=boss.angle+Math.PI/1.5+Math.sin(progress*Math.PI)*1.5; }else if(boss.state==='attacking_smash'){ const progress=Math.min(1,boss.attackAnimationTimer/C.BOSS_SMASH_WINDUP); leftArmAngle=boss.angle-Math.PI/1.5-progress*Math.PI*0.8; rightArmAngle=boss.angle+Math.PI/1.5+progress*Math.PI*0.8; }else if(boss.state==='attacking_spin'){ const progress=boss.attackAnimationTimer/C.BOSS_SPIN_DURATION; const spinOffset=progress*Math.PI*4; leftArmAngle=boss.angle+spinOffset-Math.PI/1.5; rightArmAngle=boss.angle+spinOffset+Math.PI/1.5; } ctx.fillStyle=isFlashing?'#DDDDDD':'#8B4513'; const leftX=Math.cos(leftArmAngle)*armDist;const leftY=Math.sin(leftArmAngle)*armDist; ctx.beginPath();ctx.arc(leftX,leftY,armRadius,0,Math.PI*2);ctx.fill();ctx.stroke(); ctx.fillStyle=isFlashing?'#CCCCCC':'#696969'; const rightX=Math.cos(rightArmAngle)*armDist;const rightY=Math.sin(rightArmAngle)*armDist; ctx.beginPath();ctx.arc(rightX,rightY,armRadius*1.1,0,Math.PI*2);ctx.fill();ctx.stroke(); if(boss.state==='attacking_smash'&&boss.attackAnimationTimer>=C.BOSS_SMASH_WINDUP){ ctx.save(); const effectProgress=(boss.attackAnimationTimer-C.BOSS_SMASH_WINDUP)/C.BOSS_SMASH_EFFECT_DURATION; const effectRadius=C.BOSS_SMASH_RANGE*effectProgress; ctx.globalAlpha=Math.max(0,1.0-effectProgress); ctx.strokeStyle='red'; ctx.lineWidth=5+(1-effectProgress)*5; ctx.beginPath();ctx.arc(0,0,effectRadius,0,Math.PI*2);ctx.stroke(); ctx.restore(); } if(boss.state==='attacking_spin'){ ctx.save(); ctx.globalAlpha=0.4+Math.sin(now/50)*0.1; ctx.strokeStyle='white'; ctx.lineWidth=2+Math.sin(now/50)*2; ctx.beginPath();ctx.arc(0,0,C.BOSS_SPIN_RANGE-5,0,Math.PI*2);ctx.stroke(); ctx.beginPath();ctx.arc(0,0,C.BOSS_SPIN_RANGE-15,0,Math.PI*2);ctx.stroke(); ctx.restore(); } } else if(boss.type==='forest_wolf'){ ctx.rotate(boss.angle); const bodyL=C.FOREST_WOLF_BODY_LENGTH;const bodyW=C.FOREST_WOLF_BODY_WIDTH; const headR=C.FOREST_WOLF_HEAD_RADIUS;const legR=C.FOREST_WOLF_LEG_RADIUS; const headOffsetX=bodyL/2+headR*0.6; ctx.fillStyle=baseColor; ctx.strokeStyle='#444';ctx.lineWidth=1; const legOffsetY=bodyW/2+legR*0.5; const legOffsetXFront=bodyL*0.35;const legOffsetXBack=-bodyL*0.35; ctx.beginPath();ctx.arc(legOffsetXFront,legOffsetY,legR,0,Math.PI*2);ctx.fill();ctx.stroke(); ctx.beginPath();ctx.arc(legOffsetXFront,-legOffsetY,legR,0,Math.PI*2);ctx.fill();ctx.stroke(); ctx.beginPath();ctx.arc(legOffsetXBack,legOffsetY,legR,0,Math.PI*2);ctx.fill();ctx.stroke(); ctx.beginPath();ctx.arc(legOffsetXBack,-legOffsetY,legR,0,Math.PI*2);ctx.fill();ctx.stroke(); ctx.fillRect(-bodyL/2,-bodyW/2,bodyL,bodyW); ctx.strokeRect(-bodyL/2,-bodyW/2,bodyL,bodyW); ctx.beginPath();ctx.arc(headOffsetX,0,headR,0,Math.PI*2);ctx.fill();ctx.stroke(); ctx.fillStyle='#FF0000'; const eyeOffsetY=headR*0.4;const eyeOffsetX=headOffsetX+headR*0.3;const eyeRadius=headR*0.2; ctx.beginPath();ctx.arc(eyeOffsetX,eyeOffsetY,eyeRadius,0,Math.PI*2);ctx.fill(); ctx.beginPath();ctx.arc(eyeOffsetX,-eyeOffsetY,eyeRadius,0,Math.PI*2);ctx.fill(); } else if(boss.type==='jungle_boss'){ const pulseFactor=0.9+Math.sin(now/300)*0.1; const currentRadius=boss.radius*pulseFactor; ctx.fillStyle=baseColor; ctx.globalAlpha=isFlashing?1.0:0.8; ctx.beginPath();ctx.arc(0,0,currentRadius,0,Math.PI*2);ctx.fill(); ctx.fillStyle='#40E0D0'; ctx.globalAlpha=isFlashing?0.8:0.9; ctx.beginPath();ctx.arc(0,0,currentRadius*0.6,0,Math.PI*2);ctx.fill(); ctx.fillStyle='#FFFFFF'; ctx.globalAlpha=1.0; const eyeRadius=currentRadius*0.15; const eyeOffsetX=currentRadius*0.3; const eyeAngle=boss.angle; ctx.beginPath();ctx.arc(Math.cos(eyeAngle-0.5)*eyeOffsetX,Math.sin(eyeAngle-0.5)*eyeOffsetX,eyeRadius,0,Math.PI*2);ctx.fill(); ctx.beginPath();ctx.arc(Math.cos(eyeAngle+0.5)*eyeOffsetX,Math.sin(eyeAngle+0.5)*eyeOffsetX,eyeRadius,0,Math.PI*2);ctx.fill(); } ctx.restore();}); }
// PASTE drawDroppedItems() definition here (already complete)
function drawDroppedItems() { ctx.save(); droppedItems.forEach(item => { const itemData = C.ITEM_DATA[item.type]; if (!itemData) return; ctx.save(); ctx.translate(item.x, item.y); const bounceOffset = Math.abs(Math.sin((Date.now() - item.spawnTime) / 200)) * 3; ctx.translate(0, -bounceOffset); const size = item.radius * 2.5; drawItemShape(ctx, item.type, size); ctx.restore(); }); ctx.restore(); }
// PASTE drawPlayer() definition here (already complete)
function drawPlayer() { ctx.save(); ctx.translate(player.x,player.y); ctx.fillStyle='#87CEEB'; ctx.beginPath();ctx.arc(0,0,player.radius,0,Math.PI*2);ctx.fill(); ctx.strokeStyle='#4682B4';ctx.lineWidth=2;ctx.stroke(); let handAngleBase=player.angle; let handDist=C.HAND_DISTANCE; let leftHandAngle=handAngleBase-Math.PI/4; let rightHandAngle=handAngleBase+Math.PI/4; if(player.isAttacking){ const progress=Math.min(1,(Date.now()-player.attackTimer)/C.ATTACK_DURATION); const equippedToolType=C.ITEM_DATA[player.equippedItemType]?.toolType; if(equippedToolType!=='bow'){ const swingArc=C.ATTACK_SWING_ARC; const currentSwing=Math.sin(progress*Math.PI)*swingArc; rightHandAngle=player.angle+currentSwing-swingArc/2+Math.PI/4; leftHandAngle=player.angle-Math.PI/4; }else{ const drawBackAmount=Math.sin(progress*Math.PI)*5; handDist-=drawBackAmount; rightHandAngle=player.angle+Math.PI/6; leftHandAngle=player.angle-Math.PI/6; } }else if(player.isInteracting){ const progress=(Date.now()-player.interactTimer)/C.INTERACT_DURATION; const pulseAmount=Math.sin(progress*Math.PI)*5; handDist+=pulseAmount; rightHandAngle=player.angle+Math.PI/6; leftHandAngle=player.angle-Math.PI/6; } const leftX=Math.cos(leftHandAngle)*handDist;const leftY=Math.sin(leftHandAngle)*handDist; const rightX=Math.cos(rightHandAngle)*handDist;const rightY=Math.sin(rightHandAngle)*handDist; ctx.fillStyle='#FFDAB9'; ctx.beginPath();ctx.arc(leftX,leftY,C.LIMB_RADIUS,0,Math.PI*2);ctx.fill(); ctx.beginPath();ctx.arc(rightX,rightY,C.LIMB_RADIUS,0,Math.PI*2);ctx.fill(); if(player.equippedItemType){ const itemData=C.ITEM_DATA[player.equippedItemType]; if(itemData){ ctx.save(); const itemDistOffset=C.LIMB_RADIUS*1.5; const itemX=Math.cos(rightHandAngle)*(handDist+itemDistOffset); const itemY=Math.sin(rightHandAngle)*(handDist+itemDistOffset); ctx.translate(itemX,itemY); ctx.rotate(rightHandAngle+Math.PI/2); drawItemShape(ctx,player.equippedItemType,25); ctx.restore(); } } ctx.restore(); }
// PASTE drawProjectiles() definition here (already complete)
function drawProjectiles() { ctx.save(); projectiles.forEach(p=>{ ctx.fillStyle=p.color||'#FFF'; ctx.strokeStyle=p.color||'#FFF'; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.atan2(p.vy,p.vx)); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-p.radius*2.5,0);ctx.lineTo(p.radius*1.5,0); ctx.lineTo(p.radius*0.8,-p.radius*0.6); ctx.moveTo(p.radius*1.5,0); ctx.lineTo(p.radius*0.8,p.radius*0.6); ctx.stroke(); ctx.restore(); }); ctx.restore(); }
// PASTE drawUndeadMinions() definition here (already complete)
function drawUndeadMinions() { if(!gameHasStarted||undeadMinions.length===0)return; const now=Date.now(); ctx.save(); undeadMinions.forEach(minion=>{ ctx.save(); ctx.translate(minion.x,minion.y); if(minion.health<minion.maxHealth&&minion.health>0){ const bw=minion.radius*1.8,bh=3,barY=-minion.radius-bh-2; ctx.fillStyle='#444';ctx.fillRect(-bw/2,barY,bw,bh); ctx.fillStyle='#BBB';ctx.fillRect(-bw/2,barY,bw*(minion.health/minion.maxHealth),bh); } const isFlashing=minion.flashUntil>now&&Math.floor(now/50)%2===0; ctx.fillStyle=isFlashing?'#FFF':minion.color; ctx.beginPath();ctx.arc(0,0,minion.radius,0,Math.PI*2);ctx.fill(); ctx.strokeStyle="#555";ctx.lineWidth=1;ctx.stroke(); ctx.restore(); }); ctx.restore(); }
// PASTE drawSummonedSlimes() definition here (already complete)
function drawSummonedSlimes() { if(!gameHasStarted||summonedSlimes.length===0)return; const now=Date.now(); ctx.save(); summonedSlimes.forEach(slime=>{ ctx.save(); ctx.translate(slime.x,slime.y); if(slime.health<slime.maxHealth&&slime.health>0){ const bw=slime.radius*1.8,bh=3,barY=-slime.radius-bh-2; ctx.fillStyle='#004d00'; ctx.fillRect(-bw/2,barY,bw,bh); ctx.fillStyle='#32CD32'; ctx.fillRect(-bw/2,barY,bw*(slime.health/slime.maxHealth),bh); } const isFlashing=slime.flashUntil>now&&Math.floor(now/50)%2===0; ctx.fillStyle=isFlashing?'#FFFFFF':slime.color; ctx.beginPath();ctx.arc(0,0,slime.radius,0,Math.PI*2);ctx.fill(); ctx.strokeStyle="#006400";ctx.lineWidth=1;ctx.stroke(); ctx.restore(); }); ctx.restore(); }
// PASTE drawPets() definition here (already complete)
function drawPets() { if (!player.pet || gamePaused) return; const pet=player.pet; const now=Date.now(); const isFlashing=pet.flashUntil>now&&Math.floor(now/50)%2===0; ctx.save(); ctx.translate(pet.x,pet.y); ctx.fillStyle=isFlashing?'#FFF':pet.color; ctx.strokeStyle='black';ctx.lineWidth=1; ctx.beginPath();ctx.arc(0,0,pet.radius,0,Math.PI*2);ctx.fill();ctx.stroke(); ctx.fillStyle='black'; switch(pet.type){ case 'frog': case 'cat': case 'dog': ctx.beginPath();ctx.arc(-pet.radius*0.4,-pet.radius*0.2,2,0,Math.PI*2);ctx.fill(); ctx.beginPath();ctx.arc(pet.radius*0.4,-pet.radius*0.2,2,0,Math.PI*2);ctx.fill(); break; case 'beetle': ctx.strokeStyle='black';ctx.lineWidth=1; ctx.beginPath();ctx.moveTo(0,-pet.radius);ctx.lineTo(-3,-pet.radius-4);ctx.stroke(); ctx.beginPath();ctx.moveTo(0,-pet.radius);ctx.lineTo(3,-pet.radius-4);ctx.stroke(); if(!pet.blockReady){ ctx.fillStyle='rgba(100,100,100,0.4)'; ctx.beginPath();ctx.arc(0,0,pet.radius+1,0,Math.PI*2);ctx.fill(); } break; case 'bird': ctx.fillStyle='#FFD700';ctx.beginPath(); ctx.moveTo(0,-pet.radius*0.5);ctx.lineTo(pet.radius,0);ctx.lineTo(0,pet.radius*0.5);ctx.closePath();ctx.fill(); break; } ctx.restore(); }

// Main drawing function
function draw() {
    if (!gameHasStarted) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 - cameraX, canvas.height / 2 - cameraY);

    drawWorldBackground();
    drawResources();
    drawDroppedItems();
    drawMonsters();
    drawUndeadMinions();
    drawSummonedSlimes();
    drawBosses();
    drawPlayer();
    drawPets();
    drawProjectiles();
    drawBiomeWalls(); // Draw walls last in world space? Or before entities? Before looks better.

    if (currentNightOpacity > 0.01) {
        ctx.save(); ctx.fillStyle = '#00001a'; ctx.globalAlpha = currentNightOpacity;
        ctx.fillRect(cameraX - canvas.width / 2, cameraY - canvas.height / 2, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0; ctx.globalCompositeOperation = 'lighter';
        resources.forEach(res => { if (res.isPlaced && res.lightRadius > 0 && res.type === 'torch') { const g = ctx.createRadialGradient(res.x, res.y, 0, res.x, res.y, res.lightRadius), b = 0.6; g.addColorStop(0, `rgba(255,190,120,${b})`); g.addColorStop(0.6, `rgba(200,100,50,${b*0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(res.x, res.y, res.lightRadius, 0, Math.PI * 2); ctx.fill(); } });
        C.lavaPools.forEach(p => { if (p.lightRadius > 0) { const cX=p.x+p.width/2, cY=p.y+p.height/2, b=p.lightOpacity||0.8, g=ctx.createRadialGradient(cX,cY,0,cX,cY,p.lightRadius); g.addColorStop(0,`rgba(255,100,0,${b*0.9})`); g.addColorStop(0.5,`rgba(255,60,0,${b*0.6})`); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath();ctx.arc(cX,cY,p.lightRadius,0,Math.PI*2);ctx.fill(); } });
        if (player.equippedItemType === 'torch') { const d = C.ITEM_DATA['torch']; if (d && d.lightRadius > 0) { const r = d.lightRadius, g = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, r), b = 0.65; g.addColorStop(0, `rgba(255,190,120,${b})`); g.addColorStop(0.6, `rgba(200,100,50,${b*0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(player.x, player.y, r, 0, Math.PI * 2); ctx.fill(); } }
        ctx.restore();
    }
    ctx.restore(); // Restore camera transform
    drawMinimap(); // Draw UI minimap
}


// --- Game Loop ---
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    if (gameHasStarted && !isGameOver && !gamePaused) {
        update(deltaTime || 0); // Pass delta time, use 0 if first frame
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Start Game ---
player.xpToNextLevel = U.calculateXPForNextLevel(player.level);
requestAnimationFrame(gameLoop);
console.log("--- game.js loaded. Waiting for class selection... ---");