import { AnimationManager } from '../animation/AnimationManager.js';

export default class DoorManager {
    constructor(scene) {
        this.scene = scene;
        this.doors = {};
        AnimationManager.createWoodenDoorAnims(scene);
        AnimationManager.createSurgeryDoorAnims(scene);
        this.loadDoors();
    }

    loadDoors() {
        const doorZonesLayer = this.scene.map.getObjectLayer('door_zones');
        if (!doorZonesLayer || !doorZonesLayer.objects.length) {
            console.warn('[DoorManager] No door_zones layer found');
            return;
        }

        this.doors = {};

        doorZonesLayer.objects.forEach(obj => {
            const doorIdProp = obj.properties?.find(p => p.name === 'door_id');
            const doorTypeProp = obj.properties?.find(p => p.name === 'door_type');

            if (!doorIdProp) {
                console.warn('[DoorManager] Door zone without door_id property');
                return;
            }

            const doorId = doorIdProp.value;
            const doorType = doorTypeProp ? doorTypeProp.value : 'wooden';  // Default to wooden
            const triggerX = obj.x + obj.width / 2;
            const doorY = obj.y + 32;

            // Create invisible trigger zone (sensor)
            const trigger = this.scene.add.zone(triggerX, obj.y + obj.height / 2, obj.width, obj.height);
            this.scene.physics.world.enable(trigger);
            trigger.body.setAllowGravity(false);

            // Create door sprite based on type
            const spritesheetKey = doorType === 'surgery' ? 'surgery_door' : 'wooden_door';
            const door = this.scene.add.sprite(triggerX, doorY - 16, spritesheetKey, 0);
            door.setOrigin(0.5, 0.5);
            door.setDepth(40);

            // Store door type for animation selection
            this.doors[doorId] = {
                trigger,
                door,
                doorType,
                isOpen: false,
                closeTimer: null,
                overlappingSprites: new Set()
            };
            console.log(`[DoorManager] Loaded ${doorType} door: ${doorId}`);
        });

        console.log(`[DoorManager] Total doors loaded: ${Object.keys(this.doors).length}`);
    }

    activateTriggers(spritesOrGroup) {
        let sprites = Array.isArray(spritesOrGroup)
            ? spritesOrGroup
            : spritesOrGroup.getChildren
                ? spritesOrGroup.getChildren()
                : [spritesOrGroup];

        Object.values(this.doors).forEach(doorObj => {
            sprites.forEach(sprite => {
                // Overlap start (enter zone)
                this.scene.physics.add.overlap(
                    sprite,
                    doorObj.trigger,
                    () => this.onDoorZoneEnter(doorObj, sprite),
                    null,
                    this
                );

                // Overlap end is trickier - we use a separate check in update
                // Store reference to check later
                sprite._doorZones = sprite._doorZones || [];
                sprite._doorZones.push(doorObj);
            });
        });
    }

    onDoorZoneEnter(doorObj, sprite) {
        doorObj.overlappingSprites.add(sprite);

        if (!doorObj.isOpen) {
            // Play animation based on door type
            const animKey = doorObj.doorType === 'surgery' ? 'surgery_door_open' : 'wooden_door_open';
            doorObj.door.play(animKey);
            doorObj.isOpen = true;
            console.log(`[DoorManager] Door ${doorObj.doorType} opened`);

            if (doorObj.closeTimer) {
                this.scene.time.removeEvent(doorObj.closeTimer);
                doorObj.closeTimer = null;
            }
        }
    }

    updateDoors() {
        // Check each door to see if sprites are still overlapping
        Object.values(this.doors).forEach(doorObj => {
            const spritesStillOverlapping = [];

            doorObj.overlappingSprites.forEach(sprite => {
                const isOverlapping = this.scene.physics.overlap(sprite, doorObj.trigger);
                if (isOverlapping) {
                    spritesStillOverlapping.push(sprite);
                }
            });

            // Update the set with only sprites still overlapping
            doorObj.overlappingSprites.clear();
            spritesStillOverlapping.forEach(sprite => doorObj.overlappingSprites.add(sprite));

            // If no sprites overlapping, schedule door close
            if (doorObj.overlappingSprites.size === 0 && doorObj.isOpen) {
                if (!doorObj.closeTimer) {
                    doorObj.closeTimer = this.scene.time.delayedCall(500, () => {
                        const animKey = doorObj.doorType === 'surgery' ? 'surgery_door_close' : 'wooden_door_close';
                        doorObj.door.play(animKey);
                        doorObj.isOpen = false;
                        doorObj.closeTimer = null;
                        console.log(`[DoorManager] Door closed`);
                    });
                }
            }
        });
    }
}
