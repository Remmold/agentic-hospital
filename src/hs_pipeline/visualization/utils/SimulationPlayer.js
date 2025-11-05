import { LOCATIONS, AGENT_LOCATIONS, getLocation } from './Constants.js';
import { CharacterFactory } from './CharacterFactory.js';
import { AnimationManager } from './AnimationManager.js';
import { PatientSpriteRegistry } from './PatientSpriteRegistry.js';

export class SimulationPlayer {
    constructor(scene, pathfindingManager, depthManager, onCompleteCallback) {
        this.scene = scene;
        this.pathfinding = pathfindingManager;
        this.depthManager = depthManager;

        this.isPlaying = false;
        this.currentStep = 0;
        this.lastHighlightedStep = -1; // Track the last step that was actually highlighted
        this.simulationData = null;
        this.npc = null;
        this.onCompleteCallback = null;
        this.eventHandlers = [];
        this.spritesheet = null; // Will be set when patient is spawned
        this.baseWaitTime = 2000;
        this.speedMultiplier = 1;
        this.isPausedByUI = false;
        this.isExiting = false; // Track if patient is in exit phase
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
        
        if (paused) {
            // Stop movement if patient is moving
            if (this.npc && this.npc.pathTween && this.npc.pathTween.isPlaying()) {
                this.npc.pathTween.pause();
                console.log(`[SimulationPlayer] Movement paused`);
            }
            
            // Switch to idle/sit animation when paused
            if (this.npc && this.npc.lastDirection) {
                let action = this.npc.lastAction || 'idle';
                // Convert walk to idle when paused (standing still)
                if (action === 'walk') {
                    action = 'idle';
                }
                AnimationManager.playAnimation(this.npc, action, this.npc.lastDirection);
                console.log(`[SimulationPlayer] Playing ${action} animation while paused`);
            }
        } else {
            // RESUME: Handle all possible states
            if (this.npc && this.npc.pathTween && this.npc.pathTween.isPaused()) {
                // Resume movement and switch to walk animation
                this.npc.pathTween.resume();
                if (this.npc.lastDirection) {
                    AnimationManager.playAnimation(this.npc, 'walk', this.npc.lastDirection);
                }
                console.log(`[SimulationPlayer] Movement and walk animation resumed`);
            } else if (this.isExiting) {
                // If exiting but not moving, continue exit sequence
                console.log(`[SimulationPlayer] Resuming exit sequence`);
                this.checkPauseBeforeFinish();
            } else if (this.isPlaying && !this.npc?.pathTween?.isPlaying()) {
                // Resume timeline if we were between steps
                console.log(`[SimulationPlayer] Resuming timeline from step ${this.currentStep}`);
                this.playNextStep();
            }
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
        this.lastHighlightedStep = -1; // Reset highlighted step
        this.isPlaying = true;
        this.waitTimeMs = waitTimeMs;

        console.log(`[SimulationPlayer] Starting timeline for ${jsonData.patient.name} from waiting room`);

        // Notify UI that patient case is loaded (with sprite for glow)
        try {
            const event = new CustomEvent('patientCaseLoaded', {
                detail: {
                    caseData: jsonData,
                    sprite: this.npc,
                    patientId: this.npc?.uniqueId
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
        this.lastHighlightedStep = -1; // Reset highlighted step
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
                    sprite: this.npc,
                    patientId: this.npc?.uniqueId
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

        const clickHandler = (pointer) => {
            pointer.event.stopPropagation();

            console.log(`[SimulationPlayer] Patient clicked: ${this.simulationData?.patient?.name}`);

            if (this.simulationData) {
                try {
                    const event = new CustomEvent('patientClicked', {
                        detail: {
                            caseData: this.simulationData,
                            sprite: this.npc,
                            patientId: this.npc?.uniqueId,
                            currentStep: this.lastHighlightedStep,
                            isPlaying: this.isPlaying
                        }
                    });
                    window.dispatchEvent(event);
                    console.log('[SimulationPlayer] Patient clicked - event dispatched');
                } catch (error) {
                    console.error('[SimulationPlayer] Error dispatching click event:', error);
                }
            }
        };

        // Register handler and track it for cleanup
        this.npc.on('pointerdown', clickHandler);
        this.eventHandlers.push({
            sprite: this.npc,
            event: 'pointerdown',
            handler: clickHandler
        });

        console.log('[SimulationPlayer] Patient spawned with click tracking');
    }

    playNextStep() {
        // Check if paused
        if (this.isPausedByUI) {
            console.log(`[SimulationPlayer] Paused, waiting to continue from step ${this.currentStep}...`);
            return;
        }

        if (!this.isPlaying) {
            console.log('[SimulationPlayer] Not playing, stopping');
            return;
        }

        if (this.currentStep >= this.simulationData.timeline.length) {
            console.log('[SimulationPlayer] Timeline complete, showing reflection');
            this.showReflectionAndReturn();
            return;
        }

        const step = this.simulationData.timeline[this.currentStep];
        const agent = step.agent;
        let locationKey = AGENT_LOCATIONS[agent];
        let animation = 'idle';
        let direction = 'down';

        if (agent === 'Lab Tech') {
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
                // Update last highlighted step (the step we just arrived at)
                this.lastHighlightedStep = this.currentStep;

                const event = new CustomEvent('simulationStepChanged', {
                    detail: {
                        stepIndex: this.currentStep,
                        patientId: this.npc?.uniqueId,
                        patientName: this.simulationData?.patient?.name
                    }
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

    showReflectionAndReturn() {
        console.log(`[SimulationPlayer] All steps complete, showing reflection step`);

        // Highlight the last step as the "reflection" step
        const lastStepIndex = this.simulationData.timeline.length - 1;
        this.lastHighlightedStep = lastStepIndex;

        try {
            const event = new CustomEvent('simulationStepChanged', {
                detail: {
                    stepIndex: lastStepIndex,
                    patientId: this.npc?.uniqueId,
                    patientName: this.simulationData?.patient?.name,
                    isReflection: true
                }
            });
            window.dispatchEvent(event);
            console.log(`[SimulationPlayer] Reflection step highlighted (step ${lastStepIndex})`);
        } catch (error) {
            console.error('[SimulationPlayer] Error dispatching reflection step:', error);
        }

        // Wait a bit, then start moving to entrance (with pause check)
        const adjustedWaitTime = this.waitTimeMs / this.speedMultiplier;
        this.scene.time.delayedCall(adjustedWaitTime, () => {
            this.returnToEntrance();
        });
    }

    returnToEntrance() {
        // Check if paused before starting exit
        if (this.isPausedByUI) {
            console.log(`[SimulationPlayer] Paused before exit, waiting...`);
            // Don't create infinite loop - just return and let resume handle it
            return;
        }
        
        console.log(`[SimulationPlayer] ${this.spritesheet} starting exit to entrance...`);
        
        // Mark that we're in exit phase
        this.isExiting = true;
        this.moveToLocation('ENTRANCE', 'idle', 'down', () => {
            // Arrived at entrance, but check pause before finishing
            this.checkPauseBeforeFinish();
        });
    }

    checkPauseBeforeFinish() {
        // Check if paused after arriving at entrance
        if (this.isPausedByUI) {
            console.log(`[SimulationPlayer] Paused at entrance, waiting before exit...`);
            // Don't create infinite loop - just return and let resume handle it
            return;
        }
        
        console.log(`[SimulationPlayer] Completing exit...`);
        
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
        
        this.scene.time.delayedCall(1000, () => {
            this.finishSimulation();
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
            this.cleanupEventHandlers();
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

            this.cleanupEventHandlers();

            this.npc.destroy();
            this.npc = null;
        }

        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    /**
     * Clean up all event handlers to prevent memory leaks
     */
    cleanupEventHandlers() {
        this.eventHandlers.forEach(({ sprite, event, handler }) => {
            if (sprite && !sprite.destroyed) {
                sprite.off(event, handler);
            }
        });
        this.eventHandlers = [];
        console.log('[SimulationPlayer] Event handlers cleaned up');
    }

    update() {
        if (this.npc && this.depthManager) {
            this.depthManager.updateSpriteDepth(this.npc);
        }
    }
}