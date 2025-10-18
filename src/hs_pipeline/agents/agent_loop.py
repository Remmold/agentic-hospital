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


patient = PatientData(name="John", age=45, symptoms=["fever", "cough"])

nurse_result = nurse_agent.run_sync("Assess this patient", deps=patient)
print(show_tool_calls(nurse_result))
print(nurse_result.output)

doctor_deps = DoctorDeps(
    patient_data=patient,
    nurse_assessment=nurse_result.output  
)

doctor_result = doctor_agent.run_sync("Diagnose this patient", deps=doctor_deps)
print(show_tool_calls(doctor_result))
print(doctor_result.output)

