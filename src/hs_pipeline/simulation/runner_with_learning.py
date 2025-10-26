from pathlib import Path
from dataclasses import asdict
import json
import time
import uuid

from hs_pipeline.extraction import extractor, llm_parser
from hs_pipeline.agents.nurse_agent import nurse_agent, PatientData
from hs_pipeline.agents.doctor_agent import doctor_agent, DoctorDeps
from hs_pipeline.agents.lab_agent import lab_agent, LabAgentDeps
from hs_pipeline.agents.agent_loop import run_agent_with_retry, extract_tool_calls
from hs_pipeline.agents.patient_generator import generate_disease, generate_patient_data
from hs_pipeline.utils.constants import DATA_PATH
from hs_pipeline.agents.disease_validation import validate_diagnosis
from hs_pipeline.database_management.db_manager import get_db


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

    def patient_from_document(self, pdf_path: Path) -> PatientData:
        """Create PatientData from uploaded PDF."""
        print(f"Extracting: {pdf_path.name}")
        text = extractor.extract_text_from_file(pdf_path)
        
        print("Parsing...")
        parsed = llm_parser.extract_patient_for_simulation(text)
        
        return PatientData(
            name=parsed["name"],
            age=parsed["age"],
            symptoms=parsed["symptoms"]
        )
    
    def patient_from_text(self, symptoms: str, age: int = 45, name: str = "Custom") -> PatientData:
        """Create PatientData from text input."""
        return PatientData(
            name=name,
            age=age,
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
            department: Medical department (for case organization)
            max_steps: Max agent interactions
        """
        current_agent_name = "Nurse"
        current_deps = patient
        context = "Assess this patient"
        result = None
        api_calls = 0
        timeline = []
        
        print(f"\n{'='*60}")
        print(f"Patient: {patient.name}, {patient.age}y")
        print(f"Symptoms: {', '.join(patient.symptoms)}")
        if actual_disease:
            print(f"Hidden Disease: {actual_disease}")
        print(f"{'='*60}\n")
        
        while api_calls < max_steps:
            current_agent = self.agents[current_agent_name]
            print(f"[{api_calls + 1}] {current_agent_name}...")
            
            result = run_agent_with_retry(current_agent, context, current_deps)
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
                print(f"  Ordering: {result.output.ordered_test}")
                
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
                
                lab_results = (current_deps.lab_results or []) + [lab_result.output]
                
                current_agent_name = "Doctor"
                current_deps = DoctorDeps(
                    patient_data=patient,
                    nurse_assessment=current_deps.nurse_assessment,
                    lab_results=lab_results,
                    department=department 
                )
        
        is_correct = None
        validation_reason = "No diagnosis to validate"
        
        if actual_disease and result and result.output.diagnosis:
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
            
            # Store successful case in database
            if is_correct:
                self._store_successful_case(
                    patient=patient,
                    timeline=timeline,
                    diagnosis=result.output.diagnosis,
                    treatment=result.output.recommended_treatment,
                    department=department
                )
        
        return {
            "patient": asdict(patient),
            "actual_disease": actual_disease,
            "timeline": timeline,
            "final_diagnosis": result.output.model_dump() if result else None,
            "total_steps": api_calls,
            "is_correct": is_correct,  # NEW
            "validation_reason": validation_reason  # NEW
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
                patient_gender="Unknown",  # TODO: Add gender to PatientData
                medical_history=patient.medical_history or "None reported",
                symptoms=", ".join(patient.symptoms),
                examination_ordered=examination_ordered,
                examination_results=examination_results,
                diagnosis=diagnosis,
                treatment_plan=treatment or "Not specified",
                outcome="success"
            )
            print(f"💾 Case {case_id} saved to Medical Case Base")
        except Exception as e:
            print(f"❌ Error saving case: {e}")


# Test
if __name__ == "__main__":    
    runner = SimulationRunner()
    
    # Test 1: Random disease with learning
    print("\nTEST 1: Random Disease with Learning")
    disease = generate_disease()
    patient = generate_patient_data(disease)
    result = runner.run_simulation(
        patient, 
        actual_disease=disease,
        department="General"  # TODO: Map diseases to departments
    )
    
    # Save results
    with open(f"{disease}.json", "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"\nDiagnosis: {result['final_diagnosis']['diagnosis']}")
    print(f"Validation: {result['validation_reason']}")
    print(f"Saved to {disease}.json")
    
    # Check database
    print("\n" + "="*60)
    print("Check database with: python inspect_db.py")
    print("="*60)

    # # Test 2: Custom text input
    # print("\nTEST 2: Custom Input")
    # patient2 = runner.patient_from_text(
    #     symptoms="fever, cough, fatigue",
    #     age=35,
    #     name="Test Patient"
    # )
    # result2 = runner.run_simulation(patient2, actual_disease="pneumonia", department="Respiratory")
    
    # with open("output_custom.json", "w") as f:
    #     json.dump(result2, f, indent=2)
    # print(f"Saved to output_custom.json")