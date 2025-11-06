/**
 * @fileoverview Manages all staff NPCs including doctors, nurses, and support staff
 * Handles staff spawning, patrol routes, and idle behaviors
 * 
 * @module utils/StaffManager
 * @requires ./CharacterFactory
 * @requires ./Constants
 * @requires ./AnimationUtils
 * @author Hospital Simulation Team
 */

import { CharacterFactory } from './CharacterFactory.js';
import { LOCATIONS } from './Constants.js';
import { AnimationUtils } from './AnimationUtils.js';

/**
 * StaffManager - Manages all staff NPCs in the hospital
 * 
 * Responsibilities:
 * - Spawning staff at configured positions
 * - Managing patrol routes
 * - Handling idle animations at waypoints
 * - Updating staff depth for proper rendering
 */
export class StaffManager {
    /**
     * Creates a new StaffManager
     * 
     * @param {Phaser.Scene} scene - The game scene
     * @param {DepthManager} depthManager - Manages sprite rendering depth
     */
    constructor(scene, depthManager) {
        this.scene = scene;
        this.depthManager = depthManager;
        this.staff = [];

        // Staff configuration with positions, patrols, and behaviors
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
                    { ...LOCATIONS.XRAY_VIEW_WINDOW_POSITION, idleMs: 7000, idleDirection: 'up' },
                    { ...LOCATIONS.XRAY_TECH_POSITION, idleMs: 6000, idleDirection: 'up' },
                ],
                idleAction: 'sit',
                idleDirection: 'up',
                idleMs: 3000
            },
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
            },
            {
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
                spritesheet: 'nurse_3',
                initialPosition: { ...LOCATIONS.RECEPTION.RIGHT_COMPUTER },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'down',
                idleMs: 3000
            },
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
            },
            {
                id: 'conference_7',
                spritesheet: 'nurse_8',
                initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.TOP_CHAIR_4 },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'down',
                idleMs: 3000
            },
            {
                id: 'conference_8',
                spritesheet: 'nurse_7',
                initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.TOP_CHAIR_6 },
                patrol: false,
                idleAction: 'idle',
                idleDirection: 'down',
                idleMs: 3000
            }
        ];
    }

    /**
     * Spawn all configured staff NPCs
     * Iterates through staffConfig and creates each staff member
     */
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

    /**
     * Spawn a single staff member
     * 
     * @param {Object} config - Staff configuration object
     * @param {string} config.id - Unique staff identifier
     * @param {string} config.spritesheet - Sprite sheet key
     * @param {Object} config.initialPosition - Starting position {x, y}
     * @param {string} config.idleAction - Initial animation action ('idle', 'sit')
     * @param {string} config.idleDirection - Initial facing direction
     * @param {Array|boolean} config.patrol - Patrol waypoints or false if stationary
     */
    spawnStaff(config) {
        try {
            // Create the NPC sprite
            const npc = CharacterFactory.createCharacter(
                this.scene,
                config.id,
                config.spritesheet,
                config.initialPosition.x,
                config.initialPosition.y,
            );

            // Create staff data tracking object
            const staffData = {
                id: config.id,
                npc: npc,
                config: config,
                currentPatrolIndex: 0,
                isIdling: false,
                idleTimer: 0
            };

            // Play initial idle animation
            CharacterFactory.playAnimation(
                npc,
                config.idleAction,
                config.idleDirection
            );

            // If staff has patrol route, start moving to first waypoint
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

    /**
     * Update all staff members (called every frame)
     * Updates depth and processes patrol routes
     */
    update() {
        this.staff.forEach(staffData => {
            try {
                // Update sprite depth for proper rendering
                this.depthManager.updateSpriteDepth(staffData.npc);

                // Process patrol if staff member is patrolling
                if (staffData.config.patrol && Array.isArray(staffData.config.patrol)) {
                    this.updatePatrol(staffData);
                }
            } catch (error) {
                console.error(`[StaffManager] Error updating ${staffData.id}:`, error);
            }
        });
    }

    /**
     * Update patrol state for a staff member
     * Handles waypoint arrival, idle timing, and moving to next waypoint
     * 
     * @param {Object} staffData - Staff tracking data
     * @private
     */
    updatePatrol(staffData) {
        const patrol = staffData.config.patrol;
        const currentWaypoint = patrol[staffData.currentPatrolIndex];
        const npc = staffData.npc;

        if (!currentWaypoint) return;

        if (staffData.isIdling) {
            // Staff is idling at current waypoint - update timer
            staffData.idleTimer += 1000 / 60; // Assuming 60 FPS

            // Check if idle time is complete
            if (staffData.idleTimer >= currentWaypoint.idleMs) {
                staffData.isIdling = false;
                staffData.idleTimer = 0;

                // Move to next waypoint (loop back to start if at end)
                staffData.currentPatrolIndex = (staffData.currentPatrolIndex + 1) % patrol.length;
                const nextWaypoint = patrol[staffData.currentPatrolIndex];
                this.moveToWaypoint(staffData, nextWaypoint);
            }
        } else {
            // Staff is moving - check if they've arrived at waypoint
            const distance = Phaser.Math.Distance.Between(
                npc.x, npc.y,
                currentWaypoint.x, currentWaypoint.y
            );

            // Threshold increased from 20 to 30 to handle floating-point coordinates better
            if (distance < 30) {
                // Arrived at waypoint - start idling
                staffData.isIdling = true;
                staffData.idleTimer = 0;

                // Use waypoint-specific idle settings if provided, otherwise use default
                const idleAction = currentWaypoint.idleAction || staffData.config.idleAction;
                const idleDirection = currentWaypoint.idleDirection || staffData.config.idleDirection;

                CharacterFactory.playAnimation(npc, idleAction, idleDirection);
            }
        }
    }

    /**
     * Move a staff member to a waypoint
     * 
     * @param {Object} staffData - Staff tracking data
     * @param {Object} waypoint - Target waypoint {x, y, idleMs}
     * @param {number} [speed=150] - Movement speed in pixels per second
     * @private
     */
    moveToWaypoint(staffData, waypoint, speed = 150) {
        const npc = staffData.npc;

        try {
            if (this.scene.pathfinding) {
                this.scene.pathfinding.moveToPoint(npc, waypoint.x, waypoint.y, speed, () => {
                    // Callback when arrival complete (if needed)
                });
            }
        } catch (error) {
            console.error('[StaffManager] Error moving to waypoint:', error);
        }
    }

    /**
     * Get a staff NPC by their ID
     * 
     * @param {string} id - Staff member ID
     * @returns {Phaser.Physics.Arcade.Sprite|null} Staff sprite or null if not found
     * 
     * @example
     * const doctor = staffManager.getStaffById('doctor_1');
     * if (doctor) {
     *   console.log(`Doctor at: ${doctor.x}, ${doctor.y}`);
     * }
     */
    getStaffById(id) {
        const staffData = this.staff.find(s => s.id === id);
        return staffData ? staffData.npc : null;
    }

    /**
     * Destroy all staff members and clear the staff list
     * Useful for scene cleanup or restart
     */
    destroyAllStaff() {
        this.staff.forEach(staffData => {
            if (staffData.npc) {
                staffData.npc.destroy();
            }
        });
        this.staff = [];
        console.log('[StaffManager] All staff destroyed');
    }
}