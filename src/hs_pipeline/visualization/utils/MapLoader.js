/**
 * Handles tilemap loading and layer setup
 */
export class MapLoader {
    constructor(scene) {
        this.scene = scene;
    }

    /**
 * Load all required assets
 */
    static loadAssets(scene, cacheBuster = '') {
        // Tilemap and props
        const propAssets = [
            { type: 'tilemapTiledJSON', key: 'hospitalMap', path: './assets/hospital_tilemap.json' },
            { type: 'spritesheet', key: 'floors', path: './assets/props/hospital_floors_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'walls', path: './assets/props/hospital_walls_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'borders', path: './assets/props/hospital_borders_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'hospital_props', path: './assets/props/hospital_props_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'hospital_windows', path: './assets/props/hospital_windows_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'generic_props', path: './assets/props/generic_props_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'grocery_props', path: './assets/props/grocery_props_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'wooden_door', path: './assets/doors/animated_door_big_5_32x32.png', config: { frameWidth: 32, frameHeight: 96 } },
            { type: 'spritesheet', key: 'surgery_door', path: './assets/doors/animated_hospital_surgery_door_32x32.png', config: { frameWidth: 64, frameHeight: 96 } },
            { type: 'spritesheet', key: 'room_labels', path: './assets/labels/room_labels_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
        ];

        // Generate patient sprites dynamically (pat_1.png through pat_29.png)
        const patientAssets = MapLoader.generatePatientAssets(1, 44);

        // Staff sprites
        const staffAssets = [
            { type: 'spritesheet', key: 'nurse_1', path: './assets/characters/nurse_1.png', config: { frameWidth: 32, frameHeight: 64 } },
            { type: 'spritesheet', key: 'nurse_2', path: './assets/characters/nurse_2.png', config: { frameWidth: 32, frameHeight: 64 } },
            { type: 'spritesheet', key: 'nurse_3', path: './assets/characters/nurse_3.png', config: { frameWidth: 32, frameHeight: 64 } },
            { type: 'spritesheet', key: 'nurse_4', path: './assets/characters/nurse_4.png', config: { frameWidth: 32, frameHeight: 64 } },
            { type: 'spritesheet', key: 'doctor_1', path: './assets/characters/doctor_1.png', config: { frameWidth: 32, frameHeight: 64 } },
            { type: 'spritesheet', key: 'doctor_2', path: './assets/characters/doctor_2.png', config: { frameWidth: 32, frameHeight: 64 } },
            { type: 'spritesheet', key: 'mri_1', path: './assets/characters/mri_1.png', config: { frameWidth: 32, frameHeight: 64 } },
            { type: 'spritesheet', key: 'xray_1', path: './assets/characters/xray_1.png', config: { frameWidth: 32, frameHeight: 64 } },
            { type: 'spritesheet', key: 'player', path: './assets/characters/pat_player.png', config: { frameWidth: 32, frameHeight: 64 } },
        ];

        // Combine all assets
        const allAssets = [...propAssets, ...patientAssets, ...staffAssets];

        // Clear cache for all keys
        const keysToRemove = allAssets.map(a => a.key);
        keysToRemove.forEach(key => scene.textures.remove(key));

        // Load all assets
        allAssets.forEach(asset => {
            const path = `${asset.path}${cacheBuster}`;
            if (asset.type === 'tilemapTiledJSON') {
                scene.load.tilemapTiledJSON(asset.key, path);
            } else {
                scene.load.spritesheet(asset.key, path, asset.config);
            }
        });

        scene.load.on('loaderror', (file) => console.error('Failed to load:', file.key));
    }

    /**
     * Generate patient sprite assets dynamically
     * @param {number} startNum - Starting patient number (e.g., 1)
     * @param {number} endNum - Ending patient number (e.g., 44 (current max))
     */
    static generatePatientAssets(startNum, endNum) {
        const patients = [];
        for (let i = startNum; i <= endNum; i++) {
            const key = `pat_${i}`;
            patients.push({
                type: 'spritesheet',
                key: key,
                path: `./assets/characters/${key}.png`,
                config: { frameWidth: 32, frameHeight: 64 }
            });
        }
        return patients;
    }

    /**
     * Setup tilemap with all layers
     */
    setupMap() {
        const map = this.scene.make.tilemap({ key: 'hospitalMap' });
        const tilesets = this.loadTilesets(map);
        const layers = this.createLayers(map, tilesets);

        this.scene.map = map;
        this.scene.layers = layers;

        console.log('Map loaded successfully!');
        return { map, layers };
    }

    /**
     * Load all tilesets
     */
    loadTilesets(map) {
        return [
            map.addTilesetImage('floors', 'floors'),
            map.addTilesetImage('walls', 'walls'),
            map.addTilesetImage('borders', 'borders'),
            map.addTilesetImage('hospital_props', 'hospital_props'),
            map.addTilesetImage('hospital_windows', 'hospital_windows'),
            map.addTilesetImage('generic_props', 'generic_props'),
            map.addTilesetImage('grocery_props', 'grocery_props'),
            map.addTilesetImage('room_labels', 'room_labels'),
        ];
    }

    /**
     * Create all layers with appropriate depths
     */
    createLayers(map, tilesets) {
        const layerConfig = [
            { name: 'floor_layer', key: 'floor', depth: -1000 },
            { name: 'wall_behind', key: 'wallBehind', depth: 20 },
            { name: 'props_on_wall', key: 'propsOnWall', depth: 30 },
            { name: 'props_behind', key: 'propsBehind', depth: 40 },
            { name: 'props_dynamic', key: 'propsDynamic', depth: 50 },
            { name: 'props', key: 'props', depth: 60 },
            { name: 'props_dynamic_in_front', key: 'propsDynamicInFront', depth: 70 },
            { name: 'props_in_front', key: 'propsInFront', depth: 10000 },
            { name: 'wall_inside', key: 'wallInside', depth: 30000 },
            { name: 'labels', key: 'room_labels', depth: 30000 },
            { name: 'wall_in_front', key: 'wallInFront', depth: 30001 },
            { name: 'glass_outside', key: 'glassOutside', depth: 30002 },
            { name: 'collision', key: 'collision', depth: 0, hidden: true }
        ];

        const layers = {};

        layerConfig.forEach(config => {
            const layer = map.createLayer(config.name, tilesets, 0, 0);

            if (!layer && config.optional) return;

            if (layer) {
                layer.setDepth(config.depth);

                if (config.hidden) {
                    layer.setVisible(false);
                }

                if (config.name === 'collision') {
                    layer.setCollisionByExclusion([-1]);
                }

                layers[config.key] = layer;
            }
        });

        return layers;
    }
}
