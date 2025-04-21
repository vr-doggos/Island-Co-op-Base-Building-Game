import * as C from './config.js';

// --- Utility Functions ---
export function distanceSq(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
}

export function distance(x1, y1, x2, y2) {
    return Math.sqrt(distanceSq(x1, y1, x2, y2));
}

export function normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += 2 * Math.PI;
    while (angle > Math.PI) angle -= 2 * Math.PI;
    return angle;
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function canvasToWorld(canvasX, canvasY, cameraX, cameraY, canvasWidth, canvasHeight) {
    const worldOriginX = cameraX - canvasWidth / 2;
    const worldOriginY = cameraY - canvasHeight / 2;
    return {
        x: canvasX + worldOriginX,
        y: canvasY + worldOriginY
    };
}

export function getBiomeAt(x, y) {
    // Use imported BIOME_BOUNDS
    if (x < C.BIOME_BOUNDS.ROCKY_X_END && y < C.BIOME_BOUNDS.ROCKY_Y_END) return 'rocky';
    if (x > C.BIOME_BOUNDS.SWAMP_X_START && y < C.BIOME_BOUNDS.SWAMP_Y_END) return 'swamp';
    if (x < C.BIOME_BOUNDS.VOLCANO_X_END && y > C.BIOME_BOUNDS.VOLCANO_Y_START) return 'volcano';
    if (x > C.BIOME_BOUNDS.BADLANDS_X_START && y > C.BIOME_BOUNDS.BADLANDS_Y_START) return 'badlands';
    if (y < C.BIOME_BOUNDS.FROSTLANDS_Y_END) return 'frostlands';
    if (y > C.BIOME_BOUNDS.DESERT_Y_START) return 'desert';
    if (x < C.BIOME_BOUNDS.FOREST_X_END) return 'forest';
    if (x > C.BIOME_BOUNDS.JUNGLE_X_START) return 'jungle';
    return 'plains';
}

export function formatTime(milliseconds) {
    if (milliseconds < 0) milliseconds = 0;
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// --- Line Segment Intersection Helper ---
export function segmentsIntersect(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
    function orientation(px, py, qx, qy, rx, ry) {
        const val = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
        if (val === 0) return 0; // Collinear
        return (val > 0) ? 1 : 2; // Clockwise or Counterclockwise
    }

    function onSegment(px, py, qx, qy, rx, ry) {
        return (qx <= Math.max(px, rx) && qx >= Math.min(px, rx) &&
                qy <= Math.max(py, ry) && qy >= Math.min(py, ry));
    }

    const o1 = orientation(p1x, p1y, p2x, p2y, p3x, p3y);
    const o2 = orientation(p1x, p1y, p2x, p2y, p4x, p4y);
    const o3 = orientation(p3x, p3y, p4x, p4y, p1x, p1y);
    const o4 = orientation(p3x, p3y, p4x, p4y, p2x, p2y);

    // General case
    if (o1 !== o2 && o3 !== o4) return true;

    // Special Cases for collinear points
    if (o1 === 0 && onSegment(p1x, p1y, p3x, p3y, p2x, p2y)) return true;
    if (o2 === 0 && onSegment(p1x, p1y, p4x, p4y, p2x, p2y)) return true;
    if (o3 === 0 && onSegment(p3x, p3y, p1x, p1y, p4x, p4y)) return true;
    if (o4 === 0 && onSegment(p3x, p3y, p2x, p2y, p4x, p4y)) return true;

    return false; // Doesn't intersect
}

// --- Line of Sight Check ---
export function isLineObstructed(p1x, p1y, p2x, p2y, wallArray) {
    for (const wall of wallArray) {
        if (!wall.isWall) continue; // Only check against actual walls defined in createWalls

        const wx = wall.x;
        const wy = wall.y;
        const ww = wall.width;
        const wh = wall.height;

        // Define wall corners
        const tl = { x: wx, y: wy };
        const tr = { x: wx + ww, y: wy };
        const bl = { x: wx, y: wy + wh };
        const br = { x: wx + ww, y: wy + wh };

        // Check intersection with each wall segment
        if (segmentsIntersect(p1x, p1y, p2x, p2y, tl.x, tl.y, tr.x, tr.y)) return true; // Top
        if (segmentsIntersect(p1x, p1y, p2x, p2y, bl.x, bl.y, br.x, br.y)) return true; // Bottom
        if (segmentsIntersect(p1x, p1y, p2x, p2y, tl.x, tl.y, bl.x, bl.y)) return true; // Left
        if (segmentsIntersect(p1x, p1y, p2x, p2y, tr.x, tr.y, br.x, br.y)) return true; // Right
    }
    return false; // No obstruction found
}

// --- Collision Detection ---
// Note: Moved checkCollision here as it's a general utility.
// It now needs the game state arrays passed to it or imported.
// Simpler to keep it in game.js for now to avoid passing too much state.
// *Keeping checkCollision in game.js for simplicity of this refactor*

// --- Helper to Pick Forest Corner ---
export function pickNewForestCornerTarget(wolf) {
    const corners = [
        { x: 0, y: C.BIOME_BOUNDS.FROSTLANDS_Y_END }, // Top-left forest
        { x: C.BIOME_BOUNDS.FOREST_X_END, y: C.BIOME_BOUNDS.FROSTLANDS_Y_END }, // Top-right forest
        { x: 0, y: C.BIOME_BOUNDS.DESERT_Y_START }, // Bottom-left forest
        { x: C.BIOME_BOUNDS.FOREST_X_END, y: C.BIOME_BOUNDS.DESERT_Y_START } // Bottom-right forest
    ];

    let availableCorners = corners;
    // Avoid picking the same corner twice in a row if possible
    if (wolf.targetCorner) {
        availableCorners = corners.filter(c => c.x !== wolf.targetCorner.x || c.y !== wolf.targetCorner.y);
        if (availableCorners.length === 0) availableCorners = corners; // Fallback if only one corner left somehow
    }

    // Pick a random available corner
    const bestCorner = availableCorners[Math.floor(Math.random() * availableCorners.length)];

    // Add slight random offset to prevent getting stuck exactly on the corner boundary
    const offsetX = (Math.random() - 0.5) * C.WALL_THICKNESS * 3;
    const offsetY = (Math.random() - 0.5) * C.WALL_THICKNESS * 3;

    // Clamp the target position to be within the forest bounds and away from edges
    wolf.targetCorner = {
        x: Math.max(0 + wolf.radius, Math.min(C.BIOME_BOUNDS.FOREST_X_END - wolf.radius, bestCorner.x + offsetX)),
        y: Math.max(C.BIOME_BOUNDS.FROSTLANDS_Y_END + wolf.radius, Math.min(C.BIOME_BOUNDS.DESERT_Y_START - wolf.radius, bestCorner.y + offsetY))
    };
    console.log(`Wolf ${wolf.id} targeting new corner: (${Math.round(wolf.targetCorner.x)}, ${Math.round(wolf.targetCorner.y)})`);
    wolf.lastCornerChangeTime = Date.now();
}

// --- XP and Leveling Functions ---
export function calculateXPForNextLevel(currentLevel) {
    if (currentLevel < 1) return C.BASE_XP_FOR_LEVEL_2;
    const required = Math.floor(C.BASE_XP_FOR_LEVEL_2 * Math.pow(currentLevel, C.XP_LEVEL_EXPONENT));
    return Math.max(C.BASE_XP_FOR_LEVEL_2, required); // Ensure it's at least the base amount
}