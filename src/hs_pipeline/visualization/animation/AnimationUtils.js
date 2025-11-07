/**
 * @fileoverview Shared animation utility functions
 * Provides helper methods to reduce animation code duplication
 * 
 * @module utils/AnimationUtils
 * @requires ./AnimationManager
 * @author Hospital Simulation Team
 */

import { AnimationManager } from './AnimationManager.js';

/**
 * AnimationUtils - Helper functions for common animation patterns
 */
export class AnimationUtils {
    /**
     * Play animation using sprite's last known direction
     * Useful for transitioning to idle after movement
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The character sprite
     * @param {string} action - Action type ('idle', 'walk', 'sit')
     * @returns {boolean} True if animation was played successfully
     * 
     * @example
     * // Instead of:
     * // if (sprite.lastDirection) {
     * //   AnimationManager.playAnimation(sprite, 'idle', sprite.lastDirection);
     * // }
     * 
     * // Use:
     * AnimationUtils.playLastAnimation(sprite, 'idle');
     */
    static playLastAnimation(sprite, action = 'idle') {
        if (!sprite || !sprite.lastDirection) {
            console.warn('[AnimationUtils] Sprite missing or no lastDirection set');
            return false;
        }

        AnimationManager.playAnimation(sprite, action, sprite.lastDirection);
        return true;
    }

    /**
     * Safely stop current animation and play a new one
     * Prevents animation flickering and ensures clean transitions
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The character sprite
     * @param {string} action - Action type ('idle', 'walk', 'sit')
     * @param {string} direction - Direction ('up', 'down', 'left', 'right')
     * 
     * @example
     * AnimationUtils.stopAndPlay(sprite, 'idle', 'down');
     */
    static stopAndPlay(sprite, action, direction) {
        if (!sprite) return;

        if (sprite.anims) {
            sprite.stop();
        }

        AnimationManager.playAnimation(sprite, action, direction);
    }

    /**
     * Check if sprite is currently playing a specific animation
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The character sprite
     * @param {string} action - Action type to check
     * @param {string} [direction] - Optional direction to check
     * @returns {boolean} True if sprite is playing the specified animation
     * 
     * @example
     * if (AnimationUtils.isPlaying(sprite, 'walk')) {
     *   console.log('Sprite is walking');
     * }
     */
    static isPlaying(sprite, action, direction = null) {
        if (!sprite || !sprite.anims || !sprite.anims.currentAnim) {
            return false;
        }

        const currentKey = sprite.anims.currentAnim.key;

        if (direction) {
            const expectedKey = `${sprite.uniqueId}_${action}_${direction}`;
            return currentKey === expectedKey;
        }

        // Check if any animation with this action is playing
        return currentKey.includes(`_${action}_`);
    }

    /**
     * Get the direction from two points (useful for facing logic)
     * 
     * @param {number} fromX - Starting X coordinate
     * @param {number} fromY - Starting Y coordinate
     * @param {number} toX - Target X coordinate
     * @param {number} toY - Target Y coordinate
     * @returns {string} Direction ('up', 'down', 'left', 'right')
     * 
     * @example
     * const direction = AnimationUtils.getDirectionToPoint(
     *   sprite.x, sprite.y,
     *   target.x, target.y
     * );
     * AnimationManager.playAnimation(sprite, 'walk', direction);
     */
    static getDirectionToPoint(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;

        // Determine primary direction based on larger delta
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }

    /**
     * Get opposite direction
     * Useful for turning characters around
     * 
     * @param {string} direction - Current direction
     * @returns {string} Opposite direction
     * 
     * @example
     * const oppositeDir = AnimationUtils.getOppositeDirection('up'); // Returns 'down'
     */
    static getOppositeDirection(direction) {
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        return opposites[direction] || direction;
    }

    /**
     * Play a random sitting animation (sit, sit_phone, or sit_book)
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The character sprite
     * @param {string} [chairDirection='down'] - Direction the chair faces
     * 
     * @example
     * AnimationUtils.playRandomSittingAnimation(sprite, 'down');
     */
    static playRandomSittingAnimation(sprite, chairDirection = 'down') {
        const action = AnimationManager.getRandomSittingAnimation(chairDirection);
        AnimationManager.playAnimation(sprite, action, chairDirection);
    }
}