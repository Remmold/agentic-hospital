/**
 * @fileoverview Manages all staff NPCs including doctors, nurses, and support staff
 * Handles staff spawning, patrol routes, and idle behaviors
 * 
 * @module ./StaffManager
 * @requires utils/CharacterFactory
 * @requires ./StaffConfig
 * @author Hospital Simulation Team
 */

import { CharacterFactory } from '../animation/CharacterFactory.js';
import { STAFF_CONFIG } from './StaffConfig.js';

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

        // Import staff configuration from external file
        this.staffConfig = STAFF_CONFIG;
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
            staffData.idleTimer += 1000 / 120; // Assuming 60 FPS

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

            // Threshold at 20 pixels for waypoint arrival detection
            if (distance < 20) {
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