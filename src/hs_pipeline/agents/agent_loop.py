from hs_pipeline.agents.nurse_agent import nurse_agent,PatientData
from hs_pipeline.agents.doctor_agent import doctor_agent,DoctorDeps
from hs_pipeline.agents.lab_agent import LabAgentDeps,lab_agent
from hs_pipeline.agents.patient_generator import generate_disease,generate_patient_data
from dataclasses import asdict
import time
import json
import logfire
#logfire.configure()
#logfire.instrument_pydantic_ai()

def show_tool_calls(result, agent_name):
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name') and hasattr(part, 'args'):
                    print(f"{agent_name} uses: 🔧{part.tool_name}")
                    print(f"   Args: {part.args}")


def extract_tool_calls(result):
    tools = []
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name') and hasattr(part, 'args'): 
                    tools.append(part.tool_name)
    return tools


disease = generate_disease()
patient_to_test = generate_patient_data(disease)


agents = {
    "Nurse": nurse_agent,
    "Doctor": doctor_agent,
    "Lab":lab_agent
}

current_agent_name = "Nurse"
current_deps = patient_to_test
context = "Asses this patient"
result = None
api_calls = 0
timeline = []

while True and api_calls <20:

    current_agent = agents[current_agent_name]
    for attempt in range(3):
        try:
            result = current_agent.run_sync(context, deps=current_deps)
            break
        except Exception as e:
            if attempt == 2:  # Last attempt
                print(f"Failed after 3 attempts: {e}")
                raise
            print(f"Attempt {attempt + 1} failed, retrying...")
            time.sleep(1)

    timeline.append({
    "agent": current_agent_name,
    "decision": result.output.model_dump(),
    "tools_used": extract_tool_calls(result)
    })
    show_tool_calls(result, current_agent_name)
    print(result.output)

    
    if result.output.next_step == "finish_chain" or result.output.next_step == "discharge":
        break
    elif result.output.next_step == "send_to_doctor":
        context = result.output.context_for_next
        current_agent_name = "Doctor"
        current_patient = current_deps
        current_deps = DoctorDeps(
            patient_data=current_patient,
            nurse_assessment=result.output,
            lab_results=None
            )
    elif result.output.next_step == "order_test":
    
        nurse_assessment = current_deps.nurse_assessment
        current_agent_name = "Lab"
        current_agent = agents[current_agent_name]
        # Create lab deps
        test_type = result.output.ordered_test
        lab_deps = LabAgentDeps(
            disease=disease,
            patient_data=patient_to_test,
            test_type=test_type
        )

        for attempt in range(3):
                try:
                    lab_result = current_agent.run_sync("Run the requested test", deps=lab_deps)
                    break
                except Exception as e:
                    if attempt == 2:
                        print(f"Lab agent failed after 3 attempts: {e}")
                        raise
                    print(f"Lab attempt {attempt + 1} failed, retrying...")
                    time.sleep(1)

        api_calls += 1
        timeline.append({
            "agent": current_agent_name,
            "decision": lab_result.output.model_dump(),
            "tools_used": extract_tool_calls(lab_result)
        })

        if current_deps.lab_results is None:
            lab_results = [lab_result.output]
        else:
            lab_results = current_deps.lab_results
            lab_results.append(lab_result.output)
        # Route back to doctor with all info
        current_agent_name = "Doctor"
        current_deps = DoctorDeps(
            patient_data=patient_to_test,
            nurse_assessment=nurse_assessment,
            lab_results=lab_results
        )

simulation_result = {
    "patient": asdict(patient_to_test),
    "actual_disease": disease,
    "timeline": timeline,
    "final_diagnosis": result.output.model_dump() if result else None
}

with open("simulation_output.json", "w") as f:
    json.dump(simulation_result, f, indent=2)

print("Saved to simulation_output.json")

        
        
