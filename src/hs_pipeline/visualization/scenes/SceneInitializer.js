/**
 * SceneInitializer
 * Handles initialization of all scene components
 * Sets up managers, player, pathfinding, and input handlers
 */

import { MapLoader } from '../core/MapLoader.js';
import { DebugManager } from '../core/DebugManager.js';
import { ZoneManager } from '../physics/ZoneManager.js';
import { CollisionManager } from '../physics/CollisionManager.js';
import { DepthManager } from '../rendering/DepthManager.js';
import { CameraManager } from '../rendering/CameraManager.js';
import DoorManager from '../rendering/DoorManager.js';
import { InputManager } from '../input/InputManager.js';
import { MovementController } from '../input/MovementController.js';
import { PathfindingManager } from '../pathfinding/PathfindingManager.js';
import { CharacterFactory } from '../animation/CharacterFactory.js';

export class SceneInitializer {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Setup all core managers (map, zones, collision, depth, doors, input, debug)
     */
    setupManagers() {
        const mapLoader = new MapLoader(this.scene);
        mapLoader.setupMap();

        this.scene.zoneManager = new ZoneManager(this.scene, this.scene.map);
        this.scene.collisionManager = new CollisionManager(this.scene, this.scene.map);
        this.scene.depthManager = new DepthManager(this.scene, this.scene.zoneManager);
        this.scene.doorManager = new DoorManager(this.scene);
        this.scene.inputManager = new InputManager(this.scene);

        this.scene.debugManager = new DebugManager(this.scene, {
            devMode: this.scene.DEV_MODE,
            collisionOverlay: this.scene.COLLISION_OVERLAY,
            depthPanel: this.scene.DEPTH_PANEL
        });

        this.scene.debugManager.initialize({
            collision: this.scene.collisionManager,
            zone: this.scene.zoneManager
        });
    }

    /**
     * Setup camera system with scrolling and mini-cam
     * Must be called after setupManagers (needs map dimensions)
     */
    setupCamera() {
        // Map dimensions: 40x50 tiles = 1280x1600 pixels
        const worldWidth = this.scene.map.widthInPixels;
        const worldHeight = this.scene.map.heightInPixels;

        this.scene.cameraManager = new CameraManager(this.scene);
        this.scene.cameraManager.initialize(worldWidth, worldHeight);

        console.log(`[SceneInitializer] Camera system initialized for ${worldWidth}x${worldHeight}px world`);
    }

    /**
     * Setup player character with physics and collision
     */
    setupPlayer() {
        this.scene.player = CharacterFactory.createCharacter(
            this.scene,
            'player',
            'player',
            28 * 32,
            19 * 32,
            {
                bodyWidth: 24,
                bodyHeight: 24,
                offsetX: 4,
                offsetY: 44,
                initialDirection: 'down'
            }
        );

        this.scene.player.setCollideWorldBounds(true);
        this.scene.physics.add.collider(this.scene.player, this.scene.layers.collision);

        const collisionGroup = this.scene.collisionManager?.getCollisionGroup();
        if (collisionGroup) {
            this.scene.physics.add.collider(this.scene.player, collisionGroup);
        }

        this.scene.movementController = new MovementController(this.scene, this.scene.player, 150);
        this.scene.isPlayerPathfinding = false;
    }

    /**
     * Setup pathfinding system
     */
    setupPathfinding() {
        this.scene.pathfinding = new PathfindingManager(
            this.scene,
            this.scene.map,
            this.scene.layers.collision,
            this.scene.collisionManager
        );
    }

    /**
     * Setup click-to-move input handler
     */
    setupClickToMove() {
        this.scene.input.on('pointerdown', (pointer) => {
            // Don't move if clicking on an interactive object (like a patient)
            if (pointer.event.defaultPrevented) {
                return;
            }

            const worldX = pointer.worldX;
            const worldY = pointer.worldY;

            this.scene.isPlayerPathfinding = true;
            this.scene.pathfinding.moveToPoint(this.scene.player, worldX, worldY, 250, () => {
                CharacterFactory.playAnimation(this.scene.player, 'idle', this.scene.player.lastDirection);
                this.scene.isPlayerPathfinding = false;
            });
        });
    }
}
