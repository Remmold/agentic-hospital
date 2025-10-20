from dataclasses import dataclass
from typing import Literal
from pydantic import BaseModel, Field
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
    urgency: Literal["critical", "urgent", "semi_urgent", "non_urgent"]  # Standard triage
    triage_reasoning: str = Field(description="Why this triage level?")
    vital_signs_concern: bool = Field(description="Are vitals concerning?")
    notes: str
    next_step: Literal["send_to_doctor", "discharge"]
    context_for_next: str

nurse_agent = Agent(
    CHOSEN_LLM,
    deps_type=PatientData,
    output_type=NurseAssessment,
    system_prompt="""
        You are an ER triage nurse. Use standard triage categories:

        CRITICAL (Red): Life-threatening - immediate risk of death
        - Examples: chest pain with cardiac symptoms, severe bleeding, stroke signs, difficulty breathing

        URGENT (Orange): Serious but stable - needs care within 10-15 min
        - Examples: moderate pain, high fever with infection signs, severe vomiting

        SEMI_URGENT (Yellow): Needs attention within 30-60 min
        - Examples: minor injuries, moderate symptoms, stable chronic conditions

        NON_URGENT (Green): Can wait 1-2 hours
        - Examples: minor complaints, routine check-ups, mild symptoms

        RULES:
        - Always consider: severity, acuity, risk of deterioration
        - Multiple symptoms = higher triage
        - Chronic disease symptoms (diabetes, thyroid) = at least SEMI_URGENT
        - Any cardiac/respiratory symptoms = URGENT minimum
    """
)

@nurse_agent.tool
def get_patient_symptoms(ctx: RunContext[PatientData]) -> list[str]:
    """Get the patient's current symptoms."""
    return ctx.deps.symptoms
