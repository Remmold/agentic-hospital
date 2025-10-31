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
import { PatientQueueManager } from '../utils/PatientQueueManager.js';
import { StaffManager } from '../utils/StaffManager.js';
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

    async create() {
        this.setupManagers();
        this.setupPlayer();
        this.setupPathfinding();
        this.setupClickToMove();

        // Initialize staff NPCs FIRST
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

        console.log('[HospitalScene] Setup complete! Auto-generation started.');
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

        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.layers.collision);

        const collisionGroup = this.collisionManager?.getCollisionGroup();
        if (collisionGroup) {
            this.physics.add.collider(this.player, collisionGroup);
        }

        this.movementController = new MovementController(this, this.player, 250);
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
        }

        // Keyboard movement
        if (!this.isPlayerPathfinding) {
            const input = this.inputManager.getMovementInput();
            this.movementController.handleMovement(input);
        }

        this.debugManager.updateDepthPanel(this.player);
    }
}
