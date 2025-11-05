import { LOCATIONS, AGENT_LOCATIONS, getLocation } from './Constants.js';
import { CharacterFactory } from './CharacterFactory.js';
import { AnimationManager } from './AnimationManager.js';
import { PatientSpriteRegistry } from './PatientSpriteRegistry.js';

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
        this.spritesheet = null; // Will be set when patient is spawned
        this.baseWaitTime = 2000;
        this.speedMultiplier = 1;
        this.isPausedByUI = false;
    }

    getRandomPatientSprite() {
        return PatientSpriteRegistry.getNextSprite();
    }

    onComplete(callback) {
        this.onCompleteCallback = callback;
    }

    onReturnStart(callback) {
        this.onReturnStartCallback = callback;
    }

    setSpeedMultiplier(speed) {
        this.speedMultiplier = speed;
        console.log(`[SimulationPlayer] Speed set to ${speed}x`);
    }

    setPaused(paused) {
        this.isPausedByUI = paused;
        console.log(`[SimulationPlayer] ${paused ? 'PAUSED' : 'RESUMED'}`);
        
        if (!paused && this.isPlaying) {
            // Resume if we were waiting
            this.playNextStep();
        }
    }

    getChairDirection(chairKey) {
        const chairNum = parseInt(chairKey.match(/\d+/)[0]);

        if (chairNum >= 1 && chairNum <= 4) {
            return 'down';
        } else if (chairNum >= 5 && chairNum <= 8) {
            return 'up';
        } else if (chairNum >= 9 && chairNum <= 11) {
            return 'left';
        }
        return 'down';
    }

    goToWaitingRoom(spritesheet, chairKey = 'WAITING_ROOM.CHAIR_1', caseData = null) {
        this.spritesheet = spritesheet;
        this.spawnPatient();
        
        // Store simulation data so clicking works even in waiting room
        if (caseData) {
            this.simulationData = caseData;
        }
        
        console.log(`[GoToWaitingRoom] ${spritesheet} starting: entrance → reception → ${chairKey}`);

        this.moveToLocation('RECEPTION', 'idle', 'up', () => {
            console.log(`[GoToWaitingRoom] ${spritesheet} arrived at reception`);

            this.scene.time.delayedCall(2000, () => {
                console.log(`[GoToWaitingRoom] ${spritesheet} done idling, moving to ${chairKey}`);

                const chairDirection = this.getChairDirection(chairKey);

                const sittingAnim = AnimationManager.getRandomSittingAnimation(chairDirection);
                
                this.moveToLocation(chairKey, sittingAnim, chairDirection, () => {
                    console.log(`[GoToWaitingRoom] ${spritesheet} sitting in ${chairKey} with animation: ${sittingAnim}`);

                    // If phone animation, use special looped handler
                    if (sittingAnim === 'sit_phone') {
                        AnimationManager.playPhoneAnimation(this.npc, this.scene);
                    }
                });
            });
        });
    }

    /**
 * Start timeline from waiting room (patient already waiting)
 */
    startTimelineFromWaitingRoom(jsonData, waitTimeMs = 2000, receptionDesk = 'RECEPTION.LEFT') {
        this.simulationData = jsonData;
        this.currentStep = 0;
        this.isPlaying = true;
        this.waitTimeMs = waitTimeMs;

        console.log(`[SimulationPlayer] Starting timeline for ${jsonData.patient.name} from waiting room`);

        // Notify UI that patient case is loaded (with sprite for glow)
        try {
            const event = new CustomEvent('patientCaseLoaded', {
                detail: {
                    caseData: jsonData,
                    sprite: this.npc
                }
            });
            window.dispatchEvent(event);
            console.log('[SimulationPlayer] Dispatched patientCaseLoaded event');
        } catch (error) {
            console.error('[SimulationPlayer] Error dispatching event:', error);
        }

        // Small delay, then start timeline
        this.scene.time.delayedCall(waitTimeMs, () => {
            // STOP phone animation if patient was using it
            if (this.npc) {
                AnimationManager.stopPhoneAnimation(this.npc, this.scene);
            }

            this.playNextStep();
        });
    }

    /**
     * Start active patient simulation
     */
    playSimulation(jsonData, waitTimeMs = 2000, spritesheet = 'patient_1', receptionDesk = 'RECEPTION.LEFT') {
        if (this.isPlaying) {
            console.warn('[SimulationPlayer] Simulation already playing');
            return;
        }

        this.simulationData = jsonData;
        this.spritesheet = spritesheet;
        this.currentStep = 0;
        this.isPlaying = true;
        this.waitTimeMs = waitTimeMs;

        console.log(`[SimulationPlayer] Starting simulation: ${jsonData.patient.name}`);
        console.log(`[SimulationPlayer] Total steps: ${jsonData.timeline.length}`);

        this.spawnPatient();

        // Notify UI that patient case is loaded (with sprite for glow)
        try {
            const event = new CustomEvent('patientCaseLoaded', { 
                detail: { 
                    caseData: jsonData,
                    sprite: this.npc
                } 
            });
            window.dispatchEvent(event);
            console.log('[SimulationPlayer] Dispatched patientCaseLoaded event');
        } catch (error) {
            console.error('[SimulationPlayer] Error dispatching event:', error);
        }

        // Walk to reception (specific desk)
        this.moveToLocation(receptionDesk, 'idle', 'up', () => {
            console.log('[SimulationPlayer] Arrived at reception, starting timeline...');
            const adjustedWaitTime = this.waitTimeMs / this.speedMultiplier;
            this.scene.time.delayedCall(adjustedWaitTime, () => {
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

        // Make interactive and clickable
        this.npc.setInteractive({ useHandCursor: true });
        
        // Store reference to this SimulationPlayer instance
        this.npc.simulationPlayer = this;
        
        // Add click handler
        this.npc.on('pointerdown', (pointer) => {
            // Prevent map click-to-move when clicking on patient
            pointer.event.stopPropagation();
            
            console.log(`[SimulationPlayer] Patient clicked: ${this.simulationData?.patient?.name}`);
            
            // Dispatch event to show this patient's timeline AND move glow
            if (this.simulationData) {
                try {
                    const event = new CustomEvent('patientClicked', { 
                        detail: { 
                            caseData: this.simulationData,
                            sprite: this.npc
                        } 
                    });
                    window.dispatchEvent(event);
                    console.log('[SimulationPlayer] Patient clicked - event dispatched');
                } catch (error) {
                    console.error('[SimulationPlayer] Error dispatching click event:', error);
                }
            }
        });

        console.log(`[SimulationPlayer] Patient spawned at entrance (${this.spritesheet})`);
    }

    playNextStep() {
        // Check if paused
        if (this.isPausedByUI) {
            // Wait and check again
            this.scene.time.delayedCall(100, () => this.playNextStep());
            return;
        }

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

        console.log(`[SimulationPlayer] Step ${this.currentStep + 1}/${this.simulationData.timeline.length}: ${agent} at ${locationKey}`);

        this.moveToLocation(locationKey, animation, direction, () => {
            // Notify UI AFTER arrival at location
            try {
                const event = new CustomEvent('simulationStepChanged', { 
                    detail: { stepIndex: this.currentStep } 
                });
                window.dispatchEvent(event);
                console.log(`[SimulationPlayer] Step ${this.currentStep} highlighted (arrived at ${locationKey})`);
            } catch (error) {
                console.error('[SimulationPlayer] Error dispatching step change:', error);
            }

            const adjustedWaitTime = this.waitTimeMs / this.speedMultiplier;
            this.scene.time.delayedCall(adjustedWaitTime, () => {
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

        console.log(`[SimulationPlayer] Lab test: ${testDescription}`);

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
            return { location: 'LAB_BLOOD', animation: 'sit', direction: 'down' };
        }

        return { location: 'LAB_DEFAULT', animation: 'sit', direction: 'down' };
    }

    returnToEntrance() {
        console.log(`[SimulationPlayer] ${this.spritesheet} finished ALL steps, returning to entrance...`);

        // Notify UI that simulation is complete
        try {
            const event = new CustomEvent('simulationComplete', { 
                detail: { patientName: this.simulationData.patient.name } 
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('[SimulationPlayer] Error dispatching complete event:', error);
        }

        if (this.onReturnStartCallback) {
            this.onReturnStartCallback();
        }

        this.moveToLocation('ENTRANCE', 'idle', 'down', () => {
            this.scene.time.delayedCall(1000, () => {
                this.finishSimulation();
            });
        });
    }

    moveToLocation(locationKey, action, direction, onComplete) {
        const location = getLocation(locationKey);

        if (!location) {
            console.error(`[SimulationPlayer] Location not found: ${locationKey}`);
            if (onComplete) onComplete();
            return;
        }

        console.log(`[SimulationPlayer] Moving to ${location.name}`);
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
        console.log('[SimulationPlayer] Simulation stopped');
    }

    finishSimulation() {
        this.isPlaying = false;
        console.log(`[SimulationPlayer] Simulation complete: ${this.simulationData.patient.name}`);
        
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