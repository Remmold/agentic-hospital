import { getLocation } from '../core/Constants.js';
import { AnimationUtils } from '../animation/AnimationUtils.js';
import { PatientAnimations } from './PatientAnimations.js';

/**
 * PatientMovement - Manages patient movement between locations
 * 
 * Responsibilities:
 * - Pathfinding integration
 * - Movement to locations
 * - Animation during movement
 * - Arrival callbacks
 */
export class PatientMovement {
    constructor(scene, pathfinding) {
        this.scene = scene;
        this.pathfinding = pathfinding;
        this.animations = new PatientAnimations(scene);
    }

    /**
     * Move patient sprite to a location
     * Handles pathfinding, animations, and arrival callback
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     * @param {string|Object} locationKey - Location key (e.g., 'RECEPTION.LEFT') or location object
     * @param {string} arrivalAction - Animation action on arrival ('idle', 'sit')
     * @param {string} arrivalDirection - Direction to face on arrival
     * @param {Function} [onComplete] - Optional callback when movement completes
     */
    moveToLocation(sprite, locationKey, arrivalAction, arrivalDirection, onComplete) {
        const location = getLocation(locationKey);

        if (!location) {
            console.error(`[PatientMovement] Location not found: ${locationKey}`);
            if (onComplete) onComplete();
            return;
        }

        const baseSpeed = 150;

        this.pathfinding.moveToPoint(
            sprite,
            location.x,
            location.y,
            baseSpeed, // Use base speed only - timeScale handles the multiplier
            () => {
                this.animations.stopAndPlay(sprite, arrivalAction, arrivalDirection);
                if (onComplete) {
                    onComplete();
                }
            }
        );
    }

    /**
     * Move to a location and wait for a specified duration
     * Convenience method that combines movement with a timed wait
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     * @param {string|Object} locationKey - Location key or object
     * @param {string} action - Animation action during wait
     * @param {string} direction - Direction to face during wait
     * @param {number} waitMs - Time to wait at location (milliseconds)
     * @param {Function} [onComplete] - Optional callback after wait completes
     */
    moveToLocationAndWait(sprite, locationKey, action, direction, waitMs, onComplete) {
        this.moveToLocation(sprite, locationKey, action, direction, () => {
            // After arrival, wait for specified duration
            this.scene.time.delayedCall(waitMs, () => {
                if (onComplete) onComplete();
            });
        });
    }

    /**
     * Calculate direction from one point to another
     * Useful for determining which way a patient should face
     */
    getDirectionToPoint(fromX, fromY, toX, toY) {
        return AnimationUtils.getDirectionToPoint(fromX, fromY, toX, toY);
    }

    /**
     * Stop any active movement on a sprite
     * Cancels pathfinding tween and sets velocity to zero
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     */
    stopMovement(sprite) {
        if (!sprite) return;

        // Stop pathfinding tween if active
        if (sprite.pathTween && sprite.pathTween.isPlaying()) {
            sprite.pathTween.stop();
        }

        // Stop physics velocity
        if (sprite.body) {
            sprite.body.setVelocity(0, 0);
        }
    }

    /**
     * Pause movement (keeps tween but pauses it)
     * Useful for pause/resume functionality
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     */
    pauseMovement(sprite) {
        if (!sprite) return;

        if (sprite.pathTween && sprite.pathTween.isPlaying()) {
            sprite.pathTween.pause();
        }
    }

    /**
     * Resume paused movement
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     */
    resumeMovement(sprite) {
        if (!sprite) return;

        if (sprite.pathTween && sprite.pathTween.isPaused()) {
            sprite.pathTween.resume();

            // Resume walk animation if sprite has a direction
            if (sprite.lastDirection) {
                this.animations.playWalkAnimation(sprite, sprite.lastDirection);
            }
        }
    }

    /**
     * Check if sprite is currently moving
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     * @returns {boolean} True if sprite is moving
     */
    isMoving(sprite) {
        if (!sprite) return false;
        return sprite.pathTween && sprite.pathTween.isPlaying();
    }
}
