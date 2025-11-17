/**
 * GlowManager
 * Manages the glowing circle indicator that shows which patient's timeline is being viewed
 */
export class GlowManager {
    constructor(scene) {
        this.scene = scene;
        this.glowGraphics = null;
        this.glowTween = null;
        this.targetSprite = null;
        
        this.createGlow();
    }

    createGlow() {
        // Create a glowing circle
        this.glowGraphics = this.scene.add.graphics();
        this.glowGraphics.setDepth(10); 
        
        // Draw multiple layers for glow effect
        // Outer glow (largest, most transparent)
        this.glowGraphics.fillStyle(0x00ff88, 0.08);
        this.glowGraphics.fillCircle(0, 0, 40);
        
        // Middle glow (more faint)
        this.glowGraphics.fillStyle(0x00ff88, 0.12);
        this.glowGraphics.fillCircle(0, 0, 32);
        
        // Inner bright circle (more faint)
        this.glowGraphics.fillStyle(0x00ff88, 0.15);
        this.glowGraphics.fillCircle(0, 0, 24);
        
        // Bright ring
        this.glowGraphics.lineStyle(3, 0x00ff88, 0.8);
        this.glowGraphics.strokeCircle(0, 0, 28);
        
        // Outer ring
        this.glowGraphics.lineStyle(2, 0x00ff88, 0.5);
        this.glowGraphics.strokeCircle(0, 0, 36);
        
        // Start invisible
        this.glowGraphics.setVisible(false);
    }

    startPulsing() {
        // Stop any existing tween
        if (this.glowTween) {
            this.glowTween.stop();
        }
        
        // Add pulsing animation
        this.glowTween = this.scene.tweens.add({
            targets: this.glowGraphics,
            alpha: { from: 1, to: 0.5 },
            scaleX: { from: 1, to: 1.15 },
            scaleY: { from: 1, to: 1.15 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    stopPulsing() {
        if (this.glowTween) {
            this.glowTween.stop();
            this.glowTween = null;
        }
    }

    /**
     * Attach glow to a sprite
     * @param {Phaser.GameObjects.Sprite} sprite - The sprite to attach to
     */
    attachToSprite(sprite) {
        if (!sprite) {
            this.hide();
            return;
        }

        this.targetSprite = sprite;
        this.glowGraphics.setVisible(true);
        this.startPulsing();
        this.updatePosition();
    }

    /**
     * Update glow position to follow target sprite
     */
    updatePosition() {
        if (this.targetSprite && this.glowGraphics.visible) {
            // Position higher to center around sprite body (sprites have origin at feet)
            this.glowGraphics.setPosition(
                this.targetSprite.x,
                this.targetSprite.y - 17
            );
        }
    }

    /**
     * Hide the glow
     */
    hide() {
        this.glowGraphics.setVisible(false);
        this.stopPulsing();
        this.targetSprite = null;
    }

    /**
     * Destroy the glow
     */
    destroy() {
        this.stopPulsing();
        if (this.glowGraphics) {
            this.glowGraphics.destroy();
            this.glowGraphics = null;
        }
        this.targetSprite = null;
    }
}