from dataclasses import dataclass
from typing import Literal
from hs_pipeline.agents.nurse_agent import PatientData,NurseAssessment
from pydantic import BaseModel
from pydantic_ai import Agent,RunContext
from dotenv import load_dotenv
from hs_pipeline.utils.constants import CHOSEN_LLM
load_dotenv()

@dataclass
class DoctorDeps:
    patient_data:PatientData
    nurse_assessment:NurseAssessment

class DoctorDiagnosis(BaseModel):
    diagnosis: str
    recommended_treatment: str
    follow_up_needed: bool
    next_step: Literal["finish_chain"] # Add more steps for more advanced agent looping for mvp this is enough i think
    context_for_next: str
    

doctor_agent = Agent(
   CHOSEN_LLM,
    deps_type=DoctorDeps,
    output_type=DoctorDiagnosis,
    system_prompt="You are a doctor reviewing patient cases and nurse assessments."
)
@doctor_agent.tool
def get_nurse_assessment(ctx: RunContext[DoctorDeps]) -> str:
    """Get the nurse's assessment including urgency and notes."""
    return f"Urgency: {ctx.deps.nurse_assessment.urgency}, Notes: {ctx.deps.nurse_assessment.notes}"

