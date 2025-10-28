# Medical Diagnosis Agent System

Multi-agent simulation where AI agents diagnose patients and learn from mistakes.

## What's Inside

**Agents** (`/agents/`)
- `nurse_agent.py` - Triages patients
- `doctor_agent.py` - Diagnoses using RAG (searches past cases + learned experiences)
- `lab_agent.py` - Generates test results
- `reflection_agent.py` - Analyzes errors, creates learning principles
- `patient_generator.py` - Creates realistic patients by department

**Database** (`db_manager.py`)
- DuckDB for structured data (cases, experiences, performance metrics)
- ChromaDB for semantic search (global across all departments)

**Utilities**
- `disease_validation.py` - Hybrid rule-based + LLM validation
- `agent_utils.py` - Retry logic, tool extraction, timeline parsing

**Runner** (`runner_with_learning.py`)
- Main simulation loop
- Handles agent coordination, validation, learning

## How to Run

### Single Simulation
```python
from hs_pipeline.simulation.runner_with_learning import SimulationRunner
from hs_pipeline.agents.patient_generator import generate_random_patient

runner = SimulationRunner()
patient, disease, department = generate_random_patient()
result = runner.run_simulation(patient, disease, department)

print(f"Correct: {result['is_correct']}")
```

### Batch Simulations
```bash
python runner_with_learning.py
```

Edit these parameters at the bottom:
```python
NUM_SIMULATIONS = 10              # How many cases
TARGET_DEPARTMENT = "Neurology"   # Or None for random
```

## Configuration

Create `.env`:
```bash
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_key
```

## How It Works

1. Generate patient with hidden disease
2. Nurse triages → Doctor searches database for similar cases
3. Doctor orders tests (if needed) → Lab returns results
4. Doctor makes diagnosis → System validates
5. Correct = stored in case base, Wrong = reflection creates learning principle
6. Over time, accuracy improves as experience base grows

## Database

Stored in `data/`:
- `agent_hospital.db` (DuckDB)
- `chroma_db/` (ChromaDB)

Clean slate: `rm -rf data/`

## Output

Results saved to `simulation_results/sim_N_department_disease.json`

Each contains:
- Patient data
- Timeline of agent decisions
- Final diagnosis
- Validation result