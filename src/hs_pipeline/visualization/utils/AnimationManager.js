import { PHONE_ANIMATION } from './Constants.js';

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
        },
        sit_phone: {
            down: { start: 336, end: 347, frameRate: 6 }
        },
        sit_book: {
            down: { start: 392, end: 403, frameRate: 6 }
        },
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

    static createWoodenDoorAnims(scene) {
        if (scene.anims.exists('wooden_door_open')) return;

        scene.anims.create({
            key: 'wooden_door_open',
            frames: scene.anims.generateFrameNumbers('wooden_door', { start: 0, end: 4 }),
            frameRate: 8,
            repeat: 0,
        });

        scene.anims.create({
            key: 'wooden_door_close',
            frames: scene.anims.generateFrameNumbers('wooden_door', { frames: [4, 3, 2, 1, 0] }),
            frameRate: 8,
            repeat: 0,
        });
    }

    static createSurgeryDoorAnims(scene) {
        if (scene.anims.exists('surgery_door_open')) return;

        scene.anims.create({
            key: 'surgery_door_open',
            frames: scene.anims.generateFrameNumbers('surgery_door', { start: 0, end: 5 }),
            frameRate: 8,
            repeat: 0,
        });

        scene.anims.create({
            key: 'surgery_door_close',
            frames: scene.anims.generateFrameNumbers('surgery_door', { frames: [5, 4, 3, 2, 1, 0] }),
            frameRate: 8,
            repeat: 0,
        });
    }

    /**
     * Play phone animation sequence (pickup, hold loop, putdown on demand)
     */
    static playPhoneAnimation(sprite, sceneInstance) {
        if (!sprite || !sceneInstance) {
            console.warn('playPhoneAnimation: sprite or sceneInstance missing');
            return;
        }

        // Get the sprite's current texture key
        const textureKey = sprite.texture.key;

        // Create animations specific to THIS sprite's texture (if not already created)
        if (!sceneInstance.anims.exists(`${textureKey}_phone_pickup`)) {
            sceneInstance.anims.create({
                key: `${textureKey}_phone_pickup`,
                frames: scene.anims.generateFrameNumbers(textureKey, {
                    start: 336,
                    end: 338
                }),
                frameRate: 6,
                repeat: 0
            });
        }

        if (!sceneInstance.anims.exists(`${textureKey}_phone_holding`)) {
            sceneInstance.anims.create({
                key: `${textureKey}_phone_holding`,
                frames: sceneInstance.anims.generateFrameNumbers(textureKey, {
                    start: 339,
                    end: 344
                }),
                frameRate: 6,
                repeat: -1
            });
        }

        if (!sceneInstance.anims.exists(`${textureKey}_phone_putdown`)) {
            sceneInstance.anims.create({
                key: `${textureKey}_phone_putdown`,
                frames: sceneInstance.anims.generateFrameNumbers(textureKey, {
                    start: 345,
                    end: 347
                }),
                frameRate: 6,
                repeat: 0
            });
        }

        // Stop any running animations
        sprite.stop();

        // Play pickup animation, then automatically start holding loop
        sprite.play(`${textureKey}_phone_pickup`);
        sprite.once('animationcomplete', () => {
            sprite.play(`${textureKey}_phone_holding`);
        });
    }

    /**
     * Stop phone animation and play putdown sequence
     */
    static stopPhoneAnimation(sprite, sceneInstance) {
        if (!sprite || !sceneInstance) return;

        const textureKey = sprite.texture.key;

        // Ensure animation exists for this texture
        if (!sceneInstance.anims.exists(`${textureKey}_phone_putdown`)) {
            sceneInstance.anims.create({
                key: `${textureKey}_phone_putdown`,
                frames: sceneInstance.anims.generateFrameNumbers(textureKey, {
                    start: 345,
                    end: 347
                }),
                frameRate: 6,
                repeat: 0
            });
        }

        // Stop current animation and play putdown
        sprite.stop();
        sprite.play(`${textureKey}_phone_putdown`);

        // After putdown completes, return to sitting idle
        sprite.once('animationcomplete', () => {
            sprite.setFrame(339); // Sit still
        });
    }

    /**
     * Get random sitting animation type
     */
    static getRandomSittingAnimation(chairDirection = null) {
        if (chairDirection === 'down') {
            const sittingAnimations = ['sit', 'sit_phone', 'sit_book'];
            return sittingAnimations[Math.floor(Math.random() * sittingAnimations.length)];
        }
        return 'sit';
    }
}
