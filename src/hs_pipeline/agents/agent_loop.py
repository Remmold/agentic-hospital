from hs_pipeline.agents.nurse_agent import nurse_agent,PatientData
from hs_pipeline.agents.doctor_agent import doctor_agent,DoctorDeps
from hs_pipeline.agents.patient_generator import generate_disease,generate_patient_data
import logfire
#logfire.configure()
#logfire.instrument_pydantic_ai()

def show_tool_calls(result):
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name'):
                    print(f"🔧 Tool called: {part.tool_name}")
                    if hasattr(part, 'args'):
                        print(f"   Args: {part.args}")

disease = generate_disease()
patient_to_test = generate_patient_data(disease)

current_agent = nurse_agent
current_deps = patient_to_test
context = "Asses this patient"
result = None

while True:
    result = current_agent.run_sync(context, deps=current_deps)
    show_tool_calls(result)
    print(result.output)

    
    if result.output.next_step == "finish_chain" or result.output.next_step == "discharge":
        break
    elif result.output.next_step == "send_to_doctor":
        context = result.output.context_for_next
        current_agent = doctor_agent
        current_patient = current_deps
        current_deps = DoctorDeps(
            patient_data=current_patient,
            nurse_assessment=result.output
            )

