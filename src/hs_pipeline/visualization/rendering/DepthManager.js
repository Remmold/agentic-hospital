/**
 * DepthManager
 * Manages sprite depth sorting for proper layering with zone support
 */
export class DepthManager {
    constructor(scene, zoneManager = null) {
        this.scene = scene;
        this.zoneManager = zoneManager;
        this.debugMode = true;
        this.lastLoggedDepth = null;
        this.logThrottle = 0;
        this.currentZoneType = 'none';
    }

    setZoneManager(zoneManager) {
        this.zoneManager = zoneManager;
    }

    /**
     * Update sprite depth based on Y position and zones
     * @param {Phaser.GameObjects.Sprite} sprite - The sprite to update
     */
    updateSpriteDepth(sprite) {
        if (!sprite) return;

        let depth;
        const zone = this.zoneManager ? this.zoneManager.getZoneAt(sprite.x, sprite.y) : null;

        if (zone) {
            if (zone.zoneType === 'behindDynamic') {
                // Player depth: 41-49 (behind dynamic_prop)
                const mapHeight = this.scene.map ? this.scene.map.heightInPixels : 3000;
                depth = 41 + (sprite.y / mapHeight) * 8;
                this.currentZoneType = 'behindDynamic';
            }
            else if (zone.zoneType === 'behindDynamic2') {
                // Player depth: 51-59
                const mapHeight = this.scene.map ? this.scene.map.heightInPixels : 3000;
                depth = 51 + (sprite.y / mapHeight) * 8;
                this.currentZoneType = 'behindDynamic';
            }
            else {
                // Player depth: 11-19 (behind wall)
                const mapHeight = this.scene.map ? this.scene.map.heightInPixels : 3000;
                depth = 11 + (sprite.y / mapHeight) * 8;
                this.currentZoneType = 'behindWall';
            }
        } else {
            // Player depth: 100+
            depth = 100 + sprite.y;
            this.currentZoneType = 'none';
        }

        sprite.setDepth(depth);

        // Debug logging
        if (this.debugMode) {
            this.logThrottle++;
            if (this.logThrottle >= 60) {
                this.logThrottle = 0;
            }
        }
    }
}
