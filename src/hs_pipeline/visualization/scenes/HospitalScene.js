import { LOCATIONS } from '../utils/Constants.js';
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
        this.DEV_MODE = true;
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
        // Use CharacterFactory to create player
        this.player = CharacterFactory.createCharacter(
            this,
            'player',
            'patient_1',
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

        // Collisions
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.layers.collision);

        const collisionGroup = this.collisionManager?.getCollisionGroup();
        if (collisionGroup) {
            this.physics.add.collider(this.player, collisionGroup);
        }

        // Movement controller
        this.movementController = new MovementController(this, this.player, 250);
        this.isPlayerPathfinding = false;
    }

    update() {
        this.depthManager.updateSpriteDepth(this.player);

        // Update simulation player
        if (this.simulationPlayer) {
            this.simulationPlayer.update();
        }

        // Keyboard movement (if not pathfinding)
        if (!this.isPlayerPathfinding) {
            const input = this.inputManager.getMovementInput();
            this.movementController.handleMovement(input);
        }

        this.debugManager.updateDepthPanel(this.player);
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
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            console.log(`Moving to: ${worldX}, ${worldY}`);

            this.isPlayerPathfinding = true;
            this.pathfinding.moveToPoint(this.player, worldX, worldY, 250, () => {
                console.log('Player reached destination!');
                CharacterFactory.playAnimation(this.player, 'idle', this.player.lastDirection);
                this.isPlayerPathfinding = false;
            });
        });
    }

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
                this.time.delayedCall(1000, () => {
                    this.simulationPlayer.playSimulation(data, 3000);
                });
            })
            .catch(error => {
                console.error('Failed to load simulation:', error);
            });
    }
}
