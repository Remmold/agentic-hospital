/**
 * PathfindingGrid
 * Provides a grid representation of the game world for pathfinding
 * Handles both tile-based collision (from collision layer) and prop collision (from objects)
 * 
 * This class acts as an adapter between:
 * - Phaser's tilemap system (tile-based collision)
 * - Custom collision objects (circular/rectangular props)
 * - The A* pathfinding algorithm
 * 
 * @module pathfinding/PathfindingGrid
 */

export class PathfindingGrid {
    constructor(tilemap, collisionLayer, collisionManager = null) {
        this.tilemap = tilemap;
        this.layer = collisionLayer;
        this.collisionManager = collisionManager;
        this.tileSize = tilemap.tileWidth;
    }

    /**
     * Check if a tile is walkable (not blocked by collision)
     * Checks both tile-based collision AND prop collision objects
     * 
     * @param {number} tileX - Tile X coordinate (in tiles, not pixels)
     * @param {number} tileY - Tile Y coordinate (in tiles, not pixels)
     * @returns {boolean} True if tile is walkable, false if blocked
     */
    isWalkable(tileX, tileY) {
        // Check 1: Tile-based collision (walls, etc.)
        const tile = this.layer.getTileAt(tileX, tileY);
        if (tile && tile.collides) {
            return false;
        }

        // Check 2: Prop collision objects (furniture, equipment, etc.)
        if (this.collisionManager) {
            const worldPos = this.tileToWorld(tileX, tileY);
            if (this.collisionManager.isBlocked(worldPos.x, worldPos.y)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Convert world coordinates (pixels) to tile coordinates
     * 
     * @param {number} x - World X coordinate in pixels
     * @param {number} y - World Y coordinate in pixels
     * @returns {{x: number, y: number}} Tile coordinates
     * 
     * @example
     * const tile = grid.worldToTile(320, 480);
     * // With 32px tiles: {x: 10, y: 15}
     */
    worldToTile(x, y) {
        return {
            x: Math.floor(x / this.tileSize),
            y: Math.floor(y / this.tileSize)
        };
    }

    /**
     * Convert tile coordinates to world coordinates (pixels)
     * Returns the center of the tile
     * 
     * @param {number} tileX - Tile X coordinate
     * @param {number} tileY - Tile Y coordinate
     * @returns {{x: number, y: number}} World coordinates (center of tile)
     * 
     * @example
     * const worldPos = grid.tileToWorld(10, 15);
     * // With 32px tiles: {x: 336, y: 496} (center of tile)
     */
    tileToWorld(tileX, tileY) {
        return {
            x: tileX * this.tileSize + this.tileSize / 2,  // Center X
            y: tileY * this.tileSize + this.tileSize / 2   // Center Y
        };
    }
}
