import { LOCATIONS, AGENT_LOCATIONS, LAB_TEST_LOCATIONS, getLocation } from './Constants.js';
import { CharacterFactory } from './CharacterFactory.js';

export class SimulationPlayer {
    constructor(scene, pathfindingManager, depthManager) {
        this.scene = scene;
        this.pathfinding = pathfindingManager;
        this.depthManager = depthManager;
        this.isPlaying = false;
        this.currentStep = 0;
        this.simulationData = null;
        this.npc = null;
        this.onCompleteCallback = null;
        this.spritesheet = 'patient_1';
    }

    onComplete(callback) {
        this.onCompleteCallback = callback;
    }

    playSimulation(jsonData, waitTimeMs = 2000, spritesheet = 'patient_1') {
        if (this.isPlaying) {
            console.warn('Simulation already playing');
            return;
        }

        this.simulationData = jsonData;
        this.spritesheet = spritesheet;
        this.currentStep = 0;
        this.isPlaying = true;
        this.waitTimeMs = waitTimeMs;
        console.log(`Starting simulation: ${jsonData.patient.name}`);
        console.log(`Total steps: ${jsonData.timeline.length}`);
        this.spawnPatient();

        this.moveToLocation('RECEPTION', 'idle', 'up', () => {
            console.log('Arrived at reception, starting timeline...');
            this.scene.time.delayedCall(this.waitTimeMs, () => {
                this.playNextStep();
            });
        });
    }

    spawnPatient() {
        const entrance = LOCATIONS.ENTRANCE;
        this.npc = CharacterFactory.createCharacter(
            this.scene,
            'patient',
            this.spritesheet,
            entrance.x,
            entrance.y
        );

        this.scene.physics.add.collider(this.npc, this.scene.layers.collision);
        const collisionGroup = this.scene.collisionManager?.getCollisionGroup();
        if (collisionGroup) {
            this.scene.physics.add.collider(this.npc, collisionGroup);
        }

        console.log(`Patient spawned: ${this.simulationData.patient.name} (${this.spritesheet})`);
    }

    playNextStep() {
        if (!this.isPlaying || this.currentStep >= this.simulationData.timeline.length) {
            this.returnToEntrance();
            return;
        }

        const step = this.simulationData.timeline[this.currentStep];
        const agent = step.agent;

        let locationKey = AGENT_LOCATIONS[agent];
        let animation = 'idle';
        let direction = 'down';

        if (agent === 'Lab') {
            const labLocation = this.getLabLocation(step);
            locationKey = labLocation.location;
            animation = labLocation.animation;
            direction = labLocation.direction;
        } else if (agent === 'Doctor') {
            animation = 'sit';
            direction = 'up';
        } else if (agent === 'Nurse') {
            animation = 'sit';
            direction = 'down';
        }

        console.log(`Step ${this.currentStep + 1}: ${agent} at ${locationKey}`);
        this.moveToLocation(locationKey, animation, direction, () => {
            this.scene.time.delayedCall(this.waitTimeMs, () => {
                this.currentStep++;
                this.playNextStep();
            });
        });
    }

    getLabLocation(step) {
        let testDescription = '';

        if (step.decision?.ordered_test) {
            testDescription = step.decision.ordered_test.toLowerCase();
        } else if (step.decision?.tests_ran) {
            testDescription = step.decision.tests_ran.toLowerCase();
        } else if (this.currentStep > 0) {
            const previousStep = this.simulationData.timeline[this.currentStep - 1];
            if (previousStep.decision?.ordered_test) {
                testDescription = previousStep.decision.ordered_test.toLowerCase();
            }
        }

        console.log(`Lab test from ordered_test: ${testDescription}`);

        if (testDescription.includes('mri')) {
            return { location: 'LAB_MRI', animation: 'idle', direction: 'up' };
        }
        if (testDescription.includes('xray') || testDescription.includes('x-ray')) {
            return { location: 'LAB_XRAY', animation: 'idle', direction: 'down' };
        }
        if (testDescription.includes('ct')) {
            return { location: 'LAB_CT', animation: 'idle', direction: 'up' };
        }
        if (testDescription.includes('blood')) {
            return { location: 'LAB_BLOOD', animation: 'sit', direction: 'left' };
        }

        return { location: 'LAB_DEFAULT', animation: 'sit', direction: 'left' };
    }

    returnToEntrance() {
        console.log('Timeline complete, returning to entrance...');
        this.moveToLocation('ENTRANCE', 'idle', 'down', () => {
            this.scene.time.delayedCall(1000, () => {
                this.finishSimulation();
            });
        });
    }

    moveToLocation(locationKey, action, direction, onComplete) {
        const location = getLocation(locationKey);
        if (!location) {
            console.error(`Location not found: ${locationKey}`);
            if (onComplete) onComplete();
            return;
        }

        console.log(`Moving to ${location.name}`);
        this.pathfinding.moveToPoint(
            this.npc,
            location.x,
            location.y,
            150,
            () => {
                CharacterFactory.playAnimation(this.npc, action, direction);
                if (onComplete) onComplete();
            }
        );
    }

    stopSimulation() {
        this.isPlaying = false;
        if (this.npc) {
            this.npc.destroy();
            this.npc = null;
        }
        console.log('Simulation stopped');
    }

    finishSimulation() {
        this.isPlaying = false;
        console.log(`Simulation complete: ${this.simulationData.patient.name}`);
        if (this.npc) {
            if (this.npc.pathTween) {
                this.npc.pathTween.stop();
            }
            if (this.npc.body) {
                this.npc.body.setVelocity(0, 0);
            }
            this.npc.destroy();
            this.npc = null;
        }

        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    update() {
        if (this.npc && this.depthManager) {
            this.depthManager.updateSpriteDepth(this.npc);
        }
    }
}
