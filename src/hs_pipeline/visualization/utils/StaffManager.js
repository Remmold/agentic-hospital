import { CharacterFactory } from './CharacterFactory.js';
import { LOCATIONS } from './Constants.js';

export class StaffManager {
    constructor(scene, depthManager) {
        this.scene = scene;
        this.depthManager = depthManager;
        this.staff = [];

        // Staff configuration
        this.staffConfig = [
            {
                id: 'doctor_1',
                spritesheet: 'doctor_1',
                initialPosition: { ...LOCATIONS.DOCTORS_OFFICE.DOCTORS_CHAIR },
                patrol: false,
                idleAction: 'sit',
                idleDirection: 'down',
                idleMs: 3000
            },
            {
                id: 'lab_nurse',
                spritesheet: 'nurse_1',
                initialPosition: { ...LOCATIONS.LAB.NURSE_POSITION },
                patrol: [
                    { ...LOCATIONS.LAB.BIG_MACHINE, idleMs: 2000 },
                    { ...LOCATIONS.LAB.SMALL_MACHINE, idleMs: 4000 }
                ],
                idleAction: 'idle',
                idleDirection: 'right'
            },
            {
                id: 'mri_nurse',
                spritesheet: 'mri_1',
                initialPosition: { ...LOCATIONS.MRI.STAFF_CHAIR },
                patrol: false,
                // patrol: [
                //     { ...LOCATIONS.LAB.BIG_MACHINE, idleMs: 2000 },
                //     { ...LOCATIONS.LAB.SMALL_MACHINE, idleMs: 4000 }
                // ],
                idleAction: 'idle',
                idleDirection: 'right'
            },
            {
                id: 'receptionist_1',
                spritesheet: 'nurse_2',
                initialPosition: { ...LOCATIONS.RECEPTION.LEFT_COMPUTER },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'down',
                idleMs: 3000
            },
            {
                id: 'receptionist_2',
                spritesheet: 'nurse_2',
                initialPosition: { ...LOCATIONS.RECEPTION.RIGHT_COMPUTER },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'down',
                idleMs: 3000
            }
        ];
    }

    spawnAllStaff() {
        try {
            this.staffConfig.forEach(config => {
                this.spawnStaff(config);
            });
            console.log(`[StaffManager] Spawned ${this.staff.length} NPCs`);
        } catch (error) {
            console.error('[StaffManager] Error spawning staff:', error);
        }
    }

    spawnStaff(config) {
        try {
            const npc = CharacterFactory.createCharacter(
                this.scene,
                config.id,
                config.spritesheet,
                config.initialPosition.x,
                config.initialPosition.y
            );

            const staffData = {
                id: config.id,
                npc: npc,
                config: config,
                currentPatrolIndex: 0,
                isIdling: false,
                idleTimer: 0
            };

            CharacterFactory.playAnimation(
                npc,
                config.idleAction,
                config.idleDirection
            );

            this.staff.push(staffData);
            console.log(`[StaffManager] Spawned ${config.id} at (${config.initialPosition.x}, ${config.initialPosition.y})`);
        } catch (error) {
            console.error(`[StaffManager] Error spawning ${config.id}:`, error);
        }
    }

    update() {
        this.staff.forEach(staffData => {
            try {
                this.depthManager.updateSpriteDepth(staffData.npc);

                if (staffData.config.patrol && Array.isArray(staffData.config.patrol)) {
                    this.updatePatrol(staffData);
                }
            } catch (error) {
                console.error(`[StaffManager] Error updating ${staffData.id}:`, error);
            }
        });
    }

    updatePatrol(staffData) {
        const patrol = staffData.config.patrol;
        const currentWaypoint = patrol[staffData.currentPatrolIndex];
        const npc = staffData.npc;

        if (!currentWaypoint) return;

        if (staffData.isIdling) {
            staffData.idleTimer += 1000 / 60;

            if (staffData.idleTimer >= currentWaypoint.idleMs) {
                staffData.isIdling = false;
                staffData.idleTimer = 0;
                staffData.currentPatrolIndex = (staffData.currentPatrolIndex + 1) % patrol.length;

                const nextWaypoint = patrol[staffData.currentPatrolIndex];
                this.moveToWaypoint(staffData, nextWaypoint);
            }
        } else {
            const distance = Phaser.Math.Distance.Between(
                npc.x, npc.y,
                currentWaypoint.x, currentWaypoint.y
            );

            if (distance < 20) {
                staffData.isIdling = true;
                staffData.idleTimer = 0;

                CharacterFactory.playAnimation(
                    npc,
                    staffData.config.idleAction,
                    staffData.config.idleDirection
                );
            }
        }
    }

    moveToWaypoint(staffData, waypoint) {
        const npc = staffData.npc;
        const speed = 80;

        try {
            if (this.scene.pathfinding) {
                this.scene.pathfinding.moveToPoint(npc, waypoint.x, waypoint.y, speed, () => {
                    // Arrived
                });
            }
        } catch (error) {
            console.error('[StaffManager] Error moving to waypoint:', error);
        }
    }

    getStaffById(id) {
        const staffData = this.staff.find(s => s.id === id);
        return staffData ? staffData.npc : null;
    }

    destroyAllStaff() {
        this.staff.forEach(staffData => {
            if (staffData.npc) {
                staffData.npc.destroy();
            }
        });
        this.staff = [];
    }
}
