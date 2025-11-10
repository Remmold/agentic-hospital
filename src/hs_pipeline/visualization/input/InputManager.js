/**
 * InputManager
 * Manages keyboard input for player movement
 */
export class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.setupInput();
    }

    // Set up keyboard controls (Arrow keys + WASD)
    setupInput() {
        // Arrow keys
        this.cursors = this.scene.input.keyboard.createCursorKeys();

        // WASD keys
        this.keys = {
            w: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            a: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            s: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            d: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
    }

    // Check if moving left
    isMovingLeft() {
        return this.cursors.left.isDown || this.keys.a.isDown;
    }

    // Check if moving right
    isMovingRight() {
        return this.cursors.right.isDown || this.keys.d.isDown;
    }

    // Check if moving up
    isMovingUp() {
        return this.cursors.up.isDown || this.keys.w.isDown;
    }

    // Check if moving down
    isMovingDown() {
        return this.cursors.down.isDown || this.keys.s.isDown;
    }

    /* Get current movement direction
     * @returns {Object} { x: number, y: number, direction: string|null }
     */
    getMovementInput() {
        let velocityX = 0;
        let velocityY = 0;
        let direction = null;

        if (this.isMovingLeft()) {
            velocityX = -1;
            direction = 'left';
        } else if (this.isMovingRight()) {
            velocityX = 1;
            direction = 'right';
        }

        if (this.isMovingUp()) {
            velocityY = -1;
            direction = 'up';
        } else if (this.isMovingDown()) {
            velocityY = 1;
            direction = 'down';
        }

        return { x: velocityX, y: velocityY, direction };
    }
}
