import { AnimationManager } from '../utils/AnimationManager.js';
import { InputManager } from '../utils/InputManager.js';
import { DepthManager } from '../utils/DepthManager.js';
import { ZoneManager } from '../utils/ZoneManager.js';
import { MovementController } from '../utils/MovementController.js';

export class HospitalScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HospitalScene' });
        this.DEV_MODE = true; // Enable dev mode for automatic cache busting
    }

    preload() {
        // Bust cache if DEV_MODE is enables
        const cacheBuster = this.DEV_MODE ? `?v=${Date.now()}` : '';

        // Load Tiled tilemap JSON
        this.load.tilemapTiledJSON('hospitalMap', `./assets/hospital_tilemap.json${cacheBuster}`);

        // Load the tilesets
        this.load.spritesheet('floors', `./assets/props/hospital_floors_32x32.png${cacheBuster}`, {
            frameWidth: 32,
            frameHeight: 32
        });

        this.load.spritesheet('walls', `./assets/props/hospital_walls_32x32.png${cacheBuster}`, {
            frameWidth: 32,
            frameHeight: 32
        });

        this.load.spritesheet('borders', `./assets/props/hospital_borders_32x32.png${cacheBuster}`, {
            frameWidth: 32,
            frameHeight: 32
        });

        this.load.spritesheet('hospital_props', `./assets/props/hospital_props_32x32.png${cacheBuster}`, {
            frameWidth: 32,
            frameHeight: 32
        });

        this.load.spritesheet('generic_props', `./assets/props/generic_props_32x32.png${cacheBuster}`, {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load character spritesheets
        this.load.spritesheet('patient', `./assets/characters/patient_1.png${cacheBuster}`, {
            frameWidth: 32,
            frameHeight: 64
        });

        this.load.on('loaderror', (file) => {
            console.log('Failed to load:', file.key);
        });
    }

    create() {
        // Initialize map and layers
        this.setupMap();

        // Initialize zone manager AFTER map is created
        this.zoneManager = new ZoneManager(this, this.map);

        // Initialize managers
        this.animationManager = new AnimationManager(this);
        this.inputManager = new InputManager(this);
        this.depthManager = new DepthManager(this, this.zoneManager);

        // Create animations
        this.animationManager.createPatientAnimations();

        // Create player
        this.setupPlayer();

        console.log('Map loaded successfully!');
        console.log('Use WASD or Arrow Keys to move');
    }

    // Setup tilemap and layers
    setupMap() {
        const map = this.make.tilemap({ key: 'hospitalMap' });

        const floorTileset = map.addTilesetImage('floors', 'floors');
        const wallTileset = map.addTilesetImage('walls', 'walls');
        const borderTileset = map.addTilesetImage('borders', 'borders');
        const hospitalPropsTileset = map.addTilesetImage('hospital_props', 'hospital_props');
        const genericPropsTileset = map.addTilesetImage('generic_props', 'generic_props');
        const tilesets = [floorTileset, wallTileset, borderTileset, hospitalPropsTileset, genericPropsTileset];

        // Create layers with static depths
        const floorLayer = map.createLayer('floor_layer', tilesets, 0, 0);
        floorLayer.setDepth(-1000);

        const wallBehindLayer = map.createLayer('wall_behind', tilesets, 0, 0);
        wallBehindLayer.setDepth(2);

        const propsBehindLayer = map.createLayer('props_behind', tilesets, 0, 0);
        propsBehindLayer.setDepth(3);

        const propsLayer = map.createLayer('props', tilesets, 0, 0);
        propsLayer.setDepth(4);

        const propsInFrontLayer = map.createLayer('props_in_front', tilesets, 0, 0);
        propsInFrontLayer.setDepth(20000);

        const wallInsideLayer = map.createLayer('wall_inside', tilesets, 0, 0);
        wallInsideLayer.setDepth(30000);

        const wallInFrontLayer = map.createLayer('wall_in_front', tilesets, 0, 0);
        wallInFrontLayer.setDepth(30001);

        // Collision
        const collisionLayer = map.createLayer('collision', tilesets, 0, 0);
        collisionLayer.setVisible(false);
        collisionLayer.setCollisionByExclusion([-1]);

        this.map = map;
        this.layers = {
            floor: floorLayer,
            wallBehind: wallBehindLayer,
            propsBehind: propsBehindLayer,
            props: propsLayer,
            propsInFront: propsInFrontLayer,
            wallInside: wallInsideLayer,
            wallInFront: wallInFrontLayer,
            collision: collisionLayer
        };
    }

    // Setup player sprite and physics
    setupPlayer() {
        this.patient = this.physics.add.sprite(17 * 32, 28 * 32, 'patient', 0);
        this.patient.setOrigin(0.5, 1);
        this.patient.setCollideWorldBounds(true);

        // Make collision body narrower and shorter
        // Width: 20px (narrower than 32px to fit through doorways)
        // Height: 24px (shorter body for better feel)
        this.patient.body.setSize(24, 24, false);

        // Center the narrower body horizontally and offset vertically
        // X offset: (32 - 20) / 2 = 6px to center the 20px body in the 32px sprite
        // Y offset: 64 - 24 = 40px to position at the feet
        this.patient.body.setOffset(6, 40);

        // Set up collisions
        this.physics.add.collider(this.patient, this.layers.collision);

        // Initialize movement controller
        this.movementController = new MovementController(this, this.patient, 250);

        // Play initial idle animation
        this.patient.play('patient_idle_down');
    }

    update() {
        // Update depth based on Y position
        this.depthManager.updateSpriteDepth(this.patient);

        // Handle player movement
        const input = this.inputManager.getMovementInput();
        this.movementController.handleMovement(input);
    }
}
