import { InputManager } from '../utils/InputManager.js';
import { DepthManager } from '../utils/DepthManager.js';
import { ZoneManager } from '../utils/ZoneManager.js';
import DoorManager from '../utils/DoorManager.js';
import { CollisionManager } from '../utils/CollisionManager.js';
import { MovementController } from '../utils/MovementController.js';
import { DebugManager } from '../utils/DebugManager.js';
import { MapLoader } from '../utils/MapLoader.js';
import { PathfindingManager } from '../pathfinding/PathfindingManager.js';
import { PatientQueueManager } from '../utils/PatientQueueManager.js';
import { StaffManager } from '../utils/StaffManager.js';
import { CharacterFactory } from '../utils/CharacterFactory.js';
import { UIManager } from '../ui/UIManager.js';
import { GlowManager } from '../utils/GlowManager.js';

export class HospitalScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HospitalScene' });
        this.DEV_MODE = true;
        this.DEPTH_PANEL = false;
    }

    preload() {
        const cacheBuster = this.DEV_MODE ? `?v=${Date.now()}` : '';
        MapLoader.loadAssets(this, cacheBuster);
    }

    async create() {
        console.log('[HospitalScene] Starting create...');
        
        // Initialize UI Manager FIRST
        this.setupUI();
        
        this.setupManagers();
        this.setupPlayer();
        this.setupPathfinding();
        this.setupClickToMove();

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

        // Hook into patient spawning to automatically add new patients to door triggers
        const originalSpawnPatient = this.patientQueue.spawnPatient.bind(this.patientQueue);
        this.patientQueue.spawnPatient = function (availableCases) {
            const result = originalSpawnPatient(availableCases);

            // After patient spawns, add them to door triggers
            if (this.activePatient?.player?.npc) {
                this.scene.doorManager.activateTriggers(this.activePatient.player.npc);
                console.log('[DoorManager] Active patient registered for door triggers');
            }

            this.waitingPatients.forEach(patient => {
                if (patient.player?.npc) {
                    this.scene.doorManager.activateTriggers(patient.player.npc);
                }
            });

            return result;
        };

        console.log('[HospitalScene] Setup complete! Auto-generation started.');
    }

    setupUI() {
        try {
            // Create UI Manager
            window.simulationUI = new UIManager();
            console.log('[HospitalScene] UI Manager created successfully');
            
            // Listen to UI events for pause/play
            window.addEventListener('simulationPause', (e) => {
                const isPaused = e.detail.isPaused;
                console.log(`[HospitalScene] Simulation ${isPaused ? 'PAUSED' : 'RESUMED'}`);
                
                // Pause/resume the active patient
                if (this.patientQueue && this.patientQueue.activePatient) {
                    this.patientQueue.activePatient.player.setPaused(isPaused);
                }
            });
            
            // Listen to speed changes
            window.addEventListener('simulationSpeed', (e) => {
                const speed = e.detail.speed;
                console.log(`[HospitalScene] Speed changed to ${speed}x`);
                
                // Update speed for active patient
                if (this.patientQueue && this.patientQueue.activePatient) {
                    this.patientQueue.activePatient.player.setSpeedMultiplier(speed);
                }
            });
            
            // Listen for patient case loaded event (initial load or timeline start)
            window.addEventListener('patientCaseLoaded', (e) => {
                console.log('[HospitalScene] patientCaseLoaded event received');
                if (window.simulationUI) {
                    // This patient is becoming active, so isActive = true
                    window.simulationUI.displayPatientCase(
                        e.detail.caseData, 
                        e.detail.patientId, 
                        true, // This is the active patient
                        null  // No current step to highlight yet
                    );
                    
                    // Apply current UI pause and speed state to the new active patient
                    if (e.detail.sprite && e.detail.sprite.simulationPlayer) {
                        const isPaused = window.simulationUI.getIsPaused();
                        const speed = window.simulationUI.getCurrentSpeed();
                        
                        e.detail.sprite.simulationPlayer.setPaused(isPaused);
                        e.detail.sprite.simulationPlayer.setSpeedMultiplier(speed);
                        
                        console.log(`[HospitalScene] Applied UI state to new patient: paused=${isPaused}, speed=${speed}x`);
                    }
                }
                // Attach glow to the sprite if provided
                if (e.detail.sprite && this.glowManager) {
                    this.glowManager.attachToSprite(e.detail.sprite);
                }
            });
            
            // Listen for patient clicked event (user clicks a different patient)
            window.addEventListener('patientClicked', (e) => {
                console.log('[HospitalScene] patientClicked event received');
                if (window.simulationUI) {
                    // Check if clicked patient is the currently active one
                    const isActivePatient = window.simulationUI.activePatientId === e.detail.patientId;
                    
                    // Display patient case, passing currentStep if this is the active patient
                    window.simulationUI.displayPatientCase(
                        e.detail.caseData, 
                        e.detail.patientId, 
                        false, // Not marking as active, just viewing
                        isActivePatient && e.detail.isPlaying ? e.detail.currentStep : null
                    );
                }
                // Move glow to clicked patient
                if (e.detail.sprite && this.glowManager) {
                    this.glowManager.attachToSprite(e.detail.sprite);
                }
            });
            
            // Listen for step changes
            window.addEventListener('simulationStepChanged', (e) => {
                if (window.simulationUI) {
                    window.simulationUI.highlightCurrentStep(
                        e.detail.stepIndex,
                        e.detail.patientId
                    );
                }
            });
            
            // Listen for simulation complete
            window.addEventListener('simulationComplete', (e) => {
                console.log(`[HospitalScene] Patient ${e.detail.patientName} completed simulation`);
            });
            
            // Listen for patient chip clicks
            window.addEventListener('patientChipClicked', (e) => {
                console.log('[HospitalScene] patientChipClicked event received');
                if (window.simulationUI && e.detail.caseData) {
                    // Same as patientClicked - just viewing, not making active
                    const isActivePatient = window.simulationUI.activePatientId === e.detail.patientId;
                    const currentStep = isActivePatient && e.detail.isPlaying ? e.detail.currentStep : null;
                    
                    window.simulationUI.displayPatientCase(
                        e.detail.caseData,
                        e.detail.patientId,
                        false,
                        currentStep
                    );
                }
                // Move glow to clicked patient if sprite exists
                if (e.detail.sprite && this.glowManager) {
                    this.glowManager.attachToSprite(e.detail.sprite);
                }
            });
            
            console.log('[HospitalScene] UI event listeners attached');
        } catch (error) {
            console.error('[HospitalScene] Error setting up UI:', error);
        }
    }

    setupManagers() {
        // Map and zones
        const mapLoader = new MapLoader(this);
        mapLoader.setupMap();

        // Core managers
        this.zoneManager = new ZoneManager(this, this.map);
        this.collisionManager = new CollisionManager(this, this.map);
        this.depthManager = new DepthManager(this, this.zoneManager);

        // Door zones + sprites
        this.doorManager = new DoorManager(this);

        // Input manager
        this.inputManager = new InputManager(this);

        // Debug manager
        this.debugManager = new DebugManager(this, {
            devMode: this.DEV_MODE,
            depthPanel: this.DEPTH_PANEL
        });

        this.debugManager.initialize({
            collision: this.collisionManager,
            zone: this.zoneManager
        });
    }

    setupPlayer() {
        this.player = CharacterFactory.createCharacter(
            this,
            'player',
            'player',
            28 * 32,
            19 * 32,
            {
                bodyWidth: 24,
                bodyHeight: 24,
                offsetX: 6,
                offsetY: 42,
                initialDirection: 'down'
            }
        );

        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.layers.collision);

        const collisionGroup = this.collisionManager?.getCollisionGroup();
        if (collisionGroup) {
            this.physics.add.collider(this.player, collisionGroup);
        }

        this.movementController = new MovementController(this, this.player, 150);
        this.isPlayerPathfinding = false;
    }

    setupPathfinding() {
        this.pathfinding = new PathfindingManager(
            this,
            this.map,
            this.layers.collision,
            this.collisionManager
        );
    }

    setupClickToMove() {
        this.input.on('pointerdown', (pointer) => {
            // Don't move if clicking on an interactive object (like a patient)
            if (pointer.event.defaultPrevented) {
                return;
            }

            const worldX = pointer.worldX;
            const worldY = pointer.worldY;

            this.isPlayerPathfinding = true;
            this.pathfinding.moveToPoint(this.player, worldX, worldY, 250, () => {
                CharacterFactory.playAnimation(this.player, 'idle', this.player.lastDirection);
                this.isPlayerPathfinding = false;
            });
        });
    }

    update() {
        // Safety checks
        if (!this.player || !this.depthManager) return;

        this.depthManager.updateSpriteDepth(this.player);

        // Update staff
        if (this.staffManager) {
            this.staffManager.update();
        }

        // Update patient queue
        if (this.patientQueue && this.availableCases) {
            this.patientQueue.update(this.availableCases);
            
            // Update patient selector UI
            if (window.simulationUI) {
                this.updatePatientSelectorUI();
            }
        }

        // Keyboard movement
        if (!this.isPlayerPathfinding) {
            const input = this.inputManager.getMovementInput();
            this.movementController.handleMovement(input);
        }

        // Door updating
        if (this.doorManager) {
            this.doorManager.updateDoors();
        }

        // Update glow position to follow selected patient
        if (this.glowManager) {
            this.glowManager.updatePosition();
        }

        this.debugManager.updateDepthPanel(this.player);
    }

    updatePatientSelectorUI() {
        if (!this.patientQueue || !window.simulationUI) return;
        
        // Get active patient
        const activePatient = this.patientQueue.activePatient ? {
            id: this.patientQueue.activePatient.id,
            name: this.patientQueue.activePatient.player.simulationData?.patient?.name || 'Unknown',
            caseData: this.patientQueue.activePatient.player.simulationData,
            sprite: this.patientQueue.activePatient.player.npc,
            currentStep: this.patientQueue.activePatient.player.lastHighlightedStep,
            isPlaying: this.patientQueue.activePatient.player.isPlaying
        } : null;
        
        // Get waiting patients
        const waitingPatients = this.patientQueue.waitingPatients.map(patient => ({
            id: patient.id,
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