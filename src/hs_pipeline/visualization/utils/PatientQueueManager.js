import { SimulationPlayer } from './SimulationPlayer.js';
import { PatientSpriteRegistry } from './PatientSpriteRegistry.js';

export class PatientQueueManager {
    constructor(scene, pathfinding, depthManager) {
        this.scene = scene;
        this.pathfinding = pathfinding;
        this.depthManager = depthManager;

        this.activePatient = null;
        this.waitingPatients = [];
        this.completedPatients = [];
        this.usedCases = [];

        this.minSpawnDelay = 5000;
        this.maxSpawnDelay = 10000;
        this.nextPatientTime = Date.now() + 2000;

        this.patientCounter = 0;

        this.waitingRoomChairs = [
            'WAITING_ROOM.CHAIR_1', 'WAITING_ROOM.CHAIR_2', 'WAITING_ROOM.CHAIR_3', 'WAITING_ROOM.CHAIR_4',
            'WAITING_ROOM.CHAIR_5', 'WAITING_ROOM.CHAIR_6', 'WAITING_ROOM.CHAIR_7', 'WAITING_ROOM.CHAIR_8',
            'WAITING_ROOM.CHAIR_9', 'WAITING_ROOM.CHAIR_10', 'WAITING_ROOM.CHAIR_11'
        ];
        this.occupiedChairs = new Set();
        this.maxWaitingCapacity = this.waitingRoomChairs.length;

        this.receptionDesks = ['RECEPTION.LEFT', 'RECEPTION.RIGHT'];
        this.occupiedReceptionDesks = new Set();
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
        return PatientSpriteRegistry.getNextSprite();
    }

    getRandomAvailableWaitingChair() {
        const available = this.waitingRoomChairs.filter(chair => !this.occupiedChairs.has(chair));
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    getRandomAvailableReceptionDesk() {
        const available = this.receptionDesks.filter(desk => !this.occupiedReceptionDesks.has(desk));
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    canSpawnNextPatient() {
        if (this.activePatient === null) return true;
        const availableChairs = this.maxWaitingCapacity - this.waitingPatients.length;
        return availableChairs > 0;
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

    spawnPatient(availableCases) {
        if (!this.canSpawnNextPatient()) {
            return;
        }

        const caseFile = this.getRandomUnusedCase(availableCases);
        const spritesheet = this.getNextSpriteSheet();
        const patientId = `patient_${Date.now()}_${Math.random()}`;

        this.loadCaseFile(caseFile).then(caseData => {
            if (!caseData) {
                console.error(`[PatientQueue] Failed to load case: ${caseFile}`);
                return;
            }

            const simulationPlayer = new SimulationPlayer(this.scene, this.pathfinding, this.depthManager);

            if (this.activePatient === null) {
                const receptionDesk = this.getRandomAvailableReceptionDesk() || this.receptionDesks[0];
                this.occupiedReceptionDesks.add(receptionDesk);

                this.activePatient = {
                    id: patientId,
                    player: simulationPlayer,
                    caseFile: caseFile,
                    spritesheet: spritesheet,
                    spawnTime: Date.now(),
                    waitingChair: null,
                    receptionDesk: receptionDesk
                };

                simulationPlayer.playSimulation(caseData, 2000, spritesheet, receptionDesk);
                simulationPlayer.onComplete(() => this.handlePatientComplete());

                console.log(`[PatientQueue] ✅ ${patientId} ACTIVE (${spritesheet}) at ${receptionDesk}`);

            } else {
                const waitingChair = this.getRandomAvailableWaitingChair();

                if (waitingChair === null) {
                    return;
                }

                this.occupiedChairs.add(waitingChair);

                this.waitingPatients.push({
                    id: patientId,
                    player: simulationPlayer,
                    caseData: caseData,
                    spritesheet: spritesheet,
                    spawnTime: Date.now(),
                    waitingChair: waitingChair
                });

                // Pass caseData so waiting patients are clickable
                simulationPlayer.goToWaitingRoom(spritesheet, waitingChair, caseData);

                console.log(`[PatientQueue] ⏳ ${patientId} WAITING (${spritesheet}) at ${waitingChair} - Queue: ${this.waitingPatients.length}/${this.maxWaitingCapacity}`);
            }
        }).catch(error => {
            console.error(`[PatientQueue] Error spawning patient:`, error);
        });
    }

    handlePatientComplete() {
        if (this.activePatient) {
            const elapsed = (Date.now() - this.activePatient.spawnTime) / 1000;
            console.log(`[PatientQueue] ✔️ ${this.activePatient.id} COMPLETED (${elapsed.toFixed(1)}s)`);

            if (this.activePatient.receptionDesk) {
                this.occupiedReceptionDesks.delete(this.activePatient.receptionDesk);
            }

            this.completedPatients.push(this.activePatient);
            this.activePatient = null;
        }

        if (this.waitingPatients.length > 0) {
            const nextPatient = this.waitingPatients.shift();
            this.occupiedChairs.delete(nextPatient.waitingChair);

            const receptionDesk = this.getRandomAvailableReceptionDesk() || this.receptionDesks[0];
            this.occupiedReceptionDesks.add(receptionDesk);

            console.log(`[PatientQueue] Starting: ${nextPatient.id} from waiting room`);

            this.activePatient = {
                id: nextPatient.id,
                player: nextPatient.player,
                caseFile: nextPatient.caseFile,
                spritesheet: nextPatient.spritesheet,
                spawnTime: nextPatient.spawnTime,
                waitingChair: null,
                receptionDesk: receptionDesk
            };

            nextPatient.player.startTimelineFromWaitingRoom(nextPatient.caseData, 2000, receptionDesk);
            nextPatient.player.onComplete(() => this.handlePatientComplete());

            console.log(`[PatientQueue] ✅ ${nextPatient.id} NOW ACTIVE at ${receptionDesk}`);
        }
    }

    update(availableCases) {
        if (Date.now() >= this.nextPatientTime) {
            this.spawnPatient(availableCases);
            this.nextPatientTime = Date.now() + Phaser.Math.Between(this.minSpawnDelay, this.maxSpawnDelay);
        }

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
        const hospitalized = (this.activePatient ? 1 : 0) + this.waitingPatients.length;
        return {
            active: this.activePatient?.id || 'None',
            waiting: `${this.waitingPatients.length}/${this.maxWaitingCapacity}`,
            hospitalized: `${hospitalized}/${1 + this.maxWaitingCapacity}`,
            completed: this.completedPatients.length,
            spawned: this.patientCounter
        };
    }

    startAutoPatientGeneration(availableCases) {
        console.log('[PatientQueue] Auto-generation started');
    }
}