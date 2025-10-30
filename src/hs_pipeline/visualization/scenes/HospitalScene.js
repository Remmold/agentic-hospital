import { LOCATIONS } from '../utils/Constants.js';
import { AnimationManager } from '../utils/AnimationManager.js';
import { InputManager } from '../utils/InputManager.js';
import { DepthManager } from '../utils/DepthManager.js';
import { ZoneManager } from '../utils/ZoneManager.js';
import { CollisionManager } from '../utils/CollisionManager.js';
import { MovementController } from '../utils/MovementController.js';
import { DebugManager } from '../utils/DebugManager.js';
import { MapLoader } from '../utils/MapLoader.js';
import { PathfindingManager } from '../pathfinding/PathfindingManager.js';  
import { SimulationPlayer } from '../utils/SimulationPlayer.js';
import { CharacterFactory } from '../utils/CharacterFactory.js';


export class HospitalScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HospitalScene' });
        this.DEV_MODE = false;
        this.DEPTH_PANEL = false;
    }

    preload() {
        const cacheBuster = this.DEV_MODE ? `?v=${Date.now()}` : '';
        MapLoader.loadAssets(this, cacheBuster);
    }

    create() {
        this.setupManagers();
        this.setupPlayer();

        this.setupPathfinding();
        this.setupClickToMove();

        // Initialize simulation player
        this.simulationPlayer = new SimulationPlayer(this, this.pathfinding, this.depthManager);
        this.loadAndPlaySimulation();
    }

    setupManagers() {
        // Map and zones
        const mapLoader = new MapLoader(this);
        mapLoader.setupMap();

        // Core managers
        this.zoneManager = new ZoneManager(this, this.map);
        this.collisionManager = new CollisionManager(this, this.map);
        this.depthManager = new DepthManager(this, this.zoneManager);

        // Input and animation
        this.animationManager = new AnimationManager(this);
        this.inputManager = new InputManager(this);
        this.animationManager.createPatientAnimations();

        // Debug manager
        this.debugManager = new DebugManager(this, {
            devMode: this.DEV_MODE,
            depthPanel: this.DEPTH_PANEL
        });
    }

    setupPlayer() {
        this.patient = this.physics.add.sprite(28 * 32, 19 * 32, 'patient', 0);
        this.patient.lastDirection = 'down'; // Default orientation
        this.patient.setOrigin(0.5, 1);
        this.patient.setCollideWorldBounds(true);

        // Make collision body narrower and shorter
        // Width: 20px (narrower than 32px to fit through doorways)
        // Height: 24px (shorter body for better feel)
        this.patient.body.setSize(24, 24, false);

        // Center the narrower body horizontally and offset vertically
        // X offset: (32 - 20) / 2 = 6px to center the 20px body in the 32px sprite
        // Y offset: 64 - 24 = 40px to position at the feet
        this.patient.body.setOffset(6, 42);

        // Collisions
        this.physics.add.collider(this.patient, this.layers.collision);

        const collisionGroup = this.collisionManager?.getCollisionGroup();
        if (collisionGroup) {
            this.physics.add.collider(this.patient, collisionGroup);
        }

        // Movement
        this.movementController = new MovementController(this, this.patient, 250);

        this.patient.play('patient_idle_down');
        this.isPlayerPathfinding = false;
    }

    update() {
        this.depthManager.updateSpriteDepth(this.patient);
        
        // Update simulation player
        if (this.simulationPlayer) {
            this.simulationPlayer.update();
        }
        
        if (!this.isPlayerPathfinding) {
            const input = this.inputManager.getMovementInput();
            this.movementController.handleMovement(input);
        }

        this.debugManager.updateDepthPanel(this.patient);
    }
    
    // Setup pathfinding system
    setupPathfinding() {
        this.pathfinding = new PathfindingManager(
            this,
            this.map,
            this.layers.collision,
            this.collisionManager
        );
    }

    // Setup click-to-move for testing
    setupClickToMove() {
        this.input.on('pointerdown', (pointer) => {
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            
            console.log(`Moving to: ${worldX}, ${worldY}`);
            this.isPlayerPathfinding = true; // DISABLE KEYBOARD
            
            this.pathfinding.moveToPoint(this.patient, worldX, worldY, 250, () => {
                console.log('Player reached destination!');
                this.movementController.playIdleAnimation();
                this.isPlayerPathfinding = false; // RE-ENABLE KEYBOARD
            });
        });
    }

    // Simulation loader/player
    loadAndPlaySimulation() {
        fetch('./assets/simulation_results/sim_4_Orthopedics_hip_dysplasia.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Simulation loaded:', data);
                
                // Start simulation (no need to pass NPC, it spawns itself)
                this.time.delayedCall(1000, () => {
                    this.simulationPlayer.playSimulation(data, 3000);
                });
            })
            .catch(error => {
                console.error('Failed to load simulation:', error);
            });
    }
}
