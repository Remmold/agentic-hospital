from hs_pipeline.agents.nurse_agent import nurse_agent,PatientData
from hs_pipeline.agents.doctor_agent import doctor_agent,DoctorDeps
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


# Test case 1: Mild symptoms
patient1 = PatientData(name="John", age=45, symptoms=["fever", "cough"])

# Test case 2: More severe
patient2 = PatientData(name="Sarah", age=67, symptoms=["chest pain", "shortness of breath"])

# Test case 3: Minor issue
patient3 = PatientData(name="Tim", age=25, symptoms=["headache"])

patient_to_test = patient2

nurse_result = nurse_agent.run_sync("Assess this patient", deps=patient_to_test)
show_tool_calls(nurse_result)
print(nurse_result.output)

doctor_deps = DoctorDeps(
    patient_data=patient_to_test,
    nurse_assessment=nurse_result.output  
)

doctor_result = doctor_agent.run_sync("Diagnose this patient", deps=doctor_deps)
show_tool_calls(doctor_result)
print(doctor_result.output)

