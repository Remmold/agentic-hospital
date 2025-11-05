/**
 * Manages the simulation UI panel
 */
export class UIManager {
    constructor() {
        this.createPanel();
        this.isPaused = false;
        this.speeds = [0.5, 1, 2, 4];
        this.currentSpeedIndex = 1;
        this.displayedPatientId = null; // Track which patient's timeline is shown
        this.activePatientId = null; // Track which patient is actively running
        this.setupControls();
        console.log('[UIManager] Initialized');
    }

    createPanel() {
        // Create panel HTML if it doesn't exist
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
                        <button id="speedBtn" class="control-btn speed-btn">
                            <span class="btn-text">1×</span>
                        </button>
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
            
            // Add styles
            this.addStyles();
        }
        
        this.panel = panel;
        this.patientInfo = document.getElementById('patient-info');
        this.timelineContainer = document.getElementById('timeline-container');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.speedBtn = document.getElementById('speedBtn');
    }

    addStyles() {
        const styleId = 'simulation-panel-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            * {
                box-sizing: border-box;
            }

           
        `;
        document.head.appendChild(style);
    }

    setupControls() {
        this.playPauseBtn.addEventListener('click', () => {
            this.togglePause();
        });
        
        this.speedBtn.addEventListener('click', () => {
            this.cycleSpeed();
        });
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
        
        console.log(`[UIManager] ${this.isPaused ? 'PAUSED' : 'PLAYING'}`);
    }

    cycleSpeed() {
        this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speeds.length;
        const speed = this.speeds[this.currentSpeedIndex];
        this.speedBtn.innerHTML = `<span class="btn-text">${speed}×</span>`;
        
        window.dispatchEvent(new CustomEvent('simulationSpeed', { 
            detail: { speed } 
        }));
        
        console.log(`[UIManager] Speed: ${speed}x`);
    }

    displayPatientCase(patientData, patientId = null, isActive = false, currentStep = null) {
        console.log('[UIManager] displayPatientCase called with:', patientData);
        
        // Store which patient is being displayed
        this.displayedPatientId = patientId;
        
        // Store active patient ID only if this is the active patient
        if (isActive) {
            this.activePatientId = patientId;
            console.log(`[UIManager] Active patient set to: ${patientId}`);
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

        // Display patient info
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

        // Clear and rebuild timeline
        this.timelineContainer.innerHTML = '';
        
        if (patientData.timeline && patientData.timeline.length > 0) {
            patientData.timeline.forEach((step, index) => {
                const stepEl = this.createTimelineStep(step, index);
                this.timelineContainer.appendChild(stepEl);
            });
            console.log(`[UIManager] Created ${patientData.timeline.length} timeline steps for patient ${patientId}`);
            
            // If this is the active patient and we have a current step, highlight it
            if (patientId === this.activePatientId && currentStep !== null && currentStep >= 0) {
                // Use setTimeout to ensure DOM is fully updated
                setTimeout(() => {
                    this.highlightCurrentStep(currentStep, patientId);
                    console.log(`[UIManager] Auto-highlighted step ${currentStep} for active patient`);
                }, 0);
            }
        } else {
            this.timelineContainer.innerHTML = '<p style="color: #718096; text-align: center; padding: 20px;">No timeline data</p>';
        }
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
        console.log(`[UIManager] Step change: step ${stepIndex}, patientId: ${patientId}, displayed: ${this.displayedPatientId}, active: ${this.activePatientId}`);
        
        // Only highlight if:
        // 1. This step is for the active patient
        // 2. The active patient's timeline is currently displayed
        if (patientId !== this.activePatientId) {
            console.log(`[UIManager] Ignoring step - not the active patient`);
            return;
        }
        
        if (this.displayedPatientId !== this.activePatientId) {
            console.log(`[UIManager] Ignoring step - active patient timeline not displayed`);
            return;
        }
        
        console.log(`[UIManager] Highlighting step ${stepIndex} for active patient`);
        
        // Remove all current highlights
        document.querySelectorAll('.timeline-step').forEach(el => {
            el.classList.remove('current');
            const index = parseInt(el.dataset.stepIndex);
            if (index < stepIndex) {
                el.classList.add('completed');
            } else {
                el.classList.remove('completed');
            }
        });

        // Highlight current step
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
}