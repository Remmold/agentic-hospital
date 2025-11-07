/**
 * @fileoverview Centralized event bus for all game events
 * Eliminates duplication of CustomEvent creation and error handling
 * 
 * @module utils/EventBus
 * @author Hospital Simulation Team
 */

/**
 * EventBus - Centralized event management system
 * Provides consistent event dispatching with automatic error handling
 * 
 * @example
 * // Instead of:
 * // try {
 * //   const event = new CustomEvent('patientClicked', { detail: { data } });
 * //   window.dispatchEvent(event);
 * // } catch (error) {
 * //   console.error('Error:', error);
 * // }
 * 
 * // Use:
 * EventBus.emit('patientClicked', { data });
 */
export class EventBus {
    /**
     * Emit an event to all listeners
     * 
     * @param {string} eventName - Name of the event to emit
     * @param {Object} detail - Event data payload
     * @returns {boolean} True if event was successfully dispatched
     * 
     * @example
     * EventBus.emit('patientClicked', { 
     *   patientId: 'patient_123',
     *   caseData: {...}
     * });
     */
    static emit(eventName, detail = {}) {
        try {
            const event = new CustomEvent(eventName, { detail });
            window.dispatchEvent(event);
            return true;
        } catch (error) {
            console.error(`[EventBus] Error dispatching ${eventName}:`, error);
            return false;
        }
    }

    /**
     * Add an event listener
     * 
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Function to call when event is emitted
     * @returns {Function} Cleanup function to remove the listener
     * 
     * @example
     * const unsubscribe = EventBus.on('patientClicked', (e) => {
     *   console.log('Patient clicked:', e.detail.patientId);
     * });
     * 
     * // Later, to remove listener:
     * unsubscribe();
     */
    static on(eventName, callback) {
        window.addEventListener(eventName, callback);

        // Return cleanup function
        return () => {
            window.removeEventListener(eventName, callback);
        };
    }

    /**
     * Add a one-time event listener that auto-removes after first trigger
     * 
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Function to call when event is emitted
     * 
     * @example
     * EventBus.once('simulationComplete', (e) => {
     *   console.log('Simulation completed:', e.detail.patientName);
     * });
     */
    static once(eventName, callback) {
        const handler = (event) => {
            callback(event);
            window.removeEventListener(eventName, handler);
        };
        window.addEventListener(eventName, handler);
    }

    /**
     * Remove all listeners for a specific event
     * Note: This only works for listeners added through EventBus.on()
     * 
     * @param {string} eventName - Name of the event to clear
     */
    static removeAll(eventName) {
        // Note: Due to browser limitations, we can't actually remove all listeners
        // This is a placeholder for future implementation with listener tracking
        console.warn(`[EventBus] removeAll() called for ${eventName} but not fully implemented`);
    }
}

/**
 * Standard event names used throughout the application
 * Use these constants to avoid typos and ensure consistency
 * 
 * @constant {Object}
 */
export const EVENT_NAMES = {
    // Patient events
    PATIENT_CLICKED: 'patientClicked',
    PATIENT_CASE_LOADED: 'patientCaseLoaded',
    PATIENT_CHIP_CLICKED: 'patientChipClicked',

    // Simulation events
    SIMULATION_PAUSE: 'simulationPause',
    SIMULATION_SPEED: 'simulationSpeed',
    SIMULATION_STEP_CHANGED: 'simulationStepChanged',
    SIMULATION_COMPLETE: 'simulationComplete',
};