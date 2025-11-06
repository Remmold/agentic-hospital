/**
 * @fileoverview Main patient simulation coordinator
 * Manages patient lifecycle from spawn to completion including timeline progression
 * 
 * @module simulation/PatientSimulation
 * @requires ../utils/Constants
 * @requires ../utils/CharacterFactory
 * @requires ../utils/PatientSpriteRegistry
 * @requires ../utils/EventBus
 * @requires ./PatientMovement
 * @requires ./PatientAnimations
 * @author Hospital Simulation Team
 */

import { AGENT_LOCATIONS, getLocation } from '../utils/Constants.js';
import { CharacterFactory } from '../utils/CharacterFactory.js';
import { PatientSpriteRegistry } from '../utils/PatientSpriteRegistry.js';
import { EventBus, EVENT_NAMES } from '../utils/EventBus.js';
import { PatientMovement } from './PatientMovement.js';
import { PatientAnimations } from './PatientAnimations.js';

/**
 * PatientSimulation - Coordinates a patient's journey through the hospital
 * 
 * Responsibilities:
 * - Timeline management and progression
 * - Patient state tracking (playing, paused, exiting)
 * - Event coordination
 * - Speed control
 * - Cleanup and resource management
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

        // Core state
        this.isPlaying = false;
        this.currentStep = 0;
        this.lastHighlightedStep = -1; // For UI highlighting
        this.simulationData = null;
        this.npc = null;
        this.spritesheet = null;

        // Control state
        this.speedMultiplier = 1;
        this.isPausedByUI = false;
        this.isExiting = false;

        // Timing
        this.baseWaitTime = 2000;
        this.waitTimeMs = 2000;

        // Callbacks
        this.onCompleteCallback = onCompleteCallback;
        this.onReturnStartCallback = null;

        // Event management
        this.eventHandlers = [];
        this.eventBusSubscriptions = [];

        // Helper modules
        this.movement = new PatientMovement(scene, pathfindingManager);
        this.animations = new PatientAnimations(scene);
    }

    /**
     * Get next random patient sprite from registry
     * 
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

    /**
     * Set simulation speed multiplier
     * 
     * @param {number} speed - Speed multiplier (0.5 = half speed, 2 = double speed)
     */
    setSpeedMultiplier(speed) {
        this.speedMultiplier = speed;
        console.log(`[PatientSimulation] Speed set to ${speed}x`);
    }

    /**
     * Pause or resume the simulation
     * 
     * @param {boolean} paused - True to pause, false to resume
     */
    setPaused(paused) {
        this.isPausedByUI = paused;
        console.log(`[PatientSimulation] ${paused ? 'PAUSED' : 'RESUMED'}`);

        if (paused) {
            // Pause movement if active
            if (this.npc && this.npc.pathTween && this.npc.pathTween.isPlaying()) {
                this.movement.pauseMovement(this.npc);
            }

            // Switch to idle/sit animation when paused
            if (this.npc && this.npc.lastDirection) {
                let action = this.npc.lastAction || 'idle';
                // Convert walk to idle when paused
                if (action === 'walk') {
                    action = 'idle';
                }
                this.animations.stopAndPlay(this.npc, action, this.npc.lastDirection);
            }
        } else {
            // Resume movement if it was paused
            if (this.npc && this.npc.pathTween && this.npc.pathTween.isPaused()) {
                this.movement.resumeMovement(this.npc);
            } else if (this.isExiting) {
                // If exiting but not moving, continue exit sequence
                this.checkPauseBeforeFinish();
            } else if (this.isPlaying && !this.movement.isMoving(this.npc)) {
                // Resume timeline if between steps
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

        console.log(`[PatientSimulation] Starting simulation: ${jsonData.patient.name}`);
        console.log(`[PatientSimulation] Total steps: ${jsonData.timeline.length}`);

        // Spawn the patient sprite
        this.spawnPatient();

        // Notify UI that patient case is loaded
        EventBus.emit(EVENT_NAMES.PATIENT_CASE_LOADED, {
            caseData: jsonData,
            sprite: this.npc,
            patientId: this.npc?.uniqueId
        });

        // Walk to reception
        this.movement.moveToLocation(this.npc, receptionDesk, 'idle', 'up', () => {
            console.log('[PatientSimulation] Arrived at reception, starting timeline...');
            const adjustedWaitTime = this.waitTimeMs / this.speedMultiplier;
            this.scene.time.delayedCall(adjustedWaitTime, () => {
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

        console.log('[DEBUG] goToWaitingRoom - sprite uniqueId:', this.npc?.uniqueId);
        console.log('[DEBUG] goToWaitingRoom - sprite lastDirection:', this.npc?.lastDirection);

        // First, go to reception desk
        this.movement.moveToLocation(this.npc, 'RECEPTION', 'idle', 'up', () => {
            console.log('[PatientSimulation] At reception, moving to waiting room...');

            // Wait at reception for 2 seconds
            this.scene.time.delayedCall(2000, () => {
                // Determine chair direction
                const chairDirection = this.getChairDirection(chairKey);

                // Get appropriate sitting animation based on direction
                const sittingAnim = this.animations.getRandomSittingAnimation(chairDirection);

                console.log(`[PatientSimulation] Patient going to ${chairKey}`);
                console.log(`[DEBUG] chairDirection: ${chairDirection}`);
                console.log(`[DEBUG] sittingAnim: ${sittingAnim}`);
                console.log(`[DEBUG] sprite uniqueId: ${this.npc?.uniqueId}`);

                // Move to chair
                this.movement.moveToLocation(this.npc, chairKey, sittingAnim, chairDirection, () => {
                    console.log('[PatientSimulation] Patient seated in waiting room');
                    console.log(`[DEBUG] After seating - sprite lastDirection: ${this.npc?.lastDirection}`);
                    console.log(`[DEBUG] After seating - sprite lastAction: ${this.npc?.lastAction}`);

                    // Start phone animation if sitting with phone
                    if (sittingAnim === 'sit_phone') {
                        this.animations.playPhoneAnimation(this.npc);
                    }
                });
            });
        });
    }

    /**
     * Start timeline from waiting room (when patient becomes active)
     * Patient stays in chair and timeline starts immediately
     * 
     * @param {Object} caseData - Patient case data
     * @param {number} waitTimeMs - Wait time before starting timeline
     * @param {string} receptionDesk - Reception desk (not used, kept for compatibility)
     */
    startTimelineFromWaitingRoom(caseData, waitTimeMs, receptionDesk) {
        console.log('[PatientSimulation] Starting timeline from waiting room');

        this.simulationData = caseData;
        this.currentStep = 0;
        this.lastHighlightedStep = -1;
        this.isPlaying = true;
        this.waitTimeMs = waitTimeMs;

        // Stop any phone animations
        this.animations.stopPhoneAnimation(this.npc);

        // Notify UI that patient case is loaded (now active)
        EventBus.emit(EVENT_NAMES.PATIENT_CASE_LOADED, {
            caseData: caseData,
            sprite: this.npc,
            patientId: this.npc?.uniqueId
        });

        // Start timeline directly from waiting room after wait time
        this.scene.time.delayedCall(waitTimeMs, () => {
            if (this.npc) {
                this.animations.stopPhoneAnimation(this.npc);
            }
            this.playNextStep();
        });
    }

    /**
     * Spawn the patient sprite at the entrance
     * @private
     */
    spawnPatient() {
        const entrance = getLocation('ENTRANCE');
        if (!entrance) {
            console.error('[PatientSimulation] Could not find entrance location');
            return;
        }

        this.npc = CharacterFactory.createCharacter(
            this.scene,
            'patient',
            this.spritesheet,
            entrance.x,
            entrance.y,
            {
                bodyWidth: 24,
                bodyHeight: 24,
                offsetX: 6,
                offsetY: 40,
                initialDirection: 'up'  // Patients start facing UP at entrance
            }
        );

        // Add collision physics
        this.scene.physics.add.collider(this.npc, this.scene.layers.collision);
        const collisionGroup = this.scene.collisionManager?.getCollisionGroup();
        if (collisionGroup) {
            this.scene.physics.add.collider(this.npc, collisionGroup);
        }

        this.npc.setDepth(entrance.y);
        this.npc.simulationPlayer = this;

        this.setupClickHandler();

        console.log(`[PatientSimulation] Patient spawned: ${this.npc.uniqueId}`);
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
            console.log('[PatientSimulation] Patient clicked');

            // Emit patient clicked event
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
     * @private
     */
    playNextStep() {
        // Check if paused
        if (this.isPausedByUI) {
            console.log(`[PatientSimulation] Paused, waiting to continue from step ${this.currentStep}...`);
            return;
        }

        // Check if still playing
        if (!this.isPlaying) {
            console.log('[PatientSimulation] Not playing, stopping');
            return;
        }

        // Check if timeline complete
        if (this.currentStep >= this.simulationData.timeline.length) {
            this.showReflectionAndReturn();
            return;
        }

        const step = this.simulationData.timeline[this.currentStep];
        console.log(`[PatientSimulation] Step ${this.currentStep + 1}/${this.simulationData.timeline.length}: ${step.agent}`);

        const agent = step.agent;
        let locationKey = AGENT_LOCATIONS[agent];
        let animation = 'idle';
        let direction = 'down';

        // Determine location and animation based on agent type
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

        // Move to location and wait
        this.movement.moveToLocation(this.npc, locationKey, animation, direction, () => {
            // Update UI highlight
            this.lastHighlightedStep = this.currentStep;

            EventBus.emit(EVENT_NAMES.SIMULATION_STEP_CHANGED, {
                stepIndex: this.currentStep,
                patientId: this.npc?.uniqueId,
                patientName: this.simulationData?.patient?.name
            });

            // Wait before next step
            const adjustedWaitTime = this.waitTimeMs / this.speedMultiplier;
            this.scene.time.delayedCall(adjustedWaitTime, () => {
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
        const testType = step.test_ordered?.toLowerCase() || '';

        if (testType.includes('mri')) {
            return { location: 'LAB_MRI', animation: 'sit', direction: 'up' };
        } else if (testType.includes('x-ray') || testType.includes('xray')) {
            return { location: 'LAB_XRAY', animation: 'idle', direction: 'up' };
        } else if (testType.includes('ct')) {
            return { location: 'LAB_CT', animation: 'sit', direction: 'up' };
        } else {
            return { location: 'LAB_DEFAULT', animation: 'sit', direction: 'down' };
        }
    }

    /**
     * Show reflection step and initiate return journey
     * @private
     */
    showReflectionAndReturn() {
        console.log('[PatientSimulation] Timeline complete, showing reflection...');

        this.lastHighlightedStep = this.currentStep;

        EventBus.emit(EVENT_NAMES.SIMULATION_STEP_CHANGED, {
            stepIndex: this.currentStep,
            patientId: this.npc?.uniqueId,
            patientName: this.simulationData?.patient?.name
        });

        const adjustedWaitTime = this.waitTimeMs / this.speedMultiplier;
        this.scene.time.delayedCall(adjustedWaitTime, () => {
            this.isExiting = true;

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
            console.log('[PatientSimulation] Paused before exit, waiting...');
            return;
        }

        const entrance = getLocation('ENTRANCE');
        if (!entrance) {
            console.error('[PatientSimulation] Could not find entrance location');
            this.completeSimulation();
            return;
        }

        console.log('[PatientSimulation] Patient returning to entrance...');

        this.movement.moveToLocation(this.npc, entrance, 'idle', 'down', () => {
            console.log('[PatientSimulation] Patient reached entrance');
            this.completeSimulation();
        });
    }

    /**
     * Complete simulation and trigger callback
     * @private
     */
    completeSimulation() {
        console.log('[PatientSimulation] Simulation complete!');

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

            // Cleanup event handlers
            this.cleanupEventHandlers();
            this.eventBusSubscriptions.forEach(unsubscribe => unsubscribe());
            this.eventBusSubscriptions = [];

            // Destroy sprite
            this.npc.destroy();
            this.npc = null;
        }

        // Trigger completion callback
        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    /**
     * Clean up all sprite event handlers to prevent memory leaks
     * @private
     */
    cleanupEventHandlers() {
        this.eventHandlers.forEach(({ sprite, event, handler }) => {
            if (sprite && !sprite.destroyed) {
                sprite.off(event, handler);
            }
        });
        this.eventHandlers = [];
        console.log('[PatientSimulation] Event handlers cleaned up');
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