console.log("--- game.js started ---");

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthValueSpan = document.getElementById('healthValue');
const maxHealthValueSpan = document.getElementById('maxHealthValue');
const hungerValueSpan = document.getElementById('hungerValue');
const dayValueSpan = document.getElementById('dayValue');
const levelValueSpan = document.getElementById('levelValue');
const xpValueSpan = document.getElementById('xpValue');
const debugDiv = document.getElementById('debug');
const mainHotbarSlots = document.querySelectorAll('#hotbar .hotbar-slot');
const deathMessageDiv = document.getElementById('deathMessage');
const craftingMenuDiv = document.getElementById('craftingMenu');
const craftingMenuTitle = document.getElementById('craftingMenuTitle');
const closeCraftingButton = document.getElementById('closeCraftingButton');
const timeUIDiv = document.getElementById('timeUI');
const minionInfoBar = document.getElementById('minionInfoBar'); // Ref for minion bar
// Class Selection Elements
const classSelectionOverlay = document.getElementById('classSelectionOverlay');
const classSelect = document.getElementById('classSelect');
const startGameButton = document.getElementById('startGameButton');
// Perk Selection Elements
const levelPerkOverlay = document.getElementById('levelPerkOverlay');
const perkDescription = document.getElementById('perkDescription');
let perkChoice1Button = document.getElementById('perkChoice1Button'); // Use let for re-assignment
let perkChoice2Button = document.getElementById('perkChoice2Button'); // Use let for re-assignment
// Weapon Choice Elements
const weaponChoiceOverlay = document.getElementById('weaponChoiceOverlay');
const weaponChoiceTitle = document.getElementById('weaponChoiceTitle');
const weapon1Name = document.getElementById('weapon1Name');
const weapon1Desc = document.getElementById('weapon1Desc');
const weapon2Name = document.getElementById('weapon2Name');
const weapon2Desc = document.getElementById('weapon2Desc');
let weaponChoice1Button = document.getElementById('weaponChoice1Button'); // Use let
let weaponChoice2Button = document.getElementById('weaponChoice2Button'); // Use let
// Pet Choice Elements
const petChoiceOverlay = document.getElementById('petChoiceOverlay');
let petChoice1Button = document.getElementById('petChoice1Button'); // Use let
let petChoice2Button = document.getElementById('petChoice2Button'); // Use let
let petChoice3Button = document.getElementById('petChoice3Button'); // Use let
let petChoice4Button = document.getElementById('petChoice4Button'); // Use let
let petChoice5Button = document.getElementById('petChoice5Button'); // Use let
// Crafting/Upgrader Elements (ensure they exist)
const upgraderInputSlot = document.getElementById('upgraderInputSlot');
const upgraderMaterialSlot = document.getElementById('upgraderMaterialSlot');
const upgraderOutputSlot = document.getElementById('upgraderOutputSlot');
const upgradeItemButton = document.getElementById('upgradeItemButton');


// --- Game Settings ---
const FRAME_TIME_TARGET = 1000 / 60; // ~16.667ms, target frame time for speed calculations
const PLAYER_SPEED = 4; // Speed units per frame (at assumed 60fps)
const PLAYER_RADIUS = 15;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_MAX_HUNGER = 100;
const LIMB_RADIUS = 5;
const HAND_DISTANCE = PLAYER_RADIUS + 10;
const ATTACK_SWING_ARC = Math.PI / 2;
const ATTACK_DURATION = 150;
const MELEE_ATTACK_COOLDOWN = 250; // How often melee can *damage*
const INTERACT_DURATION = 100;
const ATTACK_RANGE = 60;
const BASE_ATTACK_POWER = 5;
const BASE_GATHER_POWER = 3;
const SWORD_MULTIPLIER = 2.0;
const AXE_MULTIPLIER = 3.0;
const PICKAXE_MULTIPLIER = 4.0;
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
const HEAL_AMOUNT = 25;
const BOW_COOLDOWN = 1600;
const PROJECTILE_SPEED = 8; // Speed units per frame (at assumed 60fps)
const PROJECTILE_RANGE = 450;
const PROJECTILE_RADIUS = 3;
const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 120;
const MINIMAP_PADDING = 15;
const MINIMAP_ALPHA = 0.75;
const MINIMAP_PLAYER_COLOR = '#00FF00';
const MINIMAP_BOSS_COLOR = '#FF0000';
const MINIMAP_RESPAWN_COLOR = '#FFFF00';
const MINIMAP_PLAYER_SIZE = 3;
const BASE_XP_FOR_LEVEL_2 = 100;
const XP_LEVEL_EXPONENT = 1.5;
const MONSTER_XP_REWARD = 10;
const PLAINS_BOSS_XP_REWARD = 250;
const MINION_KILL_XP_MULTIPLIER = 0.5; // XP multiplier for minion kills
const MAX_UNDEAD_MINIONS = 10;
const MAX_SUMMONED_SLIMES = 2;

// --- World & Time Settings ---
const WORLD_WIDTH = 2000 * 10;
const WORLD_HEIGHT = 1500 * 10;
const ISLAND_PADDING = 150 * 3;
const DAY_LENGTH = 120000;
const NIGHT_START_PERCENT = 0.65;
const TRANSITION_DURATION_PERCENT = 0.08;
const SUNSET_START_PERCENT = NIGHT_START_PERCENT - TRANSITION_DURATION_PERCENT;
const SUNRISE_START_PERCENT = 1.0 - TRANSITION_DURATION_PERCENT;
const MAX_NIGHT_OPACITY = 0.75;

// --- Biome Definitions ---
const WORLD_THIRD_X = WORLD_WIDTH / 3; const WORLD_THIRD_Y = WORLD_HEIGHT / 3;
const BIOME_BOUNDS = { ROCKY_X_END: WORLD_THIRD_X, ROCKY_Y_END: WORLD_THIRD_Y, SWAMP_X_START: WORLD_WIDTH - WORLD_THIRD_X, SWAMP_Y_END: WORLD_THIRD_Y, VOLCANO_X_END: WORLD_THIRD_X, VOLCANO_Y_START: WORLD_HEIGHT - WORLD_THIRD_Y, BADLANDS_X_START: WORLD_WIDTH - WORLD_THIRD_X, BADLANDS_Y_START: WORLD_HEIGHT - WORLD_THIRD_Y, FROSTLANDS_Y_END: WORLD_THIRD_Y, DESERT_Y_START: WORLD_HEIGHT - WORLD_THIRD_Y, FOREST_X_END: WORLD_THIRD_X, JUNGLE_X_START: WORLD_WIDTH - WORLD_THIRD_X };
const WORLD_CENTER_X = WORLD_WIDTH / 2; const WORLD_CENTER_Y = WORLD_HEIGHT / 2;
const JUNGLE_LAKE = { x: BIOME_BOUNDS.JUNGLE_X_START + (WORLD_WIDTH - BIOME_BOUNDS.JUNGLE_X_START) * 0.15, y: BIOME_BOUNDS.FROSTLANDS_Y_END + (BIOME_BOUNDS.DESERT_Y_START - BIOME_BOUNDS.FROSTLANDS_Y_END) * 0.2, width: (WORLD_WIDTH - BIOME_BOUNDS.JUNGLE_X_START) * 0.7, height: (BIOME_BOUNDS.DESERT_Y_START - BIOME_BOUNDS.FROSTLANDS_Y_END) * 0.6, color: '#367588' };
const LAVA_POOL_COUNT = 5; const lavaPools = []; for (let i = 0; i < LAVA_POOL_COUNT; i++) { const poolWidth = (BIOME_BOUNDS.VOLCANO_X_END * 0.1) + (Math.random() * BIOME_BOUNDS.VOLCANO_X_END * 0.2); const poolHeight = ( (WORLD_HEIGHT - BIOME_BOUNDS.VOLCANO_Y_START) * 0.1) + (Math.random() * (WORLD_HEIGHT - BIOME_BOUNDS.VOLCANO_Y_START) * 0.2); lavaPools.push({ x: (Math.random() * (BIOME_BOUNDS.VOLCANO_X_END - poolWidth)), y: BIOME_BOUNDS.VOLCANO_Y_START + (Math.random() * (WORLD_HEIGHT - BIOME_BOUNDS.VOLCANO_Y_START - poolHeight)), width: poolWidth, height: poolHeight, color: '#FF4500', lightRadius: 80 + Math.random() * 60, lightOpacity: 0.7 + Math.random() * 0.15 }); }
const WALL_THICKNESS = 15;
const WALL_COLOR = 'rgba(60, 40, 30, 0.8)';

const BIOME_DATA = {
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
const NECROMANCER_KILLS_TO_SUMMON = 5;

// --- Class Data ---
const CLASS_DATA = {
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
const PLAINS_BOSS_RADIUS = 40; const PLAINS_BOSS_HEALTH = 1000; const PLAINS_BOSS_SPEED = 1.0; const PLAINS_BOSS_DETECT_RANGE_SQ = 400 * 400; const PLAINS_BOSS_ATTACK_COOLDOWN = 1500; const PLAINS_BOSS_ATTACK_CHOICE_COOLDOWN = 3000; const BOSS_HIT_RANGE = PLAINS_BOSS_RADIUS + PLAYER_RADIUS + 10; const BOSS_HIT_DAMAGE = 25; const BOSS_SMASH_RANGE = 100; const BOSS_SMASH_DAMAGE = 35; const BOSS_SMASH_WINDUP = 800; const BOSS_SMASH_EFFECT_DURATION = 300; const BOSS_SPIN_RANGE = PLAINS_BOSS_RADIUS + 20; const BOSS_SPIN_DAMAGE = 15; const BOSS_SPIN_DURATION = 1200; const BOSS_SPIN_DAMAGE_INTERVAL = 300;
const FOREST_WOLF_RADIUS = 50; const FOREST_WOLF_BODY_LENGTH = 120; const FOREST_WOLF_BODY_WIDTH = 40; const FOREST_WOLF_HEAD_RADIUS = 30; const FOREST_WOLF_LEG_RADIUS = 10; const FOREST_WOLF_HEALTH = 200; const FOREST_WOLF_SPEED_MULT = 1.25; const FOREST_WOLF_CONTACT_DAMAGE = 90; const FOREST_WOLF_ENEMY_CONTACT_DAMAGE = 90; const FOREST_WOLF_CORNER_THRESHOLD_SQ = 100 * 100; const FOREST_WOLF_TREE_DESTROY_RADIUS = FOREST_WOLF_RADIUS + 10;
const JUNGLE_BOSS_RADIUS = 50; const JUNGLE_BOSS_HEALTH = PLAINS_BOSS_HEALTH * 2; const JUNGLE_BOSS_ATTACK_COOLDOWN = 2000; const JUNGLE_BOSS_PROJECTILE_SPEED = 6; const JUNGLE_BOSS_PROJECTILE_RANGE = 1000 * 100; const JUNGLE_BOSS_PROJECTILE_RADIUS = 8; const JUNGLE_BOSS_PROJECTILE_COLOR = '#1E90FF'; const JUNGLE_BOSS_PROJECTILE_DAMAGE = 50;

// --- Monster Settings ---
const MONSTER_SPEED = 1.8; // Speed units per frame (at assumed 60fps)
const MONSTER_DETECT_RANGE = 250;
const MONSTER_ATTACK_RANGE = PLAYER_RADIUS + 5;
const MONSTER_HIT_BUFFER = 5; // Extra distance for contact damage check
const MONSTER_ATTACK_COOLDOWN = 1000;
const MONSTER_DAMAGE = 10;
const INITIAL_MONSTER_COUNT = 1000;
const NIGHTLY_MONSTER_SPAWN_COUNT = 100;
const MAX_MONSTER_COUNT = 5000;
const FOREST_TREE_TARGET = 1200;
const GOLD_COIN_DROP_CHANCE = 1 / 50;

// --- Undead Minion Settings ---
const UNDEAD_RADIUS = 8;
const UNDEAD_COLOR = '#E0E0E0';
const UNDEAD_BASE_HEALTH_MULT = 0.8;
const UNDEAD_SPEED = 1.5; // Speed units per frame (at assumed 60fps)
const UNDEAD_ATTACK_RANGE = MONSTER_ATTACK_RANGE;
const UNDEAD_HIT_BUFFER = MONSTER_HIT_BUFFER;
const UNDEAD_ATTACK_COOLDOWN = 1200;
const UNDEAD_DAMAGE = 6;

// --- Summoned Slime Settings ---
const SUMMONED_SLIME_RADIUS = 9;
const SUMMONED_SLIME_COLOR = '#32CD32';
const SUMMONED_SLIME_HEALTH_MULT = 1.0;
const SUMMONED_SLIME_SPEED = 1.6; // Speed units per frame (at assumed 60fps)
const SUMMONED_SLIME_DETECT_RANGE_SQ = (MONSTER_DETECT_RANGE * 0.9) ** 2;
const SUMMONED_SLIME_ATTACK_RANGE = MONSTER_ATTACK_RANGE;
const SUMMONED_SLIME_HIT_BUFFER = MONSTER_HIT_BUFFER;
const SUMMONED_SLIME_ATTACK_COOLDOWN = 1100;
const SUMMONED_SLIME_DAMAGE = 8;
const SUMMON_FOLLOW_DISTANCE_SQ = (PLAYER_RADIUS + SUMMONED_SLIME_RADIUS + 25)**2;
const SUMMON_AGGRO_RANGE_SQ = (MONSTER_DETECT_RANGE * 1.2) ** 2;

// --- Pet Settings ---
const PET_FOLLOW_DISTANCE = PLAYER_RADIUS + 15;
const PET_RADIUS = 10;
const PET_FROG_HEAL_AMOUNT = 10;
const PET_FROG_HEAL_COOLDOWN = 30000; // 30 seconds
const PET_CAT_ATTACK_COOLDOWN = 1500;
const PET_CAT_PROJECTILE_SPEED = 7; // Speed units per frame (at assumed 60fps)
const PET_CAT_PROJECTILE_RANGE = 300;
const PET_CAT_PROJECTILE_RADIUS = 4;
const PET_CAT_PROJECTILE_DAMAGE = 5;
const PET_BEETLE_BLOCK_COOLDOWN = 10000; // 10 seconds
const PET_DOG_ATTACK_RANGE = PLAYER_RADIUS + PET_RADIUS + 10;
const PET_DOG_ATTACK_COOLDOWN = 800;
const PET_DOG_DAMAGE = 7;
const PET_BIRD_PICKUP_RANGE_SQ = (PLAYER_RADIUS + PET_RADIUS + 30)**2;

// --- Item Data ---
const ITEM_DATA = {
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

// --- Boss -> Wall Tier Mapping ---
const BOSS_WALL_TIER_MAP = { 'plains_boss': 1, };

// --- Weapon Choice Data ---
const CLASS_WEAPON_CHOICES = {
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
const PET_DATA = {
    frog: { name: "Frog", color: '#228B22', radius: 8 },
    cat:  { name: "Cat", color: '#FFA500', radius: 9 },
    beetle: { name: "Beetle", color: '#8B4513', radius: 10 },
    bird: { name: "Bird", color: '#ADD8E6', radius: 7 },
    dog: { name: "Dog", color: '#D2B48C', radius: 11 },
};


// --- Game State ---
let mouseCanvasX = 0; let mouseCanvasY = 0;
let worldMouseX = 0; let worldMouseY = 0;
let keysPressed = {};
let resources = []; let monsters = []; let solidObjects = []; let bosses = [];
let walls = [];
let projectiles = [];
let droppedItems = [];
let undeadMinions = [];
let summonedSlimes = [];
let gameTime = 0; let dayCount = 1; let isNight = false;
let currentNightOpacity = 0;
let isGameOver = false; let isCraftingMenuOpen = false; let isUpgraderUIOpen = false;
let selectedUpgradeInput = { slotIndex: -1, source: null, itemData: null }; // Store item data directly
let cameraX = 0; let cameraY = 0;
let isMinimapVisible = true;
let gameHasStarted = false;
let forestWolfDefeated = false;
let gamePaused = false;
let isMouseDown = false;

// --- Player Object ---
const player = {
    x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, radius: PLAYER_RADIUS, id: 'player',
    health: PLAYER_MAX_HEALTH, maxHealth: PLAYER_MAX_HEALTH, hunger: PLAYER_MAX_HUNGER,
    level: 1, currentXP: 0, xpToNextLevel: BASE_XP_FOR_LEVEL_2,
    monsterKillCount: 0, hasChosenLevel3Perk: false, pet: null,
    className: null, speedMultiplier: 1.0, swordMultiplierBoost: 1.0, bowMultiplierBoost: 1.0, lifesteal: 0, daySpeedPenalty: 1.0,
    // Perks
    bonusMaxHealth: 0, bonusSwordDamage: 0, bonusMeleeDamage: 0, bonusMovementSpeedMult: 1.0, bonusBowAttackSpeedMult: 1.0, bonusLifesteal: 0, bonusNightSpeedMult: 1.0, bonusDaySpeedPenaltyMult: 1.0, // Added necromancer kills needed modification directly to CLASS_DATA
    bonusUndeadHealthMult: 1.0, bonusMaxSummons: 0, bonusSummonHealthMult: 1.0, bonusSummonDamageMult: 1.0,
    // Weapon Choice Effects
    chosenWeaponId: null, weaponAttackSpeedMult: 1.0, weaponDamageMult: 1.0, weaponMoveSpeedMult: 1.0, weaponRangeMult: 1.0, weaponOnKillHeal: 0,
    // Pet Timers/States
    lastPetHealTime: 0, beetleBlockCooldownTime: 0, // beetleBlockCooldownTime seems unused, using pet.lastBlockTime
    // Rest
    angle: 0, isAttacking: false, attackTimer: 0, lastAttackTime: 0, isInteracting: false, interactTimer: 0,
    inventorySlots: new Array(INVENTORY_COLS * INVENTORY_ROWS).fill(null), hotbarSlots: new Array(HOTBAR_SIZE).fill(null),
    selectedHotbarSlotIndex: 0, equippedItemType: null, selectedInventoryItem: null,
    respawnX: WORLD_WIDTH / 2, respawnY: WORLD_HEIGHT / 2, lastBowShotTime: 0,
};

// --- Define Recipes ---
const recipes = [
    { id: 'craft_stick', name: 'Stick', output: { type: 'stick', count: 2 }, input: { 'wood': 1 }, requiresWorkbench: false },
    { id: 'craft_plank', name: 'Wooden Plank', output: { type: 'wood_plank', count: 4 }, input: { 'wood': 1 }, requiresWorkbench: false },
    { id: 'craft_stone_block', name: 'Stone Block', output: { type: 'stone_block', count: 4 }, input: { 'stone': 1 }, requiresWorkbench: false },
    { id: 'craft_wood_sword', name: 'Wooden Sword', output: { type: 'wood_sword', count: 1 }, input: { 'wood_plank': 2, 'stick': 1 }, requiresWorkbench: false },
    { id: 'craft_wood_axe', name: 'Wooden Axe', output: { type: 'wood_axe', count: 1 }, input: { 'wood_plank': 3, 'stick': 2 }, requiresWorkbench: false },
    { id: 'craft_wood_pickaxe', name: 'Wooden Pickaxe', output: { type: 'wood_pickaxe', count: 1 }, input: { 'wood_plank': 3, 'stick': 2 }, requiresWorkbench: false },
    { id: 'craft_wooden_bow', name: 'Wooden Bow', output: { type: 'wooden_bow', count: 1 }, input: { 'stick': 3, 'plant_fiber': 3 }, requiresWorkbench: false },
    { id: 'craft_workbench', name: 'Workbench', output: { type: 'workbench', count: 1 }, input: { 'wood': 10 }, requiresWorkbench: false },
    { id: 'craft_icky_bed', name: 'Icky Bed', output: { type: 'icky_bed', count: 1 }, input: { 'monster_goop': 10, 'wood_plank': 5, 'plant_fiber': 5 }, requiresWorkbench: false },
    { id: 'craft_healing_salve', name: 'Healing Salve', output: { type: 'healing_salve', count: 1 }, input: { 'plant_fiber': 3, 'monster_goop': 1 }, requiresWorkbench: false },
    { id: 'craft_torch', name: 'Torch', output: { type: 'torch', count: 3 }, input: { 'stick': 1, 'plant_fiber': 1 }, requiresWorkbench: false },

    // Workbench Recipes
    { id: 'craft_stone_sword', name: 'Stone Sword', output: { type: 'stone_sword', count: 1 }, input: { 'stone_block': 2, 'stick': 1 }, requiresWorkbench: true },
    { id: 'craft_stone_axe', name: 'Stone Axe', output: { type: 'stone_axe', count: 1 }, input: { 'stone_block': 3, 'stick': 2 }, requiresWorkbench: true },
    { id: 'craft_stone_pickaxe', name: 'Stone Pickaxe', output: { type: 'stone_pickaxe', count: 1 }, input: { 'stone_block': 3, 'stick': 2 }, requiresWorkbench: true },
    { id: 'craft_stone_bow', name: 'Stone Reinforced Bow', output: { type: 'stone_reinforced_bow', count: 1 }, input: { 'wooden_bow': 1, 'stone': 10, 'plant_fiber': 5 }, requiresWorkbench: true },
    { id: 'craft_item_upgrader_t1', name: 'Item Upgrader T1', output: { type: 'item_upgrader_t1', count: 1 }, input: { 'wood_plank': 15, 'stone_block': 10, 'iron_ore': 5 }, requiresWorkbench: true },
];


// --- Define Upgrader Recipes ---
const UPGRADER_RECIPES = {
    'wood_pickaxe': { name: 'Upgrade to Stone Pickaxe', output: 'stone_pickaxe', material: 'stone', materialCount: 15 },
    'stone_pickaxe': { name: 'Upgrade to Iron Pickaxe', output: 'iron_pickaxe', material: 'iron_ore', materialCount: 10 },
    'iron_pickaxe': { name: 'Upgrade to Cobalt Pickaxe', output: 'cobalt_pickaxe', material: 'cobalt_ore', materialCount: 12 },
    'cobalt_pickaxe': { name: 'Upgrade to Mithril Pickaxe', output: 'mithril_pickaxe', material: 'mithril_ore', materialCount: 15 },
    'mithril_pickaxe': { name: 'Upgrade to Adamantite Pickaxe', output: 'adamantite_pickaxe', material: 'adamantite_ore', materialCount: 18 },
    // Add other tool upgrades here following the same pattern
    // 'wood_sword': { name: 'Upgrade to Stone Sword', output: 'stone_sword', material: 'stone', materialCount: 10 },
    // 'wood_axe': { name: 'Upgrade to Stone Axe', output: 'stone_axe', material: 'stone', materialCount: 12 },
    // 'wooden_bow': { name: 'Upgrade to Stone-Reinforced Bow', output: 'stone_reinforced_bow', material: 'stone', materialCount: 8 },
};

// --- Utility Functions ---
function distanceSq(x1, y1, x2, y2) { const dx = x1 - x2; const dy = y1 - y2; return dx * dx + dy * dy; }
function distance(x1, y1, x2, y2) { return Math.sqrt(distanceSq(x1, y1, x2, y2)); }
function normalizeAngle(angle) { while (angle <= -Math.PI) angle += 2 * Math.PI; while (angle > Math.PI) angle -= 2 * Math.PI; return angle; }
function clampCamera() { const camLeft = player.x - canvas.width / 2; const camTop = player.y - canvas.height / 2; const camRight = player.x + canvas.width / 2; const camBottom = player.y + canvas.height / 2; cameraX = player.x; cameraY = player.y; if (camLeft < 0) cameraX = canvas.width / 2; if (camRight > WORLD_WIDTH) cameraX = WORLD_WIDTH - canvas.width / 2; if (camTop < 0) cameraY = canvas.height / 2; if (camBottom > WORLD_HEIGHT) cameraY = WORLD_HEIGHT - canvas.height / 2; }
function canvasToWorld(canvasX, canvasY) { const worldOriginX = cameraX - canvas.width / 2; const worldOriginY = cameraY - canvas.height / 2; return { x: canvasX + worldOriginX, y: canvasY + worldOriginY }; }
function getBiomeAt(x, y) { if (x < BIOME_BOUNDS.ROCKY_X_END && y < BIOME_BOUNDS.ROCKY_Y_END) return 'rocky'; if (x > BIOME_BOUNDS.SWAMP_X_START && y < BIOME_BOUNDS.SWAMP_Y_END) return 'swamp'; if (x < BIOME_BOUNDS.VOLCANO_X_END && y > BIOME_BOUNDS.VOLCANO_Y_START) return 'volcano'; if (x > BIOME_BOUNDS.BADLANDS_X_START && y > BIOME_BOUNDS.BADLANDS_Y_START) return 'badlands'; if (y < BIOME_BOUNDS.FROSTLANDS_Y_END) return 'frostlands'; if (y > BIOME_BOUNDS.DESERT_Y_START) return 'desert'; if (x < BIOME_BOUNDS.FOREST_X_END) return 'forest'; if (x > BIOME_BOUNDS.JUNGLE_X_START) return 'jungle'; return 'plains'; }
function formatTime(milliseconds) { if (milliseconds < 0) milliseconds = 0; const totalSeconds = Math.floor(milliseconds / 1000); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`; }

// --- Line Segment Intersection Helper ---
function segmentsIntersect(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
    function orientation(px, py, qx, qy, rx, ry) { const val = (qy - py) * (rx - qx) - (qx - px) * (ry - qy); if (val === 0) return 0; return (val > 0) ? 1 : 2; }
    function onSegment(px, py, qx, qy, rx, ry) { return (qx <= Math.max(px, rx) && qx >= Math.min(px, rx) && qy <= Math.max(py, ry) && qy >= Math.min(py, ry)); }
    const o1=orientation(p1x, p1y, p2x, p2y, p3x, p3y), o2=orientation(p1x, p1y, p2x, p2y, p4x, p4y), o3=orientation(p3x, p3y, p4x, p4y, p1x, p1y), o4=orientation(p3x, p3y, p4x, p4y, p2x, p2y);
    if (o1!==o2 && o3!==o4) return true; if (o1===0 && onSegment(p1x,p1y,p3x,p3y,p2x,p2y)) return true; if (o2===0 && onSegment(p1x,p1y,p4x,p4y,p2x,p2y)) return true; if (o3===0 && onSegment(p3x,p3y,p1x,p1y,p4x,p4y)) return true; if (o4===0 && onSegment(p3x,p3y,p2x,p2y,p4x,p4y)) return true; return false;
}

// --- Line of Sight Check ---
function isLineObstructed(p1x, p1y, p2x, p2y, wallArray) {
    for (const wall of wallArray) { if (!wall.isWall) continue; const wx = wall.x, wy = wall.y, ww = wall.width, wh = wall.height; const tl={x:wx,y:wy}, tr={x:wx+ww,y:wy}, bl={x:wx,y:wy+wh}, br={x:wx+ww,y:wy+wh}; if (segmentsIntersect(p1x,p1y,p2x,p2y, tl.x,tl.y, tr.x,tr.y)) return true; if (segmentsIntersect(p1x,p1y,p2x,p2y, bl.x,bl.y, br.x,br.y)) return true; if (segmentsIntersect(p1x,p1y,p2x,p2y, tl.x,tl.y, bl.x,bl.y)) return true; if (segmentsIntersect(p1x,p1y,p2x,p2y, tr.x,tr.y, br.x,br.y)) return true; } return false;
}

// --- Helper to Pick Forest Corner ---
function pickNewForestCornerTarget(wolf) {
    const corners = [ { x: 0, y: BIOME_BOUNDS.FROSTLANDS_Y_END }, { x: BIOME_BOUNDS.FOREST_X_END, y: BIOME_BOUNDS.FROSTLANDS_Y_END }, { x: 0, y: BIOME_BOUNDS.DESERT_Y_START }, { x: BIOME_BOUNDS.FOREST_X_END, y: BIOME_BOUNDS.DESERT_Y_START } ];
    let availableCorners = corners; if (wolf.targetCorner) { availableCorners = corners.filter(c => c.x !== wolf.targetCorner.x || c.y !== wolf.targetCorner.y); if (availableCorners.length === 0) availableCorners = corners; }
    const bestCorner = availableCorners[Math.floor(Math.random() * availableCorners.length)]; const offsetX = (Math.random() - 0.5) * WALL_THICKNESS * 3; const offsetY = (Math.random() - 0.5) * WALL_THICKNESS * 3;
    wolf.targetCorner = { x: Math.max(0 + wolf.radius, Math.min(BIOME_BOUNDS.FOREST_X_END - wolf.radius, bestCorner.x + offsetX)), y: Math.max(BIOME_BOUNDS.FROSTLANDS_Y_END + wolf.radius, Math.min(BIOME_BOUNDS.DESERT_Y_START - wolf.radius, bestCorner.y + offsetY)) };
    console.log(`Wolf ${wolf.id} targeting new corner: (${Math.round(wolf.targetCorner.x)}, ${Math.round(wolf.targetCorner.y)})`); wolf.lastCornerChangeTime = Date.now();
}


// --- UI Update Function --- (MOVED EARLIER)
function updateUI() {
    healthValueSpan.textContent = Math.floor(player.health);
    maxHealthValueSpan.textContent = Math.floor(player.maxHealth);
    hungerValueSpan.textContent = Math.floor(player.hunger);
    dayValueSpan.textContent = dayCount;
    levelValueSpan.textContent = player.level;
    xpValueSpan.textContent = `${player.currentXP}/${player.xpToNextLevel}`;

    if (gameHasStarted && minionInfoBar) {
        if (player.className === 'necromancer') {
            minionInfoBar.style.display = 'block';
            const killsNeeded = CLASS_DATA.necromancer.killsToSummon;
            const killsProgress = player.monsterKillCount % killsNeeded;
            minionInfoBar.textContent = `Undead: ${undeadMinions.length}/${MAX_UNDEAD_MINIONS} | Kills: ${killsProgress}/${killsNeeded}`;
        } else if (player.className === 'summoner') {
            minionInfoBar.style.display = 'block';
            const currentMaxSlimes = MAX_SUMMONED_SLIMES + player.bonusMaxSummons;
            minionInfoBar.textContent = `Slimes: ${summonedSlimes.length}/${currentMaxSlimes}`;
        } else {
            minionInfoBar.style.display = 'none';
        }
    } else if (minionInfoBar) {
        minionInfoBar.style.display = 'none';
    }

    let debugSpeedPenalty = (!isNight && player.daySpeedPenalty < 1.0) ? ` DayPen:x${player.daySpeedPenalty.toFixed(2)}` : '';
    let nightSpeedBonus = (isNight && player.bonusNightSpeedMult > 1.0) ? ` NightSpd:x${player.bonusNightSpeedMult.toFixed(2)}` : '';
    let necroKills = player.className === 'necromancer' ? ` NKills:${player.monsterKillCount}` : '';
    let currentSpeed = PLAYER_SPEED * player.speedMultiplier * player.bonusMovementSpeedMult * player.weaponMoveSpeedMult;
    if (!isNight && player.daySpeedPenalty < 1.0) currentSpeed *= player.daySpeedPenalty;
    if (isNight && player.bonusNightSpeedMult > 1.0) currentSpeed *= player.bonusNightSpeedMult;

    debugDiv.textContent = `World:(${Math.round(player.x)},${Math.round(player.y)})|Mouse:(${Math.round(worldMouseX)},${Math.round(worldMouseY)})|Res:${resources.length}|Mon:${monsters.length}|Undead:${undeadMinions.length}|Summon:${summonedSlimes.length}|Boss:${bosses.length}|Items:${droppedItems.length}|Proj:${projectiles.length}|Speed:${currentSpeed.toFixed(1)}${debugSpeedPenalty}${nightSpeedBonus}${necroKills}`;
}


// --- XP and Leveling & Perk Functions ---
function calculateXPForNextLevel(currentLevel) { if (currentLevel < 1) return BASE_XP_FOR_LEVEL_2; const required = Math.floor(BASE_XP_FOR_LEVEL_2 * Math.pow(currentLevel, XP_LEVEL_EXPONENT)); return Math.max(BASE_XP_FOR_LEVEL_2, required); }
function gainXP(amount) { if (isGameOver || amount <= 0 || !gameHasStarted) return; player.currentXP += amount; console.log(`%cGained ${amount} XP! Current: ${player.currentXP}/${player.xpToNextLevel}`, "color: lightgreen;"); let leveledUp = false; while (player.currentXP >= player.xpToNextLevel) { leveledUp = true; player.level++; player.currentXP -= player.xpToNextLevel; player.xpToNextLevel = calculateXPForNextLevel(player.level); console.log(`%cLEVEL UP! Reached Level ${player.level}!`, "color: yellow; font-size: 1.2em; font-weight: bold;"); console.log(`%cNext level requires ${player.xpToNextLevel} XP. Current XP: ${player.currentXP}`, "color: lightblue;"); } if (leveledUp && player.level === 3 && !player.hasChosenLevel3Perk) { showLevel3PerkMenu(); } if (leveledUp && player.level === 5 && !player.pet) { showPetChoiceMenu(); } updateUI(); }
function showLevel3PerkMenu() { // Ensure elements exist
    const overlay = document.getElementById('levelPerkOverlay'); const button1 = document.getElementById('perkChoice1Button'); const button2 = document.getElementById('perkChoice2Button'); const desc = document.getElementById('perkDescription'); if (!overlay || !button1 || !button2 || !desc) { console.error("Level 3 Perk UI elements missing!"); return; } console.log("Showing Level 3 Perk Menu"); gamePaused = true; let choice1Text = "Perk 1"; let choice2Text = "Perk 2"; let descText = "Choose your path!"; switch (player.className) { case 'knight': choice1Text = "+20 Max HP"; choice2Text = "+15 Sword Damage"; descText = "Strengthen your Resolve or your Blade?"; break; case 'archer': choice1Text = "+10% Move Speed"; choice2Text = "+10% Bow Attack Speed"; descText = "Become Swifter or Shoot Faster?"; break; case 'scout': choice1Text = "+10 Max HP"; choice2Text = "+15 Melee Damage (All)"; descText = "Bolster your Health or Enhance All Melee Strikes?"; break; case 'tank': choice1Text = "+50 Max HP"; choice2Text = "+20 Melee Damage / -15% Speed"; descText = "Become an Immovable Object or a Destructive Force?"; break; case 'vampire': choice1Text = "+2.5 Lifesteal"; choice2Text = "+15% Move Speed"; descText = "Enhance your Vampiric Drain or gain Celerity?"; break; case 'necromancer': choice1Text = "Kills needed per Undead -1"; choice2Text = "+20% Undead Health"; descText = "Improve your Necrotic Rituals or Fortify your Minions?"; break; case 'summoner': choice1Text = "+1 Max Slime"; choice2Text = "+25% Slime Health"; descText = "Expand your Legion or Empower your existing Summons?"; break; default: console.warn("Unknown class for perk menu:", player.className); choice1Text = "Generic Perk 1"; choice2Text = "Generic Perk 2"; break; } desc.textContent = descText; button1.textContent = choice1Text; button2.textContent = choice2Text; // Re-attach listeners to fresh clones to ensure they work
    const newChoice1Button = button1.cloneNode(true); const newChoice2Button = button2.cloneNode(true); button1.parentNode.replaceChild(newChoice1Button, button1); button2.parentNode.replaceChild(newChoice2Button, button2); // Update global references if needed (or re-select them in applyPerkChoice)
    perkChoice1Button = newChoice1Button; perkChoice2Button = newChoice2Button; perkChoice1Button.addEventListener('click', () => applyPerkChoice(1), { once: true }); perkChoice2Button.addEventListener('click', () => applyPerkChoice(2), { once: true }); overlay.style.display = 'flex'; }
function applyPerkChoice(choiceIndex) { if (player.hasChosenLevel3Perk || !gameHasStarted) return; console.log(`Applying Perk Choice ${choiceIndex} for class ${player.className}`); let bonusHealthApplied = 0; switch (player.className) { case 'knight': if (choiceIndex === 1) { player.bonusMaxHealth += 20; bonusHealthApplied = 20;} else { player.bonusSwordDamage += 15; } break; case 'archer': if (choiceIndex === 1) { player.bonusMovementSpeedMult *= 1.10; } else { player.bonusBowAttackSpeedMult *= 0.90; } break; case 'scout': if (choiceIndex === 1) { player.bonusMaxHealth += 10; bonusHealthApplied = 10;} else { player.bonusMeleeDamage += 15; } break; case 'tank': if (choiceIndex === 1) { player.bonusMaxHealth += 50; bonusHealthApplied = 50;} else { player.bonusMeleeDamage += 20; player.bonusMovementSpeedMult *= 0.85; } break; case 'vampire': if (choiceIndex === 1) { player.bonusLifesteal += 2.5; } else { player.bonusMovementSpeedMult *= 1.15; } break; case 'necromancer': if (choiceIndex === 1) { CLASS_DATA.necromancer.killsToSummon = Math.max(1, (CLASS_DATA.necromancer.killsToSummon || NECROMANCER_KILLS_TO_SUMMON) -1); console.log("Necromancer kills needed reduced to:", CLASS_DATA.necromancer.killsToSummon);} else { player.bonusUndeadHealthMult *= 1.20; } break; case 'summoner': if (choiceIndex === 1) { player.bonusMaxSummons += 1; } else { player.bonusSummonHealthMult *= 1.25; } break; } player.hasChosenLevel3Perk = true; levelPerkOverlay.style.display = 'none'; gamePaused = false; // Apply accumulated health bonus
    player.maxHealth += player.bonusMaxHealth; player.health += player.bonusMaxHealth; player.bonusMaxHealth = 0; // Reset accumulator
    updateUI(); // <<< Call updateUI here
    console.log("Perk applied. Player stats updated."); }

// --- Weapon Choice Functions ---
function showWeaponChoiceMenu() { // Ensure elements exist
    const overlay = document.getElementById('weaponChoiceOverlay'); const button1 = document.getElementById('weaponChoice1Button'); const button2 = document.getElementById('weaponChoice2Button'); if (!overlay || !button1 || !button2 || !weaponChoiceTitle || !weapon1Name || !weapon1Desc || !weapon2Name || !weapon2Desc) { console.error("Weapon Choice UI elements missing!"); return; } if (gamePaused) return; console.log("Showing Weapon Choice Menu for class:", player.className); gamePaused = true; const choices = CLASS_WEAPON_CHOICES[player.className] || CLASS_WEAPON_CHOICES.default; weaponChoiceTitle.textContent = "Choose Your Weapon"; weapon1Name.textContent = choices[0].name; weapon1Desc.textContent = choices[0].desc; weapon2Name.textContent = choices[1].name; weapon2Desc.textContent = choices[1].desc; button1.dataset.weaponId = choices[0].id; button2.dataset.weaponId = choices[1].id; // Re-attach listeners to fresh clones
    const newWeapon1Button = button1.cloneNode(true); const newWeapon2Button = button2.cloneNode(true); button1.parentNode.replaceChild(newWeapon1Button, button1); button2.parentNode.replaceChild(newWeapon2Button, button2); weaponChoice1Button = newWeapon1Button; // Update global refs
    weaponChoice2Button = newWeapon2Button; weaponChoice1Button.addEventListener('click', handleWeaponChoice, { once: true }); weaponChoice2Button.addEventListener('click', handleWeaponChoice, { once: true }); overlay.style.display = 'flex'; }
function handleWeaponChoice(event) { const chosenWeaponId = event.target.dataset.weaponId; console.log("Weapon chosen:", chosenWeaponId); let chosenWeaponData = null; for (const classKey in CLASS_WEAPON_CHOICES) { const weapon = CLASS_WEAPON_CHOICES[classKey].find(w => w.id === chosenWeaponId); if (weapon) { chosenWeaponData = weapon; break; } } if (chosenWeaponData) { applyWeaponEffects(chosenWeaponData); player.chosenWeaponId = chosenWeaponId; // Find and remove the orb AFTER applying effects
        const orbInvIndex = player.inventorySlots.findIndex(slot => slot && slot.type === 'mystical_orb'); if (orbInvIndex !== -1) { removeFromInventory('mystical_orb', 1); } else { const orbHotbarIndex = player.hotbarSlots.findIndex(slot => slot && slot.type === 'mystical_orb'); if (orbHotbarIndex !== -1) { decrementHotbarItem(orbHotbarIndex); } else { console.warn("Mystical Orb not found after choosing weapon?"); } } } else { console.error("Could not find chosen weapon data for ID:", chosenWeaponId); } weaponChoiceOverlay.style.display = 'none'; gamePaused = false; updateUI(); // <<< Call updateUI here
}
function applyWeaponEffects(weaponData) { console.log("Applying effects for:", weaponData.name); // Reset temporary multipliers first
    player.weaponAttackSpeedMult = 1.0; player.weaponDamageMult = 1.0; player.weaponMoveSpeedMult = 1.0; player.weaponRangeMult = 1.0; player.weaponOnKillHeal = 0; // Apply new ones
    for (const effect in weaponData.effects) { console.log(` - Applying ${effect}: ${weaponData.effects[effect]}`); switch (effect) { case 'weaponDamageMult': player.weaponDamageMult *= weaponData.effects[effect]; break; case 'weaponAttackSpeedMult': player.weaponAttackSpeedMult *= weaponData.effects[effect]; break; case 'weaponMoveSpeedMult': player.bonusMovementSpeedMult *= weaponData.effects[effect]; break; // Applies to bonusMovementSpeedMult
            case 'bonusMaxHealth': player.bonusMaxHealth += weaponData.effects[effect]; break; // Use bonusMaxHealth to accumulate
            case 'bonusMeleeDamage': player.bonusMeleeDamage += weaponData.effects[effect]; break; case 'weaponRangeMult': player.weaponRangeMult *= weaponData.effects[effect]; break; case 'weaponOnKillHeal': player.weaponOnKillHeal += weaponData.effects[effect]; break; // Summoner/Necro specific weapon effects
            case 'bonusMaxSummons': player.bonusMaxSummons += weaponData.effects[effect]; break; case 'bonusUndeadHealthMult': player.bonusUndeadHealthMult *= weaponData.effects[effect]; break; case 'bonusSummonHealthMult': player.bonusSummonHealthMult *= weaponData.effects[effect]; break; case 'bonusSummonDamageMult': player.bonusSummonDamageMult *= weaponData.effects[effect]; break; case 'bonusLifesteal': player.bonusLifesteal += weaponData.effects[effect]; break; case 'bonusNightSpeedMult': player.bonusNightSpeedMult *= weaponData.effects[effect]; break; case 'bonusDaySpeedPenaltyMult': player.bonusDaySpeedPenaltyMult *= weaponData.effects[effect]; // Calculate updated day speed penalty immediately
                 player.daySpeedPenalty = Math.min(1.0, (CLASS_DATA[player.className]?.daySpeedPenalty || 1.0) * player.bonusDaySpeedPenaltyMult); break; } } // Apply accumulated health bonus
    player.maxHealth += player.bonusMaxHealth; player.health += player.bonusMaxHealth; player.bonusMaxHealth = 0; // Reset accumulator
    player.health = Math.min(player.health, player.maxHealth); }

// --- Pet Choice Functions ---
function showPetChoiceMenu() { // Ensure elements exist
    const overlay = document.getElementById('petChoiceOverlay'); const button1 = document.getElementById('petChoice1Button'); const button2 = document.getElementById('petChoice2Button'); const button3 = document.getElementById('petChoice3Button'); const button4 = document.getElementById('petChoice4Button'); const button5 = document.getElementById('petChoice5Button'); if (!overlay || !button1 || !button2 || !button3 || !button4 || !button5) { console.error("Pet Choice UI elements missing!"); return; } if (gamePaused || player.pet) return; console.log("Showing Pet Choice Menu"); gamePaused = true; button1.textContent = PET_DATA.frog.name; button2.textContent = PET_DATA.cat.name; button3.textContent = PET_DATA.beetle.name; button4.textContent = PET_DATA.bird.name; button5.textContent = PET_DATA.dog.name; const buttons = [button1, button2, button3, button4, button5]; const petTypes = ['frog', 'cat', 'beetle', 'bird', 'dog']; buttons.forEach((button, index) => { const newButton = button.cloneNode(true); // Re-clone to remove old listeners
        button.parentNode.replaceChild(newButton, button); // Update global references
        if (index === 0) petChoice1Button = newButton; else if (index === 1) petChoice2Button = newButton; else if (index === 2) petChoice3Button = newButton; else if (index === 3) petChoice4Button = newButton; else if (index === 4) petChoice5Button = newButton; newButton.addEventListener('click', () => applyPetChoice(petTypes[index]), { once: true }); }); overlay.style.display = 'flex'; }
function applyPetChoice(petType) { if (player.pet || !gameHasStarted) return; console.log("Pet chosen:", petType); const petBaseData = PET_DATA[petType]; player.pet = { type: petType, name: petBaseData.name, color: petBaseData.color, radius: petBaseData.radius, x: player.x - player.radius - PET_RADIUS, y: player.y, target: null, lastAttackTime: 0, lastHealTime: 0, blockReady: (petType === 'beetle'), // Only beetle starts ready?
     lastBlockTime: 0, projectileCooldown: 0, flashUntil: 0 }; petChoiceOverlay.style.display = 'none'; gamePaused = false; updateUI(); }

// --- Item Handling Functions ---
function findFirstEmptyInventorySlot() { return player.inventorySlots.findIndex(slot => slot === null); }
function findItemStackableInventorySlot(itemType) { return player.inventorySlots.findIndex(slot => slot !== null && slot.type === itemType && slot.count < MAX_STACK_SIZE); }
function addDroppedItem(x, y, type, count = 1) { for (let i = 0; i < count; i++) { const offsetX = (Math.random() - 0.5) * 15; const offsetY = (Math.random() - 0.5) * 15; droppedItems.push({ id: `item_${Date.now()}_${Math.random()}`, x: x + offsetX, y: y + offsetY, type: type, radius: DROPPED_ITEM_RADIUS, spawnTime: Date.now() }); } }
function addToInventory(itemType, count = 1) { let rem = count; // Fill stackable slots first
    while (rem > 0) { const idx = findItemStackableInventorySlot(itemType); if (idx !== -1) { const slot = player.inventorySlots[idx]; const add = Math.min(rem, MAX_STACK_SIZE - slot.count); slot.count += add; rem -= add; } else { break; } } // Fill empty slots
    while (rem > 0) { const idx = findFirstEmptyInventorySlot(); if (idx !== -1) { const add = Math.min(rem, MAX_STACK_SIZE); player.inventorySlots[idx] = { type: itemType, count: add }; rem -= add; } else { console.warn(`Inv full! Cannot add ${rem} ${itemType}.`); rem = 0; break; } } if (isCraftingMenuOpen) { populateCraftingMenu(isNearWorkbench(), isNearUpgrader()); } updateMainHotbarVisuals(); }
function removeFromInventory(itemType, count = 1) { let rem = count; let removed = 0; // Check inventory first (loop backwards for potential slot removal/shift issues if not careful)
    for (let i = player.inventorySlots.length - 1; i >= 0 && rem > 0; i--) { const slot = player.inventorySlots[i]; if (slot && slot.type === itemType) { const remSlot = Math.min(rem, slot.count); slot.count -= remSlot; rem -= remSlot; removed += remSlot; if (slot.count <= 0) { player.inventorySlots[i] = null; } } } // Check hotbar if still needed
    if (rem > 0) { for (let i = player.hotbarSlots.length - 1; i >= 0 && rem > 0; i--) { const slot = player.hotbarSlots[i]; if (slot && slot.type === itemType) { const remSlot = Math.min(rem, slot.count); slot.count -= remSlot; rem -= remSlot; removed += remSlot; if (slot.count <= 0) { player.hotbarSlots[i] = null; updateEquippedItem(); // Update if selected slot becomes empty
                     } } } } if (removed > 0) { if (isCraftingMenuOpen) { populateCraftingMenu(isNearWorkbench(), isNearUpgrader()); } updateMainHotbarVisuals(); } return removed >= count; // Return true if *all* requested items were removed
}
function getTotalItemCount(itemType) { const invCount = player.inventorySlots.reduce((t, s) => (s && s.type === itemType ? t + s.count : t), 0); const hotbarCount = player.hotbarSlots.reduce((t, s) => (s && s.type === itemType ? t + s.count : t), 0); return invCount + hotbarCount; }

// --- Crafting Functions ---
function canCraft(recipe) { for (const itemId in recipe.input) { if (getTotalItemCount(itemId) < recipe.input[itemId]) return false; } return true; }
function doCraft(recipeId) { const recipe = recipes.find(r => r.id === recipeId); if (!recipe) return; if (canCraft(recipe)) { let success = true; const ingredientsToRemove = { ...recipe.input }; // Use temporary copy
        for (const itemId in ingredientsToRemove) { if (!removeFromInventory(itemId, ingredientsToRemove[itemId])) { console.error(`Failed to remove ${ingredientsToRemove[itemId]}x ${itemId} for recipe ${recipe.name}`); success = false; // Should ideally revert, but simple approach for now
                break; } } if (success) { addToInventory(recipe.output.type, recipe.output.count); console.log(`%cCrafted ${recipe.output.count}x ${recipe.output.type}!`, 'color: cyan; font-weight: bold;'); if (isCraftingMenuOpen) populateCraftingMenu(isNearWorkbench(), isNearUpgrader()); } else { console.error(`Crafting failed for ${recipe.name} due to ingredient removal issue.`); // TODO: Maybe try to give back ingredients? Complex.
         } } else { console.log(`Cannot craft ${recipe.name} - missing ingredients.`); } }

// --- UI Interaction ('E' Menu - Item Moving) ---
function handleInventorySlotClick(index) { const clickedSlot = player.inventorySlots[index]; const selected = player.selectedInventoryItem; if (selected) { // Place selected item into clicked slot
        const originalSourceArray = selected.source === 'inventory' ? player.inventorySlots : player.hotbarSlots; // Check if stackable
        if (clickedSlot && clickedSlot.type === selected.type && clickedSlot.count < MAX_STACK_SIZE) { const canAdd = MAX_STACK_SIZE - clickedSlot.count; const toAdd = Math.min(selected.count, canAdd); clickedSlot.count += toAdd; selected.count -= toAdd; if (selected.count <= 0) { originalSourceArray[selected.index] = null; // Clear original slot
                player.selectedInventoryItem = null; } else { // Update the original slot with the remaining count (if it was the same slot, this is redundant but safe)
                originalSourceArray[selected.index] = { ...selected }; // Update with remaining count
                player.selectedInventoryItem = null; } } else { // Swap items
            originalSourceArray[selected.index] = clickedSlot; player.inventorySlots[index] = { type: selected.type, count: selected.count }; player.selectedInventoryItem = null; } } else if (clickedSlot) { // Pick up item from clicked slot
        player.selectedInventoryItem = { index: index, type: clickedSlot.type, count: clickedSlot.count, source: 'inventory' }; } populateCraftingMenu(isNearWorkbench(), isNearUpgrader()); updateMainHotbarVisuals(); updateEquippedItem(); }
function handleHotbarSlotClick(index) { const clickedSlot = player.hotbarSlots[index]; const selected = player.selectedInventoryItem; if (selected) { // Place selected item into clicked slot
        const originalSourceArray = selected.source === 'inventory' ? player.inventorySlots : player.hotbarSlots; // Check if stackable
        if (clickedSlot && clickedSlot.type === selected.type && clickedSlot.count < MAX_STACK_SIZE) { const canAdd = MAX_STACK_SIZE - clickedSlot.count; const toAdd = Math.min(selected.count, canAdd); clickedSlot.count += toAdd; selected.count -= toAdd; if (selected.count <= 0) { originalSourceArray[selected.index] = null; player.selectedInventoryItem = null; } else { originalSourceArray[selected.index] = { ...selected }; player.selectedInventoryItem = null; } } else { // Swap items
            originalSourceArray[selected.index] = clickedSlot; player.hotbarSlots[index] = { type: selected.type, count: selected.count }; player.selectedInventoryItem = null; } } else if (clickedSlot) { // Pick up item from clicked slot
        player.selectedInventoryItem = { index: index, type: clickedSlot.type, count: clickedSlot.count, source: 'hotbar' }; } populateCraftingMenu(isNearWorkbench(), isNearUpgrader()); updateMainHotbarVisuals(); updateEquippedItem(); }
function drawItemShape(ctx, itemType, size) { const itemData = ITEM_DATA[itemType]; if (!itemData) { ctx.fillStyle='magenta'; ctx.fillRect(size*0.1,size*0.1,size*0.8,size*0.8); ctx.strokeStyle='black'; ctx.lineWidth=1; ctx.strokeRect(size*0.1,size*0.1,size*0.8,size*0.8); ctx.beginPath();ctx.moveTo(size*0.1,size*0.1);ctx.lineTo(size*0.9,size*0.9);ctx.moveTo(size*0.9,size*0.1);ctx.lineTo(size*0.1,size*0.9);ctx.stroke(); return; } ctx.save(); ctx.translate(size/2, size/2); ctx.fillStyle=itemData.color||'#FFF'; ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=1; const scale=size/30; ctx.scale(scale,scale); const shapeSize=18; switch(itemData.shape){ case 'line': ctx.beginPath();ctx.moveTo(0,-shapeSize*0.6);ctx.lineTo(0,shapeSize*0.6);ctx.lineWidth=3*scale>1?3:1/scale;ctx.stroke();break; case 'rect': ctx.fillRect(-shapeSize*0.4,-shapeSize*0.4,shapeSize*0.8,shapeSize*0.8);ctx.strokeRect(-shapeSize*0.4,-shapeSize*0.4,shapeSize*0.8,shapeSize*0.8);break; case 'torch': { const sH=shapeSize*1.0,sW=shapeSize*0.2,fH=shapeSize*0.5; ctx.fillStyle=ITEM_DATA['stick']?.color||'#B8860B';ctx.fillRect(-sW/2,sH*0.1,sW,sH*0.9); ctx.fillStyle=itemData.color;ctx.beginPath();ctx.ellipse(0,-sH*0.25,sW*1.5,fH,0,0,Math.PI*2);ctx.fill(); break;} case 'sword': { const swH=shapeSize*1.3,swW=shapeSize*0.15,gW=shapeSize*0.4; ctx.fillStyle='#444';ctx.fillRect(-swW*1.2,swH*0.2,swW*2.4,swH*0.2); ctx.fillStyle='#888';ctx.fillRect(-gW/2,swH*0.1,gW,swW*2); ctx.fillStyle=itemData.color;ctx.beginPath();ctx.moveTo(0,-swH*0.4);ctx.lineTo(-swW,swH*0.1);ctx.lineTo(swW,swH*0.1);ctx.closePath();ctx.fill();ctx.stroke(); break;} case 'axe': case 'pickaxe': { const hH=shapeSize*1.2,hW=shapeSize*0.15,hdW=shapeSize*0.6,hdH=shapeSize*0.4; ctx.fillStyle=ITEM_DATA['stick']?.color||'#B8860B';ctx.fillRect(-hW/2,-hH/2+hdH/2,hW,hH);ctx.strokeRect(-hW/2,-hH/2+hdH/2,hW,hH); ctx.fillStyle=itemData.color;ctx.fillRect(-hdW/2,-hH/2,hdW,hdH);ctx.strokeRect(-hdW/2,-hH/2,hdW,hdH); break;} case 'bow': ctx.beginPath();ctx.moveTo(0,-shapeSize*0.6);ctx.quadraticCurveTo(-shapeSize*0.7,0,0,shapeSize*0.6);ctx.quadraticCurveTo(shapeSize*0.7,0,0,-shapeSize*0.6); ctx.moveTo(-shapeSize*0.1,-shapeSize*0.5);ctx.lineTo(-shapeSize*0.1,shapeSize*0.5);ctx.lineWidth=1*scale>0.5?1:0.5/scale;ctx.strokeStyle='#eee';ctx.stroke(); ctx.lineWidth=3*scale>1?3:1/scale;ctx.strokeStyle='rgba(0,0,0,0.6)';ctx.stroke();ctx.fill();break; case 'cactus': const cW=shapeSize*0.4,cH=shapeSize*1.3; ctx.fillRect(-cW/2,-cH/2,cW,cH);ctx.fillRect(-cW*1.2,-cH*0.1,cW*2.4,cW*0.6);ctx.strokeStyle='darkgreen';ctx.strokeRect(-cW/2,-cH/2,cW,cH);break; case 'circle': default: ctx.beginPath();ctx.arc(0,0,shapeSize*0.4,0,Math.PI*2);ctx.fill();ctx.stroke();break; } ctx.restore(); }
function populateCraftingMenu(isNearWorkbench, isNearUpgrader) { if (!craftingMenuDiv) return; const invGrid=document.getElementById('inventoryGrid');const hotbarGrid=document.getElementById('hotbarGrid');const playerRecipeList=document.getElementById('recipeList');const workbenchCtxDiv=document.getElementById('workbenchContext');const upgraderCtxDiv=document.getElementById('upgraderContext');const workbenchRecipeList=document.getElementById('workbenchRecipeList'); if (!invGrid||!hotbarGrid||!playerRecipeList||!workbenchCtxDiv||!upgraderCtxDiv||!workbenchRecipeList) { console.error("Missing UI elements for combined crafting menu!"); return; } invGrid.style.setProperty('--inventory-cols',INVENTORY_COLS); hotbarGrid.style.setProperty('--hotbar-size',HOTBAR_SIZE); const createSlotCanvas=(item)=>{const canvas=document.createElement('canvas');canvas.width=40;canvas.height=40;canvas.classList.add('item-icon');const itemCtx=canvas.getContext('2d');if(item&&item.type){drawItemShape(itemCtx,item.type,canvas.width);}return canvas;}; invGrid.innerHTML=''; player.inventorySlots.forEach((item,index)=>{const slotDiv=document.createElement('div');slotDiv.classList.add('inventory-slot');slotDiv.dataset.index=index; if(item){const itemData=ITEM_DATA[item.type]||{name:item.type};slotDiv.title=itemData.name;slotDiv.appendChild(createSlotCanvas(item));if(item.count>1){const countSpan=document.createElement('span');countSpan.classList.add('item-count');countSpan.textContent=item.count;slotDiv.appendChild(countSpan);}} if(player.selectedInventoryItem&&player.selectedInventoryItem.source==='inventory'&&player.selectedInventoryItem.index===index){slotDiv.classList.add('selected-for-move');if(item)slotDiv.style.opacity='0.5';} slotDiv.addEventListener('click',()=>handleInventorySlotClick(index)); invGrid.appendChild(slotDiv);}); hotbarGrid.innerHTML=''; player.hotbarSlots.forEach((item,index)=>{const slotDiv=document.createElement('div');slotDiv.classList.add('hotbar-menu-slot');slotDiv.dataset.index=index; if(item){const itemData=ITEM_DATA[item.type]||{name:item.type};slotDiv.title=itemData.name;slotDiv.appendChild(createSlotCanvas(item));if(item.count>1){const countSpan=document.createElement('span');countSpan.classList.add('item-count');countSpan.textContent=item.count;slotDiv.appendChild(countSpan);}} if(player.selectedInventoryItem&&player.selectedInventoryItem.source==='hotbar'&&player.selectedInventoryItem.index===index){slotDiv.classList.add('selected-for-move');if(item)slotDiv.style.opacity='0.5';} slotDiv.addEventListener('click',()=>handleHotbarSlotClick(index)); hotbarGrid.appendChild(slotDiv);}); playerRecipeList.innerHTML=''; const playerRecipes=recipes.filter(r=>!r.requiresWorkbench); if(playerRecipes.length===0){playerRecipeList.innerHTML=`<li>No player recipes available.</li>`;} else {playerRecipes.forEach(recipe=>{const li=document.createElement('li');const canCurrentlyCraft=canCraft(recipe);let ingredientsHTML=''; for(const itemId in recipe.input){const req=recipe.input[itemId];const owned=getTotalItemCount(itemId);const missingCls=owned<req?'missing':'';const itemName=(ITEM_DATA[itemId]?.name||itemId).replace(/_/g,' ');ingredientsHTML+=`<span class="ingredient ${missingCls}">${itemName}: ${owned}/${req}</span>`;} li.innerHTML=`<div><strong>${recipe.name}</strong><div class="recipe-details">${ingredientsHTML}</div></div><button data-recipe-id="${recipe.id}" ${canCurrentlyCraft?'':'disabled'}>Craft</button>`; const craftBtn=li.querySelector('button');if(craftBtn){craftBtn.addEventListener('click',()=>{doCraft(recipe.id);});} playerRecipeList.appendChild(li);});} workbenchRecipeList.innerHTML=''; if(isNearWorkbench){populateWorkbenchRecipes(workbenchRecipeList);} if(isNearUpgrader){populateUpgraderUI();}else{ // Clear upgrader UI if not near
         if(upgraderInputSlot) upgraderInputSlot.innerHTML='(Click Tool)'; if(upgraderMaterialSlot) upgraderMaterialSlot.innerHTML='(Material)'; if(upgraderOutputSlot) upgraderOutputSlot.innerHTML='(Result)'; if(upgradeItemButton) upgradeItemButton.disabled=true; // Reset selected input if player moves away
        selectedUpgradeInput={slotIndex:-1,source:null, itemData: null}; } }
function toggleCraftingMenu() { if (!gameHasStarted) return; isCraftingMenuOpen = !isCraftingMenuOpen; if (isCraftingMenuOpen) { gamePaused = true; const nearUpgrader = isNearUpgrader(); const nearWorkbench = !nearUpgrader && isNearWorkbench(); let context = 'player'; let title = 'Crafting'; let activeClass = ''; if (nearUpgrader) { context = 'upgrader'; title = 'Item Upgrader'; activeClass = 'upgrader-active'; document.getElementById('contextualColumn').style.display = 'flex'; document.getElementById('workbenchContext').style.display = 'none'; document.getElementById('upgraderContext').style.display = 'flex'; } else if (nearWorkbench) { context = 'workbench'; title = 'Workbench Crafting'; activeClass = 'workbench-active'; document.getElementById('contextualColumn').style.display = 'flex'; document.getElementById('workbenchContext').style.display = 'flex'; document.getElementById('upgraderContext').style.display = 'none'; } else { document.getElementById('contextualColumn').style.display = 'none'; // Hide contextual if neither
             document.getElementById('workbenchContext').style.display = 'none'; document.getElementById('upgraderContext').style.display = 'none'; } populateCraftingMenu(nearWorkbench, nearUpgrader); craftingMenuDiv.className = 'active ' + activeClass; craftingMenuDiv.style.display = 'flex'; craftingMenuTitle.textContent = title; } else { craftingMenuDiv.style.display = 'none'; craftingMenuDiv.className = ''; if (player.selectedInventoryItem) { player.selectedInventoryItem = null; } if (selectedUpgradeInput.itemData) selectedUpgradeInput = { slotIndex: -1, source: null, itemData: null }; gamePaused = false; } }
craftingMenuDiv.addEventListener('click', (event) => { if (event.target === craftingMenuDiv && isCraftingMenuOpen) { toggleCraftingMenu(); } });
function isNearWorkbench() { for (const obj of resources) { // Check resources array for placed items
        if (obj.isPlaced && obj.type === 'workbench' && distanceSq(player.x,player.y,obj.x,obj.y)<INTERACT_RANGE_SQ) return true; } return false; }
function isNearUpgrader() { for (const obj of resources) { // Check resources array for placed items
        if (obj.isPlaced && obj.type === 'item_upgrader_t1' && distanceSq(player.x,player.y,obj.x,obj.y)<INTERACT_RANGE_SQ) return true; } return false; }
function populateWorkbenchRecipes(listElement) { if(!listElement) return; listElement.innerHTML=''; const availableRecipes=recipes.filter(r=>r.requiresWorkbench===true); if(availableRecipes.length===0){listElement.innerHTML=`<li>No workbench recipes available yet.</li>`;}else{availableRecipes.forEach(recipe=>{const li=document.createElement('li');const canCurrentlyCraft=canCraft(recipe);let ingredientsHTML=''; for(const itemId in recipe.input){const req=recipe.input[itemId];const owned=getTotalItemCount(itemId);const missingCls=owned<req?'missing':'';const itemName=(ITEM_DATA[itemId]?.name||itemId).replace(/_/g,' ');ingredientsHTML+=`<span class="ingredient ${missingCls}">${itemName}: ${owned}/${req}</span>`;} li.innerHTML=`<div><strong>${recipe.name}</strong><div class="recipe-details">${ingredientsHTML}</div></div><button data-recipe-id="${recipe.id}" ${canCurrentlyCraft?'':'disabled'}>Craft</button>`; const craftBtn=li.querySelector('button');if(craftBtn){craftBtn.addEventListener('click',()=>{doCraft(recipe.id);});} listElement.appendChild(li);});}}
function populateUpgraderUI() { // Dom elements grabbed globally now
    if(!upgraderInputSlot||!upgraderMaterialSlot||!upgraderOutputSlot||!upgradeItemButton){console.error("Missing Upgrader UI elements");return;} const createSlotCanvas=(item)=>{const c=document.createElement('canvas');c.width=40;c.height=40;c.classList.add('item-icon');const ctx=c.getContext('2d');if(item&&item.type){drawItemShape(ctx,item.type,c.width);}return c;}; // Clear slots visually first
    upgraderInputSlot.innerHTML='(Click Tool)';upgraderInputSlot.style.opacity='0.5';upgraderInputSlot.classList.remove('has-item'); upgraderMaterialSlot.innerHTML='(Material)';upgraderMaterialSlot.style.opacity='0.5';upgraderMaterialSlot.classList.remove('has-item'); upgraderOutputSlot.innerHTML='(Result)';upgraderOutputSlot.style.opacity='0.5';upgraderOutputSlot.classList.remove('has-item'); upgradeItemButton.disabled=true; // Add click listener if not already added
    if(!upgraderInputSlot.dataset.listenerAdded){upgraderInputSlot.addEventListener('click',handleUpgraderInputClick);upgraderInputSlot.dataset.listenerAdded='true';} let currentInputItem = selectedUpgradeInput.itemData; // Use stored item data
     if(currentInputItem){upgraderInputSlot.innerHTML='';upgraderInputSlot.appendChild(createSlotCanvas(currentInputItem));upgraderInputSlot.style.opacity='1';upgraderInputSlot.classList.add('has-item');const upgradeRecipe=UPGRADER_RECIPES[currentInputItem.type];if(upgradeRecipe){upgraderMaterialSlot.innerHTML='';const materialItem={type:upgradeRecipe.material,count:upgradeRecipe.materialCount};upgraderMaterialSlot.appendChild(createSlotCanvas(materialItem));const countSpanMat=document.createElement('span');countSpanMat.classList.add('item-count');countSpanMat.textContent=upgradeRecipe.materialCount;upgraderMaterialSlot.appendChild(countSpanMat);upgraderMaterialSlot.style.opacity='1';upgraderMaterialSlot.classList.add('has-item');upgraderOutputSlot.innerHTML='';const outputItem={type:upgradeRecipe.output,count:1};upgraderOutputSlot.appendChild(createSlotCanvas(outputItem));upgraderOutputSlot.style.opacity='1';upgraderOutputSlot.classList.add('has-item');const hasMats=getTotalItemCount(upgradeRecipe.material)>=upgradeRecipe.materialCount;upgradeItemButton.disabled=!hasMats;}else{ // Item in slot, but not upgradable? Clear other slots.
         upgraderMaterialSlot.innerHTML = '(Material)'; upgraderMaterialSlot.style.opacity = '0.5'; upgraderMaterialSlot.classList.remove('has-item'); upgraderOutputSlot.innerHTML='(Invalid)'; upgraderOutputSlot.style.opacity = '0.5'; upgraderOutputSlot.classList.remove('has-item'); upgradeItemButton.disabled=true;}}else{upgradeItemButton.disabled=true;} }
function handleUpgraderInputClick() { const selected = player.selectedInventoryItem; if (selected) { // If holding an item, try to place it in the upgrader
        const itemType = selected.type; if (UPGRADER_RECIPES[itemType]) { // Only accept upgradable tools
            // Clear the previously selected item from its original slot
            const originalSourceArray = selected.source === 'inventory' ? player.inventorySlots : player.hotbarSlots; originalSourceArray[selected.index] = null; // Set the upgrader's state
            selectedUpgradeInput = { index: selected.index, // Store original index (though the slot is now cleared)
                 source: selected.source, itemData: { type: selected.type, count: selected.count } }; player.selectedInventoryItem = null; // Clear held item
            populateCraftingMenu(false, true); // Update UI
        } else { console.log("Cannot place this item in the upgrader."); } } else if (selectedUpgradeInput.itemData) { // If not holding an item, try to pick up from the upgrader
         // Create the item data to be picked up
        player.selectedInventoryItem = { index: selectedUpgradeInput.index, // Use stored original index
             type: selectedUpgradeInput.itemData.type, count: selectedUpgradeInput.itemData.count, source: selectedUpgradeInput.source // Use stored original source
        }; // Clear upgrader state
        selectedUpgradeInput = { slotIndex: -1, source: null, itemData: null }; populateCraftingMenu(false, true); // Update UI
    } }
function doUpgrade() { if(!selectedUpgradeInput.itemData){console.warn("No tool selected to upgrade.");return;} const toolToUpgradeType = selectedUpgradeInput.itemData.type; const upgradeRecipe=UPGRADER_RECIPES[toolToUpgradeType]; if(!upgradeRecipe){console.error("Upgrade recipe inconsistency for type:", toolToUpgradeType);return;} if(getTotalItemCount(upgradeRecipe.material)>=upgradeRecipe.materialCount){const removedMat=removeFromInventory(upgradeRecipe.material,upgradeRecipe.materialCount); // Tool is already conceptually removed from player inv/hotbar by handleUpgraderInputClick
        if(removedMat){addToInventory(upgradeRecipe.output,1);console.log(`%cUpgraded to ${ITEM_DATA[upgradeRecipe.output]?.name || upgradeRecipe.output}!`, "color: lightblue; font-weight: bold;");selectedUpgradeInput={slotIndex:-1,source:null, itemData: null}; // Clear state
            populateCraftingMenu(false,true);updateMainHotbarVisuals();updateEquippedItem();}else{console.error("Failed to remove materials during upgrade attempt."); // Attempt to refund materials if tool removal failed? Tool already removed conceptually.
             // --- FIX START ---
             if (!removedMat && selectedUpgradeInput.itemData) { // Tool was conceptually removed, but mats failed. Refund tool?
                 console.warn("Trying to return tool after failed mat removal...");
                 addToInventory(selectedUpgradeInput.itemData.type, selectedUpgradeInput.itemData.count);
             }
             // --- FIX END ---
             selectedUpgradeInput = { slotIndex: -1, source: null, itemData: null }; // Reset state regardless
             populateCraftingMenu(false, true); updateMainHotbarVisuals(); updateEquippedItem(); } }else{console.warn(`Not enough ${ITEM_DATA[upgradeRecipe.material]?.name || upgradeRecipe.material} to upgrade.`);} }
// Add listener for the integrated button if it exists
if (upgradeItemButton) upgradeItemButton.addEventListener('click', doUpgrade);

function updateMainHotbarVisuals() { mainHotbarSlots.forEach((slotDiv,index)=>{const item=player.hotbarSlots[index];const existingIcon=slotDiv.querySelector('.item-icon');const existingCount=slotDiv.querySelector('.item-count');const existingNum=slotDiv.querySelector('.slot-number');if(existingIcon)slotDiv.removeChild(existingIcon);if(existingCount)slotDiv.removeChild(existingCount);if(existingNum)slotDiv.removeChild(existingNum); // Remove old number too
        // Always add the number (might be hidden by icon)
        const numSpan=document.createElement('span');numSpan.classList.add('slot-number');numSpan.textContent=`${index+1}`;numSpan.style.cssText="position:absolute; top:2px; left:4px; font-size:0.8em; color: rgba(255,255,255,0.5); z-index: 0; pointer-events: none;";slotDiv.appendChild(numSpan);if(item){const itemCanvas=document.createElement('canvas');itemCanvas.width=35;itemCanvas.height=35;itemCanvas.classList.add('item-icon');itemCanvas.style.pointerEvents='none';const itemCtx=itemCanvas.getContext('2d');if(item.type){drawItemShape(itemCtx,item.type,itemCanvas.width);} slotDiv.appendChild(itemCanvas);if(item.count>1){const countSpan=document.createElement('span');countSpan.classList.add('item-count');countSpan.textContent=item.count;slotDiv.appendChild(countSpan);}}}); }

// --- Collision Detection ---
function checkCollision(entityRadius, potentialX, potentialY, ignoreId = null, checkAgainst = [...solidObjects, ...monsters, ...bosses, ...undeadMinions, ...summonedSlimes, player]) {
    for (const solid of checkAgainst) {
        if (!solid || solid.id === ignoreId) continue; // Skip null/undefined/self

        // Determine if the object should be checked for collision
        let shouldCollide = false;
        if (solid.isWall) {
            shouldCollide = true;
        } else if (solid.id === player.id) {
            shouldCollide = true;
        } else if (solid.isSolid) { // Check the isSolid flag first
            if (typeof solid.health === 'number') { // If it has health, it must be > 0
                shouldCollide = solid.health > 0;
            } else { // If it's solid but has no health (like a placed workbench before taking damage?), consider it solid
                shouldCollide = true;
            }
        } else if (typeof solid.health === 'number' && solid.health > 0) { // Check non-solid entities with health (like monsters, bosses if not solid)
            shouldCollide = true;
        }


        if (shouldCollide) {
            if (solid.isWall) { // AABB Collision for walls
                const closestX = Math.max(solid.x, Math.min(potentialX, solid.x + solid.width));
                const closestY = Math.max(solid.y, Math.min(potentialY, solid.y + solid.height));
                if (distanceSq(potentialX, potentialY, closestX, closestY) < entityRadius * entityRadius) {
                    return solid;
                }
            } else if (typeof solid.radius === 'number') { // Circle collision for others
                if (distanceSq(potentialX, potentialY, solid.x, solid.y) < (entityRadius + solid.radius) ** 2) {
                    return solid;
                }
            }
        }
    }
    return null; // No collision
}


// --- Initialization Functions ---
function createWalls() { walls = []; // Clear existing walls from array
    solidObjects = solidObjects.filter(obj => !obj.isWall); // Remove walls from solid objects
    console.log("Creating biome walls..."); const add=(id,x,y,w,h,tier)=>{const wall={id:id,x:x,y:y,width:w,height:h,color:WALL_COLOR,isWall:true,tier:tier,isSolid:true,isAttackable:false, health: Infinity}; walls.push(wall);solidObjects.push(wall);}; add('wall_f_p',BIOME_BOUNDS.FOREST_X_END-WALL_THICKNESS/2,BIOME_BOUNDS.FROSTLANDS_Y_END,WALL_THICKNESS,BIOME_BOUNDS.DESERT_Y_START-BIOME_BOUNDS.FROSTLANDS_Y_END,1); add('wall_j_p',BIOME_BOUNDS.JUNGLE_X_START-WALL_THICKNESS/2,BIOME_BOUNDS.FROSTLANDS_Y_END,WALL_THICKNESS,BIOME_BOUNDS.DESERT_Y_START-BIOME_BOUNDS.FROSTLANDS_Y_END,1); add('wall_r_f',BIOME_BOUNDS.ROCKY_X_END-WALL_THICKNESS/2,0,WALL_THICKNESS,BIOME_BOUNDS.ROCKY_Y_END,2); add('wall_s_f',BIOME_BOUNDS.SWAMP_X_START-WALL_THICKNESS/2,0,WALL_THICKNESS,BIOME_BOUNDS.SWAMP_Y_END,2); add('wall_v_d',BIOME_BOUNDS.VOLCANO_X_END-WALL_THICKNESS/2,BIOME_BOUNDS.VOLCANO_Y_START,WALL_THICKNESS,WORLD_HEIGHT-BIOME_BOUNDS.VOLCANO_Y_START,3); add('wall_b_d',BIOME_BOUNDS.BADLANDS_X_START-WALL_THICKNESS/2,BIOME_BOUNDS.BADLANDS_Y_START,WALL_THICKNESS,WORLD_HEIGHT-BIOME_BOUNDS.BADLANDS_Y_START,3); add('wall_fr_pl',BIOME_BOUNDS.FOREST_X_END,BIOME_BOUNDS.FROSTLANDS_Y_END-WALL_THICKNESS/2,BIOME_BOUNDS.JUNGLE_X_START-BIOME_BOUNDS.FOREST_X_END,WALL_THICKNESS,4); add('wall_d_pl',BIOME_BOUNDS.FOREST_X_END,BIOME_BOUNDS.DESERT_Y_START-WALL_THICKNESS/2,BIOME_BOUNDS.JUNGLE_X_START-BIOME_BOUNDS.FOREST_X_END,WALL_THICKNESS,4); add('wall_r_fo',0,BIOME_BOUNDS.ROCKY_Y_END-WALL_THICKNESS/2,BIOME_BOUNDS.ROCKY_X_END,WALL_THICKNESS,4); add('wall_s_j',BIOME_BOUNDS.SWAMP_X_START,BIOME_BOUNDS.SWAMP_Y_END-WALL_THICKNESS/2,WORLD_WIDTH-BIOME_BOUNDS.SWAMP_X_START,WALL_THICKNESS,4); add('wall_v_fo',0,BIOME_BOUNDS.VOLCANO_Y_START-WALL_THICKNESS/2,BIOME_BOUNDS.VOLCANO_X_END,WALL_THICKNESS,4); add('wall_b_j',BIOME_BOUNDS.BADLANDS_X_START,BIOME_BOUNDS.BADLANDS_Y_START-WALL_THICKNESS/2,WORLD_WIDTH-BIOME_BOUNDS.BADLANDS_X_START,WALL_THICKNESS,4); console.log(`Created ${walls.length} wall segments.`); }
function spawnInitialResources() { resources=[]; solidObjects=[]; // Clear previous solid objects too before respawning
     let resCount=0, treeCount=0, rockCount=0, boneCount=0, attempts=0; const MAX_ATT=15000; console.log(`Spawning ${FOREST_TREE_TARGET} trees...`); attempts=0; while(treeCount<FOREST_TREE_TARGET&&attempts<MAX_ATT*2){attempts++;const x=Math.random()*BIOME_BOUNDS.FOREST_X_END,y=BIOME_BOUNDS.FROSTLANDS_Y_END+Math.random()*(BIOME_BOUNDS.DESERT_Y_START-BIOME_BOUNDS.FROSTLANDS_Y_END); if(getBiomeAt(x,y)!=='forest')continue; const d=ITEM_DATA['tree'], r=d?.radius||15, h=d?.health||50; const res={id:`res_t_${Date.now()}_${Math.random()}`,x:x,y:y,radius:r,type:'tree',color:d.color,maxHealth:h*2,health:h*2,flashUntil:0,isAttackable:true,isSolid:true,isPlaced:false,variant:null}; if(!checkCollision(r,x,y,null,solidObjects)){resources.push(res);if(res.isSolid) solidObjects.push(res);treeCount++;resCount++;}} console.log(`Spawned ${treeCount} forest trees.`); console.log(`Spawning 1500 rocks...`); attempts=0; let count=0; while(count<1500&&attempts<MAX_ATT*1.5){attempts++;const x=Math.random()*BIOME_BOUNDS.ROCKY_X_END,y=Math.random()*BIOME_BOUNDS.ROCKY_Y_END; if(getBiomeAt(x,y)!=='rocky')continue; const d=ITEM_DATA['rock'], r=d?.radius||12, h=d?.health||150; const res={id:`res_r_${Date.now()}_${Math.random()}`,x:x,y:y,radius:r,type:'rock',color:d.color,maxHealth:h*2,health:h*2,flashUntil:0,isAttackable:true,isSolid:true,isPlaced:false}; if(!checkCollision(r,x,y,null,solidObjects)){resources.push(res);if(res.isSolid) solidObjects.push(res);count++;resCount++;}} console.log(`Spawned ${count} rocky rocks.`); console.log(`Spawning 300 bone trees...`); attempts=0; count=0; while(count<300&&attempts<MAX_ATT){attempts++;const x=BIOME_BOUNDS.BADLANDS_X_START+Math.random()*(WORLD_WIDTH-BIOME_BOUNDS.BADLANDS_X_START),y=BIOME_BOUNDS.BADLANDS_Y_START+Math.random()*(WORLD_HEIGHT-BIOME_BOUNDS.BADLANDS_Y_START); if(getBiomeAt(x,y)!=='badlands')continue; const d=ITEM_DATA['bone_tree'], r=d?.radius||13, h=d?.health||80; const res={id:`res_b_${Date.now()}_${Math.random()}`,x:x,y:y,radius:r,type:'bone_tree',color:d.color,maxHealth:h*2,health:h*2,flashUntil:0,isAttackable:true,isSolid:true,isPlaced:false,variant:'bone'}; if(!checkCollision(r,x,y,null,solidObjects)){resources.push(res);if(res.isSolid) solidObjects.push(res);count++;resCount++;}} console.log(`Spawned ${count} bone trees.`); console.log("Spawning other resources..."); const TARGET_OTHER=2000; attempts=0; const MAX_OTHER_ATT=TARGET_OTHER*15; let tempOther=0; while(tempOther<TARGET_OTHER&&attempts<MAX_OTHER_ATT){attempts++;const x=Math.random()*WORLD_WIDTH,y=Math.random()*WORLD_HEIGHT;const biome=getBiomeAt(x,y); if(biome==='rocky'||biome==='badlands'||biome==='forest')continue; if((x>JUNGLE_LAKE.x&&x<JUNGLE_LAKE.x+JUNGLE_LAKE.width&&y>JUNGLE_LAKE.y&&y<JUNGLE_LAKE.y+JUNGLE_LAKE.height)||lavaPools.some(p=>x>p.x&&x<p.x+p.width&&y>p.y&&y<p.y+p.height)||(x<ISLAND_PADDING/2||x>WORLD_WIDTH-ISLAND_PADDING/2||y<ISLAND_PADDING/2||y>WORLD_HEIGHT-ISLAND_PADDING/2))continue; const data=BIOME_DATA[biome];const mult=data.spawnMultiplier||1;const chance=0.05;if(Math.random()>chance*mult)continue; const rand=Math.random();let type=null,variant=null;let treeD=data.treeDensity,rockD=data.rockDensity,cactusD=data.cactusDensity; if(biome==='volcano'||biome==='swamp')treeD=0; const totalD=treeD+rockD+cactusD; if(totalD>0){const treeC=treeD/totalD;const rockC=rockD/totalD; if(rand<treeC){type='tree';if(biome==='frostlands')variant='snowy';}else if(rand<treeC+rockC){type='rock';}else if(cactusD>0&&biome==='desert'){type='cactus';}} if(type){const d=ITEM_DATA[type];const r=d?.radius||(type==='tree'?(12+Math.random()*6):(10+Math.random()*4));const h=d?.health||(type==='tree'?50:150);const res={id:`res_${type}_${Date.now()}_${Math.random()}`,x:x,y:y,radius:r,type:type,color:d.color,maxHealth:h*2,health:h*2,flashUntil:0,isAttackable:true,isSolid:true,isPlaced:false,variant:variant}; if(!checkCollision(r,x,y,null,solidObjects)){resources.push(res);if(res.isSolid) solidObjects.push(res);tempOther++;resCount++;}}} if(attempts>=MAX_OTHER_ATT)console.warn("Max attempts spawning other resources."); console.log(`Total resources spawned: ${resCount}`); }
function spawnInitialMonsters() { monsters = []; let attempts=0; const MAX_ATT=INITIAL_MONSTER_COUNT*5; console.log(`Spawning ${INITIAL_MONSTER_COUNT} monsters...`); let count=0; while(count<INITIAL_MONSTER_COUNT&&attempts<MAX_ATT){attempts++;const x=Math.random()*WORLD_WIDTH, y=Math.random()*WORLD_HEIGHT; if((x>JUNGLE_LAKE.x&&x<JUNGLE_LAKE.x+JUNGLE_LAKE.width&&y>JUNGLE_LAKE.y&&y<JUNGLE_LAKE.y+JUNGLE_LAKE.height)||lavaPools.some(p=>x>p.x&&x<p.x+p.width&&y>p.y&&y<p.y+p.height)||(x<ISLAND_PADDING/2||x>WORLD_WIDTH-ISLAND_PADDING/2||y<ISLAND_PADDING/2||y>WORLD_HEIGHT-ISLAND_PADDING/2)||distanceSq(x,y,player.x,player.y)<(200*200)||checkCollision(10,x,y,null,solidObjects)) continue; const h=50; const mon={id:`mon_${Date.now()}_${Math.random()}`,x:x,y:y,radius:10+Math.random()*5,type:'slime',color:'#DC143C',maxHealth:h*2,health:h*2,flashUntil:0,state:'idle',attackCooldown:MONSTER_ATTACK_COOLDOWN,lastAttackTime:0,target:null,isAttackable:true,isSolid:false}; monsters.push(mon); count++;} if(attempts>=MAX_ATT&&count<INITIAL_MONSTER_COUNT){console.warn(`Max spawn attempts for monsters. Spawned: ${count}`);} console.log(`Spawned ${count} actual monsters.`); }
function spawnBosses() { bosses=[]; const baseBossHealth=PLAINS_BOSS_HEALTH;const plainsEdgeBuffer=50;let spawnX_plains,spawnY_plains;let attempts_plains=0;const MAX_BOSS_SPAWN_ATTEMPTS=50;do{spawnX_plains=BIOME_BOUNDS.FOREST_X_END+plainsEdgeBuffer+Math.random()*(BIOME_BOUNDS.JUNGLE_X_START-BIOME_BOUNDS.FOREST_X_END-2*plainsEdgeBuffer);spawnY_plains=BIOME_BOUNDS.FROSTLANDS_Y_END+plainsEdgeBuffer+Math.random()*(BIOME_BOUNDS.DESERT_Y_START-BIOME_BOUNDS.FROSTLANDS_Y_END-2*plainsEdgeBuffer);attempts_plains++;}while(checkCollision(PLAINS_BOSS_RADIUS,spawnX_plains,spawnY_plains,null,solidObjects)&&attempts_plains<MAX_BOSS_SPAWN_ATTEMPTS);if(attempts_plains>=MAX_BOSS_SPAWN_ATTEMPTS){console.error("Could not find valid spawn location for Plains Boss!");spawnX_plains=WORLD_CENTER_X;spawnY_plains=WORLD_CENTER_Y;} const plainsBoss={id:`boss_plains_${Date.now()}`,x:spawnX_plains,y:spawnY_plains,radius:PLAINS_BOSS_RADIUS,type:'plains_boss',color:'#665A48',angle:0,maxHealth:baseBossHealth,health:baseBossHealth,flashUntil:0,state:'patrolling',attackCooldown:PLAINS_BOSS_ATTACK_COOLDOWN,lastAttackTime:0,attackTarget:null,speed:PLAINS_BOSS_SPEED,detectRangeSq:PLAINS_BOSS_DETECT_RANGE_SQ,attackRange_hit:BOSS_HIT_RANGE,attackRange_smash:BOSS_SMASH_RANGE,attackRange_spin:BOSS_SPIN_RANGE,patrolTargetX:null,patrolTargetY:null,attackAnimationTimer:0,attackChoiceCooldown:PLAINS_BOSS_ATTACK_CHOICE_COOLDOWN,lastAttackChoiceTime:0,currentAttack:null,smashLanded:false,lastSpinDamageTime:0,isAttackable:true,isSolid:true,isPlaced:false,isBoss:true}; bosses.push(plainsBoss);solidObjects.push(plainsBoss);console.log("Spawned Plains Boss at",Math.round(spawnX_plains),Math.round(spawnY_plains)); const forestEdgeBuffer=80;let spawnX_wolf,spawnY_wolf;let attempts_wolf=0;do{spawnX_wolf=forestEdgeBuffer+Math.random()*(BIOME_BOUNDS.FOREST_X_END-2*forestEdgeBuffer);spawnY_wolf=BIOME_BOUNDS.FROSTLANDS_Y_END+forestEdgeBuffer+Math.random()*(BIOME_BOUNDS.DESERT_Y_START-BIOME_BOUNDS.FROSTLANDS_Y_END-2*forestEdgeBuffer);attempts_wolf++;}while(checkCollision(FOREST_WOLF_RADIUS,spawnX_wolf,spawnY_wolf,null,solidObjects)&&attempts_wolf<MAX_BOSS_SPAWN_ATTEMPTS);if(attempts_wolf>=MAX_BOSS_SPAWN_ATTEMPTS){console.error("Could not find valid spawn location for Forest Wolf! Placing near center of forest.");spawnX_wolf=BIOME_BOUNDS.FOREST_X_END/2;spawnY_wolf=(BIOME_BOUNDS.FROSTLANDS_Y_END+BIOME_BOUNDS.DESERT_Y_START)/2;} const forestWolf={id:`boss_wolf_${Date.now()}`,x:spawnX_wolf,y:spawnY_wolf,radius:FOREST_WOLF_RADIUS,type:'forest_wolf',color:'#696969',angle:Math.random()*Math.PI*2,maxHealth:FOREST_WOLF_HEALTH,health:FOREST_WOLF_HEALTH,flashUntil:0,state:'moving_to_corner',speedMultiplier:FOREST_WOLF_SPEED_MULT,contactDamage:FOREST_WOLF_CONTACT_DAMAGE,targetCorner:null,lastCornerChangeTime:0,isAttackable:true,isSolid:true,isPlaced:false,isBoss:true}; bosses.push(forestWolf);solidObjects.push(forestWolf);console.log("Spawned Forest Wolf at",Math.round(spawnX_wolf),Math.round(spawnY_wolf));}
function spawnJungleBoss() { if(!forestWolfDefeated||bosses.some(b=>b.type==='jungle_boss'))return; console.log("Spawning Jungle Lake Boss..."); const spawnX=JUNGLE_LAKE.x+JUNGLE_LAKE.width/2; const spawnY=JUNGLE_LAKE.y+JUNGLE_LAKE.height/2; if(checkCollision(JUNGLE_BOSS_RADIUS,spawnX,spawnY,null,solidObjects)){console.error("Cannot spawn Jungle Boss - Lake center blocked?"); return;} const jungleBoss={id:`boss_jungle_${Date.now()}`,x:spawnX,y:spawnY,radius:JUNGLE_BOSS_RADIUS,type:'jungle_boss',color:'#008B8B',angle:0,maxHealth:JUNGLE_BOSS_HEALTH,health:JUNGLE_BOSS_HEALTH,flashUntil:0,state:'active',attackCooldown:JUNGLE_BOSS_ATTACK_COOLDOWN,lastAttackTime:0,projectileDamage:JUNGLE_BOSS_PROJECTILE_DAMAGE,isAttackable:true,isSolid:true,isPlaced:false,isBoss:true,lakeBounds:{...JUNGLE_LAKE}}; bosses.push(jungleBoss);solidObjects.push(jungleBoss);console.log("Spawned Jungle Lake Boss at",Math.round(spawnX),Math.round(spawnY)); }


// --- Input Handling ---
document.addEventListener('keydown', (event) => { if (isGameOver || !gameHasStarted || gamePaused) return; const key=event.key.toLowerCase(); const code=event.code; if(key==='e'){toggleCraftingMenu();keysPressed[key]=false;return;} if(key==='escape'){if(isCraftingMenuOpen){toggleCraftingMenu();} keysPressed[key]=false;return;} if(isCraftingMenuOpen) return; if(key==='m'){isMinimapVisible=!isMinimapVisible;console.log(`Minimap toggled: ${isMinimapVisible?'ON':'OFF'}`);keysPressed[key]=false;event.preventDefault();return;} if(code==='Space'){handleSpacebarPress();event.preventDefault();keysPressed[' ']=false; return;} keysPressed[key]=true; if(!isNaN(parseInt(key))&&parseInt(key)>=1&&parseInt(key)<=HOTBAR_SIZE){selectHotbar(parseInt(key)-1);} });
document.addEventListener('keyup', (event) => { keysPressed[event.key.toLowerCase()] = false; if(event.code === 'Space') keysPressed[' '] = false;});
canvas.addEventListener('mousemove', (event) => { if(isGameOver||!gameHasStarted||gamePaused)return; const rect=canvas.getBoundingClientRect(); mouseCanvasX=event.clientX-rect.left; mouseCanvasY=event.clientY-rect.top; const worldCoords=canvasToWorld(mouseCanvasX,mouseCanvasY); worldMouseX=worldCoords.x; worldMouseY=worldCoords.y; });
canvas.addEventListener('mousedown', (event) => { if(isGameOver||isCraftingMenuOpen||!gameHasStarted||gamePaused)return; if(event.button===0){isMouseDown = true;} else if(event.button===2){if(!player.isInteracting&&!player.isAttacking){player.isInteracting=true;player.interactTimer=Date.now();tryInteract();}} });
canvas.addEventListener('mouseup', (event) => { if (event.button === 0) { isMouseDown = false; } });
canvas.addEventListener('mouseleave', () => { isMouseDown = false; });
closeCraftingButton.addEventListener('click', ()=>{if(player.selectedInventoryItem){player.selectedInventoryItem=null;} if(selectedUpgradeInput.itemData)selectedUpgradeInput={slotIndex:-1,source:null, itemData: null}; toggleCraftingMenu();});


// --- Action Functions ---
function findNearestObject(x, y, rangeSq, filterFn = () => true) { let closest=null,minDistSq=rangeSq; // Check placed resources first
    for(const obj of resources){ if(obj.isPlaced&&filterFn(obj)){const dSq=distanceSq(x,y,obj.x,obj.y);if(dSq<minDistSq&&dSq<INTERACT_RANGE_SQ){minDistSq=dSq;closest=obj;}}} // Removed redundant solidObjects loop, assuming placed resources are in resources array
    return closest; }
function decrementHotbarItem(index) { const slot=player.hotbarSlots[index]; if(!slot)return false; slot.count--; if(slot.count<=0){player.hotbarSlots[index]=null;} updateMainHotbarVisuals();updateEquippedItem();if(isCraftingMenuOpen){populateCraftingMenu(isNearWorkbench(),isNearUpgrader());} return true;}
function tryAttack() { if (!gameHasStarted || gamePaused) return; const now = Date.now(); const equippedItemSlot = player.hotbarSlots[player.selectedHotbarSlotIndex]; const equippedItemType = equippedItemSlot ? equippedItemSlot.type : null; const equippedItemData = equippedItemType ? ITEM_DATA[equippedItemType] : null; // --- BOW ATTACK ---
     if (equippedItemData && equippedItemData.type === 'tool' && equippedItemData.toolType === 'bow') { const currentBowCooldown = BOW_COOLDOWN * player.bonusBowAttackSpeedMult * player.weaponAttackSpeedMult; if (now - player.lastBowShotTime >= currentBowCooldown) { player.isAttacking = true; player.attackTimer = now; player.lastBowShotTime = now; const projSpeed = PROJECTILE_SPEED; // Raw speed value
             const range = (equippedItemData.range || PROJECTILE_RANGE) * (player.weaponRangeMult || 1); const dmg = ((equippedItemData.damage || 10) * player.bowMultiplierBoost) * player.weaponDamageMult; const proj = { id: `proj_${player.id}_${now}`, ownerId: player.id, x: player.x + Math.cos(player.angle) * (player.radius + 5), y: player.y + Math.sin(player.angle) * (player.radius + 5), vx: Math.cos(player.angle) * projSpeed, // Store base velocity vector
                vy: Math.sin(player.angle) * projSpeed, damage: dmg, range: range, traveled: 0, radius: PROJECTILE_RADIUS, color: '#F5F5DC', type: 'arrow_projectile' }; projectiles.push(proj); console.log(`Fired arrow (Dmg:${dmg.toFixed(1)})`); } return; // Bow handled, exit
     } // --- MELEE ATTACK ---
     if (now - player.lastAttackTime < MELEE_ATTACK_COOLDOWN * player.weaponAttackSpeedMult) { // Check cooldown first
         if(isMouseDown) { player.isAttacking = true; player.attackTimer = now; } // Keep animation going if holding
         return; // On cooldown
     } player.isAttacking = true; player.attackTimer = now; player.lastAttackTime = now; let bestTarget = null, minDistSq = (ATTACK_RANGE + player.radius)**2; // Define what can be attacked by melee
    const attackables = [...monsters, ...resources.filter(r => r.isAttackable), // Only attackable resources
        ...bosses, ...undeadMinions, ...summonedSlimes ]; const ax = player.x + Math.cos(player.angle) * player.radius, ay = player.y + Math.sin(player.angle) * player.radius; for (const target of attackables) { if (!target || target.health <= 0) continue; // Skip dead targets
         let hit = false; const targetRadius = target.radius || (target.isPlaced ? (ITEM_DATA[target.type]?.solidRadius || 0) : 0); if (targetRadius > 0) { // Use circle check for everything with a radius
             const dSq = distanceSq(ax, ay, target.x, target.y); // Check if within attack range AND closer than current best
            if (dSq < (targetRadius + ATTACK_RANGE) ** 2) { // In range check first
                 const angleTo = Math.atan2(target.y - player.y, target.x - player.x); const angleDiff = Math.abs(normalizeAngle(player.angle - angleTo)); if (angleDiff < ATTACK_SWING_ARC / 2 + 0.5) { // Check angle
                    if (dSq < minDistSq) { // Check if closest
                         minDistSq = dSq; bestTarget = target; } } } } } // --- Apply Damage ---
     if (bestTarget) { // Damage the best target found
         const targetIsEnemy = monsters.some(m => m.id === bestTarget.id) || bosses.some(b => b.id === bestTarget.id); const targetIsMonster = monsters.some(m => m.id === bestTarget.id); bestTarget.flashUntil = now + FLASH_DURATION; let damage = 0; const targetIsTree = bestTarget.type === 'tree'; const targetIsRock = bestTarget.type === 'rock'; const targetIsCactus = bestTarget.type === 'cactus'; const targetIsBone = bestTarget.type === 'bone_tree'; const targetIsPlaced = bestTarget.isPlaced; const targetIsUndead = bestTarget.type === 'undead_minion'; const targetIsSummon = bestTarget.type === 'summoned_slime'; if (equippedItemData && equippedItemData.type === 'tool') { if ((targetIsEnemy || targetIsUndead || targetIsSummon) && equippedItemData.toolType === 'sword') { damage = (BASE_ATTACK_POWER * equippedItemData.damageMultiplier * player.swordMultiplierBoost + player.bonusSwordDamage + player.bonusMeleeDamage) * player.weaponDamageMult; } else if ((targetIsTree || targetIsBone) && equippedItemData.toolType === 'axe') { damage = BASE_GATHER_POWER * equippedItemData.gatherMultiplier; } else if (targetIsRock && equippedItemData.toolType === 'pickaxe') { damage = BASE_GATHER_POWER * equippedItemData.gatherMultiplier; } else if (targetIsCactus && equippedItemData.toolType === 'axe') { damage = BASE_GATHER_POWER * equippedItemData.gatherMultiplier; } else if (targetIsPlaced && (equippedItemData.toolType === 'axe' || equippedItemData.toolType === 'pickaxe')) { damage = BASE_GATHER_POWER * 2.0; } else { // Wrong tool or hitting enemy with non-sword tool
                 damage = BASE_ATTACK_POWER / 2; } } else { // Bare hands
             damage = ((targetIsEnemy || targetIsUndead || targetIsSummon) ? BASE_ATTACK_POWER : BASE_GATHER_POWER) + player.bonusMeleeDamage; damage *= player.weaponDamageMult; if (targetIsRock || targetIsPlaced || targetIsTree || targetIsBone || targetIsCactus) { // Less damage to resources barehanded
                 damage = BASE_GATHER_POWER / 3; } } if (damage > 0) { bestTarget.health -= damage; // Apply Lifesteal
             const totalLifesteal = player.lifesteal + player.bonusLifesteal; if (targetIsEnemy && totalLifesteal > 0 && bestTarget.health > 0) { // Only heal if target is alive after hit? Or before? Let's do before/during.
                 const hBef = player.health; player.health = Math.min(player.maxHealth, player.health + totalLifesteal); if (player.health > hBef) updateUI(); } // Apply On-Kill Heal
             if(targetIsEnemy && player.weaponOnKillHeal > 0 && bestTarget.health <= 0) { player.health = Math.min(player.maxHealth, player.health + player.weaponOnKillHeal); updateUI(); } // Handle Death & Drops
             if (bestTarget.health <= 0) { console.log(`%cDestroyed ${bestTarget.type || 'entity'}!`, 'color:orange;font-weight:bold;'); const dropX = bestTarget.x, dropY = bestTarget.y; let drops = []; if (targetIsMonster && player.className === 'necromancer') { player.monsterKillCount++; updateUI(); } if (targetIsTree) { drops.push({ type: 'wood', count: 1 + Math.floor(Math.random() * 3) }); if (Math.random() < 0.2) drops.push({ type: 'plant_fiber', count: 1 }); } else if (targetIsRock) { drops.push({ type: 'stone', count: 1 + Math.floor(Math.random() * 2) }); } else if (targetIsCactus) { drops.push({ type: 'plant_fiber', count: 1 + Math.floor(Math.random() * 2) }); } else if (targetIsBone) { drops.push({ type: 'dust', count: 1 + Math.floor(Math.random() * 3) }); if (Math.random() < 0.02) { drops.push({ type: 'bone_scythe', count: 1 }); console.log("%cDrops Bone Scythe!", "color:magenta;font-weight:bold;"); } } else if (targetIsMonster) { drops.push({ type: 'monster_goop', count: 1 + Math.floor(Math.random() * 4) }); if (Math.random() < GOLD_COIN_DROP_CHANCE) drops.push({ type: 'gold_coin', count: 1 }); if (Math.random() < 0.02) drops.push({ type: 'healing_salve', count: 1 }); gainXP(MONSTER_XP_REWARD); } else if (targetIsBoss && bestTarget.type === 'plains_boss') { drops.push({ type: 'gold_coin', count: 10 + Math.floor(Math.random() * 16) }); drops.push({ type: 'stone', count: 5 + Math.floor(Math.random() * 11) }); drops.push({ type: 'iron_ore', count: 15 }); if (Math.random() < 0.1) drops.push({ type: 'healing_salve', count: 2 }); gainXP(PLAINS_BOSS_XP_REWARD); const tier = BOSS_WALL_TIER_MAP[bestTarget.type]; if (tier !== undefined) { const wc = walls.length; walls = walls.filter(w => w.tier !== tier); solidObjects = solidObjects.filter(s => !(s.isWall && s.tier === tier)); const rem = wc - walls.length; if (rem > 0) console.log(`%cTier ${tier} walls (${rem}) gone!`, 'color:blue;font-weight:bold;'); } } else if (targetIsBoss && bestTarget.type === 'forest_wolf') { gainXP(PLAINS_BOSS_XP_REWARD * 0.75); drops.push({ type: 'mystical_orb', count: 1 }); if (!forestWolfDefeated) { forestWolfDefeated = true; console.log("%cForest Wolf defeated! The lake stirs...", "color: cyan; font-weight: bold;"); spawnJungleBoss(); } } else if (targetIsBoss && bestTarget.type === 'jungle_boss') { gainXP(PLAINS_BOSS_XP_REWARD * 1.5); console.log("%cJungle Boss Defeated!", "color: blue; font-weight: bold;"); } else if (targetIsPlaced) { drops.push({ type: bestTarget.type, count: 1 }); } drops.forEach(d => addDroppedItem(dropX, dropY, d.type, d.count)); // Remove the destroyed object from relevant arrays
                 if (bestTarget.isSolid) solidObjects = solidObjects.filter(s => s.id !== bestTarget.id); if (targetIsMonster) monsters = monsters.filter(m => m.id !== bestTarget.id); else if (targetIsBoss) { bosses = bosses.filter(b => b.id !== bestTarget.id); } else if (targetIsUndead) undeadMinions = undeadMinions.filter(u => u.id !== bestTarget.id); else if (targetIsSummon) summonedSlimes = summonedSlimes.filter(s => s.id !== bestTarget.id); else resources = resources.filter(r => r.id !== bestTarget.id); } } } }
function tryInteract() { if (!gameHasStarted || gamePaused) return; const item = player.hotbarSlots[player.selectedHotbarSlotIndex]; const type = item ? item.type : null; const data = type ? ITEM_DATA[type] : null; // --- Usable Item ---
     if (item && data && data.isUsable) { if (type === 'healing_salve') { if (player.health < player.maxHealth) { player.health = Math.min(player.maxHealth, player.health + HEAL_AMOUNT); decrementHotbarItem(player.selectedHotbarSlotIndex); console.log(`Used Salve. HP: ${player.health.toFixed(0)}`); updateUI(); return; } else { console.log("Health full."); return; } } else if (type === 'mystical_orb') { console.log("Using Mystical Orb..."); if (player.chosenWeaponId) { console.log("Weapon already chosen."); return; } showWeaponChoiceMenu(); // Orb consumed in handleWeaponChoice
             return; } return; } // --- Interactable Object ---
    const nearby = findNearestObject(player.x, player.y, INTERACT_RANGE_SQ, (obj) => ITEM_DATA[obj.type]?.isInteractable); if (nearby) { if (nearby.type === 'icky_bed') { player.respawnX = nearby.x; player.respawnY = nearby.y; console.log(`%cSpawn set!`, 'color:yellow;'); nearby.flashUntil = Date.now() + 200; return; } return; } // --- Placeable Item ---
    if (item && data && data.isPlaceable) { const gx = Math.round(worldMouseX / PLACE_GRID_SIZE) * PLACE_GRID_SIZE, gy = Math.round(worldMouseY / PLACE_GRID_SIZE) * PLACE_GRID_SIZE; if (distanceSq(player.x, player.y, gx, gy) > PLACE_RANGE_SQ) return; const r = data.solidRadius || PLACE_GRID_SIZE / 2; // Check collision at the center of the placement grid cell
         const checkX = gx + PLACE_GRID_SIZE / 2; const checkY = gy + PLACE_GRID_SIZE / 2; if (checkCollision(r - 0.1, checkX, checkY, null, [...solidObjects, player])) { // Check against player too
            console.log("Placement blocked."); return; } const placed = { id: `placed_${Date.now()}_${Math.random()}`, x: gx, y: gy, radius: r, type: type, color: data.color, maxHealth: data.health || 100, health: data.health || 100, flashUntil: 0, isAttackable: data.isAttackable ?? true, isSolid: data.isSolid ?? true, isPlaced: true, lightRadius: data.lightRadius || 0, isInteractable: data.isInteractable || false }; resources.push(placed); if (placed.isSolid) solidObjects.push(placed); decrementHotbarItem(player.selectedHotbarSlotIndex); console.log(`Placed ${type} at (${gx},${gy})`); return; } }
function selectHotbar(index) { if(index<0||index>=HOTBAR_SIZE)return; player.selectedHotbarSlotIndex=index; mainHotbarSlots.forEach((slot,i)=>{slot.classList.toggle('selected',i===index);}); updateEquippedItem(); }
function updateEquippedItem() { const slot=player.hotbarSlots[player.selectedHotbarSlotIndex]; player.equippedItemType=slot?slot.type:null; }

// --- Update Functions --- (applyDamageToPlayer is defined earlier now)
// All other update functions (updatePlayer, updateMonsters, etc.) are defined further down

// --- Summoner Ability Functions ---
function trySummonSlime() { if (!gameHasStarted || gamePaused || player.className !== 'summoner') return; const currentMaxSlimes = MAX_SUMMONED_SLIMES + player.bonusMaxSummons; if (summonedSlimes.length >= currentMaxSlimes) { console.log("Max summoned slimes reached. Removing oldest..."); summonedSlimes.shift(); // Remove the first (oldest) slime
     } console.log("Attempting to summon slime..."); const spawnDist = player.radius + SUMMONED_SLIME_RADIUS + 5; const spawnX = player.x + Math.cos(player.angle) * spawnDist; const spawnY = player.y + Math.sin(player.angle) * spawnDist; spawnSummonedSlime(spawnX, spawnY); }
function spawnSummonedSlime(x, y) { const baseSlimeHealth = 50 * 2; const slimeHealth = baseSlimeHealth * SUMMONED_SLIME_HEALTH_MULT * player.bonusSummonHealthMult; const slimeDamage = SUMMONED_SLIME_DAMAGE * player.bonusSummonDamageMult; const slime = { id: `sum_slime_${Date.now()}_${Math.random()}`, ownerId: player.id, x: x, y: y, radius: SUMMONED_SLIME_RADIUS, type: 'summoned_slime', color: SUMMONED_SLIME_COLOR, maxHealth: slimeHealth, health: slimeHealth, flashUntil: 0, speed: SUMMONED_SLIME_SPEED, state: 'following', attackTarget: null, targetType: null, wanderTargetX: null, wanderTargetY: null, lastWanderChange: 0, attackCooldown: SUMMONED_SLIME_ATTACK_COOLDOWN, lastAttackTime: 0, damage: slimeDamage, detectRangeSq: SUMMONED_SLIME_DETECT_RANGE_SQ, attackRange: SUMMONED_SLIME_ATTACK_RANGE, isSolid: false, isAttackable: true }; summonedSlimes.push(slime); console.log(`Summoned slime ${slime.id} (HP: ${Math.floor(slimeHealth)}, Dmg: ${slimeDamage.toFixed(1)})`); updateUI(); // Update minion count
}

// --- Necromancer Ability Functions ---
function trySummonUndead() { if (!gameHasStarted || gamePaused || player.className !== 'necromancer') return; const killsNeeded = CLASS_DATA.necromancer.killsToSummon; if (player.monsterKillCount >= killsNeeded) { if (undeadMinions.length < MAX_UNDEAD_MINIONS) { console.log("Necromancer summoning undead..."); const spawnDist = player.radius + UNDEAD_RADIUS + 5; const spawnX = player.x + Math.cos(player.angle) * spawnDist; const spawnY = player.y + Math.sin(player.angle) * spawnDist; spawnUndeadMinion(spawnX, spawnY); player.monsterKillCount -= killsNeeded; console.log(`Kills remaining for next summon: ${killsNeeded - (player.monsterKillCount % killsNeeded)}`); updateUI(); } else { console.log("Max undead minions reached."); } } else { console.log(`Necromancer needs ${killsNeeded - (player.monsterKillCount % killsNeeded)} more kills to summon.`); } }
function spawnUndeadMinion(x, y) { const baseSlimeHealth=50*2; const undeadHealth=baseSlimeHealth*UNDEAD_BASE_HEALTH_MULT*player.bonusUndeadHealthMult; const minion={id:`undead_${Date.now()}_${Math.random()}`,ownerId:player.id,x:x+(Math.random()-0.5)*10,y:y+(Math.random()-0.5)*10,radius:UNDEAD_RADIUS,type:'undead_minion',color:UNDEAD_COLOR,maxHealth:undeadHealth,health:undeadHealth,flashUntil:0,speed:UNDEAD_SPEED,state:'idle',attackTarget:null,targetType:null,wanderTargetX:null,wanderTargetY:null,lastWanderChange:0,attackCooldown:UNDEAD_ATTACK_COOLDOWN,lastAttackTime:0,damage:UNDEAD_DAMAGE,detectRangeSq:Infinity, // Undead have infinite detect range?
     attackRange:UNDEAD_ATTACK_RANGE,isSolid:false,isAttackable:true}; undeadMinions.push(minion); console.log(`Spawned undead ${minion.id} (HP: ${Math.floor(undeadHealth)})`); updateUI(); // Update minion count
}

// --- Handle Spacebar Press ---
function handleSpacebarPress() { if (!gameHasStarted || gamePaused) return; if (player.className === 'summoner') { trySummonSlime(); } else if (player.className === 'necromancer') { trySummonUndead(); } }

// --- Apply Class Stats Function ---
function applyClassStats(selectedClass) { const stats=CLASS_DATA[selectedClass]; if(!stats){console.error(`Invalid class: ${selectedClass}. Defaults.`);player.maxHealth=PLAYER_MAX_HEALTH*1.0;player.speedMultiplier=1.0;player.swordMultiplierBoost=1.0;player.bowMultiplierBoost=1.0;player.lifesteal=0;player.daySpeedPenalty=1.0; player.className=null;player.monsterKillCount=0;}else{console.log(`Applying stats: ${selectedClass}`);player.speedMultiplier=stats.speedMult;player.swordMultiplierBoost=stats.swordBoost;player.bowMultiplierBoost=stats.bowBoost;player.maxHealth=PLAYER_MAX_HEALTH*stats.healthMult;player.lifesteal=stats.lifesteal;player.daySpeedPenalty=stats.daySpeedPenalty; // Store base penalty
        player.bonusDaySpeedPenaltyMult = 1.0; // Initialize weapon/perk multiplier
        player.className=stats.className;player.monsterKillCount=0;console.log(` > Class Name: ${player.className}`); console.log(` > Kills required per Undead: ${stats.killsToSummon > 0 ? stats.killsToSummon : 'N/A'}`); console.log(` > HP:${Math.floor(player.maxHealth)} Speed:${player.speedMultiplier} Sword:${player.swordMultiplierBoost} Bow:${player.bowMultiplierBoost} Lifesteal:${player.lifesteal} DayPenalty:${player.daySpeedPenalty}`);} player.health=player.maxHealth; }

// --- Game Initialization Function ---
function initializeGame() { console.log("--- Initializing Game World ---"); // Reset game state arrays
    resources = []; monsters = []; solidObjects = []; bosses = []; walls = []; projectiles = []; droppedItems = []; undeadMinions = []; summonedSlimes = []; gameTime = 0; dayCount = 1; isNight = false; currentNightOpacity = 0; isGameOver = false; isCraftingMenuOpen = false; isUpgraderUIOpen = false; selectedUpgradeInput = { slotIndex: -1, source: null, itemData: null }; cameraX = 0; cameraY = 0; forestWolfDefeated = false; gamePaused = false; isMouseDown = false; // Reset player state (keep chosen class stats, reset others)
    player.x = WORLD_WIDTH / 2; player.y = WORLD_HEIGHT / 2; player.health = player.maxHealth; player.hunger = PLAYER_MAX_HUNGER; player.level = 1; player.currentXP = 0; player.monsterKillCount = 0; player.hasChosenLevel3Perk = false; player.pet = null; player.angle = 0; player.isAttacking = false; player.attackTimer = 0; player.lastAttackTime = 0; player.isInteracting = false; player.interactTimer = 0; player.inventorySlots = new Array(INVENTORY_COLS * INVENTORY_ROWS).fill(null); player.hotbarSlots = new Array(HOTBAR_SIZE).fill(null); player.selectedHotbarSlotIndex = 0; player.equippedItemType = null; player.selectedInventoryItem = null; player.respawnX = WORLD_WIDTH / 2; player.respawnY = WORLD_HEIGHT / 2; player.lastBowShotTime = 0; // Reset perks and weapon effects
    player.bonusMaxHealth = 0; player.bonusSwordDamage = 0; player.bonusMeleeDamage = 0; player.bonusMovementSpeedMult = 1.0; player.bonusBowAttackSpeedMult = 1.0; player.bonusLifesteal = 0; player.bonusNightSpeedMult = 1.0; player.bonusUndeadHealthMult = 1.0; player.bonusMaxSummons = 0; player.bonusSummonHealthMult = 1.0; player.bonusSummonDamageMult = 1.0; player.chosenWeaponId = null; player.weaponAttackSpeedMult = 1.0; player.weaponDamageMult = 1.0; player.weaponMoveSpeedMult = 1.0; player.weaponRangeMult = 1.0; player.weaponOnKillHeal = 0; // Recalculate day penalty based on fresh class stats
    player.daySpeedPenalty = CLASS_DATA[player.className]?.daySpeedPenalty || 1.0; player.bonusDaySpeedPenaltyMult = 1.0; // Spawn world elements
    spawnInitialResources(); createWalls(); spawnInitialMonsters(); spawnBosses(); // Give starting items
    player.hotbarSlots[0]={type:'wood_sword',count:1}; player.hotbarSlots[1]={type:'wood_pickaxe',count:1}; player.xpToNextLevel=calculateXPForNextLevel(player.level); // Set initial state
    selectHotbar(0); updateMainHotbarVisuals(); updateEquippedItem(); clampCamera(); updateUI(); gameHasStarted=true; console.log("--- Game Ready! ---"); }

// --- Event Listeners for Class Selection ---
classSelect.addEventListener('change', ()=>{startGameButton.disabled=!(classSelect.value&&CLASS_DATA[classSelect.value]);});
startGameButton.addEventListener('click', ()=>{const selectedClass=classSelect.value; if(!selectedClass||!CLASS_DATA[selectedClass]){alert("Select class!");return;} applyClassStats(selectedClass); classSelectionOverlay.style.display='none'; initializeGame();});


// --- Main Update Function ---
function update(deltaTime) { if (isGameOver || !gameHasStarted || gamePaused) return; if (!deltaTime || deltaTime <= 0 || deltaTime > 500) deltaTime = FRAME_TIME_TARGET; // Use target frame time if deltaTime is invalid
     // Handle Attack Input
     if(isMouseDown && !player.isInteracting && !isCraftingMenuOpen) { if(player.equippedItemType && ITEM_DATA[player.equippedItemType]?.toolType !== 'bow') { // Melee hold logic handled in tryAttack cooldown check
            tryAttack(); } else if (player.equippedItemType && ITEM_DATA[player.equippedItemType]?.toolType === 'bow') { // Bow hold logic (fires on cooldown)
            tryAttack(); } } else { // Stop melee attack animation if mouse released and duration passed
        if(player.equippedItemType && ITEM_DATA[player.equippedItemType]?.toolType !== 'bow' && player.isAttacking && Date.now() - player.attackTimer > ATTACK_DURATION) { player.isAttacking = false; } } // Update Entities
    updatePlayer(deltaTime); updateMonsters(deltaTime); updateBosses(deltaTime); updateUndeadMinions(deltaTime); updateSummonedSlimes(deltaTime); updatePets(deltaTime); updateProjectiles(deltaTime); updateWorld(deltaTime); clampCamera(); updateUI(); }

// --- Main Draw Function ---
function draw() { if(!gameHasStarted){ctx.clearRect(0,0,canvas.width,canvas.height);return;} ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(canvas.width/2-cameraX,canvas.height/2-cameraY); drawWorldBackground();drawBiomeWalls();drawResources();drawMonsters();drawBosses();drawUndeadMinions();drawSummonedSlimes();drawDroppedItems();drawProjectiles();drawPlayer();drawPets(); // Draw Night Overlay & Lights
     if(currentNightOpacity>0.01){ctx.save();ctx.fillStyle='#00001a';ctx.globalAlpha=currentNightOpacity;ctx.fillRect(cameraX-canvas.width/2,cameraY-canvas.height/2,canvas.width,canvas.height);ctx.globalAlpha=1.0;ctx.globalCompositeOperation='lighter'; // Lights add brightness
        // Draw Torch Lights
        resources.forEach(res=>{if(res.isPlaced&&res.lightRadius>0&&res.type==='torch'){const g=ctx.createRadialGradient(res.x,res.y,0,res.x,res.y,res.lightRadius),b=0.6;g.addColorStop(0,`rgba(255,190,120,${b})`);g.addColorStop(0.6,`rgba(200,100,50,${b*0.5})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(res.x,res.y,res.lightRadius,0,Math.PI*2);ctx.fill();}}); // Draw Lava Pool Lights
        lavaPools.forEach(p=>{if(p.lightRadius>0){const cX=p.x+p.width/2,cY=p.y+p.height/2,b=p.lightOpacity||0.8,g=ctx.createRadialGradient(cX,cY,0,cX,cY,p.lightRadius);g.addColorStop(0,`rgba(255,100,0,${b*0.9})`);g.addColorStop(0.5,`rgba(255,60,0,${b*0.6})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cX,cY,p.lightRadius,0,Math.PI*2);ctx.fill();}}); // Draw Player Held Torch Light
        if(player.equippedItemType==='torch'){const d=ITEM_DATA['torch'];if(d&&d.lightRadius>0){const r=d.lightRadius,g=ctx.createRadialGradient(player.x,player.y,0,player.x,player.y,r),b=0.65;g.addColorStop(0,`rgba(255,190,120,${b})`);g.addColorStop(0.6,`rgba(200,100,50,${b*0.5})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(player.x,player.y,r,0,Math.PI*2);ctx.fill();}}ctx.restore();} ctx.restore(); // Restore camera translation
    drawMinimap(ctx); // Draw minimap on top (not affected by camera or night)
}

// --- Game Loop ---
let lastTime = 0;
function gameLoop(timestamp) { const deltaTime=timestamp-lastTime; lastTime=timestamp; if (!isGameOver && gameHasStarted) { update(deltaTime || FRAME_TIME_TARGET); // Pass deltaTime, fallback to target if 0/NaN
     } draw(); requestAnimationFrame(gameLoop); }


// --- Start Game (Wait for Class Selection) ---
player.xpToNextLevel = calculateXPForNextLevel(player.level); // Calc initial XP req
updateUI(); // Initial UI update
requestAnimationFrame(gameLoop); // Start loop, but update() waits for gameHasStarted flag
console.log("--- game.js loaded. Waiting for class selection... ---");