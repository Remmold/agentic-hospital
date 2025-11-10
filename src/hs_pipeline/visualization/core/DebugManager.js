/**
 * Manages all debug functionality - collision visuals and depth panel
 */
export class DebugManager {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.devMode = config.devMode || false;
        this.collisionOverlay = config.collisionOverlay || false;
        this.depthPanel = config.depthPanel || false;
        this.debugText = null;
    }

    /**
     * Initialize debug features based on config
     */
    initialize(managers) {
        this.managers = managers;

        if (this.devMode) {
            console.log("Cache-busting enabled")
        }

        if (this.collisionOverlay) {
            if (this.managers.collision) {
                this.managers.collision.setCollisionOverlay();
                console.log('[DebugManager] Collision overlay enabled');
            }
        }

        if (this.depthPanel) {
            this.createDepthPanel();
        }
    }

    /**
     * Create the depth debug panel
     */
    createDepthPanel() {
        this.debugText = this.scene.add.text(10, 10, '', {
            font: '14px monospace',
            fill: '#00ff00',
            backgroundColor: '#0000007c',
            padding: { x: 10, y: 10 }
        });
        this.debugText.setScrollFactor(0);
        this.debugText.setDepth(100000);
        console.log('[DebugManager] Depth panel enabled');
    }

    /**
     * Update depth panel with current player info
     */
    updateDepthPanel(player) {
        if (!this.depthPanel || !this.debugText || !player) return;

        const zone = this.managers.zone?.getZoneAt(player.x, player.y);

        this.debugText.setText([
            `Position: (${player.x.toFixed(0)}, ${player.y.toFixed(0)})`,
            `Depth: ${player.depth.toFixed(2)}`,
            `Zone Type: ${zone?.zoneType || 'none'}`,
            `Zone Name: ${zone?.name || 'none'}`,
            '',
            'Layer Depths:',
            'wall_behind: 20',
            'props_on_wall: 30',
            'props_behind: 40',
            'props_dynamic: 50',
            'props: 60',
            'props_dynamic_in_front: 70',
            'props_in_front: 10000'
        ]);
    }
}
