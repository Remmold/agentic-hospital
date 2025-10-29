/*
 * Handles character movement and animations
 */
export class MovementController {
    constructor(scene, sprite, speed = 150) {
        this.scene = scene;
        this.sprite = sprite;
        this.speed = speed;
        this.lastDirection = 'down';
    }

    /* Handle player movement based on input
     * @param {Object} input - Movement input { x, y, direction }
     */
    handleMovement(input) {
        // Reset velocity
        this.sprite.setVelocity(0);

        const isMoving = input.x !== 0 || input.y !== 0;

        if (isMoving) {
            // Set velocity
            this.sprite.setVelocityX(input.x * this.speed);
            this.sprite.setVelocityY(input.y * this.speed);

            // Normalize diagonal movement
            if (this.sprite.body.velocity.x !== 0 && this.sprite.body.velocity.y !== 0) {
                this.sprite.body.velocity.normalize().scale(this.speed);
            }

            // Play walk animation
            if (input.direction) {
                this.lastDirection = input.direction;
                const targetAnim = `patient_walk_${input.direction}`;
                const currentAnim = this.sprite.anims.currentAnim;

                if (!currentAnim || currentAnim.key !== targetAnim) {
                    this.sprite.play(targetAnim);
                }
            }
        } else {
            // Play idle animation
            this.playIdleAnimation();
        }
    }

    // Play idle animation for last direction
    playIdleAnimation() {
        const currentAnim = this.sprite.anims.currentAnim;
        const idleAnim = `patient_idle_${this.lastDirection}`;

        if (!currentAnim || currentAnim.key !== idleAnim) {
            this.sprite.play(idleAnim);
        }
    }

    /* Set movement speed
     * @param {number} speed - New speed value
     */
    setSpeed(speed) {
        this.speed = speed;
    }

    /* Get current movement speed
     * @returns {number}
     */
    getSpeed() {
        return this.speed;
    }
}
