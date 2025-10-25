"""
Example: Agent Hospital workflow matching the flowchart
"""
from hs_pipeline.database_management.db_manager import get_db
import uuid


def setup_database():
    """Initialize the database."""
    db = get_db()
    db.init_tables()
    print("✓ Database initialized\n")


def example_add_successful_case():
    """Doctor adds a successful case to Medical Case Base."""
    db = get_db()
    
    case_id = f"case_{uuid.uuid4()}"
    
    # Store FULL case information
    db.add_medical_case(
        case_id=case_id,
        department="Cardiology",
        patient_age=58,
        patient_gender="Male",
        medical_history="Hypertension, high cholesterol, smoker for 20 years",
        symptoms="Chest pain, shortness of breath, sweating",
        examination_ordered="ECG, Cardiac enzymes, Chest X-ray",
        examination_results="ECG shows ST elevation, Elevated troponin levels",
        diagnosis="Acute Myocardial Infarction (Heart Attack)",
        treatment_plan="Emergency PCI, Aspirin, Clopidogrel, Beta-blocker",
        outcome="success"
    )
    
    print(f"✓ Medical case added: {case_id}")
    print("  Stored in: DuckDB (full details) + ChromaDB (vectorized)\n")
    return case_id


def example_add_experience():
    """Doctor reflects on error and adds experience principle."""
    db = get_db()
    
    experience_id = f"exp_{uuid.uuid4()}"
    
    # Short principle text from reflection
    principle = "Patients over 50 with chest pain and history of smoking should be urgently evaluated for acute coronary syndrome even if initial symptoms seem mild"
    
    db.add_experience(
        experience_id=experience_id,
        department="Cardiology",
        principle_text=principle,
        validation_accuracy=0.95
    )
    
    print(f"✓ Experience added: {experience_id}")
    print(f"  Principle: {principle[:80]}...")
    print("  Stored in: DuckDB (text) + ChromaDB (vectorized)\n")
    return experience_id


def example_semantic_search_cases():
    """Semantic search for similar cases (Medical Records Retrieval)."""
    db = get_db()
    
    # Doctor gets a new patient
    patient_query = "62 year old male with chest discomfort and sweating, history of diabetes"
    
    # Search for similar cases
    results = db.search_similar_cases(
        department="Cardiology",
        query=patient_query,
        n_results=3  # Top-3 as per paper
    )
    
    print("=== Medical Records Retrieval ===")
    print(f"Query: {patient_query}")
    print(f"Found {len(results['ids'][0])} similar cases\n")
    
    # Get full details of similar cases
    for case_id in results['ids'][0]:
        case = db.get_case_details(case_id)
        if case:
            print(f"Case: {case_id}")
            print(f"  Age: {case['patient_age']}, Gender: {case['patient_gender']}")
            print(f"  Diagnosis: {case['diagnosis']}")
            print(f"  Treatment: {case['treatment_plan'][:60]}...")
            print()
    
    return results


def example_semantic_search_experiences():
    """Semantic search for relevant experiences (Experience Retrieval)."""
    db = get_db()
    
    # Doctor needs guidance
    query = "elderly patient with mild chest symptoms"
    
    # Search for relevant experiences
    results = db.search_relevant_experiences(
        department="Cardiology",
        query=query,
        n_results=4  # Top-4 as per paper
    )
    
    print("=== Experience Retrieval ===")
    print(f"Query: {query}")
    print(f"Found {len(results['ids'][0])} relevant experiences\n")
    
    # Get full experience text
    for exp_id in results['ids'][0]:
        exp = db.get_experience_details(exp_id)
        if exp:
            print(f"Experience: {exp_id}")
            print(f"  {exp['principle_text'][:100]}...")
            print(f"  Validation accuracy: {exp['validation_accuracy']}")
            print()
    
    return results


def example_doctor_workflow():
    """Complete workflow: Patient Query → Prompting → Answer → Add to database."""
    db = get_db()
    
    print("=== Doctor Workflow (Flowchart) ===\n")
    
    # Step 1: New patient arrives
    print("1. Patient Query received")
    patient_query = "55 year old female, chest pain radiating to left arm, history of hypertension"
    print(f"   {patient_query}\n")
    
    # Step 2: Medical Records Retrieval (semantic search)
    print("2. Medical Records Retrieval...")
    cases = db.search_similar_cases("Cardiology", patient_query, n_results=3)
    print(f"   Retrieved {len(cases['ids'][0])} similar cases\n")
    
    # Step 3: Experience Retrieval (semantic search)
    print("3. Experience Retrieval...")
    experiences = db.search_relevant_experiences("Cardiology", patient_query, n_results=4)
    print(f"   Retrieved {len(experiences['ids'][0])} relevant experiences\n")
    
    # Step 4: Medical Agent generates answer (simulated)
    print("4. Medical Agent (doctor) generates answer")
    print("   Using: retrieved cases + experiences + patient query\n")
    
    # Step 5: If correct → add to Medical Case Base
    print("5. Answer is correct!")
    db.add_medical_case(
        case_id=f"case_{uuid.uuid4()}",
        department="Cardiology",
        patient_age=55,
        patient_gender="Female",
        medical_history="Hypertension",
        symptoms="Chest pain radiating to left arm",
        examination_ordered="ECG, Cardiac enzymes",
        examination_results="ST depression on ECG",
        diagnosis="Unstable Angina",
        treatment_plan="Antiplatelet therapy, beta-blockers, cardiac catheterization",
        outcome="success"
    )
    print("   → Case added to Medical Record Library\n")
    
    # Alternative: If incorrect → Reflection
    print("6. (Alternative) If answer was wrong:")
    print("   → Compare with Golden Answer")
    print("   → Reflection generates principle")
    print("   → Re-answer → If correct, validate experience")
    print("   → Add to Experience Base\n")


def run_all_examples():
    """Run complete demonstration."""
    print("=" * 60)
    print("AGENT HOSPITAL DATABASE - Complete Workflow")
    print("=" * 60 + "\n")
    
    setup_database()
    example_add_successful_case()
    example_add_experience()
    example_semantic_search_cases()
    example_semantic_search_experiences()
    example_doctor_workflow()
    example_experience_tracking()
    
    print("=" * 60)
    print("✓ All examples completed!")
    print("=" * 60)


def example_experience_tracking():
    """Example: Track experience usage and deprecate poor performers."""
    db = get_db()
    
    print("=== Experience Tracking & Management ===\n")
    
    # Add an experience
    exp_id = f"exp_{uuid.uuid4()}"
    db.add_experience(
        experience_id=exp_id,
        department="Cardiology",
        principle_text="Test principle for tracking",
        validation_accuracy=0.9
    )
    
    # Simulate usage
    print("1. Experience is used in 10 cases:")
    for i in range(10):
        # 6 correct, 4 incorrect
        led_to_correct = i < 6
        db.track_experience_usage(exp_id, led_to_correct)
    
    # Check performance
    perf = db.get_experience_performance(exp_id)
    print(f"   Initial validation: {perf['initial_validation_accuracy']}")
    print(f"   Actual performance: {perf['actual_accuracy']:.2f}")
    print(f"   Times used: {perf['times_retrieved']}")
    print(f"   Correct: {perf['times_led_to_correct']}, Incorrect: {perf['times_led_to_incorrect']}\n")
    
    # Find poorly performing experiences
    print("2. Finding low-performing experiences...")
    poor_performers = db.get_low_performing_experiences(
        department="Cardiology",
        accuracy_threshold=0.65,
        min_usage=5
    )
    
    if poor_performers:
        print(f"   Found {len(poor_performers)} poor performers")
        for exp in poor_performers:
            print(f"   - {exp['experience_id']}: {exp['actual_accuracy']:.2f} accuracy")
        
        # Deprecate the worst one
        print("\n3. Deprecating poor performer...")
        db.deprecate_experience(poor_performers[0]['experience_id'])
        print(f"   ✓ Experience {poor_performers[0]['experience_id']} marked inactive\n")
    else:
        print("   No poor performers found\n")


if __name__ == "__main__":
    run_all_examples()