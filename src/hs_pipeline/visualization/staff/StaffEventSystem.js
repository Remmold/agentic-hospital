import { StaffEvent } from './StaffEvent.js';
import { CharacterFactory } from '../animation/CharacterFactory.js';

export class StaffEventSystem {
    constructor(scene, staffManager) {
        this.scene = scene;
        this.staffManager = staffManager;
        this.activeEvents = new Map();
        this.speedMultiplier = 1;
    }

    setSpeedMultiplier(multiplier) {
        this.speedMultiplier = multiplier;
        console.log(`[StaffEventSystem] Speed multiplier set to ${multiplier}x`);
        
        this.staffManager.staff.forEach(staffData => {
            if (staffData.npc.pathTween && staffData.npc.pathTween.isPlaying()) {
                staffData.npc.pathTween.timeScale = multiplier;
            }
        });
    }

    triggerEvent(staffId, waypoints, onComplete = null) {
        if (this.activeEvents.has(staffId)) {
            console.warn(`[StaffEventSystem] Cancelling existing event for ${staffId}`);
            this.cancelEvent(staffId);
        }

        const event = new StaffEvent(staffId, waypoints, onComplete);
        event.isActive = true;

        const staffData = this.staffManager.staff.find(s => s.id === staffId);
        if (!staffData) {
            console.error(`[StaffEventSystem] Staff ${staffId} not found`);
            return null;
        }

        this.activeEvents.set(staffId, {
            event: event,
            staffData: staffData,
            isIdling: false,
            idleTimer: 0
        });

        console.log(`[StaffEventSystem] Event triggered for ${staffId} with ${waypoints.length} waypoints`);
        this.moveToNextWaypoint(staffId);

        return event;
    }

    moveToNextWaypoint(staffId) {
        const eventData = this.activeEvents.get(staffId);
        if (!eventData) {
            console.warn(`[StaffEventSystem] No eventData found for ${staffId}`);
            return;
        }

        const waypoint = eventData.event.getNextWaypoint();
        if (!waypoint) {
            console.log(`[StaffEventSystem] No more waypoints for ${staffId}`);
            this.completeEvent(staffId);
            return;
        }

        console.log(`[StaffEventSystem] ${staffId} moving to waypoint ${eventData.event.currentIndex + 1}/${eventData.event.waypoints.length}`);

        this.staffManager.moveToWaypoint(
            eventData.staffData, 
            waypoint, 
            150, 
            this.speedMultiplier,
            () => {
                // Check if event still active
                const stillActive = this.activeEvents.get(staffId);
                if (!stillActive) {
                    console.warn(`[StaffEventSystem] Event no longer active for ${staffId}`);
                    return;
                }

                const npc = eventData.staffData.npc;
                const idleAction = waypoint.idleAction || 'idle';
                const idleDirection = waypoint.idleDirection || 'down';

                npc.lastDirection = idleDirection;
                npc.lastAction = idleAction;
                CharacterFactory.playAnimation(npc, idleAction, idleDirection);
                
                eventData.isIdling = true;
                eventData.idleTimer = 0;
                
                console.log(`[StaffEventSystem] ${staffId} arrived at waypoint, idling for ${waypoint.idleMs}ms`);
            }
        );
    }

    update() {
        this.activeEvents.forEach((eventData, staffId) => {
            const { event, isIdling } = eventData;
            const currentWaypoint = event.getNextWaypoint();

            if (!currentWaypoint) return;

            if (isIdling) {
                eventData.idleTimer += (1000 / 60) * this.speedMultiplier;

                if (eventData.idleTimer >= currentWaypoint.idleMs) {
                    console.log(`[StaffEventSystem] ${staffId} idle complete, advancing`);
                    eventData.isIdling = false;
                    eventData.idleTimer = 0;

                    const isComplete = event.advance();
                    console.log(`[StaffEventSystem] ${staffId} advance -> isComplete: ${isComplete}, currentIndex: ${event.currentIndex}`);
                    
                    if (isComplete) {
                        this.completeEvent(staffId);
                    } else {
                        this.moveToNextWaypoint(staffId);
                    }
                }
            }
        });
    }

   completeEvent(staffId) {
        const eventData = this.activeEvents.get(staffId);
        if (!eventData) return;

        console.log(`[StaffEventSystem] Event completed for ${staffId} - returning to home`);
        
        const { event, staffData } = eventData;
        event.isActive = false;
        event.isComplete = true;
        this.activeEvents.delete(staffId);

        // Determine return position
        const returnPosition = staffData.config.patrol 
            ? staffData.config.patrol[0] 
            : staffData.config.initialPosition;

        // Return to home position
        staffData.currentPatrolIndex = 0;
        
        this.staffManager.moveToWaypoint(
            staffData, 
            returnPosition, 
            150, 
            this.speedMultiplier,
            () => {
                const npc = staffData.npc;
                const idleAction = returnPosition.idleAction || staffData.config.idleAction;
                const idleDirection = returnPosition.idleDirection || staffData.config.idleDirection;
                
                npc.lastDirection = idleDirection;
                npc.lastAction = idleAction;
                CharacterFactory.playAnimation(npc, idleAction, idleDirection);
                
                staffData.isIdling = true;
                staffData.idleTimer = 0;
                
                console.log(`[StaffEventSystem] ${staffId} returned home - NOW calling onComplete`);
                
                // Call onComplete AFTER returning to position
                if (event.onComplete) {
                    event.onComplete();
                }
            }
        );
    }

    cancelEvent(staffId) {
        const eventData = this.activeEvents.get(staffId);
        if (eventData) {
            eventData.event.isActive = false;
            this.activeEvents.delete(staffId);
            console.log(`[StaffEventSystem] Event cancelled for ${staffId}`);
        }
    }

    hasActiveEvent(staffId) {
        return this.activeEvents.has(staffId);
    }
}