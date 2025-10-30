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
        const assets = [
            { type: 'tilemapTiledJSON', key: 'hospitalMap', path: './assets/hospital_tilemap.json' },
            { type: 'spritesheet', key: 'floors', path: './assets/props/hospital_floors_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'walls', path: './assets/props/hospital_walls_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'borders', path: './assets/props/hospital_borders_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'hospital_props', path: './assets/props/hospital_props_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'generic_props', path: './assets/props/generic_props_32x32.png', config: { frameWidth: 32, frameHeight: 32 } },
            { type: 'spritesheet', key: 'patient', path: './assets/characters/patient_1.png', config: { frameWidth: 32, frameHeight: 64 } }
        ];

        assets.forEach(asset => {
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
            map.addTilesetImage('generic_props', 'generic_props')
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
            { name: 'doors', key: 'doors', depth: 20000, optional: true },
            { name: 'wall_inside', key: 'wallInside', depth: 30000 },
            { name: 'wall_in_front', key: 'wallInFront', depth: 30001 },
            { name: 'glass_outside', key: 'glassOutside', depth: 30002, optional: true },
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
