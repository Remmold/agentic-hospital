from hs_pipeline.agents.nurse_agent import nurse_agent,PatientData
from hs_pipeline.agents.doctor_agent import doctor_agent,DoctorDeps
from hs_pipeline.agents.lab_agent import LabAgentDeps,lab_agent

from hs_pipeline.agents.patient_generator import generate_disease,generate_patient_data
import logfire
#logfire.configure()
#logfire.instrument_pydantic_ai()

def show_tool_calls(result, agent_name):
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name'):
                    print(f"{agent_name} uses: 🔧{part.tool_name}")
                    if hasattr(part, 'args'):
                        print(f"   Args: {part.args}")

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

while True and api_calls <20:
    current_agent = agents[current_agent_name]
    result = current_agent.run_sync(context, deps=current_deps)
    api_calls += 1
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
        
        # Create lab deps
        test_type = result.output.ordered_test
        lab_deps = LabAgentDeps(
            disease=disease,
            patient_data=patient_to_test,
            test_type=test_type
        )

        lab_result = lab_agent.run_sync("Run the requested test", deps=lab_deps)
        api_calls += 1

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
        
        
