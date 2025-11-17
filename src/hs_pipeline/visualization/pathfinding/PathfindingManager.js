/**
 * PathfindingManager
 * High-level manager for character pathfinding and movement
 * Coordinates between pathfinding algorithm, sprite movement, and animations
 * 
 * This is the main interface for moving characters in the game.
 * It handles:
 * - Finding paths using A*
 * - Moving sprites along paths using tweens
 * - Playing appropriate walk animations
 * - Tracking movement direction
 * - Supporting speed multipliers (for simulation playback)
 * 
 * @module pathfinding/PathfindingManager
 * @requires ./PathfindingGrid
 * @requires ./AStarPathfinder
 */

import { PathfindingGrid } from './PathfindingGrid.js';
import { AStarPathfinder } from './AStarPathfinder.js';
import { AnimationUtils } from '../animation/AnimationUtils.js';

export class PathfindingManager {
    constructor(scene, map, collisionLayer, collisionManager = null) {
        this.scene = scene;
        this.grid = new PathfindingGrid(map, collisionLayer, collisionManager);
        this.pathfinder = new AStarPathfinder(this.grid);
    }

    /**
     * Move a sprite to a target position using pathfinding
     * Automatically finds path, plays animations, and handles movement
     * 
     * This is the main method used for character movement!
     * 
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The sprite to move
     * @param {number} targetX - Target world X coordinate
     * @param {number} targetY - Target world Y coordinate
     * @param {number} [speed=150] - Movement speed in pixels per second
     * @param {Function} [onComplete=null] - Callback when movement finishes
     * @returns {boolean} True if path found and movement started, false if no path
     */
    moveToPoint(sprite, targetX, targetY, speed = 150, onComplete = null) {
        // Find path from sprite's current position to target
        const path = this.pathfinder.findPath(sprite.x, sprite.y, targetX, targetY);

        // Check if path was found
        if (path.length === 0) {
            console.warn('[PathfindingManager] No path found');
            return false;
        }

        // Stop any existing movement
        if (sprite.pathTween) {
            sprite.pathTween.stop();
        }

        // Track current waypoint in path
        let currentPoint = 0;

        /**
         * Move to next waypoint in path
         * Recursively calls itself until all waypoints reached
         * @private
         */
        const moveToNext = () => {
            // Check if we've reached the end of the path
            if (currentPoint >= path.length) {
                if (onComplete) onComplete();
                return;
            }

            // Get next waypoint
            const target = path[currentPoint];

            // Calculate movement duration based on distance and speed
            const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, target.x, target.y);
            const duration = (distance / speed) * 1000;  // Convert to milliseconds

            // Calculate direction to target using AnimationUtils
            const direction = AnimationUtils.getDirectionToPoint(
                sprite.x, sprite.y,
                target.x, target.y
            );

            // Update sprite's last known direction
            sprite.lastDirection = direction;

            // Play appropriate walk animation
            if (sprite.anims && sprite.uniqueId) {
                // Sprite has unique animations
                const animKey = `${sprite.uniqueId}_walk_${sprite.lastDirection}`;
                sprite.play(animKey, true);
            } else if (sprite.anims) {
                // Use generic patient animations
                sprite.play(`patient_walk_${sprite.lastDirection}`, true);
            }

            // Track that sprite is walking
            sprite.lastAction = 'walk';

            // Create tween to move sprite to waypoint
            sprite.pathTween = this.scene.tweens.add({
                targets: sprite,
                x: target.x,
                y: target.y,
                duration: duration,
                onComplete: () => {
                    // Move to next waypoint
                    currentPoint++;
                    moveToNext();
                }
            });

            // Apply speed multiplier (for simulation playback speed control)
            // Defaults to 1x if sprite doesn't have a simulation player
            const speedMultiplier = sprite.simulationPlayer?.speedMultiplier || 1;
            sprite.pathTween.timeScale = speedMultiplier;
        };

        // Start movement
        moveToNext();
        return true;
    }
}
