export class PathfindingGrid {
    constructor(tilemap, collisionLayer, collisionManager = null) {
        this.tilemap = tilemap;
        this.layer = collisionLayer;
        this.collisionManager = collisionManager;
        this.tileSize = tilemap.tileWidth;
    }

    isWalkable(tileX, tileY) {
        // Check Tile-based collision
        const tile = this.layer.getTileAt(tileX, tileY);
        if (tile && tile.collides) {
            return false;
        }

        // Check Prop collision objects (circles/rectangles)
        if (this.collisionManager) {
            const worldPos = this.tileToWorld(tileX, tileY);
            if (this.collisionManager.isBlocked(worldPos.x, worldPos.y)) {
                return false;
            }
        }

        return true;
    }

    worldToTile(x, y) {
        return {
            x: Math.floor(x / this.tileSize),
            y: Math.floor(y / this.tileSize)
        };
    }

    tileToWorld(tileX, tileY) {
        return {
            x: tileX * this.tileSize + this.tileSize / 2,
            y: tileY * this.tileSize + this.tileSize / 2
        };
    }
}
