/**
 * HospitalScene
 * Main hospital scene orchestrator
 * Coordinates scene lifecycle, managers, and game systems
 */

import { MapLoader } from '../core/MapLoader.js';
import { PatientQueueManager } from '../patient/PatientQueueManager.js';
import { StaffManager } from '../staff/StaffManager.js';
import { UIManager } from '../ui/UIManager.js';
import { GlowManager } from '../rendering/GlowManager.js';
import { SceneEventHandlers } from './SceneEventHandlers.js';
import { SceneInitializer } from './SceneInitializer.js';

export class HospitalScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HospitalScene' });
        this.DEV_MODE = true; // Cache busting on
        this.COLLISION_OVERLAY = false; // Red collision overlay
        this.DEPTH_PANEL = false; // Depth panel with z-index info
    }

    /**
     * Preload all game assets
     */
    preload() {
        const cacheBuster = this.DEV_MODE ? `?v=${Date.now()}` : '';
        MapLoader.loadAssets(this, cacheBuster);
    }

    /**
     * Create and initialize the scene
     */
    async create() {
        this.setupUI();

        const initializer = new SceneInitializer(this);
        initializer.setupManagers();
        initializer.setupPlayer();
        initializer.setupPathfinding();
        initializer.setupClickToMove();

        this.staffManager = new StaffManager(this, this.depthManager);
        this.staffManager.spawnAllStaff();

        this.glowManager = new GlowManager(this);
        this.patientQueue = new PatientQueueManager(this, this.pathfinding, this.depthManager);
        const availableCases = await this.patientQueue.loadAvailableCases();

        if (availableCases.length === 0) {
            console.error('[HospitalScene] No simulation cases found!');
            return;
        }

        this.availableCases = availableCases;

        this.doorManager.activateTriggers(this.player);
    }

    /**
     * Setup UI manager and event handlers
     * @private
     */
    setupUI() {
        try {
            window.simulationUI = new UIManager();

            this.eventHandlers = new SceneEventHandlers(this);
            this.eventHandlers.setupAllHandlers();

        } catch (error) {
            console.error('[HospitalScene] Error setting up UI:', error);
        }
    }

    /**
     * Update loop - called every frame
     * @param {number} time - Total elapsed time
     * @param {number} delta - Time since last frame
     */
    update(time, delta) {
        // Safety checks
        if (!this.player || !this.depthManager) return;

        this.depthManager.updateSpriteDepth(this.player);

        if (this.staffManager) {
            this.staffManager.update();
        }

        // Update patient queue and UI
        if (this.patientQueue && this.availableCases) {
            this.patientQueue.update(this.availableCases);

            if (window.simulationUI) {
                this.updatePatientSelectorUI();
            }
        }

        if (!this.isPlayerPathfinding) {
            const input = this.inputManager.getMovementInput();
            this.movementController.handleMovement(input);
        }

        if (this.doorManager) {
            this.doorManager.updateDoors();
        }

        if (this.glowManager) {
            this.glowManager.updatePosition();
        }

        this.debugManager.updateDepthPanel(this.player);
    }

    /**
     * Scene shutdown - cleanup resources
     */
    shutdown() {
        if (this.eventHandlers) {
            this.eventHandlers.cleanup();
        }

        if (this.glowManager) {
            this.glowManager.destroy();
        }
    }

    /**
     * Update patient selector UI with current queue state
     * @private
     */
    updatePatientSelectorUI() {
        if (!this.patientQueue || !window.simulationUI) return;

        // Get active patient - USE SPRITE'S UNIQUEID
        const activePatient = this.patientQueue.activePatient ? {
            id: this.patientQueue.activePatient.player.npc?.uniqueId || this.patientQueue.activePatient.id,
            name: this.patientQueue.activePatient.player.simulationData?.patient?.name || 'Unknown',
            caseData: this.patientQueue.activePatient.player.simulationData,
            sprite: this.patientQueue.activePatient.player.npc,
            currentStep: this.patientQueue.activePatient.player.lastHighlightedStep,
            isPlaying: this.patientQueue.activePatient.player.isPlaying
        } : null;

        // Get waiting patients - USE SPRITE'S UNIQUEID
        const waitingPatients = this.patientQueue.waitingPatients.map(patient => ({
            id: patient.player.npc?.uniqueId || patient.id,
            name: patient.caseData?.patient?.name || 'Unknown',
            caseData: patient.caseData,
            sprite: patient.player?.npc,
            currentStep: -1,
            isPlaying: false
        }));

        // Get completed patients (last 2)
        const completedPatients = this.patientQueue.completedPatients.slice(-2).map(patient => ({
            id: patient.id,
            name: patient.player?.simulationData?.patient?.name || 'Unknown',
            caseData: patient.player?.simulationData,
            currentStep: -1,
            isPlaying: false
        }));

        window.simulationUI.updatePatientSelector(activePatient, waitingPatients, completedPatients);
    }
}
