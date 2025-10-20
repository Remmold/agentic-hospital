from pathlib import Path
from dataclasses import asdict
import json
import time

from hs_pipeline.extraction import extractor, llm_parser
from hs_pipeline.agents.nurse_agent import nurse_agent, PatientData
from hs_pipeline.agents.doctor_agent import doctor_agent, DoctorDeps
from hs_pipeline.agents.lab_agent import lab_agent, LabAgentDeps
from hs_pipeline.agents.agent_loop import run_agent_with_retry, extract_tool_calls
from hs_pipeline.agents.patient_generator import generate_disease, generate_patient_data
from hs_pipeline.utils.constants import DATA_PATH


class SimulationRunner:
    """Runs medical simulations."""
    
    def __init__(self):
        self.agents = {
            "Nurse": nurse_agent,
            "Doctor": doctor_agent,
            "Lab": lab_agent
        }

    def patient_from_document(self, pdf_path: Path) -> PatientData:
        """Create PatientData from uploaded PDF."""
        print(f"📄 Extracting: {pdf_path.name}")
        text = extractor.extract_text_from_file(pdf_path)
        
        print("🧠 Parsing...")
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
        actual_disease: str | None = None,  # NEW
        max_steps: int = 20
    ) -> dict:
        """
        Run agent simulation.
        
        Args:
            patient: Patient data
            actual_disease: Hidden disease for realistic lab results
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
                    lab_results=None
                )
            
            # Order test
            elif result.output.next_step == "order_test":
                print(f"{result.output.ordered_test}")
                
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
                    lab_results=lab_results
                )
        
        return {
            "patient": asdict(patient),
            "actual_disease": actual_disease,
            "timeline": timeline,
            "final_diagnosis": result.output.model_dump() if result else None,
            "total_steps": api_calls
        }
    

# Test
if __name__ == "__main__":    
    runner = SimulationRunner()
    
    # Test 1: Random disease
    print("\nTEST 1: Random Disease")
    disease = "Lyme disease" # generate_disease()
    patient = generate_patient_data(disease)
    result = runner.run_simulation(patient, actual_disease=disease)
    
    with open("output_random.json", "w") as f:
        json.dump(result, f, indent=2)
    print(f"Diagnosis: {result['final_diagnosis']['diagnosis']}")
    print(f"Saved to output_random.json")
    
    # # Test 2: Custom text input
    # print("\nTEST 2: Custom Input")
    # patient2 = runner.patient_from_text(
    #     symptoms="fever, cough, fatigue",
    #     age=35,
    #     name="Test Patient"
    # )
    # result2 = runner.run_simulation(patient2, actual_disease="pneumonia")
    
    # with open("output_custom.json", "w") as f:
    #     json.dump(result2, f, indent=2)
    # print(f"Saved to output_custom.json")
    
    # # Test 3: From document (if available)
    # print("\nTEST 3: From Document")
    # pdf_path = DATA_PATH / "pdf" / "test.pdf"
    
    # if pdf_path.exists():
    #     patient3 = runner.patient_from_document(pdf_path)
    #     result3 = runner.run_simulation(patient3)  # No disease for real docs
        
    #     with open("output_document.json", "w") as f:
    #         json.dump(result3, f, indent=2)
    #     print(f"Saved to output_document.json")
    # else:
    #     print(f"Skipped (no test.pdf)")
    
    # print("\nAll tests complete!")
