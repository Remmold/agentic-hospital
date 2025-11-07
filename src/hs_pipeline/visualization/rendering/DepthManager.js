/**
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
                // Zone type 2: Behind props_dynamic (50) but in front of wall_behind (20)
                // Player depth: 41-49
                const mapHeight = this.scene.map ? this.scene.map.heightInPixels : 3000;
                depth = 41 + (sprite.y / mapHeight) * 8;
                this.currentZoneType = 'behindDynamic';
            } else if (zone.zoneType === 'behindDynamic2') {
                    // Zone type 2: Behind props_dynamic (50) but in front of wall_behind (20)
                    // Player depth: 41-49
                    const mapHeight = this.scene.map ? this.scene.map.heightInPixels : 3000;
                    depth = 51 + (sprite.y / mapHeight) * 8;
                    this.currentZoneType = 'behindDynamic';
                } else {
                // Zone type 1: Behind wall_behind (20)
                // Player depth: 11-19
                const mapHeight = this.scene.map ? this.scene.map.heightInPixels : 3000;
                depth = 11 + (sprite.y / mapHeight) * 8;
                this.currentZoneType = 'behindWall';
            }
        } else {
            // Outside zones - player in front of everything
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

    /**
     * Get current zone type for debug display
     * @returns {string}
     */
    getCurrentZoneType() {
        return this.currentZoneType;
    }

    setDebugMode(enabled) {
        this.debugMode = disabled;
        if (enabled) {
            console.log('[DepthManager] Debug mode enabled');
            console.log('[DepthManager] Layer depths:');
            console.log('  - floor: -1000');
            console.log('  - wall_behind: 20');
            console.log('  - props_on_wall: 30');
            console.log('  - props_behind: 40');
            console.log('  - props_dynamic: 50');
            console.log('  - props: 60');
            console.log('  - props_dynamic_in_front: 70');
            console.log('  - PLAYER (behindWall zone): 11-19');
            console.log('  - PLAYER (behindDynamic zone): 41-49');
            console.log('  - PLAYER (outside zones): 100+');
            console.log('  - props_in_front: 10000+');
        }
    }
}
