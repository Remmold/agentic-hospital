import { LOCATIONS, AGENT_LOCATIONS } from './Constants.js';

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

    // Load and play a simulation from JSON data
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

        // Spawn patient at entrance
        this.spawnPatient();

        // Walk to reception (nurse)
        this.moveToLocation('RECEPTION', () => {
            console.log('Arrived at reception, starting timeline...');
            this.scene.time.delayedCall(this.waitTimeMs, () => {
                this.playNextStep();
            });
        });
    }

    // Spawn the patient NPC at entrance
    spawnPatient() {
        const entrance = LOCATIONS.ENTRANCE;
        
        this.npc = this.scene.physics.add.sprite(entrance.x, entrance.y, 'patient', 0);
        this.npc.setOrigin(0.5, 1);
        this.npc.body.setSize(24, 24, false);
        this.npc.body.setOffset(6, 40);
        this.npc.lastDirection = 'down';
        this.npc.play('patient_idle_down');
        
        // Add collision
        this.scene.physics.add.collider(this.npc, this.scene.layers.collision);
        
        console.log(`Patient spawned at entrance: ${this.simulationData.patient.name}`);
    }

    // Play the next step in the timeline
    playNextStep() {
        if (!this.isPlaying || this.currentStep >= this.simulationData.timeline.length) {
            this.returnToEntrance();
            return;
        }

        const step = this.simulationData.timeline[this.currentStep];
        const agent = step.agent;
        const locationKey = AGENT_LOCATIONS[agent];

        console.log(`Step ${this.currentStep + 1}: Moving to ${agent} at ${locationKey}`);

        this.moveToLocation(locationKey, () => {
            // Wait before next step
            this.scene.time.delayedCall(this.waitTimeMs, () => {
                this.currentStep++;
                this.playNextStep();
            });
        });
    }

    // Return patient to entrance and finish
    returnToEntrance() {
        console.log('Timeline complete, returning to entrance...');
        
        this.moveToLocation('ENTRANCE', () => {
            this.scene.time.delayedCall(1000, () => {
                this.finishSimulation();
            });
        });
    }

    // Move NPC to a specific location
    moveToLocation(locationKey, onComplete) {
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
                this.npc.play('patient_idle_down');
                if (onComplete) onComplete();
            }
        );
    }

    // Stop the simulation
    stopSimulation() {
        this.isPlaying = false;
        if (this.npc) {
            this.npc.destroy();
            this.npc = null;
        }
        console.log('Simulation stopped');
    }

    // Finish the simulation
    finishSimulation() {
        this.isPlaying = false;
        console.log(`Simulation complete: ${this.simulationData.patient.name}`);
        console.log(`Final diagnosis: ${this.simulationData.final_diagnosis?.diagnosis || 'None'}`);
        console.log(`Is correct: ${this.simulationData.is_correct}`);
        
        // Destroy the NPC sprite
        if (this.npc) {
            this.npc.destroy();
            this.npc = null;
        }
    }
    
    // Update method - call from scene's update
    update() {
        if (this.npc && this.depthManager) {
            this.depthManager.updateSpriteDepth(this.npc);
        }
    }
}