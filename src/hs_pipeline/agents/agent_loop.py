from hs_pipeline.agents.nurse_agent import nurse_agent, PatientData
from hs_pipeline.agents.doctor_agent import doctor_agent, DoctorDeps
from hs_pipeline.agents.lab_agent import LabAgentDeps, lab_agent
from hs_pipeline.agents.patient_generator import generate_disease, generate_patient_data
from dataclasses import asdict
import time
import json


def show_tool_calls(result, agent_name):
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name') and hasattr(part, 'args'):
                    print(f"{agent_name} uses: {part.tool_name}")
                    print(f"   Args: {part.args}")


def extract_tool_calls(result):
    tools = []
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name') and hasattr(part, 'args'):
                    tools.append(part.tool_name)
    return tools


def run_agent_with_retry(agent, context, deps, max_attempts=3):
    for attempt in range(max_attempts):
        try:
            return agent.run_sync(context, deps=deps)
        except Exception as e:
            if attempt == max_attempts - 1:
                print(f"Failed after {max_attempts} attempts: {e}")
                raise
            print(f"Attempt {attempt + 1} failed, retrying...")
            time.sleep(1)


disease = generate_disease()
patient_to_test = generate_patient_data(disease)

agents = {
    "Nurse": nurse_agent,
    "Doctor": doctor_agent,
    "Lab": lab_agent
}

current_agent_name = "Nurse"
current_deps = patient_to_test
context = "Asses this patient"
result = None
api_calls = 0
timeline = []

while api_calls < 20:
    current_agent = agents[current_agent_name]
    result = run_agent_with_retry(current_agent, context, current_deps)
    api_calls += 1
    time.sleep(7)
    
    timeline.append({
        "agent": current_agent_name,
        "decision": result.output.model_dump(),
        "tools_used": extract_tool_calls(result)
    })
    
    show_tool_calls(result, current_agent_name)
    print(result.output)

    if result.output.next_step in ["finish_chain", "discharge"]:
        break
    elif result.output.next_step == "send_to_doctor":
        context = result.output.context_for_next
        current_agent_name = "Doctor"
        current_deps = DoctorDeps(
            patient_data=current_deps,
            nurse_assessment=result.output,
            lab_results=None
        )
    elif result.output.next_step == "order_test":
        current_agent_name = "Lab"
        lab_deps = LabAgentDeps(
            disease=disease,
            patient_data=patient_to_test,
            test_type=result.output.ordered_test
        )
        
        lab_result = run_agent_with_retry(agents["Lab"], "Run the requested test", lab_deps)
        api_calls += 1
        time.sleep(7)
        
        timeline.append({
            "agent": current_agent_name,
            "decision": lab_result.output.model_dump(),
            "tools_used": extract_tool_calls(lab_result)
        })

        lab_results = (current_deps.lab_results or []) + [lab_result.output]
        
        current_agent_name = "Doctor"
        current_deps = DoctorDeps(
            patient_data=patient_to_test,
            nurse_assessment=current_deps.nurse_assessment,
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

print("\nSaved to simulation_output.json")