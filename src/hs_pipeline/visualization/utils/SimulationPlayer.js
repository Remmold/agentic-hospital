import { LOCATIONS, AGENT_LOCATIONS, getLocation } from './Constants.js';
import { CharacterFactory } from './CharacterFactory.js';
import { AnimationManager } from './AnimationManager.js';
import { AnimationUtils } from './AnimationUtils.js';
import { PatientSpriteRegistry } from './PatientSpriteRegistry.js';
import { EventBus, EVENT_NAMES } from './EventBus.js';


export class SimulationPlayer {
    /**
     * @param {Phaser.Scene} scene - The Phaser scene instance
     * @param {PathfindingManager} pathfindingManager - Manager for pathfinding operations
     * @param {DepthManager} depthManager - Manager for sprite depth sorting
     * @param {Function} onCompleteCallback - Callback when simulation completes
     */
    constructor(scene, pathfindingManager, depthManager, onCompleteCallback) {
        this.scene = scene;
        this.pathfinding = pathfindingManager;
        this.depthManager = depthManager;

        this.isPlaying = false;
        this.currentStep = 0;
        this.lastHighlightedStep = -1;
        this.simulationData = null;
        this.npc = null;
        this.onCompleteCallback = null;
        this.eventHandlers = [];
        this.eventBusSubscriptions = [];
        this.spritesheet = null;
        this.baseWaitTime = 2000;
        this.speedMultiplier = 1;
        this.isPausedByUI = false;
        this.isExiting = false;
    }

    /**
     * Get next random patient sprite from registry
     * @returns {string} Sprite sheet key
     */
    getRandomPatientSprite() {
        return PatientSpriteRegistry.getNextSprite();
    }

    /**
     * Set callback to execute when simulation completes
     * @param {Function} callback - Function to call on completion
     */
    onComplete(callback) {
        this.onCompleteCallback = callback;
    }

    /**
     * Set callback to execute when patient returns to entrance
     * @param {Function} callback - Function to call on return start
     */
    onReturnStart(callback) {
        this.onReturnStartCallback = callback;
    }

    /**
     * Set simulation speed multiplier
     * @param {number} speed - Speed multiplier (e.g., 2 for 2x speed)
     */
    setSpeedMultiplier(speed) {
        this.speedMultiplier = speed;
        console.log(`[SimulationPlayer] Speed set to ${speed}x`);
    }

    /**
     * Pause or resume the patient simulation
     * @param {boolean} paused - True to pause, false to resume
     */
    setPaused(paused) {
        this.isPausedByUI = paused;
        console.log(`[SimulationPlayer] ${paused ? 'PAUSED' : 'RESUMED'}`);

        if (paused) {
            if (this.npc?.pathTween?.isPlaying()) {
                this.npc.pathTween.pause();
            }

            if (this.npc) {
                let action = this.npc.lastAction || 'idle';
                if (action === 'walk') {
                    action = 'idle';
                }
                AnimationUtils.playLastAnimation(this.npc, action);
            }
        } else {
            if (this.npc?.pathTween?.isPaused()) {
                this.npc.pathTween.resume();
                AnimationUtils.playLastAnimation(this.npc, 'walk');
            } else if (this.isExiting) {
                this.checkPauseBeforeFinish();
            } else if (this.isPlaying && !this.npc?.pathTween?.isPlaying()) {
                this.playNextStep();
            }
        }
    }

    /**
     * Determine chair facing direction based on chair number
     * @param {string} chairKey - Chair identifier
     * @returns {string} Direction facing ('up', 'down', 'left', 'right')
     */
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

    /**
     * Move patient to waiting room and have them sit in a chair
     * @param {string} spritesheet - Patient spritesheet key
     * @param {string} chairKey - Chair location key
     * @param {Object} caseData - Patient case data (optional)
     */
    goToWaitingRoom(spritesheet, chairKey = 'WAITING_ROOM.CHAIR_1', caseData = null) {
        this.spritesheet = spritesheet;
        this.spawnPatient();

        if (caseData) {
            this.simulationData = caseData;
        }

        this.moveToLocation('RECEPTION', 'idle', 'up', () => {
            this.scene.time.delayedCall(2000, () => {
                this.moveToChair(chairKey);
            });
        });
    }

    /**
     * Move patient to chair in waiting room and play sitting animation
     * @param {string} chairKey - Chair location key
     */
    moveToChair(chairKey) {
        const chairDirection = this.getChairDirection(chairKey);
        const sittingAnim = AnimationManager.getRandomSittingAnimation(chairDirection);

        this.moveToLocation(chairKey, sittingAnim, chairDirection, () => {
            console.log(`[GoToWaitingRoom] ${this.spritesheet} sitting in ${chairKey} with animation: ${sittingAnim}`);

            if (sittingAnim === 'sit_phone') {
                AnimationManager.playPhoneAnimation(this.npc, this.scene);
            }
        });
    }

    /**
     * Start patient timeline from waiting room (patient already waiting)
     * @param {Object} jsonData - Simulation timeline data
     * @param {number} waitTimeMs - Time to wait before starting timeline
     * @param {string} receptionDesk - Reception desk location key
     */
    startTimelineFromWaitingRoom(jsonData, waitTimeMs = 2000, receptionDesk = 'RECEPTION.LEFT') {
        this.simulationData = jsonData;
        this.currentStep = 0;
        this.lastHighlightedStep = -1;
        this.isPlaying = true;
        this.waitTimeMs = waitTimeMs;

        EventBus.emit(EVENT_NAMES.PATIENT_CASE_LOADED, {
            caseData: jsonData,
            sprite: this.npc,
            patientId: this.npc?.uniqueId
        });

        this.scene.time.delayedCall(waitTimeMs, () => {
            if (this.npc) {
                AnimationManager.stopPhoneAnimation(this.npc, this.scene);
            }
            this.playNextStep();
        });
    }

    /**
     * Start active patient simulation from entrance
     * @param {Object} jsonData - Simulation timeline data
     * @param {number} waitTimeMs - Time to wait at reception before starting timeline
     * @param {string} spritesheet - Patient spritesheet key
     * @param {string} receptionDesk - Reception desk location key
     */
    playSimulation(jsonData, waitTimeMs = 2000, spritesheet = 'patient_1', receptionDesk = 'RECEPTION.LEFT') {
        if (this.isPlaying) {
            console.warn('[SimulationPlayer] Simulation already playing');
            return;
        }

        this.simulationData = jsonData;
        this.spritesheet = spritesheet;
        this.currentStep = 0;
        this.lastHighlightedStep = -1;
        this.isPlaying = true;
        this.waitTimeMs = waitTimeMs;

        this.spawnPatient();

        EventBus.emit(EVENT_NAMES.PATIENT_CASE_LOADED, {
            caseData: jsonData,
            sprite: this.npc,
            patientId: this.npc?.uniqueId
        });

        this.moveToLocation(receptionDesk, 'idle', 'up', () => {
            const adjustedWaitTime = this.waitTimeMs / this.speedMultiplier;
            this.scene.time.delayedCall(adjustedWaitTime, () => {
                this.playNextStep();
            });
        });
    }

    /**
     * Create and set up patient NPC sprite with colliders and interactions
     */
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

        this.npc.setInteractive({ useHandCursor: true });
        this.npc.simulationPlayer = this;

        const clickHandler = (pointer) => {
            pointer.event.stopPropagation();

            if (this.simulationData) {
                EventBus.emit(EVENT_NAMES.PATIENT_CLICKED, {
                    caseData: this.simulationData,
                    sprite: this.npc,
                    patientId: this.npc?.uniqueId,
                    currentStep: this.lastHighlightedStep,
                    isPlaying: this.isPlaying
                });
            }
        };

        this.npc.on('pointerdown', clickHandler);
        this.eventHandlers.push({
            sprite: this.npc,
            event: 'pointerdown',
            handler: clickHandler
        });
    }

    /**
     * Play next step in the simulation timeline
     */
    playNextStep() {
        if (this.isPausedByUI) {
            console.log(`[SimulationPlayer] Paused, waiting to continue from step ${this.currentStep}...`);
            return;
        }

        if (!this.isPlaying) {
            console.log('[SimulationPlayer] Not playing, stopping');
            return;
        }

        if (this.currentStep >= this.simulationData.timeline.length) {
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

        this.moveToLocation(locationKey, animation, direction, () => {
            this.lastHighlightedStep = this.currentStep;

            EventBus.emit(EVENT_NAMES.SIMULATION_STEP_CHANGED, {
                stepIndex: this.currentStep,
                patientId: this.npc?.uniqueId,
                patientName: this.simulationData?.patient?.name
            });

            const adjustedWaitTime = this.waitTimeMs / this.speedMultiplier;
            this.scene.time.delayedCall(adjustedWaitTime, () => {
                this.currentStep++;
                this.playNextStep();
            });
        });
    }

    /**
     * Determine lab location based on ordered test type
     * @param {Object} step - Timeline step data
     * @returns {Object} Location data with location, animation, and direction
     */
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

    /**
     * Display reflection step and begin return to entrance
     */
    showReflectionAndReturn() {
        const lastStepIndex = this.simulationData.timeline.length - 1;
        this.lastHighlightedStep = lastStepIndex;

        EventBus.emit(EVENT_NAMES.SIMULATION_STEP_CHANGED, {
            stepIndex: lastStepIndex,
            patientId: this.npc?.uniqueId,
            patientName: this.simulationData?.patient?.name,
            isReflection: true
        });

        const adjustedWaitTime = this.waitTimeMs / this.speedMultiplier;
        this.scene.time.delayedCall(adjustedWaitTime, () => {
            this.returnToEntrance();
        });
    }

    /**
     * Move patient back to hospital entrance
     */
    returnToEntrance() {
        if (this.isPausedByUI) {
            return;
        }

        this.isExiting = true;
        this.moveToLocation('ENTRANCE', 'idle', 'down', () => {
            this.checkPauseBeforeFinish();
        });
    }

    /**
     * Check pause state before completing simulation and clean up
     */
    checkPauseBeforeFinish() {
        if (this.isPausedByUI) {
            console.log(`[SimulationPlayer] Paused before exit, waiting...`);
            return;
        }

        EventBus.emit(EVENT_NAMES.SIMULATION_COMPLETE, {
            patientName: this.simulationData.patient.name
        });

        if (this.onReturnStartCallback) {
            this.onReturnStartCallback();
        }

        this.scene.time.delayedCall(1000, () => {
            this.finishSimulation();
        });
    }

    /**
     * Move patient to a location with specified animation
     * @param {string} locationKey - Location identifier
     * @param {string} action - Animation action type
     * @param {string} direction - Character facing direction
     * @param {Function} onComplete - Callback when movement completes
     */
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
                AnimationUtils.stopAndPlay(this.npc, action, direction);
                if (onComplete) onComplete();
            }
        );
    }

    /**
     * Stop simulation immediately
     */
    stopSimulation() {
        this.isPlaying = false;
        if (this.npc) {
            this.cleanupEventHandlers();
            this.npc.destroy();
            this.npc = null;
        }
    }

    /**
     * Finish simulation, clean up all resources
     */
    finishSimulation() {
        this.isPlaying = false;

        if (this.npc) {
            if (this.npc.pathTween) {
                this.npc.pathTween.stop();
            }
            if (this.npc.body) {
                this.npc.body.setVelocity(0, 0);
            }

            this.cleanupEventHandlers();
            this.eventBusSubscriptions.forEach(unsubscribe => unsubscribe());
            this.eventBusSubscriptions = [];

            this.npc.destroy();
            this.npc = null;
        }

        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    /**
     * Clean up all sprite event handlers to prevent memory leaks
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

    /**
     * Update player state (called every frame)
     */
    update() {
        if (this.npc && this.depthManager) {
            this.depthManager.updateSpriteDepth(this.npc);
        }
    }
}
