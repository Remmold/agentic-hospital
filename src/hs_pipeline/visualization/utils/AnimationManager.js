/* 
 * Manages character animations for the hospital simulation
 */
export class AnimationManager {
    constructor(scene) {
        this.scene = scene;
    }

    // Create all patient animations
    createPatientAnimations() {
        this.createIdleAnimations();
        this.createWalkingAnimations();
        this.createSittingAnimations();
    }

    // Idle animations for all directions
    createIdleAnimations() {
        const animations = [
            { key: 'patient_idle_right', start: 56, end: 61 },
            { key: 'patient_idle_up', start: 62, end: 67 },
            { key: 'patient_idle_left', start: 68, end: 73 },
            { key: 'patient_idle_down', start: 74, end: 79 }
        ];

        animations.forEach(anim => {
            this.scene.anims.create({
                key: anim.key,
                frames: this.scene.anims.generateFrameNumbers('patient', {
                    start: anim.start,
                    end: anim.end
                }),
                frameRate: 6,
                repeat: -1
            });
        });
    }

    // Walking animations for all directions
    createWalkingAnimations() {
        const animations = [
            { key: 'patient_walk_right', start: 112, end: 117 },
            { key: 'patient_walk_up', start: 118, end: 123 },
            { key: 'patient_walk_left', start: 124, end: 129 },
            { key: 'patient_walk_down', start: 130, end: 135 }
        ];

        animations.forEach(anim => {
            this.scene.anims.create({
                key: anim.key,
                frames: this.scene.anims.generateFrameNumbers('patient', {
                    start: anim.start,
                    end: anim.end
                }),
                frameRate: 10,
                repeat: -1
            });
        });
    }

    // Sitting animations
    createSittingAnimations() {
        // Sitting right
        this.scene.anims.create({
            key: 'patient_sit_right',
            frames: this.scene.anims.generateFrameNumbers('patient', {
                start: 224,
                end: 229
            }),
            frameRate: 6,
            repeat: -1
        });

        // Sitting left
        this.scene.anims.create({
            key: 'patient_sit_left',
            frames: this.scene.anims.generateFrameNumbers('patient', {
                start: 230,
                end: 235
            }),
            frameRate: 6,
            repeat: -1
        });

        // Sitting up - uses standing idle up
        this.scene.anims.create({
            key: 'patient_sit_up',
            frames: this.scene.anims.generateFrameNumbers('patient', {
                start: 62,
                end: 67
            }),
            frameRate: 6,
            repeat: -1
        });

        // Sitting down - uses standing idle down
        this.scene.anims.create({
            key: 'patient_sit_down',
            frames: this.scene.anims.generateFrameNumbers('patient', {
                start: 74,
                end: 79
            }),
            frameRate: 6,
            repeat: -1
        });
    }
}
