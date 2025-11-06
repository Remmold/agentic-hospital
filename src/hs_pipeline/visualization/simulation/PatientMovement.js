/**
 * @fileoverview Patient movement and pathfinding management
 * Handles all patient movement between locations with animation coordination
 * 
 * @module simulation/PatientMovement
 * @requires ../utils/Constants
 * @requires ../utils/AnimationUtils
 * @requires ./PatientAnimations
 * @author Hospital Simulation Team
 */

import { getLocation } from '../utils/Constants.js';
import { AnimationUtils } from '../utils/AnimationUtils.js';
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
    /**
     * Creates a new PatientMovement manager
     * 
     * @param {Phaser.Scene} scene - The game scene
     * @param {PathfindingManager} pathfinding - Pathfinding system
     */
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
     * 
     * @example
     * movement.moveToLocation(
     *   patientSprite,
     *   'DOCTORS_OFFICE.PATIENT_CHAIR',
     *   'sit',
     *   'down',
     *   () => console.log('Arrived!')
     * );
     */
    moveToLocation(sprite, locationKey, arrivalAction, arrivalDirection, onComplete) {
        // Resolve location from key or object
        const location = getLocation(locationKey);

        if (!location) {
            console.error(`[PatientMovement] Location not found: ${locationKey}`);
            if (onComplete) onComplete();
            return;
        }

        console.log(`[PatientMovement] Moving patient to ${location.name}`);

        // Start pathfinding movement
        this.pathfinding.moveToPoint(
            sprite,
            location.x,
            location.y,
            150, // Movement speed
            () => {
                // On arrival: play arrival animation and trigger callback
                this.animations.stopAndPlay(sprite, arrivalAction, arrivalDirection);
                console.log(`[PatientMovement] Arrived at ${location.name}`);

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
     * 
     * @example
     * movement.moveToLocationAndWait(
     *   sprite,
     *   'LAB_DEFAULT',
     *   'idle',
     *   'up',
     *   3000,
     *   () => console.log('Wait complete!')
     * );
     */
    moveToLocationAndWait(sprite, locationKey, action, direction, waitMs, onComplete) {
        this.moveToLocation(sprite, locationKey, action, direction, () => {
            // After arrival, wait for specified duration
            this.scene.time.delayedCall(waitMs, () => {
                console.log(`[PatientMovement] Wait complete at ${locationKey}`);
                if (onComplete) onComplete();
            });
        });
    }

    /**
     * Calculate direction from one point to another
     * Useful for determining which way a patient should face
     * 
     * @param {number} fromX - Starting X coordinate
     * @param {number} fromY - Starting Y coordinate
     * @param {number} toX - Target X coordinate
     * @param {number} toY - Target Y coordinate
     * @returns {string} Direction ('up', 'down', 'left', 'right')
     * 
     * @example
     * const direction = movement.getDirectionToPoint(
     *   sprite.x, sprite.y,
     *   targetX, targetY
     * );
     * // Returns: 'right'
     */
    getDirectionToPoint(fromX, fromY, toX, toY) {
        return AnimationUtils.getDirectionToPoint(fromX, fromY, toX, toY);
    }

    /**
     * Stop any active movement on a sprite
     * Cancels pathfinding tween and sets velocity to zero
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     * 
     * @example
     * movement.stopMovement(patientSprite);
     */
    stopMovement(sprite) {
        if (!sprite) return;

        // Stop pathfinding tween if active
        if (sprite.pathTween && sprite.pathTween.isPlaying()) {
            sprite.pathTween.stop();
            console.log('[PatientMovement] Movement stopped');
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
     * 
     * @example
     * movement.pauseMovement(patientSprite);
     */
    pauseMovement(sprite) {
        if (!sprite) return;

        if (sprite.pathTween && sprite.pathTween.isPlaying()) {
            sprite.pathTween.pause();
            console.log('[PatientMovement] Movement paused');
        }
    }

    /**
     * Resume paused movement
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     * 
     * @example
     * movement.resumeMovement(patientSprite);
     */
    resumeMovement(sprite) {
        if (!sprite) return;

        if (sprite.pathTween && sprite.pathTween.isPaused()) {
            sprite.pathTween.resume();

            // Resume walk animation if sprite has a direction
            if (sprite.lastDirection) {
                this.animations.playWalkAnimation(sprite, sprite.lastDirection);
            }

            console.log('[PatientMovement] Movement resumed');
        }
    }

    /**
     * Check if sprite is currently moving
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     * @returns {boolean} True if sprite is moving
     * 
     * @example
     * if (movement.isMoving(sprite)) {
     *   console.log('Patient is walking');
     * }
     */
    isMoving(sprite) {
        if (!sprite) return false;
        return sprite.pathTween && sprite.pathTween.isPlaying();
    }
}