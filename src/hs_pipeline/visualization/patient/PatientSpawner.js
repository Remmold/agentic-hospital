/**
 * PatientSpawner
 * Handles patient spawning, case loading, and simulation initialization
 */

import { PatientSimulation } from '../simulation/PatientSimulation.js';
import { PatientSpriteRegistry } from './PatientSpriteRegistry.js';

export class PatientSpawner {
    constructor(scene, pathfinding, queue) {
        this.scene = scene;
        this.pathfinding = pathfinding;
        this.queue = queue;

        // Case management
        this.usedCases = [];

        // Spawn timing
        this.minSpawnDelay = 5000;
        this.maxSpawnDelay = 10000;
        this.nextPatientTime = Date.now() + 2000;

        this.patientCounter = 0;
    }

    /**
     * Load list of available case files from the server
     * @returns {Promise<string[]>} Array of case filenames
     */
    async loadAvailableCases() {
        try {
            const response = await fetch('./assets/simulation_results/');
            const html = await response.text();
            const regex = /sim_\d+_.*?\.json/g;
            const matches = html.match(regex);
            return matches ? [...new Set(matches)] : [];
        } catch (error) {
            console.error('[loadAvailableCases]: Failed to load case list:', error);
            return [];
        }
    }

    /**
     * Load a specific case file
     * @param {string} filename - Case filename
     * @returns {Promise<Object|null>} Case data or null if failed
     */
    async loadCaseFile(filename) {
        try {
            const response = await fetch(`./assets/simulation_results/${filename}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`[loadCaseFile]: Failed to load case ${filename}:`, error);
            return null;
        }
    }

    /**
     * Get a random unused case, or reset if all used
     * @param {string[]} availableCases - Array of available case filenames
     * @returns {string} Selected case filename
     */
    getRandomUnusedCase(availableCases) {
        const unused = availableCases.filter(c => !this.usedCases.includes(c));
        if (unused.length === 0) {
            console.warn('[PatientSpawner] All cases used! Resetting...');
            this.usedCases = [];
            return availableCases[Phaser.Math.Between(0, availableCases.length - 1)];
        }
        const randomCase = unused[Phaser.Math.Between(0, unused.length - 1)];
        this.usedCases.push(randomCase);
        return randomCase;
    }

    /**
     * Get the next patient spritesheet from the registry
     * @returns {string} Spritesheet name
     */
    getNextSpriteSheet() {
        return PatientSpriteRegistry.getNextSprite();
    }

    /**
     * Spawn a new patient (active or waiting)
     * @param {string[]} availableCases - Array of available case filenames
     */
    /**
     * Spawn a new patient (active or waiting)
     * @param {string[]} availableCases - Array of available case filenames
     */
    spawnPatient(availableCases) {
        if (!this.queue.canSpawnNextPatient()) {
            return;
        }

        const caseFile = this.getRandomUnusedCase(availableCases);
        const spritesheet = this.getNextSpriteSheet();
        const patientId = `patient_${Date.now()}_${Math.random()}`;

        this.loadCaseFile(caseFile).then(caseData => {
            if (!caseData) {
                console.error(`[spawnPatient]: Failed to load case: ${caseFile}`);
                return;
            }

            // Create simulation player
            const simulationPlayer = new PatientSimulation(
                this.scene,
                this.pathfinding,
                this.queue.depthManager
            );

            // Determine if patient is active or waiting
            if (this.queue.activePatient === null) {
                // Spawn as active patient
                const receptionDesk = this.queue.getRandomAvailableReceptionDesk() || this.queue.receptionDesks[0];

                const patientData = {
                    id: patientId,
                    player: simulationPlayer,
                    caseFile: caseFile,
                    spritesheet: spritesheet,
                    spawnTime: Date.now(),
                    waitingChair: null,
                    receptionDesk: receptionDesk
                };

                this.queue.setActivePatient(patientData);

                // Start simulation at reception desk
                simulationPlayer.playSimulation(caseData, 2000, spritesheet, receptionDesk);
                
                // Register door triggers after sprite is created
                this.scene.time.delayedCall(100, () => {
                    if (this.queue.activePatient?.player?.npc) {
                        this.scene.doorManager.activateTriggers(this.queue.activePatient.player.npc);
                    }
                });
                
                simulationPlayer.onComplete(() => this.handlePatientComplete());

            }
            else {
            // Spawn as waiting patient
            const waitingChair = this.queue.getRandomAvailableWaitingChair();

            if (waitingChair === null) {
                return; // No available chairs
            }

            const patientData = {
                id: patientId,
                player: simulationPlayer,
                caseData: caseData,
                spritesheet: spritesheet,
                spawnTime: Date.now(),
                waitingChair: waitingChair
                // Don't assign receptionDesk here - will be assigned when promoted
            };

            this.queue.addWaitingPatient(patientData);

            // Send patient to waiting room - they'll pick a random desk when they arrive
            simulationPlayer.goToWaitingRoom(spritesheet, waitingChair, caseData);
            
            this.scene.time.delayedCall(100, () => {
                if (patientData.player?.npc) {
                    this.scene.doorManager.activateTriggers(patientData.player.npc);
                }
            });
        }
            this.patientCounter++;
        }).catch(error => {
            console.error(`[spawnPatient]: Error spawning patient:`, error);
        });
    }

    /**
     * Handle active patient completion
     * Promotes next waiting patient if available
     */
    handlePatientComplete() {
        const nextPatientData = this.queue.handlePatientComplete();

        // If there's a next patient, start their timeline
        if (nextPatientData) {
            nextPatientData.patient.player.startTimelineFromWaitingRoom(
                nextPatientData.caseData,
                2000,
                nextPatientData.receptionDesk
            );
            nextPatientData.patient.player.onComplete(() => this.handlePatientComplete());
            
            // Ensure door triggers are registered for promoted patient
            this.scene.time.delayedCall(100, () => {
                if (nextPatientData.patient?.player?.npc) {
                    this.scene.doorManager.activateTriggers(nextPatientData.patient.player.npc);
                }
            });
        }
    }

    /**
     * Update spawn timings
     * @param {string[]} availableCases - Array of available case filenames
     */
    update(availableCases) {
        if (Date.now() >= this.nextPatientTime) {
            this.spawnPatient(availableCases);
            this.nextPatientTime = Date.now() + Phaser.Math.Between(this.minSpawnDelay, this.maxSpawnDelay);
        }
    }
}