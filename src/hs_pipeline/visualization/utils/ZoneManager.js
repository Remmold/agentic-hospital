/**
 * Manages depth zones for room-based depth sorting
 */
export class ZoneManager {
    constructor(scene, map) {
        this.scene = scene;
        this.map = map;
        this.zones = [];

        this.loadZonesFromMap();
    }

    // Load depth zones from Tiled object layer
    loadZonesFromMap() {
        const zoneLayer = this.map.getObjectLayer('depth_zones');

        if (!zoneLayer) {
            console.warn('No depth_zones layer found in tilemap');
            return;
        }

        zoneLayer.objects.forEach(obj => {
            const zone = {
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                behindWall: obj.properties?.find(p => p.name === 'behindWall')?.value ?? false,
                name: obj.name || 'unnamed_zone'
            };

            this.zones.push(zone);
            console.log(`Loaded zone: ${zone.name}, behindWall: ${zone.behindWall}`);
        });

        console.log(`Total zones loaded: ${this.zones.length}`);
    }

    /* Check if position is inside a "behind wall" zone
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if player should be behind walls
     */
    isInsideRoom(x, y) {
        for (const zone of this.zones) {
            if (zone.behindWall &&
                x >= zone.x && x <= zone.x + zone.width &&
                y >= zone.y && y <= zone.y + zone.height) {
                return true;
            }
        }
        return false;
    }
}
