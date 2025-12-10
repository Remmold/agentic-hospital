# Medical Diagnosis Agent System

Multi-agent simulation where AI agents diagnose patients and learn from mistakes.

## Agent Components

| Agent | File | Purpose |
|-------|------|---------|
| Nurse | `nurse_agent.py` | Triages patients by urgency |
| Doctor | `doctor_agent.py` | Diagnoses using RAG (searches past cases + learned experiences) |
| Lab | `lab_agent.py` | Generates realistic test results |
| Reflection | `reflection_agent.py` | Analyzes errors, creates learning principles |
| Patient Generator | `patient_generator.py` | Creates realistic patients by department |

## Utilities

- `disease_validation.py` - Hybrid rule-based + LLM validation
- `agent_utils.py` - Retry logic, tool extraction, timeline parsing

## Usage

### Import Agents

```python
from hs_pipeline.simulation.agents import (
    nurse_agent,
    doctor_agent,
    lab_agent,
    generate_random_patient,
    PatientData,
)
```

### Generate Patients

```python
from hs_pipeline.simulation.agents import generate_random_patient

patient, disease, department = generate_random_patient()
print(f"Patient: {patient.name}, {patient.age}y")
print(f"Disease: {disease} ({department})")
```

### Run Full Simulation

```python
from hs_pipeline.simulation import SimulationRunner
from hs_pipeline.simulation.agents import generate_random_patient

runner = SimulationRunner()
patient, disease, department = generate_random_patient()
result = runner.run_simulation(patient, disease, department)

print(f"Correct: {result['is_correct']}")
```

## How It Works

1. Generate patient with hidden disease
2. Nurse triages → Doctor searches database for similar cases
3. Doctor orders tests (if needed) → Lab returns results
4. Doctor makes diagnosis → System validates
5. Correct = stored in case base, Wrong = reflection creates learning principle
6. Over time, accuracy improves as experience base grows

## Configuration

Required environment variables (in `.env`):
```bash
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_key
```

Or for Gemini:
```bash
GEMINI_API_KEY=your_key
```
