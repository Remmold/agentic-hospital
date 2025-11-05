import { PathfindingGrid } from './PathfindingGrid.js';
import { AStarPathfinder } from './AStarPathfinder.js';

export class PathfindingManager {
    constructor(scene, map, collisionLayer, collisionManager = null) {
        this.scene = scene;
        this.grid = new PathfindingGrid(map, collisionLayer, collisionManager);
        this.pathfinder = new AStarPathfinder(this.grid);
    }

    moveToPoint(sprite, targetX, targetY, speed = 150, onComplete = null) {
        const path = this.pathfinder.findPath(sprite.x, sprite.y, targetX, targetY);

        if (path.length === 0) {
            console.warn('No path found!');
            return false;
        }

        // Stop current movement
        if (sprite.pathTween) {
            sprite.pathTween.stop();
        }

        let currentPoint = 0;

        const moveToNext = () => {
            if (currentPoint >= path.length) {
                if (onComplete) onComplete();
                return;
            }

            const target = path[currentPoint];
            const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, target.x, target.y);
            const duration = (distance / speed) * 1000;

            // Calculate direction BEFORE tween starts
            const dx = target.x - sprite.x;
            const dy = target.y - sprite.y;
            
            // Determine direction based on larger movement axis
            if (Math.abs(dx) > Math.abs(dy)) {
                sprite.lastDirection = dx > 0 ? 'right' : 'left';
            } else {
                sprite.lastDirection = dy > 0 ? 'down' : 'up';
            }

            // Play animation with unique key
            if (sprite.anims && sprite.uniqueId) {
                const animKey = `${sprite.uniqueId}_walk_${sprite.lastDirection}`;
                sprite.play(animKey, true);
            } else if (sprite.anims) {
                // Fallback for old system
                sprite.play(`patient_walk_${sprite.lastDirection}`, true);
            }
            
            // Mark that sprite is currently walking
            sprite.lastAction = 'walk';

            sprite.pathTween = this.scene.tweens.add({
                targets: sprite,
                x: target.x,
                y: target.y,
                duration: duration,
                onComplete: () => {
                    currentPoint++;
                    moveToNext();
                }
            });
        };

        moveToNext();
        return true;
    }
}