/**
 * StaffEvent - Defines a single staff event with waypoints and actions
 */
export class StaffEvent {
    constructor(staffId, waypoints, onComplete = null) {
        this.staffId = staffId;
        this.waypoints = waypoints; // Array of {location, idleMs, idleDirection, idleAction}
        this.currentIndex = 0;
        this.isActive = false;
        this.isComplete = false;
        this.onComplete = onComplete;
    }

    getNextWaypoint() {
        if (this.currentIndex >= this.waypoints.length) {
            return null;
        }
        return this.waypoints[this.currentIndex];
    }

    advance() {
        this.currentIndex++;
        if (this.currentIndex >= this.waypoints.length) {
            this.isComplete = true;
            return true;
        }
        return false;
    }

    reset() {
        this.currentIndex = 0;
        this.isActive = false;
        this.isComplete = false;
    }
}