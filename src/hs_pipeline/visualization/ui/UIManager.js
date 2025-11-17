/**
 * Manages the simulation UI panel
 */
export class UIManager {
    constructor() {
        this.createPanel();
        this.isPaused = false;
        this.speeds = [0.5, 1, 2, 3];
        this.currentSpeedIndex = 1;
        this.displayedPatientId = null;
        this.activePatientId = null;
        
        this.patients = {
            active: null,
            waiting: [],
            completed: []
        };
        
        this.updateSpeedControl();
        this.setupControls();
    }

    createPanel() {
        let panel = document.getElementById('simulation-panel');
        
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'simulation-panel';
            panel.innerHTML = `
                <div class="panel-header">
                    <h2>Patient Timeline</h2>
                    <div class="controls">
                        <button id="playPauseBtn" class="control-btn pause-btn">
                            <span class="btn-icon">⏸</span>
                            <span class="btn-text">Pause</span>
                        </button>
                        <div id="speedSelector" class="speed-selector">
                            <button class="speed-segment" data-speed="0.5">0.5×</button>
                            <button class="speed-segment active" data-speed="1">1×</button>
                            <button class="speed-segment" data-speed="2">2×</button>
                            <button class="speed-segment" data-speed="3">3×</button>
                        </div>
                    </div>
                </div>
                
                <div id="patient-selector" class="patient-selector">
                    <div class="selector-header">Patients</div>
                    <div id="patient-chips" class="patient-chips">
                        <!-- Patient chips will be added here -->
                    </div>
                </div>
                
                <div id="patient-info" class="patient-info">
                    <div class="no-patient">
                        <div class="waiting-icon">⏳</div>
                        <p>Waiting for patient...</p>
                    </div>
                </div>
                
                <div id="timeline-container" class="timeline-container">
                    <!-- Timeline steps will be added here -->
                </div>
            `;
            document.body.appendChild(panel);
        }
        
        this.panel = panel;
        this.patientInfo = document.getElementById('patient-info');
        this.timelineContainer = document.getElementById('timeline-container');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.speedSelector = document.getElementById('speedSelector');
        this.patientChips = document.getElementById('patient-chips');
        
        if (!this.patientChips) {
            this.addPatientSelectorToExistingPanel();
            this.patientChips = document.getElementById('patient-chips');
        }
    }

    addPatientSelectorToExistingPanel() {
        const patientInfo = document.getElementById('patient-info');
        if (!patientInfo) return;
        
        const selectorHTML = `
            <div id="patient-selector" class="patient-selector">
                <div class="selector-header">Patients</div>
                <div id="patient-chips" class="patient-chips">
                    <!-- Patient chips will be added here -->
                </div>
            </div>
        `;
        
        patientInfo.insertAdjacentHTML('beforebegin', selectorHTML);
    }

    updateSpeedControl() {
        const panelHeader = document.querySelector('#simulation-panel .panel-header');
        if (!panelHeader) return;
        
        panelHeader.innerHTML = `
            <h2>Patient Timeline</h2>
            <div class="controls">
                <button id="playPauseBtn" class="control-btn pause-btn">
                    <span class="btn-icon">⏸</span>
                    <span class="btn-text">Pause</span>
                </button>
                <div id="speedSelector" class="speed-selector">
                    <button class="speed-segment" data-speed="0.5">0.5×</button>
                    <button class="speed-segment active" data-speed="1">1×</button>
                    <button class="speed-segment" data-speed="2">2×</button>
                    <button class="speed-segment" data-speed="3">3×</button>
                </div>
            </div>
        `;
        
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.speedSelector = document.getElementById('speedSelector');
        
        this.playPauseBtn.addEventListener('click', () => {
            this.togglePause();
        });
        
        const segments = this.speedSelector.querySelectorAll('.speed-segment');
        segments.forEach(segment => {
            segment.addEventListener('click', () => {
                const speed = parseFloat(segment.dataset.speed);
                this.setSpeed(speed);
            });
        });
    }

    setupControls() {
        // Controls are now set up in updateSpeedControl()
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.playPauseBtn.innerHTML = `
                <span class="btn-icon">▶</span>
                <span class="btn-text">Play</span>
            `;
            this.playPauseBtn.classList.add('paused');
        } else {
            this.playPauseBtn.innerHTML = `
                <span class="btn-icon">⏸</span>
                <span class="btn-text">Pause</span>
            `;
            this.playPauseBtn.classList.remove('paused');
        }
        
        window.dispatchEvent(new CustomEvent('simulationPause', { 
            detail: { isPaused: this.isPaused } 
        }));
    }

    setSpeed(speed) {
        this.currentSpeedIndex = this.speeds.indexOf(speed);
        
        const segments = this.speedSelector.querySelectorAll('.speed-segment');
        segments.forEach(segment => {
            if (parseFloat(segment.dataset.speed) === speed) {
                segment.classList.add('active');
            } else {
                segment.classList.remove('active');
            }
        });
        
        window.dispatchEvent(new CustomEvent('simulationSpeed', { 
            detail: { speed } 
        }));
        
        console.log(`[UIManager] Speed: ${speed}x`);
    }

    displayPatientCase(patientData, patientId = null, isActive = false, currentStep = null) {
        
        const wasDisplayingSamePatient = this.displayedPatientId === patientId;
        this.displayedPatientId = patientId;
        
        if (isActive) {
            this.activePatientId = patientId;
        }
        
        if (!patientData || !patientData.patient) {
            console.warn('[UIManager] No patient data');
            this.patientInfo.innerHTML = `
                <div class="no-patient">
                    <div class="waiting-icon">⏳</div>
                    <p>Waiting for patient...</p>
                </div>
            `;
            this.timelineContainer.innerHTML = '';
            this.displayedPatientId = null;
            return;
        }
        
        if (wasDisplayingSamePatient) {
            if (currentStep !== null && currentStep >= 0 && patientId === this.activePatientId) {
                this.highlightCurrentStep(currentStep, patientId);
            }
            this.updateChipSelection();
            return;
        }

        const patient = patientData.patient;
        this.patientInfo.innerHTML = `
            <div class="patient-card">
                <h3>${patient.name}</h3>
                <div class="patient-details">
                    <div class="detail-row">
                        <span class="detail-label">Age:</span>
                        <span class="detail-value">${patient.age}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Gender:</span>
                        <span class="detail-value">${patient.gender}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Chief Complaint:</span>
                        <span class="detail-value">${patient.chief_complaint || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;

        this.timelineContainer.innerHTML = '';
        
        if (patientData.timeline && patientData.timeline.length > 0) {
            patientData.timeline.forEach((step, index) => {
                const stepEl = this.createTimelineStep(step, index);
                this.timelineContainer.appendChild(stepEl);
            });
            
            if (patientId === this.activePatientId && currentStep !== null && currentStep >= 0) {
                setTimeout(() => {
                    this.highlightCurrentStep(currentStep, patientId);
                }, 0);
            }
        } else {
            this.timelineContainer.innerHTML = '<p style="color: #718096; text-align: center; padding: 20px;">No timeline data</p>';
        }
        
        this.updateChipSelection();
    }

    createTimelineStep(step, index) {
        const div = document.createElement('div');
        div.className = 'timeline-step';
        div.dataset.stepIndex = index;

        const agent = step.agent || 'Unknown';
        const reasoning = step.details?.reasoning || 'No details available';
        const viewer_output = step.details?.viewer_output || 'viewer output not provided';
        const orderedTest = step.details?.ordered_test || null;
        const diagnosis = step.details?.diagnosis || null;
        const testsRan = step.details?.tests_ran || null;

        let decisionsHTML = '';
        if (orderedTest) {
            decisionsHTML += `<div class="step-decision">🔬 <strong>Test Ordered:</strong> ${orderedTest}</div>`;
        }
        if (testsRan) {
            decisionsHTML += `<div class="step-decision">✅ <strong>Tests Ran:</strong> ${testsRan}</div>`;
        }
        if (diagnosis) {
            decisionsHTML += `<div class="step-decision">📋 <strong>Diagnosis:</strong> ${diagnosis}</div>`;
        }

        div.innerHTML = `
            <div class="step-header">
                <span class="step-number">Step ${index + 1}</span>
                <span class="step-agent">${agent}</span>
            </div>
            <div class="step-content">
                <p>${viewer_output}</p>
                ${decisionsHTML}
            </div>
        `;

        return div;
    }

    highlightCurrentStep(stepIndex, patientId = null) {
        if (patientId !== this.activePatientId) {
            return;
        }
        
        if (this.displayedPatientId !== this.activePatientId) {
            return;
        }

        document.querySelectorAll('.timeline-step').forEach(el => {
            el.classList.remove('current');
            const index = parseInt(el.dataset.stepIndex);
            if (index < stepIndex) {
                el.classList.add('completed');
            } else {
                el.classList.remove('completed');
            }
        });

        const currentEl = document.querySelector(`[data-step-index="${stepIndex}"]`);
        if (currentEl) {
            currentEl.classList.add('current');
            currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    getIsPaused() {
        return this.isPaused;
    }

    getCurrentSpeed() {
        return this.speeds[this.currentSpeedIndex];
    }

    updatePatientSelector(activePatient, waitingPatients, completedPatients) {
        const oldActive = this.patients.active?.id;
        const oldWaiting = this.patients.waiting.map(p => p.id).join(',');
        const oldCompleted = this.patients.completed.map(p => p.id).join(',');
        
        this.patients.active = activePatient;
        this.patients.waiting = waitingPatients || [];
        this.patients.completed = completedPatients || [];
        
        const newActive = this.patients.active?.id;
        const newWaiting = this.patients.waiting.map(p => p.id).join(',');
        const newCompleted = this.patients.completed.map(p => p.id).join(',');
        
        if (oldActive !== newActive || oldWaiting !== newWaiting || oldCompleted !== newCompleted) {
            this.renderPatientChips();
        } else {
            this.updateChipSelection();
        }
    }

    renderPatientChips() {
        if (!this.patientChips) return;
        
        this.patientChips.innerHTML = '';
        
        if (this.patients.active) {
            const chip = this.createPatientChip(
                this.patients.active.id,
                this.patients.active.name,
                'active',
                this.patients.active.caseData,
                this.patients.active.sprite,
                this.patients.active.currentStep,
                this.patients.active.isPlaying
            );
            this.patientChips.appendChild(chip);
        }
        
        this.patients.waiting.forEach(patient => {
            const chip = this.createPatientChip(
                patient.id,
                patient.name,
                'waiting',
                patient.caseData,
                patient.sprite,
                patient.currentStep,
                patient.isPlaying
            );
            this.patientChips.appendChild(chip);
        });
        
        this.patients.completed.forEach(patient => {
            const chip = this.createPatientChip(
                patient.id,
                patient.name,
                'completed',
                patient.caseData,
                null,
                patient.currentStep,
                patient.isPlaying
            );
            this.patientChips.appendChild(chip);
        });
    }

    createPatientChip(patientId, patientName, status, caseData, sprite, currentStep = -1, isPlaying = false) {
        const chip = document.createElement('button');
        chip.className = `patient-chip patient-chip-${status}`;
        chip.dataset.patientId = patientId;
        
        if (patientId === this.displayedPatientId) {
            chip.classList.add('selected');
        }
        
        const statusIcon = {
            'active': '▶',
            'waiting': '⏳',
            'completed': '✓'
        }[status] || '';
        
        chip.innerHTML = `
            <span class="chip-icon">${statusIcon}</span>
            <span class="chip-name">${patientName}</span>
        `;
        
        chip._sprite = sprite;
        
        chip.addEventListener('click', () => {
            if (!caseData) {
                console.warn('[UIManager] No case data for patient:', patientId);
                return;
            }
            
            const freshCurrentStep = chip._sprite?.simulationPlayer?.lastHighlightedStep ?? -1;
            const freshIsPlaying = chip._sprite?.simulationPlayer?.isPlaying ?? false;

            const event = new CustomEvent('patientChipClicked', {
                detail: {
                    caseData: caseData,
                    patientId: patientId,
                    sprite: chip._sprite,
                    currentStep: freshCurrentStep,
                    isPlaying: freshIsPlaying
                }
            });
            window.dispatchEvent(event);
        });
        
        return chip;
    }

    updateChipSelection() {
        if (!this.patientChips) return;
        
        const chips = this.patientChips.querySelectorAll('.patient-chip');
        chips.forEach(chip => {
            const chipId = chip.dataset.patientId;
            if (chipId === this.displayedPatientId) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });
    }
}