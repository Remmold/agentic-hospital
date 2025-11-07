/**
 * PatientQueue.js
 * Manages the queue of patients (active, waiting, completed)
 * Handles patient state transitions and queue capacity
 */

export class PatientQueue {
    constructor(scene, depthManager) {
        this.scene = scene;
        this.depthManager = depthManager;

        // Patient states
        this.activePatient = null;
        this.waitingPatients = [];
        this.completedPatients = [];

        // Waiting room chairs
        this.waitingRoomChairs = [
            'WAITING_ROOM.CHAIR_1', 'WAITING_ROOM.CHAIR_2', 'WAITING_ROOM.CHAIR_3', 'WAITING_ROOM.CHAIR_4',
            'WAITING_ROOM.CHAIR_5', 'WAITING_ROOM.CHAIR_6', 'WAITING_ROOM.CHAIR_7', 'WAITING_ROOM.CHAIR_8',
            'WAITING_ROOM.CHAIR_9', 'WAITING_ROOM.CHAIR_10', 'WAITING_ROOM.CHAIR_11'
        ];
        this.occupiedChairs = new Set();
        this.maxWaitingCapacity = this.waitingRoomChairs.length;

        // Reception desks
        this.receptionDesks = ['RECEPTION.LEFT', 'RECEPTION.RIGHT'];
        this.occupiedReceptionDesks = new Set();
    }

    /**
     * Check if a new patient can be spawned
     * @returns {boolean} True if there's space for another patient
     */
    canSpawnNextPatient() {
        if (this.activePatient === null) return true;
        const availableChairs = this.maxWaitingCapacity - this.waitingPatients.length;
        return availableChairs > 0;
    }

    /**
     * Get a random available waiting room chair
     * @returns {string|null} Chair name or null if all occupied
     */
    getRandomAvailableWaitingChair() {
        const available = this.waitingRoomChairs.filter(chair => !this.occupiedChairs.has(chair));
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    /**
     * Get a random available reception desk
     * @returns {string|null} Desk name or null if all occupied
     */
    getRandomAvailableReceptionDesk() {
        const available = this.receptionDesks.filter(desk => !this.occupiedReceptionDesks.has(desk));
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    /**
     * Add a patient as active (at reception desk)
     * @param {Object} patientData - Patient data object
     */
    setActivePatient(patientData) {
        this.activePatient = patientData;
        if (patientData.receptionDesk) {
            this.occupiedReceptionDesks.add(patientData.receptionDesk);
        }
        console.log(`[PatientQueue] ✅ ${patientData.id} ACTIVE at ${patientData.receptionDesk}`);
    }

    /**
     * Add a patient to the waiting queue
     * @param {Object} patientData - Patient data object
     */
    addWaitingPatient(patientData) {
        this.waitingPatients.push(patientData);
        if (patientData.waitingChair) {
            this.occupiedChairs.add(patientData.waitingChair);
        }
        console.log(`[PatientQueue] ⏳ ${patientData.id} WAITING at ${patientData.waitingChair} - Queue: ${this.waitingPatients.length}/${this.maxWaitingCapacity}`);
    }

    /**
     * Handle completion of the active patient
     * Moves them to completed and promotes next waiting patient
     * @returns {Object|null} Next patient to activate, or null
     */
    handlePatientComplete() {
        if (!this.activePatient) return null;

        const elapsed = (Date.now() - this.activePatient.spawnTime) / 1000;
        console.log(`[PatientQueue] ✔️ ${this.activePatient.id} COMPLETED (${elapsed.toFixed(1)}s)`);

        // Free up the reception desk
        if (this.activePatient.receptionDesk) {
            this.occupiedReceptionDesks.delete(this.activePatient.receptionDesk);
        }

        // Move to completed
        this.completedPatients.push(this.activePatient);
        this.activePatient = null;

        // Check if there's a waiting patient to promote
        if (this.waitingPatients.length > 0) {
            const nextPatient = this.waitingPatients.shift();
            
            // Free up their waiting chair
            this.occupiedChairs.delete(nextPatient.waitingChair);

            // Assign a reception desk
            const receptionDesk = this.getRandomAvailableReceptionDesk() || this.receptionDesks[0];
            this.occupiedReceptionDesks.add(receptionDesk);

            console.log(`[PatientQueue] Starting: ${nextPatient.id} from waiting room`);

            // Update patient data
            this.activePatient = {
                id: nextPatient.id,
                player: nextPatient.player,
                caseFile: nextPatient.caseFile,
                spritesheet: nextPatient.spritesheet,
                spawnTime: nextPatient.spawnTime,
                waitingChair: null,
                receptionDesk: receptionDesk
            };

            console.log(`[PatientQueue] ✅ ${nextPatient.id} NOW ACTIVE at ${receptionDesk}`);

            // Return the next patient data so spawner can start their timeline
            return {
                patient: this.activePatient,
                caseData: nextPatient.caseData,
                receptionDesk: receptionDesk
            };
        }

        return null;
    }

    /**
     * Update depth sorting for all patient sprites
     */
    updateDepths() {
        if (this.activePatient?.player?.npc) {
            this.depthManager.updateSpriteDepth(this.activePatient.player.npc);
        }

        this.waitingPatients.forEach(patient => {
            if (patient.player?.npc) {
                this.depthManager.updateSpriteDepth(patient.player.npc);
            }
        });
    }

    /**
     * Get current queue statistics
     * @returns {Object} Stats object
     */
    getStats() {
        const hospitalized = (this.activePatient ? 1 : 0) + this.waitingPatients.length;
        return {
            active: this.activePatient?.id || 'None',
            waiting: `${this.waitingPatients.length}/${this.maxWaitingCapacity}`,
            hospitalized: `${hospitalized}/${1 + this.maxWaitingCapacity}`,
            completed: this.completedPatients.length
        };
    }
}