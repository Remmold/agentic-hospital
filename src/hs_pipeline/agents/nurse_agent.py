from dataclasses import dataclass
from pydantic import BaseModel
from pydantic_ai import Agent,RunContext
from dotenv import load_dotenv
from hs_pipeline.utils.constants import CHOSEN_LLM
load_dotenv()


@dataclass
class PatientData:
    """PatientData contains all the information that a nurse would need to assess the situation and plan course of action
    can easily be updated and work seemlesly with our program
    IMPORTANT: we also must update tools for the nurse to access the information we add
    """
    name: str
    age: int
    symptoms: list[str]

class NurseAssessment(BaseModel):
    urgency: str
    notes: str

nurse_agent = Agent(
    CHOSEN_LLM,
    deps_type=PatientData,
    output_type=NurseAssessment,
    system_prompt=(
        "You are a nurse assessing patients. "
        "Patient info will be provided: name, age, and symptoms."
    )
)
@nurse_agent.tool
def get_patient_symptoms(ctx: RunContext[PatientData]) -> list[str]:
    """Get the patient's current symptoms."""
    return ctx.deps.symptoms
# Create actual patient instance
patient = PatientData(name="John", age=45, symptoms=["fever", "cough"])

result = nurse_agent.run_sync(
    f"Assess patient: {patient.name}, age {patient.age}",
    deps=patient
)
print(dir(result))
print(result.all_messages())
