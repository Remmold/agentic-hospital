import { AGENT_LOCATIONS, getLocation } from '../core/Constants.js';
import { EventBus, EVENT_NAMES } from '../core/EventBus.js';
import { CharacterFactory } from '../animation/CharacterFactory.js';
import { PatientSpriteRegistry } from '../patient/PatientSpriteRegistry.js';
import { PatientMovement } from './PatientMovement.js';
import { PatientAnimations } from './PatientAnimations.js';
import { LOCATIONS } from '../core/Constants.js';

/**
 * PatientSimulation - Coordinates a patient's journey through the hospital
 */
export class PatientSimulation {
    /**
     * Creates a new patient simulation
     * 
     * @param {Phaser.Scene} scene - The game scene
     * @param {PathfindingManager} pathfindingManager - Pathfinding system
     * @param {DepthManager} depthManager - Sprite depth manager
     * @param {Function} [onCompleteCallback] - Optional callback on completion
     */
    constructor(scene, pathfindingManager, depthManager, onCompleteCallback) {
        this.scene = scene;
        this.pathfinding = pathfindingManager;
        this.depthManager = depthManager;

        this.isPlaying = false;
        this.currentStep = 0;
        this.lastHighlightedStep = -1; // For UI highlighting
        this.simulationData = null;
        this.npc = null;
        this.spritesheet = null;

        this.speedMultiplier = 1;
        this.isPausedByUI = false;
        this.isExiting = false;

        this.baseWaitTime = 2000;
        this.waitTimeMs = 2000;

        this.onCompleteCallback = onCompleteCallback;
        this.onReturnStartCallback = null;

        this.eventHandlers = [];
        this.eventBusSubscriptions = [];

        this.movement = new PatientMovement(scene, pathfindingManager);
        this.animations = new PatientAnimations(scene);
    }

    /**
     * Get next random patient sprite from registry
     * @returns {string} Sprite sheet key (e.g., 'pat_5')
     */
    getRandomPatientSprite() {
        return PatientSpriteRegistry.getNextSprite();
    }

    /**
     * Set callback to execute when simulation completes
     * 
     * @param {Function} callback - Function to call on completion
     */
    onComplete(callback) {
        this.onCompleteCallback = callback;
    }

    /**
     * Set callback to execute when patient starts return journey
     * 
     * @param {Function} callback - Function to call when returning starts
     */
    onReturnStart(callback) {
        this.onReturnStartCallback = callback;
    }


    setSpeedMultiplier(speed) {
        this.speedMultiplier = speed;
        
        // Adjust active tween speed immediately
        if (this.npc && this.npc.pathTween && this.npc.pathTween.isPlaying()) {
            this.npc.pathTween.timeScale = speed;
        }
        
        // Restart step if patient is idle waiting (no active tween but simulation running)
        if (this.isPlaying && this.npc && (!this.npc.pathTween || !this.npc.pathTween.isPlaying())) {
            // Cancel any pending delayed calls
            this.scene.time.removeAllEvents();
            // Immediately proceed to next step with new speed
            this.playNextStep();
        }
    }

    /**
     * Pause or resume the simulation
     * 
     * @param {boolean} paused - True to pause, false to resume
     */
    setPaused(paused) {
        this.isPausedByUI = paused;

        if (paused) {
            if (this.npc && this.npc.pathTween && this.npc.pathTween.isPlaying()) {
                this.movement.pauseMovement(this.npc);
            }

            // Switch to idle/sit animation when paused
            if (this.npc && this.npc.lastDirection) {
                let action = this.npc.lastAction || 'idle';
                if (action === 'walk') {
                    action = 'idle';
                }
                this.animations.stopAndPlay(this.npc, action, this.npc.lastDirection);
            }
        } else {
            // Resume movement if it was paused
            if (this.npc && this.npc.pathTween && this.npc.pathTween.isPaused()) {
                this.movement.resumeMovement(this.npc);
                // Reapply speed multiplier after resume
                this.npc.pathTween.timeScale = this.speedMultiplier;
            } else if (this.isExiting) {
                this.checkPauseBeforeFinish();
            } else if (this.isPlaying && !this.movement.isMoving(this.npc)) {
                this.playNextStep();
            }
        }
    }

    /**
     * Start playing the patient simulation timeline
     * 
     * @param {Object} jsonData - Patient case data with timeline
     * @param {number} [waitTimeMs=2000] - Wait time at reception
     * @param {string} [spritesheet='patient_1'] - Sprite sheet key
     * @param {string} [receptionDesk] - Reception desk to use
     */
    playSimulation(jsonData, waitTimeMs = 2000, spritesheet = 'patient_1', receptionDesk) {
        if (this.isPlaying) {
            console.warn('[PatientSimulation] Simulation already playing');
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

        this.movement.moveToLocation(this.npc, receptionDesk, 'idle', 'up', () => {
            console.log('[PatientSimulation] Arrived at reception, starting timeline...');
            this.scene.time.delayedCall(this.waitTimeMs, () => {
                this.playNextStep();
            });
        });
    }
    /**
     * Determine chair direction based on chair key
     * 
     * @param {string} chairKey - Chair location key (e.g., 'WAITING_ROOM.CHAIR_1')
     * @returns {string} Direction ('down', 'up', 'left')
     * @private
     */
    getChairDirection(chairKey) {
        // Extract chair number from key (e.g., 'WAITING_ROOM.CHAIR_5' -> 5)
        const match = chairKey.match(/CHAIR_(\d+)/);
        if (!match) return 'down'; // Default fallback

        const chairNum = parseInt(match[1]);

        // Chair 1-4: face down (can do sit/sit_phone/sit_book)
        if (chairNum >= 1 && chairNum <= 4) {
            return 'down';
        }
        // Chair 5-8: face up (sit only)
        else if (chairNum >= 5 && chairNum <= 8) {
            return 'up';
        }
        // Chair 9-11: face left (sit only)
        else if (chairNum >= 9 && chairNum <= 11) {
            return 'left';
        }

        return 'down'; // Default fallback
    }

    /**
     * Send patient to waiting room without starting timeline
     * Goes to reception FIRST, then to chair
     * 
     * @param {string} spritesheet - Sprite sheet key
     * @param {string} chairKey - Waiting room chair location key
     * @param {Object} caseData - Patient case data (for clickability)
     */
    goToWaitingRoom(spritesheet, chairKey, caseData) {
        this.spritesheet = spritesheet;
        this.simulationData = caseData;
        this.isPlaying = false;

        this.spawnPatient();

        // Pick a random reception desk (don't worry about availability - they're just checking in)
        const receptionDesks = ['RECEPTION.LEFT', 'RECEPTION.RIGHT'];
        const randomDesk = receptionDesks[Math.floor(Math.random() * receptionDesks.length)];

        this.movement.moveToLocation(this.npc, randomDesk, 'idle', 'up', () => {

            // Wait at reception for 2 seconds
            this.scene.time.delayedCall(2000, () => {
                const chairDirection = this.getChairDirection(chairKey);
                const sittingAnim = this.animations.getRandomSittingAnimation(chairDirection);

                this.movement.moveToLocation(this.npc, chairKey, sittingAnim, chairDirection, () => {

                    if (sittingAnim === 'sit_phone') {
                        this.animations.playPhoneAnimation(this.npc);
                    }
                });
            });
        });
    }

    /**
     * Start timeline from waiting room (when patient becomes active)
     * @param {Object} caseData - Patient case data
     * @param {number} waitTimeMs - Wait time at reception before starting timeline
     * @param {string} receptionDesk - Reception desk location key
     */
    startTimelineFromWaitingRoom(caseData, waitTimeMs, receptionDesk) {

        this.simulationData = caseData;
        this.currentStep = 0;
        this.lastHighlightedStep = -1;
        this.isPlaying = true;
        this.waitTimeMs = waitTimeMs;

        this.animations.stopPhoneAnimation(this.npc);

        // Notify UI that patient case is loaded (now active)
        EventBus.emit(EVENT_NAMES.PATIENT_CASE_LOADED, {
            caseData: caseData,
            sprite: this.npc,
            patientId: this.npc?.uniqueId
        });

        this.playNextStep();
    }

    spawnPatient() {
        const house = getLocation('HOUSE');
        if (!house) {
            console.error('[PatientSimulation] Could not find House location');
            return;
        }

        this.npc = CharacterFactory.createCharacter(
            this.scene,
            'patient',
            this.spritesheet,
            house.x,
            house.y,
            {
                bodyWidth: 24,
                bodyHeight: 24,
                offsetX: 4,
                offsetY: 44,
                initialDirection: 'left'  // Patients start facing left out the house
            }
        );

        // Add collision physics
        this.scene.physics.add.collider(this.npc, this.scene.layers.collision);
        const collisionGroup = this.scene.collisionManager?.getCollisionGroup();
        if (collisionGroup) {
            this.scene.physics.add.collider(this.npc, collisionGroup);
        }

        this.npc.setDepth(house.y);
        this.npc.simulationPlayer = this;

        this.setupClickHandler();

    }

    /**
     * Setup click handler for patient sprite
     * @private
     */
    setupClickHandler() {
        if (!this.npc) return;

        this.npc.setInteractive({ useHandCursor: true });

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


    playNextStep() {
        if (this.isPausedByUI) {
            return;
        }

        if (!this.isPlaying) {
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
        } else if (agent === 'Reflection') {
            animation = 'sit';
            direction = 'up';
        }

        this.movement.moveToLocation(this.npc, locationKey, animation, direction, () => {
            // Patient arrived - NOW trigger nurse event if this is a Nurse step
            if (agent === 'Nurse') {
                this.scene.staffManager.eventSystem.triggerEvent(
                    'examination_nurse',
                    [
                        { ...LOCATIONS.NURSE_OFFICE.NURSE_BY_PATIENT_SEAT, idleMs: 7000, idleDirection: 'left', idleAction: 'idle' }
                    ],
                    () => {
                        console.log('[PatientSimulation] Nurse examination complete');
                    }
                );
            }
            
            this.lastHighlightedStep = this.currentStep;

            EventBus.emit(EVENT_NAMES.SIMULATION_STEP_CHANGED, {
                stepIndex: this.currentStep,
                patientId: this.npc?.uniqueId,
                patientName: this.simulationData?.patient?.name
            });

            this.scene.time.delayedCall(this.waitTimeMs, () => {
                this.currentStep++;
                this.playNextStep();
            });
        });
    }
    /**
     * Determine lab location based on ordered test type
     * 
     * @param {Object} step - Timeline step object
     * @returns {Object} Location info {location, animation, direction}
     * @private
     */
    getLabLocation(step) {
        // Check multiple possible property locations for test type
        const testType = (step.details?.tests_ran || '').toLowerCase();
        

        if (testType.includes('mri')) {
            return { location: 'LAB_MRI', animation: 'sit', direction: 'up' };
        } else if (testType.includes('x-ray') || testType.includes('xray')) {
            return { location: 'LAB_XRAY', animation: 'sit', direction: 'down' };
        } else if (testType.includes('ct')) {
            return { location: 'LAB_CT', animation: 'sit', direction: 'up' };
        } else {
            return { location: 'LAB_DEFAULT', animation: 'sit', direction: 'down' };
        }
    }


    showReflectionAndReturn() {
        this.scene.time.delayedCall(this.waitTimeMs, () => {
            this.isExiting = true;

            // Trigger nurse to greet next patient
            if (this.scene.staffManager?.eventSystem) {
                const receptionDesks = ['RECEPTION.LEFT', 'RECEPTION.RIGHT'];
                const greetingDeskKey = receptionDesks[Math.floor(Math.random() * receptionDesks.length)];

                
                this.scene.staffManager.eventSystem.triggerEvent(
                    'examination_nurse',
                    [
                        { ...LOCATIONS.WAITING_ROOM.NURSE_GREETING_SPOT, idleMs: 4600, idleDirection: 'right', idleAction: 'idle' },
                        { ...LOCATIONS.NURSE_OFFICE.NURSE_BY_PATIENT_SEAT, idleMs: 500, idleDirection: 'left', idleAction: 'idle' }
                    ],
                    () => {
                        console.log('[PatientSimulation] Nurse greeting complete');
                    }
                );
            }

            if (this.onReturnStartCallback) {
                this.onReturnStartCallback();
            }

            this.checkPauseBeforeFinish();
        });
    }

    /**
     * Check if paused before finishing, otherwise complete simulation
     * @private
     */
    checkPauseBeforeFinish() {
        if (this.isPausedByUI) {
            return;
        }

        const house = getLocation('HOUSE');
        if (!house) {
            console.error('[PatientSimulation] Could not find house location');
            this.completeSimulation();
            return;
        }

        this.movement.moveToLocation(this.npc, house, 'idle', 'down', () => {
            this.completeSimulation();
        });
    }

    /**
     * Complete simulation and trigger callback
     * @private
     */
    completeSimulation() {
        EventBus.emit(EVENT_NAMES.SIMULATION_COMPLETE, {
            patientName: this.simulationData.patient.name,
            patientId: this.npc?.uniqueId
        });

        this.finishSimulation();
    }

    /**
     * Stop simulation immediately (emergency stop)
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
     * Finish simulation and clean up all resources
     * @private
     */
    finishSimulation() {
        this.isPlaying = false;

        if (this.npc) {
            // Stop any active movement
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


    cleanupEventHandlers() {
        this.eventHandlers.forEach(({ sprite, event, handler }) => {
            if (sprite && !sprite.destroyed) {
                sprite.off(event, handler);
            }
        });
        this.eventHandlers = [];
    }

    /**
     * Update patient state (called every frame)
     */
    update() {
        if (this.npc && this.depthManager) {
            this.depthManager.updateSpriteDepth(this.npc);
        }
    }
}
