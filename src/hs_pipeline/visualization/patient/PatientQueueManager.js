/**
 * PatientQueueManager.js
 * Main interface for patient queue management
 * Combines PatientQueue (state) and PatientSpawner (spawning logic)
 */

import { PatientQueue } from './PatientQueue.js';
import { PatientSpawner } from './PatientSpawner.js';

export class PatientQueueManager {
    constructor(scene, pathfinding, depthManager) {
        // Create the queue manager (state)
        this.queue = new PatientQueue(scene, depthManager);
        
        // Create the spawner (spawning logic)
        this.spawner = new PatientSpawner(scene, pathfinding, this.queue);

        // Expose queue properties for backward compatibility
        this.scene = scene;
        this.pathfinding = pathfinding;
        this.depthManager = depthManager;
    }

    // ==========================================
    // Delegate to PatientSpawner
    // ==========================================

    /**
     * Load available case files
     * @returns {Promise<string[]>} Array of case filenames
     */
    async loadAvailableCases() {
        return this.spawner.loadAvailableCases();
    }

    /**
     * Start automatic patient generation
     * @param {string[]} availableCases - Array of available case filenames
     */
    startAutoPatientGeneration(availableCases) {
        this.spawner.startAutoPatientGeneration(availableCases);
    }

    /**
     * Update spawning logic
     * @param {string[]} availableCases - Array of available case filenames
     */
    update(availableCases) {
        this.spawner.update(availableCases);
        this.queue.updateDepths();
    }

    // ==========================================
    // Expose Queue Properties (for HospitalScene)
    // ==========================================

    get activePatient() {
        return this.queue.activePatient;
    }

    get waitingPatients() {
        return this.queue.waitingPatients;
    }

    get completedPatients() {
        return this.queue.completedPatients;
    }

    /**
     * Get queue statistics
     * @returns {Object} Stats object
     */
    getStats() {
        return this.queue.getStats();
    }
}