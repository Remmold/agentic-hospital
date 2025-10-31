import { SimulationPlayer } from './SimulationPlayer.js';
import { LOCATIONS } from './Constants.js';

export class PatientQueueManager {
    constructor(scene, pathfinding, depthManager) {
        this.scene = scene;
        this.pathfinding = pathfinding;
        this.depthManager = depthManager;

        this.activePatient = null;
        this.waitingPatients = [];
        this.completedPatients = [];
        this.usedCases = [];

        this.minSpawnDelay = 5000;  // 5 seconds minimum between spawns
        this.maxSpawnDelay = 10000; // 10 seconds maximum between spawns
        this.nextSpawnTime = null;

        this.patientCounter = 0;
        this.spriteSheetList = ['patient_1', 'patient_2', 'patient_3'];
    }

    async loadAvailableCases() {
        try {
            const response = await fetch('./assets/simulation_results/');
            const html = await response.text();
            const regex = /sim_\d+_.*?\.json/g;
            const matches = html.match(regex);
            return matches ? [...new Set(matches)] : [];
        } catch (error) {
            console.error('[PatientQueue] Failed to load case list:', error);
            return [];
        }
    }

    getRandomUnusedCase(availableCases) {
        const unused = availableCases.filter(c => !this.usedCases.includes(c));

        if (unused.length === 0) {
            console.warn('[PatientQueue] All cases used! Resetting...');
            this.usedCases = [];
            return availableCases[Phaser.Math.Between(0, availableCases.length - 1)];
        }

        const randomCase = unused[Phaser.Math.Between(0, unused.length - 1)];
        this.usedCases.push(randomCase);
        return randomCase;
    }

    getNextSpriteSheet() {
        // Cycle through patient_1, patient_2, patient_3
        const sheet = this.spriteSheetList[this.patientCounter % this.spriteSheetList.length];
        this.patientCounter++;
        return sheet;
    }

    async loadCaseFile(filename) {
        try {
            const response = await fetch(`./assets/simulation_results/${filename}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`[PatientQueue] Failed to load case ${filename}:`, error);
            return null;
        }
    }

    /**
     * Start automatic patient generation
     * Patients spawn every 5-10 seconds
     */
    startAutoPatientGeneration(availableCases) {
        // Schedule first patient immediately
        this.scheduleNextPatient(availableCases, 0);
    }

    /**
     * Schedule the next patient to spawn
     */
    scheduleNextPatient(availableCases, delay = null) {
        if (delay === null) {
            // Random delay between min and max
            delay = Phaser.Math.Between(this.minSpawnDelay, this.maxSpawnDelay);
        }

        this.scene.time.delayedCall(delay, () => {
            this.spawnPatient(availableCases);
            // Schedule the next one
            this.scheduleNextPatient(availableCases);
        });
    }

    /**
     * Spawn a new patient
     * - If no active patient: Start immediately
     * - If active patient: Add to waiting room queue
     */
    spawnPatient(availableCases) {
        const caseFile = this.getRandomUnusedCase(availableCases);
        const spritesheet = this.getNextSpriteSheet();
        const patientId = `patient_${Date.now()}_${Math.random()}`;

        this.loadCaseFile(caseFile).then(caseData => {
            if (!caseData) {
                console.error(`[PatientQueue] Failed to load case: ${caseFile}`);
                return;
            }

            if (this.activePatient === null) {
                // ✅ NO ACTIVE PATIENT - Start immediately
                this.startPatient(patientId, spritesheet, caseData, caseFile);
            } else {
                // ✅ ACTIVE PATIENT EXISTS - Add to waiting room
                this.addToWaitingRoom(patientId, spritesheet, caseData, caseFile);
            }
        }).catch(error => {
            console.error(`[PatientQueue] Error spawning patient ${patientId}:`, error);
        });
    }

    /**
     * Start patient - they enter hospital and begin their timeline
     */
    startPatient(patientId, spritesheet, caseData, caseFile) {
        const simulationPlayer = new SimulationPlayer(this.scene, this.pathfinding, this.depthManager);

        this.activePatient = {
            id: patientId,
            player: simulationPlayer,
            caseFile: caseFile,
            spritesheet: spritesheet,
            startTime: Date.now()
        };

        console.log(`[PatientQueue] ✅ Patient ${patientId} ACTIVE - Spritesheet: ${spritesheet}`);

        // Start the simulation
        simulationPlayer.playSimulation(caseData, 2000, spritesheet);
        simulationPlayer.onComplete(() => this.handlePatientComplete());
    }

    /**
     * Add patient to waiting room queue - they don't move yet
     */
    addToWaitingRoom(patientId, spritesheet, caseData, caseFile) {
        const simulationPlayer = new SimulationPlayer(this.scene, this.pathfinding, this.depthManager);

        // Store in waiting list - DONT call playSimulation yet!
        this.waitingPatients.push({
            id: patientId,
            player: simulationPlayer,
            caseData: caseData,
            spritesheet: spritesheet,
            caseFile: caseFile,
            waitingSince: Date.now()
        });

        console.log(`[PatientQueue] ⏳ Patient ${patientId} WAITING - Queue length: ${this.waitingPatients.length}`);
    }

    /**
     * Called when active patient finishes their timeline
     */
    handlePatientComplete() {
        if (this.activePatient) {
            const elapsedTime = (Date.now() - this.activePatient.startTime) / 1000;
            console.log(`[PatientQueue] ✔️ Patient ${this.activePatient.id} COMPLETED (${elapsedTime.toFixed(1)}s)`);
            this.completedPatients.push(this.activePatient);
            this.activePatient = null;
        }

        // Start next patient from waiting room
        if (this.waitingPatients.length > 0) {
            const nextPatient = this.waitingPatients.shift();
            const waitTime = Phaser.Math.Between(1000, 3000);

            console.log(`[PatientQueue] ⏱️ Next patient ${nextPatient.id} starting in ${waitTime}ms...`);

            this.scene.time.delayedCall(waitTime, () => {
                this.startPatient(
                    nextPatient.id,
                    nextPatient.spritesheet,
                    nextPatient.caseData,
                    nextPatient.caseFile
                );
            });
        }
    }

    update(availableCases) {
        // Update depths
        if (this.activePatient && this.activePatient.player.npc) {
            this.depthManager.updateSpriteDepth(this.activePatient.player.npc);
        }

        this.waitingPatients.forEach(patient => {
            if (patient.player.npc) {
                this.depthManager.updateSpriteDepth(patient.player.npc);
            }
        });
    }

    getStats() {
        return {
            active: this.activePatient?.id || 'None',
            waiting: this.waitingPatients.length,
            completed: this.completedPatients.length,
            spawned: this.patientCounter
        };
    }
}
