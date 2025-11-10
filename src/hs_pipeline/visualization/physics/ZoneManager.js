/**
 * ZoneManager
 * Manages depth zones for room-based depth sorting
 */
export class ZoneManager {
    constructor(scene, map) {
        this.scene = scene;
        this.map = map;
        this.zones = [];
        
        this.loadZonesFromMap();
    }

    loadZonesFromMap() {
        const zoneLayer = this.map.getObjectLayer('depth_zones');
        
        if (!zoneLayer) {
            console.warn('No depth zone layer found in tilemap');
            return;
        }

        zoneLayer.objects.forEach(obj => {
            const zone = {
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                // Support for zone types
                zoneType: obj.properties?.find(p => p.name === 'zoneType')?.value || 'behindWall',
                name: obj.name || 'unnamed_zone'
            };
            this.zones.push(zone);
        });
    }

    /**
     * Get the zone at a specific position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} Zone object or null if no zone found
     */
    getZoneAt(x, y) {
        // Check zones in reverse order (last defined = highest priority)
        for (let i = this.zones.length - 1; i >= 0; i--) {
            const zone = this.zones[i];
            
            if (x >= zone.x && x <= zone.x + zone.width &&
                y >= zone.y && y <= zone.y + zone.height) {
                return zone;
            }
        }
        
        return null;
    }
}
