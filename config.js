// --- Game Settings ---
export const PLAYER_SPEED = 4;
export const PLAYER_RADIUS = 15;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_MAX_HUNGER = 100;
export const LIMB_RADIUS = 5;
export const HAND_DISTANCE = PLAYER_RADIUS + 10;
export const ATTACK_SWING_ARC = Math.PI / 2;
export const ATTACK_DURATION = 150;
export const MELEE_ATTACK_COOLDOWN = 250;
export const INTERACT_DURATION = 100;
export const ATTACK_RANGE = 60;
export const BASE_ATTACK_POWER = 5;
export const BASE_GATHER_POWER = 3;
export const SWORD_MULTIPLIER = 2.0;
export const AXE_MULTIPLIER = 3.0;
export const PICKAXE_MULTIPLIER = 4.0;
export const FLASH_DURATION = 100;
export const ITEM_PICKUP_RANGE_SQ = (PLAYER_RADIUS + 10) * (PLAYER_RADIUS + 10);
export const DROPPED_ITEM_RADIUS = 5;
export const INVENTORY_COLS = 8;
export const INVENTORY_ROWS = 4;
export const HOTBAR_SIZE = 5;
export const MAX_STACK_SIZE = 64;
export const PLACE_GRID_SIZE = 20;
export const PLACE_RANGE_SQ = (PLAYER_RADIUS + 60) * (PLAYER_RADIUS + 60);
export const INTERACT_RANGE_SQ = (PLAYER_RADIUS + 50) * (PLAYER_RADIUS + 50);
export const HEAL_AMOUNT = 25;
export const BOW_COOLDOWN = 1600;
export const PROJECTILE_SPEED = 8;
export const PROJECTILE_RANGE = 450;
export const PROJECTILE_RADIUS = 3;
export const MINIMAP_WIDTH = 160;
export const MINIMAP_HEIGHT = 120;
export const MINIMAP_PADDING = 15;
export const MINIMAP_ALPHA = 0.75;
export const MINIMAP_PLAYER_COLOR = '#00FF00';
export const MINIMAP_BOSS_COLOR = '#FF0000';
export const MINIMAP_RESPAWN_COLOR = '#FFFF00';
export const MINIMAP_PLAYER_SIZE = 3;
export const BASE_XP_FOR_LEVEL_2 = 100;
export const XP_LEVEL_EXPONENT = 1.5;
export const MONSTER_XP_REWARD = 10;
export const PLAINS_BOSS_XP_REWARD = 250;
export const MINION_KILL_XP_MULTIPLIER = 0.5;
export const MAX_UNDEAD_MINIONS = 10;
export const MAX_SUMMONED_SLIMES = 2;

// --- World & Time Settings ---
export const WORLD_WIDTH = 2000 * 10;
export const WORLD_HEIGHT = 1500 * 10;
export const ISLAND_PADDING = 150 * 3;
export const DAY_LENGTH = 120000;
export const NIGHT_START_PERCENT = 0.65;
export const TRANSITION_DURATION_PERCENT = 0.08;
export const SUNSET_START_PERCENT = NIGHT_START_PERCENT - TRANSITION_DURATION_PERCENT;
export const SUNRISE_START_PERCENT = 1.0 - TRANSITION_DURATION_PERCENT;
export const MAX_NIGHT_OPACITY = 0.75;

// --- Biome Definitions ---
const WORLD_THIRD_X = WORLD_WIDTH / 3;
const WORLD_THIRD_Y = WORLD_HEIGHT / 3;
export const BIOME_BOUNDS = {
    ROCKY_X_END: WORLD_THIRD_X, ROCKY_Y_END: WORLD_THIRD_Y,
    SWAMP_X_START: WORLD_WIDTH - WORLD_THIRD_X, SWAMP_Y_END: WORLD_THIRD_Y,
    VOLCANO_X_END: WORLD_THIRD_X, VOLCANO_Y_START: WORLD_HEIGHT - WORLD_THIRD_Y,
    BADLANDS_X_START: WORLD_WIDTH - WORLD_THIRD_X, BADLANDS_Y_START: WORLD_HEIGHT - WORLD_THIRD_Y,
    FROSTLANDS_Y_END: WORLD_THIRD_Y,
    DESERT_Y_START: WORLD_HEIGHT - WORLD_THIRD_Y,
    FOREST_X_END: WORLD_THIRD_X,
    JUNGLE_X_START: WORLD_WIDTH - WORLD_THIRD_X
};
export const WORLD_CENTER_X = WORLD_WIDTH / 2;
export const WORLD_CENTER_Y = WORLD_HEIGHT / 2;
export const JUNGLE_LAKE = {
    x: BIOME_BOUNDS.JUNGLE_X_START + (WORLD_WIDTH - BIOME_BOUNDS.JUNGLE_X_START) * 0.15,
    y: BIOME_BOUNDS.FROSTLANDS_Y_END + (BIOME_BOUNDS.DESERT_Y_START - BIOME_BOUNDS.FROSTLANDS_Y_END) * 0.2,
    width: (WORLD_WIDTH - BIOME_BOUNDS.JUNGLE_X_START) * 0.7,
    height: (BIOME_BOUNDS.DESERT_Y_START - BIOME_BOUNDS.FROSTLANDS_Y_END) * 0.6,
    color: '#367588'
};
export const LAVA_POOL_COUNT = 5;
export const lavaPools = [];
for (let i = 0; i < LAVA_POOL_COUNT; i++) {
    const poolWidth = (BIOME_BOUNDS.VOLCANO_X_END * 0.1) + (Math.random() * BIOME_BOUNDS.VOLCANO_X_END * 0.2);
    const poolHeight = ((WORLD_HEIGHT - BIOME_BOUNDS.VOLCANO_Y_START) * 0.1) + (Math.random() * (WORLD_HEIGHT - BIOME_BOUNDS.VOLCANO_Y_START) * 0.2);
    lavaPools.push({
        x: (Math.random() * (BIOME_BOUNDS.VOLCANO_X_END - poolWidth)),
        y: BIOME_BOUNDS.VOLCANO_Y_START + (Math.random() * (WORLD_HEIGHT - BIOME_BOUNDS.VOLCANO_Y_START - poolHeight)),
        width: poolWidth,
        height: poolHeight,
        color: '#FF4500',
        lightRadius: 80 + Math.random() * 60,
        lightOpacity: 0.7 + Math.random() * 0.15
    });
}
export const WALL_THICKNESS = 15;
export const WALL_COLOR = 'rgba(60, 40, 30, 0.8)';

export const BIOME_DATA = {
    plains:     { color: '#A0D995', treeDensity: 0.04, rockDensity: 0.02, enemyDensity: 0.003, cactusDensity: 0, spawnMultiplier: 1.5 },
    forest:     { color: '#2E8B57', treeDensity: 0.5,  rockDensity: 0,    enemyDensity: 0.02,  cactusDensity: 0, spawnMultiplier: 3 },
    jungle:     { color: '#556B2F', treeDensity: 0.2,  rockDensity: 0.01, enemyDensity: 0.015, cactusDensity: 0, spawnMultiplier: 3 },
    frostlands: { color: '#E6E6FA', treeDensity: 0.15, rockDensity: 0.04, enemyDensity: 0.01,  cactusDensity: 0, spawnMultiplier: 2.5 },
    desert:     { color: '#EDC9AF', treeDensity: 0,    rockDensity: 0.25, enemyDensity: 0.018, cactusDensity: 0.2, spawnMultiplier: 2.5 },
    rocky:      { color: '#A9A9A9', treeDensity: 0,    rockDensity: 0.8,  enemyDensity: 0.01,  cactusDensity: 0, spawnMultiplier: 4 },
    swamp:      { color: '#6B8E23', treeDensity: 0.1,  rockDensity: 0.01, enemyDensity: 0.025, cactusDensity: 0, spawnMultiplier: 3, hasWater: true },
    volcano:    { color: '#4C4646', treeDensity: 0,    rockDensity: 0.5,  enemyDensity: 0.022, cactusDensity: 0, spawnMultiplier: 4, hasLava: true },
    badlands:   { color: '#D2B48C', treeDensity: 0,    rockDensity: 0.1,  enemyDensity: 0.025, cactusDensity: 0.05, spawnMultiplier: 3.5, hasBoneTrees: true },
};

// --- Necromancer Settings ---
export const NECROMANCER_KILLS_TO_SUMMON = 5;

// --- Class Data ---
export const CLASS_DATA = {
    // value: { healthMult, speedMult, swordBoost, bowBoost, lifesteal, daySpeedPenalty, killsToSummon, className }
    knight:     { healthMult: 1.0, speedMult: 1.00, swordBoost: 3.0, bowBoost: 1.0, lifesteal: 0,   daySpeedPenalty: 1.0, killsToSummon: 0,   className: 'knight' },
    archer:     { healthMult: 1.0, speedMult: 1.00, swordBoost: 1.0, bowBoost: 5.0, lifesteal: 0,   daySpeedPenalty: 1.0, killsToSummon: 0,   className: 'archer' },
    scout:      { healthMult: 0.8, speedMult: 1.75, swordBoost: 1.0, bowBoost: 1.0, lifesteal: 0,   daySpeedPenalty: 1.0, killsToSummon: 0,   className: 'scout' },
    tank:       { healthMult: 3.0, speedMult: 0.80, swordBoost: 1.0, bowBoost: 1.0, lifesteal: 0,   daySpeedPenalty: 1.0, killsToSummon: 0,   className: 'tank' },
    vampire:    { healthMult: 0.8, speedMult: 1.00, swordBoost: 1.0, bowBoost: 1.0, lifesteal: 2.5, daySpeedPenalty: 0.5, killsToSummon: 0,   className: 'vampire' },
    necromancer:{ healthMult: 0.5, speedMult: 0.80, swordBoost: 1.0, bowBoost: 1.0, lifesteal: 0,   daySpeedPenalty: 1.0, killsToSummon: NECROMANCER_KILLS_TO_SUMMON, className: 'necromancer' },
    summoner:   { healthMult: 0.9, speedMult: 0.90, swordBoost: 1.0, bowBoost: 1.0, lifesteal: 0,   daySpeedPenalty: 1.0, killsToSummon: 0,   className: 'summoner' },
};

// --- Boss Settings ---
export const PLAINS_BOSS_RADIUS = 40;
export const PLAINS_BOSS_HEALTH = 1000;
export const PLAINS_BOSS_SPEED = 1.0;
export const PLAINS_BOSS_DETECT_RANGE_SQ = 400 * 400;
export const PLAINS_BOSS_ATTACK_COOLDOWN = 1500;
export const PLAINS_BOSS_ATTACK_CHOICE_COOLDOWN = 3000;
export const BOSS_HIT_RANGE = PLAINS_BOSS_RADIUS + PLAYER_RADIUS + 10;
export const BOSS_HIT_DAMAGE = 25;
export const BOSS_SMASH_RANGE = 100;
export const BOSS_SMASH_DAMAGE = 35;
export const BOSS_SMASH_WINDUP = 800;
export const BOSS_SMASH_EFFECT_DURATION = 300;
export const BOSS_SPIN_RANGE = PLAINS_BOSS_RADIUS + 20;
export const BOSS_SPIN_DAMAGE = 15;
export const BOSS_SPIN_DURATION = 1200;
export const BOSS_SPIN_DAMAGE_INTERVAL = 300;
export const FOREST_WOLF_RADIUS = 50;
export const FOREST_WOLF_BODY_LENGTH = 120;
export const FOREST_WOLF_BODY_WIDTH = 40;
export const FOREST_WOLF_HEAD_RADIUS = 30;
export const FOREST_WOLF_LEG_RADIUS = 10;
export const FOREST_WOLF_HEALTH = 200;
export const FOREST_WOLF_SPEED_MULT = 1.25;
export const FOREST_WOLF_CONTACT_DAMAGE = 90;
export const FOREST_WOLF_ENEMY_CONTACT_DAMAGE = 90;
export const FOREST_WOLF_CORNER_THRESHOLD_SQ = 100 * 100;
export const FOREST_WOLF_TREE_DESTROY_RADIUS = FOREST_WOLF_RADIUS + 10;
export const JUNGLE_BOSS_RADIUS = 50;
export const JUNGLE_BOSS_HEALTH = PLAINS_BOSS_HEALTH * 2;
export const JUNGLE_BOSS_ATTACK_COOLDOWN = 2000;
export const JUNGLE_BOSS_PROJECTILE_SPEED = 6;
export const JUNGLE_BOSS_PROJECTILE_RANGE = 1000 * 100;
export const JUNGLE_BOSS_PROJECTILE_RADIUS = 8;
export const JUNGLE_BOSS_PROJECTILE_COLOR = '#1E90FF';
export const JUNGLE_BOSS_PROJECTILE_DAMAGE = 50;

// --- Monster Settings ---
export const MONSTER_SPEED = 1.8;
export const MONSTER_DETECT_RANGE = 250;
export const MONSTER_ATTACK_RANGE = PLAYER_RADIUS + 5;
export const MONSTER_HIT_BUFFER = 5;
export const MONSTER_ATTACK_COOLDOWN = 1000;
export const MONSTER_DAMAGE = 10;
export const INITIAL_MONSTER_COUNT = 1000;
export const NIGHTLY_MONSTER_SPAWN_COUNT = 100;
export const MAX_MONSTER_COUNT = 5000;
export const FOREST_TREE_TARGET = 1200;
export const GOLD_COIN_DROP_CHANCE = 1 / 50;

// --- Undead Minion Settings ---
export const UNDEAD_RADIUS = 8;
export const UNDEAD_COLOR = '#E0E0E0';
export const UNDEAD_BASE_HEALTH_MULT = 0.8;
export const UNDEAD_SPEED = 1.5;
export const UNDEAD_ATTACK_RANGE = MONSTER_ATTACK_RANGE;
export const UNDEAD_HIT_BUFFER = MONSTER_HIT_BUFFER;
export const UNDEAD_ATTACK_COOLDOWN = 1200;
export const UNDEAD_DAMAGE = 6;

// --- Summoned Slime Settings ---
export const SUMMONED_SLIME_RADIUS = 9;
export const SUMMONED_SLIME_COLOR = '#32CD32';
export const SUMMONED_SLIME_HEALTH_MULT = 1.0;
export const SUMMONED_SLIME_SPEED = 1.6;
export const SUMMONED_SLIME_DETECT_RANGE_SQ = (MONSTER_DETECT_RANGE * 0.9) ** 2;
export const SUMMONED_SLIME_ATTACK_RANGE = MONSTER_ATTACK_RANGE;
export const SUMMONED_SLIME_HIT_BUFFER = MONSTER_HIT_BUFFER;
export const SUMMONED_SLIME_ATTACK_COOLDOWN = 1100;
export const SUMMONED_SLIME_DAMAGE = 8;
export const SUMMON_FOLLOW_DISTANCE_SQ = (PLAYER_RADIUS + SUMMONED_SLIME_RADIUS + 25)**2;
export const SUMMON_AGGRO_RANGE_SQ = (MONSTER_DETECT_RANGE * 1.2) ** 2;

// --- Pet Settings ---
export const PET_FOLLOW_DISTANCE = PLAYER_RADIUS + 15;
export const PET_RADIUS = 10;
export const PET_FROG_HEAL_AMOUNT = 10;
export const PET_FROG_HEAL_COOLDOWN = 30000; // 30 seconds
export const PET_CAT_ATTACK_COOLDOWN = 1500;
export const PET_CAT_PROJECTILE_SPEED = 7;
export const PET_CAT_PROJECTILE_RANGE = 300;
export const PET_CAT_PROJECTILE_RADIUS = 4;
export const PET_CAT_PROJECTILE_DAMAGE = 5;
export const PET_BEETLE_BLOCK_COOLDOWN = 10000; // 10 seconds
export const PET_DOG_ATTACK_RANGE = PLAYER_RADIUS + PET_RADIUS + 10;
export const PET_DOG_ATTACK_COOLDOWN = 800;
export const PET_DOG_DAMAGE = 7;
export const PET_BIRD_PICKUP_RANGE_SQ = (PLAYER_RADIUS + PET_RADIUS + 30)**2;

// --- Item Data ---
export const ITEM_DATA = {
    'tree':        { color: '#654321', name: 'Tree', isPlaceable: false, health: 50, radius: 15, shape: 'circle', isSolid: true, isAttackable: true },
    'rock':        { color: '#808080', name: 'Rock', isPlaceable: false, health: 150, radius: 12, shape: 'circle', isSolid: true, isAttackable: true },
    'cactus':      { color: '#2E8B57', name: 'Cactus', isPlaceable: false, isSolid: true, isAttackable: true, radius: 10, health: 100, shape: 'cactus' },
    'bone_tree':   { color: '#EEDFCC', name: 'Bone Tree', isPlaceable: false, isSolid: true, isAttackable: true, radius: 13, health: 160, shape: 'tree', variant: 'bone'},
    'wood':         { color: '#A0522D', name: 'Wood', isPlaceable: false, shape: 'rect' },
    'stone':        { color: '#778899', name: 'Stone', isPlaceable: false, shape: 'circle' },
    'plant_fiber':  { color: '#9ACD32', name: 'Plant Fiber', isPlaceable: false, shape: 'line' },
    'monster_goop': { color: '#90EE90', name: 'Monster Goop', isPlaceable: false, shape: 'circle' },
    'gold_coin':    { color: '#FFD700', name: 'Gold Coin', isPlaceable: false, shape: 'circle' },
    'dust':         { color: '#C2B280', name: 'Dust', isPlaceable: false, shape: 'circle'},
    'stick':        { color: '#B8860B', name: 'Stick', isPlaceable: false, shape: 'line' },
    'iron_ore':     { color: '#8A867D', name: 'Iron Ore', isPlaceable: false, shape: 'circle' },
    'cobalt_ore':   { color: '#2040C0', name: 'Cobalt Ore', isPlaceable: false, shape: 'circle' },
    'mithril_ore':  { color: '#60D090', name: 'Mithril Ore', isPlaceable: false, shape: 'circle' },
    'adamantite_ore':{ color: '#B01010', name: 'Adamantite Ore', isPlaceable: false, shape: 'circle' },
    'wood_plank':   { color: '#DEB887', name: 'Wooden Plank', isPlaceable: true, solidRadius: PLACE_GRID_SIZE / 2, shape: 'rect', isSolid: true, isAttackable: true, health: 50 },
    'stone_block':  { color: '#696969', name: 'Stone Block', isPlaceable: true, solidRadius: PLACE_GRID_SIZE / 2, shape: 'rect', isSolid: true, isAttackable: true, health: 150 },
    'workbench':    { color: '#D2691E', name: 'Workbench', isPlaceable: true, isInteractable: true, solidRadius: PLACE_GRID_SIZE, shape: 'rect', isSolid: true, isAttackable: true, health: 100 },
    'icky_bed':     { color: '#556B2F', name: 'Icky Bed', isPlaceable: true, isInteractable: true, solidRadius: PLACE_GRID_SIZE, shape: 'rect', isSolid: true, isAttackable: true, health: 80 },
    'torch':        { color: '#FFA500', name: 'Torch', isPlaceable: true, isSolid: true, isAttackable: true, solidRadius: 5, health: 10, lightRadius: 120, shape: 'torch' },
    'item_upgrader_t1': { color: '#708090', name: 'Item Upgrader T1', isPlaceable: true, isInteractable: true, solidRadius: PLACE_GRID_SIZE, shape: 'rect', isSolid: true, isAttackable: true, health: 200 },
    'healing_salve':{ color: '#FFC0CB', name: 'Healing Salve', isPlaceable: false, isUsable: true, shape: 'circle' },
    'mystical_orb': { color: '#8A2BE2', name: 'Mystical Orb', isPlaceable: false, isUsable: true, shape: 'circle' },
    'wood_sword':   { color: '#D2B48C', name: 'Wooden Sword', isPlaceable: false, type: 'tool', toolType: 'sword', damageMultiplier: SWORD_MULTIPLIER, shape: 'sword' },
    'wood_axe':     { color: '#8B4513', name: 'Wooden Axe', isPlaceable: false, type: 'tool', toolType: 'axe', gatherMultiplier: AXE_MULTIPLIER, target: 'tree', shape: 'axe' },
    'wood_pickaxe': { color: '#A0522D', name: 'Wooden Pickaxe', isPlaceable: false, type: 'tool', toolType: 'pickaxe', gatherMultiplier: PICKAXE_MULTIPLIER, target: 'rock', shape: 'pickaxe', toolTier: 0 },
    'stone_sword':  { color: '#A9A9A9', name: 'Stone Sword', isPlaceable: false, type: 'tool', toolType: 'sword', damageMultiplier: SWORD_MULTIPLIER * 1.5, shape: 'sword' },
    'stone_axe':    { color: '#808080', name: 'Stone Axe', isPlaceable: false, type: 'tool', toolType: 'axe', gatherMultiplier: AXE_MULTIPLIER * 1.5, target: 'tree', shape: 'axe' },
    'stone_pickaxe':{ color: '#696969', name: 'Stone Pickaxe', isPlaceable: false, type: 'tool', toolType: 'pickaxe', gatherMultiplier: PICKAXE_MULTIPLIER * 1.5, target: 'rock', shape: 'pickaxe', toolTier: 1 },
    'iron_pickaxe': { color: '#A19D94', name: 'Iron Pickaxe', isPlaceable: false, type: 'tool', toolType: 'pickaxe', gatherMultiplier: PICKAXE_MULTIPLIER * 2.0, target: 'rock', shape: 'pickaxe', toolTier: 2 },
    'cobalt_pickaxe':{ color: '#3E64FF', name: 'Cobalt Pickaxe', isPlaceable: false, type: 'tool', toolType: 'pickaxe', gatherMultiplier: PICKAXE_MULTIPLIER * 2.7, target: 'rock', shape: 'pickaxe', toolTier: 3 },
    'mithril_pickaxe':{ color: '#93E9BE', name: 'Mithril Pickaxe', isPlaceable: false, type: 'tool', toolType: 'pickaxe', gatherMultiplier: PICKAXE_MULTIPLIER * 3.5, target: 'rock', shape: 'pickaxe', toolTier: 4 },
    'adamantite_pickaxe':{ color: '#E41B17', name: 'Adamantite Pickaxe', isPlaceable: false, type: 'tool', toolType: 'pickaxe', gatherMultiplier: PICKAXE_MULTIPLIER * 4.5, target: 'rock', shape: 'pickaxe', toolTier: 5 },
    'wooden_bow':   { color: '#CD853F', name: 'Wooden Bow', isPlaceable: false, type: 'tool', toolType: 'bow', shape: 'bow', range: 400, damage: 45 },
    'stone_reinforced_bow': { color: '#A58D71', name: 'Stone-Reinforced Bow', isPlaceable: false, type: 'tool', toolType: 'bow', shape: 'bow', range: 450, damage: 66 },
    'bone_scythe':  { color: '#F5F5DC', name: 'Bone Scythe', isPlaceable: false, type: 'tool', toolType: 'sword', damageMultiplier: SWORD_MULTIPLIER * 2, shape: 'sword'},
    'fishing_rod':  { color: '#C0C0C0', name: 'Fishing Rod', isPlaceable: false, type: 'tool', toolType: 'fishing_rod', shape: 'line' },
};

// --- Define Recipes ---
export const recipes = [
    // Basic Player Crafting
    { id: 'craft_stick', name: 'Stick', input: { 'wood': 2 }, output: { type: 'stick', count: 4 }, requiresWorkbench: false },
    { id: 'craft_wood_plank', name: 'Wooden Plank', input: { 'wood': 1 }, output: { type: 'wood_plank', count: 2 }, requiresWorkbench: false },
    { id: 'craft_torch', name: 'Torch', input: { 'stick': 1, 'wood': 1 }, output: { type: 'torch', count: 3 }, requiresWorkbench: false },
    { id: 'craft_wood_sword', name: 'Wooden Sword', input: { 'stick': 1, 'wood_plank': 2 }, output: { type: 'wood_sword', count: 1 }, requiresWorkbench: false },
    { id: 'craft_wood_axe', name: 'Wooden Axe', input: { 'stick': 2, 'wood_plank': 3 }, output: { type: 'wood_axe', count: 1 }, requiresWorkbench: false },
    { id: 'craft_wood_pickaxe', name: 'Wooden Pickaxe', input: { 'stick': 2, 'wood_plank': 3 }, output: { type: 'wood_pickaxe', count: 1 }, requiresWorkbench: false },
    { id: 'craft_wooden_bow', name: 'Wooden Bow', input: { 'stick': 3, 'plant_fiber': 5 }, output: { type: 'wooden_bow', count: 1 }, requiresWorkbench: false },
    { id: 'craft_healing_salve', name: 'Healing Salve', input: { 'plant_fiber': 2, 'monster_goop': 1 }, output: { type: 'healing_salve', count: 1 }, requiresWorkbench: false },

    // Workbench Crafting
    { id: 'craft_workbench', name: 'Workbench', input: { 'wood': 10, 'stone': 5 }, output: { type: 'workbench', count: 1 }, requiresWorkbench: false }, // Note: Can craft WB without WB
    { id: 'craft_stone_block', name: 'Stone Block', input: { 'stone': 2 }, output: { type: 'stone_block', count: 1 }, requiresWorkbench: true },
    { id: 'craft_icky_bed', name: 'Icky Bed', input: { 'wood_plank': 5, 'plant_fiber': 10, 'monster_goop': 3 }, output: { type: 'icky_bed', count: 1 }, requiresWorkbench: true },
    { id: 'craft_stone_sword', name: 'Stone Sword', input: { 'stick': 1, 'stone': 4 }, output: { type: 'stone_sword', count: 1 }, requiresWorkbench: true },
    { id: 'craft_stone_axe', name: 'Stone Axe', input: { 'stick': 2, 'stone': 6 }, output: { type: 'stone_axe', count: 1 }, requiresWorkbench: true },
    { id: 'craft_stone_pickaxe', name: 'Stone Pickaxe', input: { 'stick': 2, 'stone': 6 }, output: { type: 'stone_pickaxe', count: 1 }, requiresWorkbench: true },
    { id: 'craft_item_upgrader_t1', name: 'Item Upgrader T1', input: { 'stone_block': 10, 'iron_ore': 5, 'wood_plank': 10 }, output: { type: 'item_upgrader_t1', count: 1 }, requiresWorkbench: true },
    { id: 'craft_stone_bow', name: 'Stone-Reinforced Bow', input: { 'wooden_bow': 1, 'stone': 8, 'plant_fiber': 5 }, output: { type: 'stone_reinforced_bow', count: 1 }, requiresWorkbench: true },
    { id: 'craft_bone_scythe', name: 'Bone Scythe', input: { 'stick': 2, 'dust': 15, 'monster_goop': 5 }, output: { type: 'bone_scythe', count: 1}, requiresWorkbench: true },
    { id: 'craft_fishing_rod', name: 'Fishing Rod', input: { 'stick': 3, 'plant_fiber': 2 }, output: { type: 'fishing_rod', count: 1 }, requiresWorkbench: true },
    // Add more workbench recipes...
];

// --- Define Upgrader Recipes ---
export const UPGRADER_RECIPES = {
    'wood_pickaxe': { name: "Upgrade to Stone Pickaxe", material: 'stone', materialCount: 10, output: 'stone_pickaxe' },
    'stone_pickaxe': { name: "Upgrade to Iron Pickaxe", material: 'iron_ore', materialCount: 15, output: 'iron_pickaxe' },
    'iron_pickaxe': { name: "Upgrade to Cobalt Pickaxe", material: 'cobalt_ore', materialCount: 20, output: 'cobalt_pickaxe'},
    'cobalt_pickaxe': { name: "Upgrade to Mithril Pickaxe", material: 'mithril_ore', materialCount: 25, output: 'mithril_pickaxe'},
    'mithril_pickaxe': { name: "Upgrade to Adamantite Pickaxe", material: 'adamantite_ore', materialCount: 30, output: 'adamantite_pickaxe'},
    'wood_sword': { name: "Upgrade to Stone Sword", material: 'stone', materialCount: 8, output: 'stone_sword'},
    'wood_axe': { name: "Upgrade to Stone Axe", material: 'stone', materialCount: 12, output: 'stone_axe'},
    'wooden_bow': { name: "Upgrade to Stone-Reinforced Bow", material: 'stone', materialCount: 10, output: 'stone_reinforced_bow'},
    // Add more upgrades...
};

// --- Boss -> Wall Tier Mapping ---
export const BOSS_WALL_TIER_MAP = {
    'plains_boss': 1,
    // 'forest_wolf': 2, // Example if wolf broke different walls
    // 'jungle_boss': 3, // Example
};

// --- Weapon Choice Data ---
export const CLASS_WEAPON_CHOICES = {
    knight: [
        { id: 'knight_greatsword', name: "Guardian's Greatsword", desc: "+25% Sword DMG, -10% Move Speed", effects: { weaponDamageMult: 1.25, weaponMoveSpeedMult: 0.90 } },
        { id: 'knight_bastion', name: "Bastion Blade", desc: "+30 Max HP, +5% Sword DMG", effects: { bonusMaxHealth: 30, weaponDamageMult: 1.05 } },
    ],
    archer: [
        { id: 'archer_longbow', name: "Swiftwood Longbow", desc: "+20% Bow DMG, +10% Range, -5% Move Speed", effects: { weaponDamageMult: 1.20, weaponRangeMult: 1.10, weaponMoveSpeedMult: 0.95 } },
        { id: 'archer_shortbow', name: "Hunter's Shortbow", desc: "+20% Bow Attack Speed, -10% Bow DMG", effects: { weaponAttackSpeedMult: 0.80, weaponDamageMult: 0.90 } },
    ],
    scout: [
        { id: 'scout_daggers', name: "Twin Daggers", desc: "+15% Atk Speed, -10% DMG", effects: { weaponAttackSpeedMult: 0.85, weaponDamageMult: 0.90 } },
        { id: 'scout_cloak', name: "Shadow Cloak", desc: "+10% Move Speed, +5 HP", effects: { weaponMoveSpeedMult: 1.10, bonusMaxHealth: 5 } }
    ],
     tank: [
         { id: 'tank_hammer', name: "Earthshaker Maul", desc: "+40 Melee DMG, -25% Atk Speed", effects: { bonusMeleeDamage: 40, weaponAttackSpeedMult: 1.25 } },
         { id: 'tank_shield', name: "Aegis Wall", desc: "+75 Max HP, -10% Move Speed", effects: { bonusMaxHealth: 75, weaponMoveSpeedMult: 0.90 } }
     ],
     vampire: [
        { id: 'vampire_rapier', name: "Blood drinker Rapier", desc: "+5% Lifesteal, +10% Atk Speed", effects: { bonusLifesteal: 0.05, weaponAttackSpeedMult: 0.90 } }, // Lifesteal is absolute value added
        { id: 'vampire_charm', name: "Nocturnal Charm", desc: "Night Speed +15%, Day Speed Penalty +10%", effects: { bonusNightSpeedMult: 1.15, bonusDaySpeedPenaltyMult: 0.90 } } // Multiplies penalty
     ],
    necromancer: [
        { id: 'necro_staff', name: "Soul Siphon Staff", desc: "Kills grant +1 HP, -5% DMG", effects: { weaponOnKillHeal: 1, weaponDamageMult: 0.95 } }, // Need on-kill hook
        { id: 'necro_tome', name: "Tome of Binding", desc: "+1 Max Undead, Undead HP -10%", effects: { bonusMaxSummons: 1, bonusUndeadHealthMult: 0.90 } } // Note: Necro uses bonusMaxSummons for Undead
    ],
    summoner: [
        { id: 'summon_catalyst', name: "Growth Catalyst", desc: "+40% Summon HP, +10% Summon DMG", effects: { bonusSummonHealthMult: 1.40, bonusSummonDamageMult: 1.10 } }, // Needs new damage mult property
        { id: 'summon_focus', name: "Swarm Focus", desc: "+1 Max Summon, -15% Summon HP", effects: { bonusMaxSummons: 1, bonusSummonHealthMult: 0.85 } }
    ],
     default: [
         { id: 'generic_sword', name: "Slightly Better Sword", desc: "+5 Melee DMG", effects: { bonusMeleeDamage: 5 } },
         { id: 'generic_boots', name: "Slightly Faster Boots", desc: "+5% Move Speed", effects: { weaponMoveSpeedMult: 1.05 } },
     ]
};

// --- Pet Data ---
export const PET_DATA = {
    frog: { name: "Frog", color: '#228B22', radius: 8 },
    cat:  { name: "Cat", color: '#FFA500', radius: 9 },
    beetle: { name: "Beetle", color: '#8B4513', radius: 10 },
    bird: { name: "Bird", color: '#ADD8E6', radius: 7 },
    dog: { name: "Dog", color: '#D2B48C', radius: 11 },
};