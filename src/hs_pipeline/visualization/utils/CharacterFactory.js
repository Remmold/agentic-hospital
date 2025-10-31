import { AnimationManager } from './AnimationManager.js';

export class CharacterFactory {
    static characterCount = 0;

    /**
     * Create a character with unique animations
     * @param {Phaser.Scene} scene - The scene
     * @param {string} characterType - Type name (e.g., 'patient', 'doctor', 'nurse')
     * @param {string} spritesheet - Spritesheet key (e.g., 'patient_1', 'nurse_1')
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Optional configuration
     * @returns {Phaser.Physics.Arcade.Sprite} Configured character sprite
     */
    static createCharacter(scene, characterType, spritesheet, x, y, options = {}) {
        // Generate unique ID for this character instance
        const uniqueId = `${characterType}_${this.characterCount++}`;

        // Create sprite
        const sprite = scene.physics.add.sprite(x, y, spritesheet, 0);
        sprite.setOrigin(0.5, 1);
        
        // Physics body configuration
        const bodyWidth = options.bodyWidth || 24;
        const bodyHeight = options.bodyHeight || 24;
        const offsetX = options.offsetX || 6;
        const offsetY = options.offsetY || 40;
        
        sprite.body.setSize(bodyWidth, bodyHeight, false);
        sprite.body.setOffset(offsetX, offsetY);

        // Store metadata
        sprite.characterType = characterType;
        sprite.uniqueId = uniqueId;
        sprite.spritesheetKey = spritesheet;
        sprite.lastDirection = options.initialDirection || 'down';
        sprite.lastAction = 'idle';

        // Create animations for this character
        AnimationManager.createAnimations(scene, uniqueId, spritesheet);

        // Play initial idle animation
        AnimationManager.playAnimation(sprite, 'idle', sprite.lastDirection);

        return sprite;
    }

    /**
     * Helper to play animation on character (delegates to AnimationManager)
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The character sprite
     * @param {string} action - Action type (idle, walk, sit)
     * @param {string} direction - Direction (up, down, left, right)
     */
    static playAnimation(sprite, action, direction) {
        AnimationManager.playAnimation(sprite, action, direction);
    }
}
