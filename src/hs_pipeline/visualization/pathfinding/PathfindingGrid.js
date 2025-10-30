export class PathfindingGrid {
    constructor(tilemap, collisionLayer) {
        this.tilemap = tilemap;
        this.layer = collisionLayer;
        this.tileSize = tilemap.tileWidth;
    }

    isWalkable(tileX, tileY) {
        const tile = this.layer.getTileAt(tileX, tileY);
        return !tile || !tile.collides;
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