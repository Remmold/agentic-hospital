/**
 * Animation frame configuration for all character types
 * All spritesheets follow the same layout
 */
export class AnimationManager {
    static ANIMATION_CONFIG = {
        idle: {
            right: { start: 56, end: 61, frameRate: 6 },
            up: { start: 62, end: 67, frameRate: 6 },
            left: { start: 68, end: 73, frameRate: 6 },
            down: { start: 74, end: 79, frameRate: 6 }
        },
        walk: {
            right: { start: 112, end: 117, frameRate: 10 },
            up: { start: 118, end: 123, frameRate: 10 },
            left: { start: 124, end: 129, frameRate: 10 },
            down: { start: 130, end: 135, frameRate: 10 }
        },
        sit: {
            right: { start: 224, end: 229, frameRate: 6 },
            left: { start: 230, end: 235, frameRate: 6 },
            up: { start: 62, end: 67, frameRate: 6 },  // Use idle up
            down: { start: 74, end: 79, frameRate: 6 }  // Use idle down
        }
    };

    /**
     * Create animations for a specific character instance
     * @param {Phaser.Scene} scene - The scene
     * @param {string} uniqueId - Unique identifier for this character
     * @param {string} spritesheet - Spritesheet key
     */
    static createAnimations(scene, uniqueId, spritesheet) {
        // Create all animation types
        Object.keys(this.ANIMATION_CONFIG).forEach(action => {
            const actionAnims = this.ANIMATION_CONFIG[action];

            Object.keys(actionAnims).forEach(direction => {
                const config = actionAnims[direction];
                const animKey = `${uniqueId}_${action}_${direction}`;

                // Skip if animation already exists
                if (scene.anims.exists(animKey)) return;

                scene.anims.create({
                    key: animKey,
                    frames: scene.anims.generateFrameNumbers(spritesheet, {
                        start: config.start,
                        end: config.end
                    }),
                    frameRate: config.frameRate,
                    repeat: -1
                });
            });
        });
    }

    /**
     * Play animation on a character sprite
     * @param {Phaser.Physics.Arcade.Sprite} sprite - Character sprite
     * @param {string} action - Action type (idle, walk, sit)
     * @param {string} direction - Direction (up, down, left, right)
     */
    static playAnimation(sprite, action, direction) {
        if (!sprite || !sprite.uniqueId) {
            console.warn('Sprite missing uniqueId');
            return;
        }

        const animKey = `${sprite.uniqueId}_${action}_${direction}`;

        if (sprite.anims && sprite.anims.currentAnim?.key !== animKey) {
            sprite.play(animKey, true);
        }

        sprite.lastDirection = direction;
        sprite.lastAction = action;
    }
}
