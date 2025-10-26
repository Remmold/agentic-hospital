"""
Updated Runner - Uses department-based patient generation
"""
from pathlib import Path
from dataclasses import asdict
import json
import uuid

from hs_pipeline.extraction import extractor, llm_parser
from hs_pipeline.agents.nurse_agent import nurse_agent, PatientData
from hs_pipeline.agents.doctor_agent import doctor_agent, DoctorDeps
from hs_pipeline.agents.lab_agent import lab_agent, LabAgentDeps
from hs_pipeline.agents.agent_loop import run_agent_with_retry, extract_tool_calls
import time
from hs_pipeline.agents.patient_generator import (  
    generate_disease,
    generate_patient_data,
    generate_random_patient,
    generate_patient_for_department,
)
from hs_pipeline.utils.constants import DATA_PATH, CHOSEN_LLM

# Learning imports
from hs_pipeline.agents.disease_validation import validate_diagnosis
from hs_pipeline.database_management.db_manager import get_db
from hs_pipeline.agents.reflection_agent import create_learning_principle


class SimulationRunner:
    """Runs medical simulations with learning capabilities."""
    
    def __init__(self):
        self.agents = {
            "Nurse": nurse_agent,
            "Doctor": doctor_agent,
            "Lab": lab_agent
        }
        
        # Initialize database
        self.db = get_db()
        self.db.init_tables()
    
    def _extract_experience_ids_from_timeline(self, timeline: list) -> list[str]:
        """Extract experience IDs that were retrieved during doctor's decision."""
        experience_ids = []
        
        for event in timeline:
            # Look for doctor's tool calls
            if event.get("agent") == "Doctor":
                tools_used = event.get("tools_used", [])
                # Check if doctor used search_relevant_experiences
                if "search_relevant_experiences" in tools_used:
                    # The experience IDs were already tracked in the tool itself
                    # But we can still extract them from the database query logs
                    # For now, we rely on the doctor_agent.py tool tracking
                    pass
        
        # Note: We now track retrieval in doctor_agent.py directly,
        # so this method is for future expansion if needed
        return experience_ids

    def patient_from_document(self, pdf_path: Path) -> PatientData:
        """Create PatientData from uploaded PDF."""
        print(f"Extracting: {pdf_path.name}")
        text = extractor.extract_text_from_file(pdf_path)
        
        print("Parsing...")
        parsed = llm_parser.extract_patient_for_simulation(text)
        
        return PatientData(
            name=parsed["name"],
            age=parsed["age"],
            gender=parsed.get("gender", "Unknown"),
            symptoms=parsed["symptoms"]
        )
    
    def patient_from_text(self, symptoms: str, age: int = 45, name: str = "Custom", gender: str = "Unknown") -> PatientData:
        """Create PatientData from text input."""
        return PatientData(
            name=name,
            age=age,
            gender=gender,
            symptoms=[s.strip() for s in symptoms.split(",")]
        )
    
    def run_simulation(
        self, 
        patient: PatientData, 
        actual_disease: str | None = None,
        department: str = "General",
        max_steps: int = 20
    ) -> dict:
        """
        Run agent simulation with validation and learning.
        
        Args:
            patient: Patient data
            actual_disease: Hidden disease for realistic lab results and validation
            department: Medical department (for case organization and RAG)
            max_steps: Max agent interactions
        """
        # Start new session for experience tracking
        self.db.start_new_session()
        
        current_agent_name = "Nurse"
        current_deps = patient
        context = "Assess this patient"
        result = None
        api_calls = 0
        timeline = []
        ordered_tests = set()  # Track tests already ordered (NEW)
        test_cycles = 0  # Track number of test rounds (NEW)
        MAX_TEST_CYCLES = 3  # Limit test rounds (NEW)
        used_experience_ids = set()  # Track which experiences were retrieved
        
        print(f"\n{'='*60}")
        print(f"Department: {department}")
        print(f"Patient: {patient.name}, {patient.age}y {patient.gender}")
        print(f"Symptoms: {', '.join(patient.symptoms)}")
        if actual_disease:
            print(f"Hidden Disease: {actual_disease}")
        print(f"{'='*60}\n")
        
        while api_calls < max_steps:
            current_agent = self.agents[current_agent_name]
            print(f"[{api_calls + 1}] {current_agent_name}...")
            
            result = run_agent_with_retry(current_agent, context, current_deps)
            if CHOSEN_LLM == "gemini-2.5-flash":
                if current_agent_name == "Doctor":
                    time.sleep(30)
                else:
                    time.sleep(12)
            api_calls += 1
            
            timeline.append({
                "step": api_calls,
                "agent": current_agent_name,
                "decision": result.output.model_dump(),
                "tools_used": extract_tool_calls(result)
            })
            
            # Check completion
            if result.output.next_step in ["finish_chain", "discharge"]:
                print(f"Done!")
                break
            
            # Send to doctor
            elif result.output.next_step == "send_to_doctor":
                context = result.output.context_for_next
                current_agent_name = "Doctor"
                current_deps = DoctorDeps(
                    patient_data=patient,
                    nurse_assessment=result.output,
                    lab_results=None,
                    department=department
                )
            
            # Order test
            elif result.output.next_step == "order_test":
                # NEW: Check for duplicate tests and cycle limit
                requested_test = result.output.ordered_test.lower()
                
                # Check if already ordered
                if requested_test in ordered_tests:
                    print(f"  ⚠️  Test already ordered: {result.output.ordered_test}")
                    print(f"  Forcing diagnosis with existing results...")
                    # Force doctor to make diagnosis with what they have
                    context = "Make a diagnosis based on the information you have. You've already ordered all necessary tests."
                    current_agent_name = "Doctor"
                    current_deps = DoctorDeps(
                        patient_data=patient,
                        nurse_assessment=current_deps.nurse_assessment,
                        lab_results=current_deps.lab_results or [],
                        department=department
                    )
                    continue
                
                # Check test cycle limit
                test_cycles += 1
                if test_cycles > MAX_TEST_CYCLES:
                    print(f"  ⚠️  Maximum test cycles ({MAX_TEST_CYCLES}) reached")
                    print(f"  Forcing diagnosis with existing results...")
                    context = "Make a final diagnosis. You've done enough testing."
                    current_agent_name = "Doctor"
                    current_deps = DoctorDeps(
                        patient_data=patient,
                        nurse_assessment=current_deps.nurse_assessment,
                        lab_results=current_deps.lab_results or [],
                        department=department
                    )
                    continue
                
                # NEW: Track this test
                print(f"  Ordering: {result.output.ordered_test}")
                ordered_tests.add(requested_test)
                
                lab_result = run_agent_with_retry(
                    self.agents["Lab"],
                    "Run test",
                    LabAgentDeps(
                        disease=actual_disease or "unknown",
                        patient_data=patient,
                        test_type=result.output.ordered_test
                    )
                )
                time.sleep(12)
                api_calls += 1
                
                timeline.append({
                    "step": api_calls,
                    "agent": "Lab",
                    "decision": lab_result.output.model_dump(),
                    "tools_used": extract_tool_calls(lab_result)
                })
                
                lab_results = (current_deps.lab_results or []) + [lab_result.output]
                
                current_agent_name = "Doctor"
                current_deps = DoctorDeps(
                    patient_data=patient,
                    nurse_assessment=current_deps.nurse_assessment,
                    lab_results=lab_results,
                    department=department
                )
        
        # === VALIDATION AND LEARNING ===
        is_correct = None
        validation_reason = "No diagnosis to validate"
        
        # Check if we have a diagnosis (doctor finished, not nurse)
        has_diagnosis = result and hasattr(result.output, 'diagnosis') and result.output.diagnosis
        
        if actual_disease and has_diagnosis:
            is_correct, validation_reason = validate_diagnosis(
                result.output.diagnosis,
                actual_disease
            )
            
            print(f"\n{'='*60}")
            print(f"VALIDATION")
            print(f"{'='*60}")
            print(f"Doctor diagnosed: {result.output.diagnosis}")
            print(f"Actual disease:   {actual_disease}")
            print(f"Result: {'✓ CORRECT' if is_correct else '✗ WRONG'}")
            print(f"Reason: {validation_reason}")
            print(f"{'='*60}\n")
            
            # Add validation to timeline
            timeline.append({
                "step": "validation",
                "is_correct": is_correct,
                "reason": validation_reason
            })
            
            # Track experience outcomes for this session
            self.db.track_session_outcome(was_correct=is_correct)
            
            # Store successful case in database
            if is_correct:
                self._store_successful_case(
                    patient=patient,
                    timeline=timeline,
                    diagnosis=result.output.diagnosis,
                    treatment=result.output.recommended_treatment,
                    department=department
                )
            else:
                # Learn from error
                self._learn_from_error(
                    patient=patient,
                    timeline=timeline,
                    wrong_diagnosis=result.output.diagnosis,
                    correct_diagnosis=actual_disease,
                    department=department
                )
        elif actual_disease and not has_diagnosis:
            # Case ended without diagnosis (nurse finished directly)
            print(f"\n⚠️  WARNING: Simulation ended without diagnosis")
            print(f"Last agent: {current_agent_name}")
            validation_reason = "No diagnosis made"
        
        return {
            "patient": asdict(patient),
            "actual_disease": actual_disease,
            "department": department,
            "timeline": timeline,
            "final_diagnosis": result.output.model_dump() if (result and hasattr(result.output, 'diagnosis')) else None,
            "total_steps": api_calls,
            "is_correct": is_correct,
            "validation_reason": validation_reason
        }
    
    def _store_successful_case(
        self,
        patient: PatientData,
        timeline: list,
        diagnosis: str,
        treatment: str,
        department: str
    ):
        """Store a successful diagnosis in the Medical Case Base."""
        
        # Extract lab tests from timeline
        examinations = []
        exam_results = []
        
        for event in timeline:
            if event.get("agent") == "Lab":
                lab_data = event.get("decision", {})
                examinations.append(lab_data.get("tests_ran", ""))
                exam_results.append(lab_data.get("test_outcome", ""))
        
        examination_ordered = ", ".join(examinations) if examinations else "None"
        examination_results = "\n".join(exam_results) if exam_results else "Clinical diagnosis without tests"
        
        case_id = f"case_{uuid.uuid4()}"
        
        try:
            self.db.add_medical_case(
                case_id=case_id,
                department=department,
                patient_age=patient.age,
                patient_gender=patient.gender,
                medical_history=patient.medical_history or "None reported",
                symptoms=", ".join(patient.symptoms),
                examination_ordered=examination_ordered,
                examination_results=examination_results,
                diagnosis=diagnosis,
                treatment_plan=treatment or "Not specified",
                outcome="success"
            )
            print(f"💾 Case {case_id} saved to Medical Case Base ({department})")
        except Exception as e:
            print(f"❌ Error saving case: {e}")
    
    def _learn_from_error(
        self,
        patient: PatientData,
        timeline: list,
        wrong_diagnosis: str,
        correct_diagnosis: str,
        department: str
    ):
        """Learn from a diagnostic error by creating and storing a principle."""
        
        print(f"\n🧠 Reflecting on error...")
        
        # Extract tests from timeline
        tests_ordered = []
        test_results = []
        
        for event in timeline:
            if event.get("agent") == "Lab":
                lab_data = event.get("decision", {})
                tests_ordered.append(lab_data.get("tests_ran", ""))
                test_results.append(lab_data.get("test_outcome", ""))
        
        # Create principle
        principle = create_learning_principle(
            patient_data=patient,
            symptoms=", ".join(patient.symptoms),
            tests_ordered=tests_ordered,
            test_results=test_results,
            wrong_diagnosis=wrong_diagnosis,
            correct_diagnosis=correct_diagnosis,
            department=department
        )
        
        if not principle:
            print("❌ Failed to create learning principle")
            return
        
        print(f"💡 Principle: {principle.principle_text}")
        print(f"   Confidence: {principle.confidence:.2f}")
        
        # Save to experience base
        exp_id = f"exp_{uuid.uuid4()}"
        
        try:
            self.db.add_experience(
                experience_id=exp_id,
                department=department,
                principle_text=principle.principle_text,
                validation_accuracy=principle.confidence
            )
            print(f"💾 Experience {exp_id} saved to Experience Base ({department})")
        except Exception as e:
            print(f"❌ Error saving experience: {e}")




if __name__ == "__main__":    
    # ======== CHANGE THESE PARAMETERS ========
    NUM_SIMULATIONS = 3               # How many simulations to run
    TARGET_DEPARTMENT = "Neurology"   # None for random, or: "Cardiology", "Neurology", "Respiratory", "Gastroenterology", "Endocrinology", "Rheumatology", "General"
    # =========================================

    runner = SimulationRunner()
    
    print(f"\n{'='*60}")
    if TARGET_DEPARTMENT:
        print(f"Running {NUM_SIMULATIONS} simulation(s) - Department: {TARGET_DEPARTMENT}")
    else:
        print(f"Running {NUM_SIMULATIONS} simulation(s) - Random departments")
    print(f"{'='*60}\n")
    
    # Track results
    results_summary = {
        "correct": 0,
        "wrong": 0,
        "total": 0,
        "by_department": {}
    }
    
    for i in range(NUM_SIMULATIONS):
        print(f"\n{'#'*60}")
        print(f"# SIMULATION {i+1}/{NUM_SIMULATIONS}")
        print(f"{'#'*60}\n")
        
        # Generate patient - either from specific department or random
        if TARGET_DEPARTMENT:
            patient, disease = generate_patient_for_department(TARGET_DEPARTMENT)
            department = TARGET_DEPARTMENT
        else:
            patient, disease, department = generate_random_patient()
        
        # Run simulation
        result = runner.run_simulation(
            patient, 
            actual_disease=disease, 
            department=department
        )
        
        # Track results
        results_summary["total"] += 1
        if result["is_correct"]:
            results_summary["correct"] += 1
        else:
            results_summary["wrong"] += 1
        
        # Track by department
        if department not in results_summary["by_department"]:
            results_summary["by_department"][department] = {"correct": 0, "wrong": 0}
        
        if result["is_correct"]:
            results_summary["by_department"][department]["correct"] += 1
        else:
            results_summary["by_department"][department]["wrong"] += 1
        
        # Save individual result
        filename = f"simulation_results/sim_{i+1}_{department}_{disease}.json"
        with open(filename, "w") as f:
            json.dump(result, f, indent=2)
        print(f"📄 Saved to {filename}")
        
        # Small delay between simulations to be safe
        if i < NUM_SIMULATIONS - 1:
            time.sleep(2)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"SUMMARY - {NUM_SIMULATIONS} Simulations")
    print(f"{'='*60}")
    print(f"Correct:   {results_summary['correct']} ({results_summary['correct']/results_summary['total']*100:.1f}%)")
    print(f"Wrong:     {results_summary['wrong']} ({results_summary['wrong']/results_summary['total']*100:.1f}%)")
    print(f"Total:     {results_summary['total']}")
    print()
    
    print("By Department:")
    for dept, stats in results_summary["by_department"].items():
        total = stats["correct"] + stats["wrong"]
        acc = stats["correct"] / total * 100 if total > 0 else 0
        print(f"  {dept:20s}: {stats['correct']}/{total} correct ({acc:.1f}%)")
    
    print(f"\n{'='*60}")
    print("Check database with: python inspect_db.py")
    print(f"{'='*60}\n")