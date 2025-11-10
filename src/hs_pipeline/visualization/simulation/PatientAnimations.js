import { AnimationManager } from '../animation/AnimationManager.js';
import { AnimationUtils } from '../animation/AnimationUtils.js';

/**
 * PatientAnimations - Manages all patient animation behaviors
 * 
 * Responsibilities:
 * - Phone animation cycles (pickup, hold, putdown)
 * - Sitting animation selection
 * - Animation timing and state
 */
export class PatientAnimations {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Play a phone animation on a sprite
     * Handles the pickup sequence and automatic transition to holding loop
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     */
    playPhoneAnimation(sprite) {
        if (!sprite) {
            console.warn('[PatientAnimations] Cannot play phone animation - sprite is null');
            return;
        }

        AnimationManager.playPhoneAnimation(sprite, this.scene);
    }

    /**
     * Stop a phone animation on a sprite
     * Plays the putdown sequence and returns to sitting idle
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     */
    stopPhoneAnimation(sprite) {
        if (!sprite) {
            console.warn('[PatientAnimations] Cannot stop phone animation - sprite is null');
            return;
        }

        AnimationManager.stopPhoneAnimation(sprite, this.scene);
        console.log('[PatientAnimations] Phone animation stopped'); // Leave until fixed
    }

    /**
     * Get a random sitting animation for a patient
     * Returns 'sit', 'sit_phone', or 'sit_book' based on chair direction
     * 
     * @param {string} [chairDirection='down'] - Direction the chair faces
     * @returns {string} Animation action name
     */
    getRandomSittingAnimation(chairDirection = 'down') {
        return AnimationManager.getRandomSittingAnimation(chairDirection);
    }

    /**
     * Play a walking animation in the appropriate direction
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     * @param {string} direction - Direction to walk ('up', 'down', 'left', 'right')
     */
    playWalkAnimation(sprite, direction) {
        if (!sprite || !direction) {
            console.warn('[PatientAnimations] Cannot play walk animation - invalid parameters');
            return;
        }

        AnimationManager.playAnimation(sprite, 'walk', direction);
    }

    /**
     * Play an idle animation in the sprite's last direction
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     */
    playIdleAnimation(sprite) {
        if (!sprite) {
            console.warn('[PatientAnimations] Cannot play idle animation - sprite is null');
            return;
        }

        AnimationUtils.playLastAnimation(sprite, 'idle');
    }

    /**
     * Stop current animation and play a new one
     * Useful for clean animation transitions
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The patient sprite
     * @param {string} action - Action type ('idle', 'walk', 'sit')
     * @param {string} direction - Direction ('up', 'down', 'left', 'right')
     */
    stopAndPlay(sprite, action, direction) {
        if (!sprite || !action || !direction) {
            console.warn('[PatientAnimations] Cannot stop and play - invalid parameters');
            return;
        }

        AnimationUtils.stopAndPlay(sprite, action, direction);
    }
}
