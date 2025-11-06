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
                id: 'doctor_xray',
                spritesheet: 'xray_1',
                initialPosition: { ...LOCATIONS.XRAY_TECH_POSITION },
                patrol: [
                    { ...LOCATIONS.XRAY_VIEW_WINDOW_POSITION, idleMs: 7000 },
                    { ...LOCATIONS.XRAY_TECH_POSITION, idleMs: 6000 },
                ],
                idleAction: 'sit',
                idleDirection: 'up',
                idleMs: 3000
            },
            // Lab nurses
            {
                id: 'lab_nurse',
                spritesheet: 'nurse_1',
                initialPosition: { ...LOCATIONS.LAB.NURSE_POSITION },
                patrol: [
                    { ...LOCATIONS.LAB.BIG_MACHINE, idleMs: 5000 },
                    { ...LOCATIONS.LAB.SMALL_MACHINE, idleMs: 5000 }
                ],
                idleAction: 'idle',
                idleDirection: 'right'
            },            {
                id: 'examination_nurse',
                spritesheet: 'nurse_1',
                initialPosition: { ...LOCATIONS.NURSE_OFFICE.NURSE_BY_PATIENT_SEAT },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'left'
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
            // Receptionists
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
                spritesheet: 'nurse_3',
                initialPosition: { ...LOCATIONS.RECEPTION.RIGHT_COMPUTER },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'down',
                idleMs: 3000
            },
            // Pharmacy staff
            {
                id: 'pharmacist_1',
                spritesheet: 'doctor_9',
                initialPosition: { ...LOCATIONS.PHARMACY.PHARMACIST_BEHIND_COUNTER_1 },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'down',
                idleMs: 3000
            },
            {
                id: 'pharmacist_2',
                spritesheet: 'doctor_10',
                initialPosition: { ...LOCATIONS.PHARMACY.PHARMACIST_BEHIND_COUNTER_2 },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'down',
                idleMs: 3000
            },
            // Conference room staff
            {
                id: 'conference_2',
                spritesheet: 'doctor_7',
                initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.BOTTOM_CHAIR_2 },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'up',
                idleMs: 3000
            },
            {
                id: 'conference_3',
                spritesheet: 'doctor_6',
                initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.BOTTOM_CHAIR_3 },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'up',
                idleMs: 3000
            },
            {
                id: 'conference_4',
                spritesheet: 'doctor_5',
                initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.BOTTOM_CHAIR_4 },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'up',
                idleMs: 3000
            },
            {
                id: 'conference_5',
                spritesheet: 'nurse_10',
                initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.BOTTOM_CHAIR_6 },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'up',
                idleMs: 3000
            },
            {
                id: 'conference_6',
                spritesheet: 'nurse_9',
                initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.TOP_CHAIR_2 },
                patrol: false,
                idleAction: 'sit',
                idleDirection: 'down',
                idleMs: 3000
            }
            ,
            {
                id: 'conference_6',
                spritesheet: 'nurse_8',
                initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.TOP_CHAIR_4 },
                patrol: false,  
                idleAction: 'idle',
                idleDirection: 'down',
                idleMs: 3000
            }
            ,
            {
                id: 'conference_6',
                spritesheet: 'nurse_7',
                initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.TOP_CHAIR_6 },
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
                config.initialPosition.y,
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
            if (config.patrol && Array.isArray(config.patrol)) {
                const firstWaypoint = config.patrol[0];
                this.moveToWaypoint(staffData, firstWaypoint);
            }
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

    moveToWaypoint(staffData, waypoint, speed = 150) {
        const npc = staffData.npc;


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
