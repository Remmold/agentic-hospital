import { LOCATIONS, AGENT_LOCATIONS, LAB_TEST_LOCATIONS } from './Constants.js';
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
    }

    playSimulation(jsonData, waitTimeMs = 2000) {
        if (this.isPlaying) {
            console.warn('Simulation already playing');
            return;
        }

        this.simulationData = jsonData;
        this.currentStep = 0;
        this.isPlaying = true;
        this.waitTimeMs = waitTimeMs;

        console.log(`Starting simulation: ${jsonData.patient.name}`);
        console.log(`Total steps: ${jsonData.timeline.length}`);

        this.spawnPatient();

        // Walk to reception
        this.moveToLocation('RECEPTION', 'idle', 'up', () => {
            console.log('Arrived at reception, starting timeline...');
            this.scene.time.delayedCall(this.waitTimeMs, () => {
                this.playNextStep();
            });
        });
    }

    spawnPatient() {
        const entrance = LOCATIONS.ENTRANCE;
        
        // USE FACTORY TO CREATE CHARACTER
        this.npc = CharacterFactory.createCharacter(
            this.scene,
            'patient',
            'patient', // Can change to 'patient_1', 'patient_2', etc.
            entrance.x,
            entrance.y
        );
        
        this.scene.physics.add.collider(this.npc, this.scene.layers.collision);
        
        console.log(`Patient spawned: ${this.simulationData.patient.name}`);
    }

    playNextStep() {
        if (!this.isPlaying || this.currentStep >= this.simulationData.timeline.length) {
            this.returnToEntrance();
            return;
        }

        const step = this.simulationData.timeline[this.currentStep];
        const agent = step.agent;
        
        // Determine location and animation based on agent and step data
        let locationKey = AGENT_LOCATIONS[agent];
        let animation = 'idle';
        let direction = 'down';

        // Special handling for Lab - check test type
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

    // Determine which lab location based on test type
    getLabLocation(step) {
        let testDescription = '';
        
        // First check current step's ordered_test
        if (step.decision?.ordered_test) {
            testDescription = step.decision.ordered_test.toLowerCase();
        }
        // Fallback to tests_ran if Lab agent
        else if (step.decision?.tests_ran) {
            testDescription = step.decision.tests_ran.toLowerCase();
        }
        // Also check previous step if Lab agent (Doctor ordered it)
        else if (this.currentStep > 0) {
            const previousStep = this.simulationData.timeline[this.currentStep - 1];
            if (previousStep.decision?.ordered_test) {
                testDescription = previousStep.decision.ordered_test.toLowerCase();
            }
        }

        console.log(`Lab test from ordered_test: ${testDescription}`);

        // MRI - lying down
        if (testDescription.includes('mri')) {
            console.log(`Matched MRI -> LAB_MRI`);
            return {
                location: 'LAB_MRI',
                animation: 'idle',
                direction: 'up'
            };
        }
        
        // X-Ray - standing
        if (testDescription.includes('xray') || testDescription.includes('x-ray')) {
            console.log(`Matched X-Ray -> LAB_XRAY`);
            return {
                location: 'LAB_XRAY',
                animation: 'idle',
                direction: 'down'
            };
        }
        
        // CT Scan - lying down
        if (testDescription.includes('ct')) {
            console.log(`Matched CT -> LAB_CT`);
            return {
                location: 'LAB_CT',
                animation: 'idle',
                direction: 'up'
            };
        }
        
        // Blood test - sitting
        if (testDescription.includes('blood')) {
            console.log(`Matched Blood -> LAB_BLOOD`);
            return {
                location: 'LAB_BLOOD',
                animation: 'sit',
                direction: 'left'
            };
        }

        // Default lab - sitting
        console.log(`Using default lab`);
        return {
            location: 'LAB_DEFAULT',
            animation: 'sit',
            direction: 'left'
        };
    }

    returnToEntrance() {
        console.log('Timeline complete, returning to entrance...');
        
        this.moveToLocation('ENTRANCE', 'idle', 'down', () => {
            this.scene.time.delayedCall(1000, () => {
                this.finishSimulation();
            });
        });
    }

    // Move to location with custom animation and direction
    moveToLocation(locationKey, action, direction, onComplete) {
        const location = LOCATIONS[locationKey];
        
        if (!location) {
            console.error(`Location ${locationKey} not found`);
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
                // Play arrival animation using factory
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
        console.log(`Final diagnosis: ${this.simulationData.final_diagnosis?.diagnosis || 'None'}`);
        console.log(`Is correct: ${this.simulationData.is_correct}`);
        
        if (this.npc) {
            this.npc.destroy();
            this.npc = null;
        }
    }
    
    update() {
        if (this.npc && this.depthManager) {
            this.depthManager.updateSpriteDepth(this.npc);
        }
    }
}