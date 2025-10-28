"""Medical simulation runner with learning capabilities."""
from pathlib import Path
from dataclasses import asdict
import json
import uuid
import time

from hs_pipeline.extraction import extractor, llm_parser
from hs_pipeline.agents.nurse_agent import nurse_agent, PatientData
from hs_pipeline.agents.doctor_agent import doctor_agent, DoctorDeps
from hs_pipeline.agents.lab_agent import lab_agent, LabAgentDeps
from hs_pipeline.agents.agent_loop import run_agent_with_retry, extract_tool_calls
from hs_pipeline.agents.patient_generator import (  
    generate_patient_for_department,
    generate_random_patient
)
from hs_pipeline.utils.constants import DATA_PATH, CHOSEN_LLM
from hs_pipeline.agents.disease_validation import validate_diagnosis
from hs_pipeline.database_management.db_manager import get_db
from hs_pipeline.agents.reflection_agent import create_learning_principle
from hs_pipeline.agents.timeline_utils import extract_lab_data, format_examination_data


class SimulationRunner:
    """Runs medical simulations with learning."""
    
    def __init__(self):
        self.agents = {
            "Nurse": nurse_agent,
            "Doctor": doctor_agent,
            "Lab": lab_agent
        }
        self.db = get_db()
        self.db.init_tables()
    
    def patient_from_document(self, pdf_path: Path) -> PatientData:
        """Create PatientData from PDF."""
        text = extractor.extract_text_from_file(pdf_path)
        parsed = llm_parser.extract_patient_for_simulation(text)
        
        return PatientData(
            name=parsed["name"],
            age=parsed["age"],
            gender=parsed.get("gender", "Unknown"),
            symptoms=parsed["symptoms"]
        )
    
    def patient_from_text(self, symptoms: str, age: int = 45, name: str = "Custom", gender: str = "Unknown") -> PatientData:
        """Create PatientData from text."""
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
        """Run simulation with validation and learning."""
        self.db.start_new_session()
        
        current_agent_name = "Nurse"
        current_deps = patient
        context = "Assess this patient"
        result = None
        api_calls = 0
        timeline = []
        ordered_tests = set()
        test_cycles = 0
        MAX_TEST_CYCLES = 3
        
        print(f"\n{'='*60}")
        print(f"Department: {department}")
        print(f"Patient: {patient.name}, {patient.age}y {patient.gender}")
        print(f"Symptoms: {', '.join(patient.symptoms)}")
        if actual_disease:
            print(f"Hidden: {actual_disease}")
        print(f"{'='*60}\n")
        
        while api_calls < max_steps:
            current_agent = self.agents[current_agent_name]
            print(f"[{api_calls + 1}] {current_agent_name}...")
            
            result = run_agent_with_retry(current_agent, context, current_deps)
            if CHOSEN_LLM == "gemini-2.5-flash":
                time.sleep(30 if current_agent_name == "Doctor" else 12)
            
            api_calls += 1
            timeline.append({
                "step": api_calls,
                "agent": current_agent_name,
                "decision": result.output.model_dump(),
                "tools_used": extract_tool_calls(result)
            })
            
            # Check completion
            if result.output.next_step in ["finish_chain", "discharge"]:
                print("Done!")
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
                requested_test = result.output.ordered_test.lower()
                
                # Check duplicate
                if requested_test in ordered_tests:
                    print(f"  ⚠️ Test already ordered: {result.output.ordered_test}")
                    context = "Make diagnosis with existing results. No more tests."
                    current_agent_name = "Doctor"
                    current_deps = DoctorDeps(
                        patient_data=patient,
                        nurse_assessment=current_deps.nurse_assessment,
                        lab_results=current_deps.lab_results or [],
                        department=department
                    )
                    continue
                
                # Check cycle limit
                test_cycles += 1
                if test_cycles > MAX_TEST_CYCLES:
                    print(f"  ⚠️ Max test cycles ({MAX_TEST_CYCLES}) reached")
                    context = "Final diagnosis with existing results."
                    current_agent_name = "Doctor"
                    current_deps = DoctorDeps(
                        patient_data=patient,
                        nurse_assessment=current_deps.nurse_assessment,
                        lab_results=current_deps.lab_results or [],
                        department=department
                    )
                    continue
                
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
                
                api_calls += 1
                timeline.append({
                    "step": api_calls,
                    "agent": "Lab",
                    "decision": lab_result.output.model_dump(),
                    "tools_used": extract_tool_calls(lab_result)
                })
                
                if CHOSEN_LLM == "gemini-2.5-flash":
                    time.sleep(12)
                
                # Update doctor deps with new results
                lab_results = current_deps.lab_results or []
                lab_results.append(lab_result.output)
                
                context = result.output.context_for_next
                current_agent_name = "Doctor"
                current_deps = DoctorDeps(
                    patient_data=patient,
                    nurse_assessment=current_deps.nurse_assessment,
                    lab_results=lab_results,
                    department=department
                )
        
        # Validation
        is_correct = False
        validation_reason = ""
        
        if result and hasattr(result.output, 'diagnosis') and result.output.diagnosis:
            print(f"\n💊 DIAGNOSIS: {result.output.diagnosis}")
            
            if actual_disease:
                is_correct, validation_reason = validate_diagnosis(
                    doctor_diagnosis=result.output.diagnosis,
                    actual_disease=actual_disease,
                    use_llm="fallback"
                )
                
                status = "✅ CORRECT" if is_correct else "❌ WRONG"
                print(f"{status}: {validation_reason}")
                
                # Track session outcome
                self.db.track_session_outcome(is_correct)
                
                # Learn or store
                if not is_correct:
                    self._learn_from_error(
                        patient, timeline, 
                        result.output.diagnosis, actual_disease, 
                        department
                    )
                else:
                    self._store_successful_case(
                        patient, timeline,
                        result.output.diagnosis,
                        result.output.recommended_treatment or "N/A",
                        department
                    )
        else:
            print(f"\n⚠️ No diagnosis made")
            validation_reason = "No diagnosis"
        
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
        self, patient: PatientData, timeline: list,
        diagnosis: str, treatment: str, department: str
    ):
        """Store successful case in Medical Case Base."""
        tests_ordered, test_results = extract_lab_data(timeline)
        examination_ordered, examination_results = format_examination_data(tests_ordered, test_results)
        
        case_id = f"case_{uuid.uuid4()}"
        
        try:
            self.db.add_medical_case(
                case_id=case_id,
                department=department,
                patient_age=patient.age,
                patient_gender=patient.gender,
                medical_history=patient.medical_history or "None",
                symptoms=", ".join(patient.symptoms),
                examination_ordered=examination_ordered,
                examination_results=examination_results,
                diagnosis=diagnosis,
                treatment_plan=treatment,
                outcome="success"
            )
            print(f"💾 Case saved to Medical Base ({department})")
        except Exception as e:
            print(f"❌ Error saving case: {e}")
    
    def _learn_from_error(
        self, patient: PatientData, timeline: list,
        wrong_diagnosis: str, correct_diagnosis: str, department: str
    ):
        """Learn from diagnostic error."""
        print(f"\n🧠 Reflecting...")
        
        tests_ordered, test_results = extract_lab_data(timeline)
        
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
            print("❌ Failed to create principle")
            return
        
        print(f"💡 {principle.principle_text}")
        print(f"   Confidence: {principle.confidence:.2f}")
        
        exp_id = f"exp_{uuid.uuid4()}"
        
        try:
            self.db.add_experience(
                experience_id=exp_id,
                department=department,
                principle_text=principle.principle_text,
                validation_accuracy=principle.confidence
            )
            print(f"💾 Experience saved to Base ({department})")
        except Exception as e:
            print(f"❌ Error saving experience: {e}")


if __name__ == "__main__":    
    NUM_SIMULATIONS = 10
    TARGET_DEPARTMENT = "Neurology"  # or None for random
    
    runner = SimulationRunner()
    
    print(f"\n{'='*60}")
    dept_str = f"Department: {TARGET_DEPARTMENT}" if TARGET_DEPARTMENT else "Random departments"
    print(f"Running {NUM_SIMULATIONS} simulations - {dept_str}")
    print(f"{'='*60}\n")
    
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
        
        if TARGET_DEPARTMENT:
            patient, disease = generate_patient_for_department(TARGET_DEPARTMENT)
            department = TARGET_DEPARTMENT
        else:
            patient, disease, department = generate_random_patient()
        
        result = runner.run_simulation(patient, disease, department)
        
        results_summary["total"] += 1
        if result["is_correct"]:
            results_summary["correct"] += 1
        else:
            results_summary["wrong"] += 1
        
        if department not in results_summary["by_department"]:
            results_summary["by_department"][department] = {"correct": 0, "wrong": 0}
        
        if result["is_correct"]:
            results_summary["by_department"][department]["correct"] += 1
        else:
            results_summary["by_department"][department]["wrong"] += 1
        
        filename = f"simulation_results/sim_{i+1}_{department}_{disease}.json"
        with open(filename, "w") as f:
            json.dump(result, f, indent=2)
        print(f"📄 Saved to {filename}")
        
        if i < NUM_SIMULATIONS - 1:
            time.sleep(2)
    
    print(f"\n{'='*60}")
    print(f"SUMMARY - {NUM_SIMULATIONS} Simulations")
    print(f"{'='*60}")
    print(f"Correct: {results_summary['correct']} ({results_summary['correct']/results_summary['total']*100:.1f}%)")
    print(f"Wrong: {results_summary['wrong']} ({results_summary['wrong']/results_summary['total']*100:.1f}%)")
    print(f"Total: {results_summary['total']}")
    print()
    
    print("By Department:")
    for dept, stats in results_summary["by_department"].items():
        total = stats["correct"] + stats["wrong"]
        acc = stats["correct"] / total * 100 if total > 0 else 0
        print(f"  {dept:20s}: {stats['correct']}/{total} correct ({acc:.1f}%)")
    
    print(f"\n{'='*60}")
    print("Check database with: python inspect_db.py")
    print(f"{'='*60}\n")