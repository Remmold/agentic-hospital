export class CharacterFactory {
    static characterCount = 0;

    /**
     * Create a character with unique animations
     * @param {Phaser.Scene} scene - The scene
     * @param {string} characterType - Type name (e.g., 'patient', 'doctor', 'nurse')
     * @param {string} spritesheet - Spritesheet key (e.g., 'patient_1', 'patient_2')
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.Physics.Arcade.Sprite} Configured character sprite
     */
    static createCharacter(scene, characterType, spritesheet, x, y) {
        // Generate unique ID for this character instance
        const uniqueId = `${characterType}_${this.characterCount++}`;
        
        // Create sprite
        const sprite = scene.physics.add.sprite(x, y, spritesheet, 0);
        sprite.setOrigin(0.5, 1);
        sprite.body.setSize(24, 24, false);
        sprite.body.setOffset(6, 40);
        sprite.lastDirection = 'down';
        
        // Store metadata
        sprite.characterType = characterType;
        sprite.uniqueId = uniqueId;
        sprite.spritesheetKey = spritesheet;
        
        // Create animations for this character
        this.createAnimations(scene, uniqueId, spritesheet);
        
        // Play initial idle animation
        sprite.play(`${uniqueId}_idle_down`);
        
        return sprite;
    }

    /**
     * Create all animations for a character instance
     */
    static createAnimations(scene, uniqueId, spritesheet) {
        // Idle animations
        const idleAnims = [
            { key: 'idle_right', start: 56, end: 61 },
            { key: 'idle_up', start: 62, end: 67 },
            { key: 'idle_left', start: 68, end: 73 },
            { key: 'idle_down', start: 74, end: 79 }
        ];

        idleAnims.forEach(anim => {
            scene.anims.create({
                key: `${uniqueId}_${anim.key}`,
                frames: scene.anims.generateFrameNumbers(spritesheet, {
                    start: anim.start,
                    end: anim.end
                }),
                frameRate: 6,
                repeat: -1
            });
        });

        // Walking animations
        const walkAnims = [
            { key: 'walk_right', start: 112, end: 117 },
            { key: 'walk_up', start: 118, end: 123 },
            { key: 'walk_left', start: 124, end: 129 },
            { key: 'walk_down', start: 130, end: 135 }
        ];

        walkAnims.forEach(anim => {
            scene.anims.create({
                key: `${uniqueId}_${anim.key}`,
                frames: scene.anims.generateFrameNumbers(spritesheet, {
                    start: anim.start,
                    end: anim.end
                }),
                frameRate: 10,
                repeat: -1
            });
        });

        // Sitting animations
        scene.anims.create({
            key: `${uniqueId}_sit_right`,
            frames: scene.anims.generateFrameNumbers(spritesheet, {
                start: 224,
                end: 229
            }),
            frameRate: 6,
            repeat: -1
        });

        scene.anims.create({
            key: `${uniqueId}_sit_left`,
            frames: scene.anims.generateFrameNumbers(spritesheet, {
                start: 230,
                end: 235
            }),
            frameRate: 6,
            repeat: -1
        });

        scene.anims.create({
            key: `${uniqueId}_sit_up`,
            frames: scene.anims.generateFrameNumbers(spritesheet, {
                start: 62,
                end: 67
            }),
            frameRate: 6,
            repeat: -1
        });

        scene.anims.create({
            key: `${uniqueId}_sit_down`,
            frames: scene.anims.generateFrameNumbers(spritesheet, {
                start: 74,
                end: 79
            }),
            frameRate: 6,
            repeat: -1
        });
    }

    /**
     * Helper to play animation on character
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The character sprite
     * @param {string} action - Action type (idle, walk, sit)
     * @param {string} direction - Direction (up, down, left, right)
     */
    static playAnimation(sprite, action, direction) {
        const animKey = `${sprite.uniqueId}_${action}_${direction}`;
        sprite.play(animKey, true);
        sprite.lastDirection = direction;
    }
}