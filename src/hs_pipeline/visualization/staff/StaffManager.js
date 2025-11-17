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
    constructor(scene, depthManager) {
        this.scene = scene;
        this.depthManager = depthManager;
        this.staff = [];

        this.staffConfig = STAFF_CONFIG;

        this.eventSystem = null; // Will be initialized after construction
}

    async initializeEventSystem() {
        const { StaffEventSystem } = await import('./StaffEventSystem.js');
        this.eventSystem = new StaffEventSystem(this.scene, this);
    }

    spawnAllStaff() {
        try {
            this.staffConfig.forEach(config => {
                this.spawnStaff(config);
            });
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

    /**
     * Update all staff members (called every frame)
     * Updates depth and processes patrol routes
     */
    update() {
        // UPDATE EVENT SYSTEM FIRST
        if (this.eventSystem) {
            this.eventSystem.update();
        }
        
        // Get current speed multiplier
        const speedMultiplier = this.eventSystem?.speedMultiplier || 1;
        
        this.staff.forEach(staffData => {
            try {
                this.depthManager.updateSpriteDepth(staffData.npc);

                // Apply speed multiplier to any active tween
                if (staffData.npc.pathTween && staffData.npc.pathTween.isPlaying()) {
                    staffData.npc.pathTween.timeScale = speedMultiplier;
                }

                // Skip normal patrol if staff has active event
                if (this.eventSystem?.hasActiveEvent(staffData.id)) {
                    return;
                }

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
            // Increment idle timer
            staffData.idleTimer += 1000 / 60; // Assuming 60 FPS update rate

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
            const distance = Phaser.Math.Distance.Between(
                npc.x, npc.y,
                currentWaypoint.x, currentWaypoint.y
            );

            // Threshold at 20 pixels for waypoint arrival detection
            if (distance < 20) {
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
     * @param {number} [speedMultiplier=1] - Speed multiplier for time scaling
     * @param {Function} [onComplete] - Callback when movement completes
     * @private
     */
    moveToWaypoint(staffData, waypoint, speed = 150, speedMultiplier = 1, onComplete = null) {
        const npc = staffData.npc;

        try {
            if (this.scene.pathfinding) {
                this.scene.pathfinding.moveToPoint(npc, waypoint.x, waypoint.y, speed, () => {
                    // Movement complete - call the callback
                    if (onComplete) onComplete();
                });
                
                // Apply speed multiplier to the tween
                if (npc.pathTween) {
                    npc.pathTween.timeScale = speedMultiplier;
                }
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
        console.log('[StaffManager] All staff destroyed');
    }
}