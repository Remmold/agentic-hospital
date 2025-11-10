/**
 * SceneEventHandlers
 * Manages all EventBus subscriptions for HospitalScene
 * Handles UI events, patient events, and simulation state changes
 */

import { EventBus, EVENT_NAMES } from '../core/EventBus.js';

export class SceneEventHandlers {
    /**
     * Create event handler manager
     * @param {Phaser.Scene} scene - The hospital scene
     */
    constructor(scene) {
        this.scene = scene;
        this.eventUnsubscribers = [];
    }

    /**
     * Setup all event handlers
     */
    setupAllHandlers() {
        this.setupPauseHandler();
        this.setupSpeedHandler();
        this.setupPatientCaseLoadedHandler();
        this.setupPatientClickedHandler();
        this.setupChipClickedHandler();
        this.setupStepChangedHandler();
        this.setupSimulationCompleteHandler();
    }

    /**
     * Setup pause/resume event handler
     * @private
     */
    setupPauseHandler() {
        const unsubscribe = EventBus.on(EVENT_NAMES.SIMULATION_PAUSE, (e) => {
            const isPaused = e.detail.isPaused;

            // Pause/resume the active patient
            if (this.scene.patientQueue?.activePatient) {
                this.scene.patientQueue.activePatient.player.setPaused(isPaused);
            }
        });

        this.eventUnsubscribers.push(unsubscribe);
    }

    /**
     * Setup simulation speed change handler
     * @private
     */
    setupSpeedHandler() {
        const unsubscribe = EventBus.on(EVENT_NAMES.SIMULATION_SPEED, (e) => {
            const speed = e.detail.speed;
            console.log(`[HospitalScene] Speed changed to ${speed}x`);

            // Update speed for active patient
            if (this.scene.patientQueue?.activePatient) {
                this.scene.patientQueue.activePatient.player.setSpeedMultiplier(speed);
            }
        });

        this.eventUnsubscribers.push(unsubscribe);
    }

    /**
     * Setup patient case loaded event handler
     * Triggered when a new patient becomes active
     * @private
     */
    setupPatientCaseLoadedHandler() {
        const unsubscribe = EventBus.on(EVENT_NAMES.PATIENT_CASE_LOADED, (e) => {
            // PatientCaseLoaded Event
            if (window.simulationUI) {
                window.simulationUI.displayPatientCase(
                    e.detail.caseData,
                    e.detail.patientId,
                    true, // This is the active patient
                    null  // No current step to highlight yet
                );

                // Apply current UI pause and speed state to the new active patient
                if (e.detail.sprite?.simulationPlayer) {
                    const isPaused = window.simulationUI.getIsPaused();
                    const speed = window.simulationUI.getCurrentSpeed();

                    e.detail.sprite.simulationPlayer.setPaused(isPaused);
                    e.detail.sprite.simulationPlayer.setSpeedMultiplier(speed);
                }
            }

            // Attach glow to the sprite
            if (e.detail.sprite && this.scene.glowManager) {
                this.scene.glowManager.attachToSprite(e.detail.sprite);
            }
        });
        this.eventUnsubscribers.push(unsubscribe);
    }

    /**
     * Setup patient sprite clicked event handler
     * Triggered when user clicks on a patient sprite
     * @private
     */
    setupPatientClickedHandler() {
        const unsubscribe = EventBus.on(EVENT_NAMES.PATIENT_CLICKED, (e) => {
            if (window.simulationUI) {
                const isActivePatient = window.simulationUI.activePatientId === e.detail.patientId;

                window.simulationUI.displayPatientCase(
                    e.detail.caseData,
                    e.detail.patientId,
                    false,
                    isActivePatient ? e.detail.currentStep : null
                );
            }

            if (e.detail.sprite && this.scene.glowManager) {
                this.scene.glowManager.attachToSprite(e.detail.sprite);
            }
        });
        this.eventUnsubscribers.push(unsubscribe);
    }

    /**
     * Setup patient chip clicked event handler
     * Triggered when user clicks on a patient chip in the UI
     * @private
     */
    setupChipClickedHandler() {
        const unsubscribe = EventBus.on(EVENT_NAMES.PATIENT_CHIP_CLICKED, (e) => {
            if (window.simulationUI && e.detail.caseData) {
                const isActivePatient = window.simulationUI.activePatientId === e.detail.patientId;

                window.simulationUI.displayPatientCase(
                    e.detail.caseData,
                    e.detail.patientId,
                    false,
                    isActivePatient ? e.detail.currentStep : null
                );
            }

            // Move glow to clicked patient if sprite exists
            if (e.detail.sprite && this.scene.glowManager) {
                this.scene.glowManager.attachToSprite(e.detail.sprite);
            }
        });
        this.eventUnsubscribers.push(unsubscribe);
    }

    /**
     * Setup simulation step changed event handler
     * Triggered when patient moves to next step in timeline
     * @private
     */
    setupStepChangedHandler() {
        const unsubscribe = EventBus.on(EVENT_NAMES.SIMULATION_STEP_CHANGED, (e) => {
            if (window.simulationUI) {
                window.simulationUI.highlightCurrentStep(
                    e.detail.stepIndex,
                    e.detail.patientId
                );
            }
        });
        this.eventUnsubscribers.push(unsubscribe);
    }

    /**
     * Setup simulation complete event handler
     * Triggered when a patient finishes their timeline
     * @private
     */
    setupSimulationCompleteHandler() {
        const unsubscribe = EventBus.on(EVENT_NAMES.SIMULATION_COMPLETE);
        this.eventUnsubscribers.push(unsubscribe);
    }

    /**
     * Cleanup all event subscriptions
     * Called when scene shuts down
     */
    cleanup() {
        console.log('[SceneEventHandlers:cleanup] Cleaning up event listeners...');
        this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.eventUnsubscribers = [];
    }
}