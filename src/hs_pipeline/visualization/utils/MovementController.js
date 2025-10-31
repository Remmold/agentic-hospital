import { CharacterFactory } from './CharacterFactory.js';

/**
 * Handles character movement and animations
 */
export class MovementController {
    constructor(scene, sprite, speed = 150) {
        this.scene = scene;
        this.sprite = sprite;
        this.speed = speed;
    }

    /**
     * Handle player movement based on input
     * @param {Object} input - Movement input { x, y, direction }
     */
    handleMovement(input) {
        if (!this.sprite || !this.sprite.body) return;

        // Reset velocity
        this.sprite.setVelocity(0);

        const isMoving = input.x !== 0 || input.y !== 0;

        if (isMoving) {
            // Set velocity
            this.sprite.setVelocityX(input.x * this.speed);
            this.sprite.setVelocityY(input.y * this.speed);

            // Normalize diagonal movement
            if (this.sprite.body.velocity.x !== 0 && this.sprite.body.velocity.y !== 0) {
                this.sprite.body.velocity.normalize().scale(this.speed);
            }

            // Play walk animation
            if (input.direction) {
                CharacterFactory.playAnimation(this.sprite, 'walk', input.direction);
            }
        } else {
            // Play idle animation
            this.playIdleAnimation();
        }
    }

    /**
     * Play idle animation for last direction
     */
    playIdleAnimation() {
        const direction = this.sprite.lastDirection || 'down';
        CharacterFactory.playAnimation(this.sprite, 'idle', direction);
    }

    /**
     * Set movement speed
     * @param {number} speed - New speed value
     */
    setSpeed(speed) {
        this.speed = speed;
    }

    /**
     * Get current movement speed
     * @returns {number}
     */
    getSpeed() {
        return this.speed;
    }
}
