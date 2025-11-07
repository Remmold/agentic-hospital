/**
 * HospitalScene.js
 * Main hospital scene orchestrator
 * Coordinates scene lifecycle, managers, and game systems
 */

import { MapLoader } from '../utils/MapLoader.js';
import { PatientQueueManager } from '../patient/PatientQueueManager.js';
import { StaffManager } from '../staff/StaffManager.js';
import { UIManager } from '../ui/UIManager.js';
import { GlowManager } from '../utils/GlowManager.js';
import { SceneEventHandlers } from './SceneEventHandlers.js';
import { SceneInitializer } from './SceneInitializer.js';

export class HospitalScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HospitalScene' });
        this.DEV_MODE = true;
        this.DEPTH_PANEL = false;
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
        console.log('[HospitalScene] Starting create...');

        // Initialize UI and event handlers
        this.setupUI();

        // Initialize scene components
        const initializer = new SceneInitializer(this);
        initializer.setupManagers();
        initializer.setupPlayer();
        initializer.setupPathfinding();
        initializer.setupClickToMove();

        // Initialize glow manager for patient selection
        this.glowManager = new GlowManager(this);

        // Initialize staff NPCs
        this.staffManager = new StaffManager(this, this.depthManager);
        this.staffManager.spawnAllStaff();

        // Initialize patient queue
        this.patientQueue = new PatientQueueManager(this, this.pathfinding, this.depthManager);

        // Load available cases
        const availableCases = await this.patientQueue.loadAvailableCases();
        console.log(`[HospitalScene] Available cases: ${availableCases.length}`);

        if (availableCases.length === 0) {
            console.error('[HospitalScene] No simulation cases found!');
            return;
        }

        this.availableCases = availableCases;

        // Start the automatic patient generation system
        this.patientQueue.startAutoPatientGeneration(availableCases);

        // Activate doors for player
        this.doorManager.activateTriggers(this.player);
    }

    /**
     * Setup UI manager and event handlers
     * @private
     */
    setupUI() {
        try {
            // Create UI Manager
            window.simulationUI = new UIManager();

            // Setup event handlers
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

        // Update player depth
        this.depthManager.updateSpriteDepth(this.player);

        // Update staff NPCs
        if (this.staffManager) {
            this.staffManager.update();
        }

        // Update patient queue and UI
        if (this.patientQueue && this.availableCases) {
            this.patientQueue.update(this.availableCases);

            // Update patient selector UI
            if (window.simulationUI) {
                this.updatePatientSelectorUI();
            }
        }

        // Handle keyboard movement (if not using click-to-move)
        if (!this.isPlayerPathfinding) {
            const input = this.inputManager.getMovementInput();
            this.movementController.handleMovement(input);
        }

        // Update doors
        if (this.doorManager) {
            this.doorManager.updateDoors();
        }

        // Update glow position to follow selected patient
        if (this.glowManager) {
            this.glowManager.updatePosition();
        }

        // Update debug panel
        this.debugManager.updateDepthPanel(this.player);
    }

    /**
     * Scene shutdown - cleanup resources
     */
    shutdown() {
        console.log('[HospitalScene] Shutting down...');

        // Cleanup event handlers
        if (this.eventHandlers) {
            this.eventHandlers.cleanup();
        }

        // Clean up managers
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