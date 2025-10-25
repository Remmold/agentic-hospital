# Agent Hospital Database - Correct Structure

Matches the flowchart from the paper.

## Database Structure

### 1. Medical Cases (Medical Record Library)
**DuckDB Table: `medical_cases`**
Stores COMPLETE case information:
- Patient demographics (age, gender)
- Medical history
- Symptoms
- Examinations ordered
- Examination results
- Diagnosis
- Treatment plan
- Outcome

**ChromaDB Collection: `medical_cases_{department}`**
- Vectorized version for semantic search
- Used for "Medical Records Retrieval" in flowchart

### 2. Experiences (Experience Base)
**DuckDB Table: `experiences`**
Stores SHORT principles from reflection:
- Principle text (natural language rule)
- Department
- Validation accuracy (initial validation)
- **Usage tracking**: times retrieved, times led to correct/incorrect
- **is_active**: can be deprecated if performing poorly
- **updated_at**: timestamp of last update

**ChromaDB Collection: `experiences_{department}`**
- Vectorized version for semantic search
- Used for "Experience Retrieval" in flowchart
- Only active experiences retrieved by default

**Experience Lifecycle:**
1. Created from reflection (validated on 1 case)
2. Retrieved and used in future cases
3. Tracked: did it lead to correct/incorrect answer?
4. If actual accuracy < threshold after N uses → deprecate
5. Kept in DB (is_active=FALSE) for analysis, not retrieved

## Workflow (from Flowchart)

```
1. Patient Query
   ↓
2. Medical Records Retrieval (semantic search top-3 cases)
   +
   Experience Retrieval (semantic search top-4 experiences)
   ↓
3. Prompting → Medical Agent (doctor)
   ↓
4. Generated Answer
   ↓
5. Correct? 
   YES → Add to Medical Record Library
   NO  → Reflection → Validated Experience → Add to Experience Base
```

## Usage

```python
from db_manager import get_db

db = get_db()
db.init_tables()

# Add successful case (when answer is correct)
db.add_medical_case(
    case_id="case_001",
    department="Cardiology",
    patient_age=58,
    patient_gender="Male",
    medical_history="Hypertension, smoker",
    symptoms="Chest pain, shortness of breath",
    examination_ordered="ECG, Cardiac enzymes",
    examination_results="ST elevation, Elevated troponin",
    diagnosis="Acute Myocardial Infarction",
    treatment_plan="Emergency PCI, Aspirin, Beta-blocker",
    outcome="success"
)

# Add experience (when reflection creates principle)
db.add_experience(
    experience_id="exp_001",
    department="Cardiology",
    principle_text="Patients over 50 with chest pain should be urgently evaluated for ACS",
    validation_accuracy=0.95
)

# Semantic search for similar cases
cases = db.search_similar_cases(
    department="Cardiology",
    query="elderly male with chest discomfort and sweating",
    n_results=3  # Top-3
)

# Semantic search for relevant experiences
experiences = db.search_relevant_experiences(
    department="Cardiology",
    query="chest pain evaluation",
    n_results=4  # Top-4
)

# Get full details
case_details = db.get_case_details(cases['ids'][0][0])
exp_details = db.get_experience_details(experiences['ids'][0][0])

# Track experience usage (after using it in a case)
db.track_experience_usage(
    experience_id="exp_001",
    led_to_correct=True  # or False
)

# Check experience performance
perf = db.get_experience_performance("exp_001")
print(f"Actual accuracy: {perf['actual_accuracy']}")
print(f"Times used: {perf['times_retrieved']}")

# Find poorly performing experiences
poor_performers = db.get_low_performing_experiences(
    department="Cardiology",
    accuracy_threshold=0.6,  # Below 60% accuracy
    min_usage=5  # Must be used at least 5 times
)

# Deprecate an experience (marks inactive, doesn't delete)
db.deprecate_experience("exp_001")
```

## Experience Management Strategy

**Why experiences can be flawed:**
- Validated on only 1 case initially
- May not generalize well
- Could be too specific or too vague
- Medical knowledge evolves

**How to manage:**
1. **Track every usage**: `track_experience_usage(exp_id, was_correct)`
2. **Monitor performance**: Compare initial validation vs actual accuracy
3. **Deprecate poor performers**: If accuracy < 60% after 5+ uses
4. **Keep for analysis**: Don't delete, mark `is_active=FALSE`

**Example:**
```
Experience: "Patients over 50 with chest pain need urgent eval"
Initial validation: 0.95 (worked on 1 case)
After 20 uses: 0.55 actual accuracy (too broad)
Action: Deprecate, create more specific principle
```

## Key Points

1. **Medical cases store EVERYTHING** - not just Q&A pairs
2. **Experiences are SHORT** - natural language principles
3. **Both are vectorized** - for semantic search
4. **Top-3 cases, Top-4 experiences** - per paper hyperparameters
5. **Doctor adds data** - no manual labeling needed
6. **Experiences ARE validated** - tested before adding (Re-answer Correct? step)
7. **But can still be flawed** - validated on 1 case, may not generalize
8. **Track experience performance** - deprecate if actual accuracy drops
9. **Don't delete, deprecate** - keep inactive experiences for analysis