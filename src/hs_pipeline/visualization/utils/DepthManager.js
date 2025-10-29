/**
 * Manages sprite depth sorting for proper layering with zone support
 */
export class DepthManager {
    constructor(scene, zoneManager = null) {
        this.scene = scene;
        this.zoneManager = zoneManager;
    }

    // Set zone manager for zone-based depth sorting
    setZoneManager(zoneManager) {
        this.zoneManager = zoneManager;
    }

    /* Update sprite depth based on Y position and zones
     * @param {Phaser.GameObjects.Sprite} sprite - The sprite to update
     */
    updateSpriteDepth(sprite) {
        if (!sprite) return;

        if (this.zoneManager && this.zoneManager.isInsideRoom(sprite.x, sprite.y)) {
            // Inside a room - player is BEHIND wall_behind layer
            // wall_behind is at depth 2
            // So player should be between -100 and 1 based on Y
            const depth = -100 + (sprite.y / 30); // Will be negative to ~1
            sprite.setDepth(depth);
        } else {
            // Outside rooms (in hallways) - player is IN FRONT of wall_behind
            // wall_behind is at depth 2
            // So player should be 3+ based on Y
            const depth = 100 + sprite.y;
            sprite.setDepth(depth);
        }
    }
}
