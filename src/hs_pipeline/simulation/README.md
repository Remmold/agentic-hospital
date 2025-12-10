# Simulation Module

**Orchestrates multi-agent medical diagnostic workflows**

This module is the core runner that coordinates AI agents (Nurse → Doctor → Lab → Reflection) through a complete patient diagnostic simulation.

## Overview

The `SimulationRunner` class manages the entire diagnostic workflow:

1. **Nurse Triage**: Initial patient assessment and symptom collection
2. **Doctor Examination**: Medical reasoning, test ordering, and diagnosis
3. **Lab Tests**: Simulated lab results based on the actual disease
4. **Reflection**: Learning from diagnostic errors to improve future accuracy

## Usage

### Generate Random Patient Simulation

```python
from hs_pipeline.simulation import SimulationRunner
from hs_pipeline.simulation.agents import generate_random_patient

runner = SimulationRunner()
patient, disease, department = generate_random_patient()
result = runner.run_simulation(patient, disease, department)
```

### Generate Patient for Specific Department

```python
from hs_pipeline.simulation import SimulationRunner
from hs_pipeline.simulation.agents import generate_patient_for_department

runner = SimulationRunner()
patient, disease = generate_patient_for_department("Cardiology")
result = runner.run_simulation(patient, disease, "Cardiology")
```

### Create Patient from Document

```python
from hs_pipeline.simulation import SimulationRunner
from pathlib import Path

runner = SimulationRunner()
patient = runner.patient_from_document(Path("patient_records/case.pdf"))
result = runner.run_simulation(patient)
```

### Create Patient from Text

```python
from hs_pipeline.simulation import SimulationRunner

runner = SimulationRunner()
patient = runner.patient_from_text(
    symptoms="chest pain, shortness of breath, fatigue",
    age=55,
    name="John Doe",
    gender="Male"
)
result = runner.run_simulation(patient)
```

## Simulation Result

The `run_simulation()` method returns a dictionary containing:

| Field | Type | Description |
|-------|------|-------------|
| `patient` | dict | Patient data (name, age, gender, symptoms) |
| `actual_disease` | str | The simulated disease (ground truth) |
| `department` | str | Medical department for the case |
| `timeline` | list | Step-by-step agent decisions (viewer format) |
| `final_diagnosis` | dict | Doctor's final diagnosis and treatment |
| `total_steps` | int | Number of agent API calls made |
| `is_correct` | bool | Whether the diagnosis matched the actual disease |
| `validation_reason` | str | Explanation of validation result |

## Workflow Details

### Agent Flow

```
┌─────────┐      ┌────────┐      ┌─────┐
│  Nurse  │ ───▶ │ Doctor │ ───▶ │ Lab │
└─────────┘      └────────┘      └─────┘
                     │              │
                     │◀─────────────┘
                     │
                     ▼
              ┌────────────┐
              │  Finish /  │
              │ Discharge  │
              └────────────┘
                     │
                     ▼ (if wrong diagnosis)
              ┌────────────┐
              │ Reflection │
              └────────────┘
```

### Test Room Routing

Tests are automatically routed to the appropriate room type:

- **MRI Room**: MRI, fMRI, MRA, magnetic resonance scans
- **X-Ray Room**: X-ray, radiography
- **CT Scan Room**: CT scan, computed tomography, CAT scan
- **General Lab**: Blood tests, cultures, and all other tests

### Safeguards

- **Duplicate Test Prevention**: Tests can only be ordered once
- **Test Cycle Limit**: Maximum 3 test cycles per simulation
- **Step Limit**: Configurable `max_steps` (default: 20)

## Running Batch Simulations

Run the module directly for batch simulations:

```bash
uv run python -m hs_pipeline.simulation.runner
```

This runs 20 simulations by default and outputs:
- JSON result files to `simulation_results/`
- Summary statistics (accuracy by department)

Configure via variables at bottom of `runner.py`:
```python
NUM_SIMULATIONS = 20      # Number of simulations to run
TARGET_DEPARTMENT = None  # Specific department or None for random
```

## Learning System

When a diagnosis is incorrect, the system:

1. **Analyzes the Error**: Compares wrong vs correct diagnosis
2. **Creates Learning Principle**: Generates actionable insights
3. **Stores Experience**: Saves to database for future reference

Successful cases are stored in the Medical Case Base for pattern matching.
