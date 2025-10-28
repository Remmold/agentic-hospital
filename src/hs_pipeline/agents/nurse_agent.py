from dataclasses import dataclass
from typing import Literal, Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from hs_pipeline.utils.constants import CHOSEN_LLM
from hs_pipeline.agents.patient_generator import PatientData


class NurseAssessment(BaseModel):
    urgency: Literal["critical", "urgent", "semi_urgent", "non_urgent"]
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
You're an ER triage nurse. Standard triage categories:

CRITICAL: Life-threatening, immediate risk
- Chest pain with cardiac symptoms, severe bleeding, stroke, difficulty breathing

URGENT: Serious but stable, needs care within 10-15 min
- Moderate pain, high fever with infection, severe vomiting

SEMI_URGENT: Needs attention within 30-60 min
- Minor injuries, moderate symptoms, stable chronic conditions

NON_URGENT: Can wait 1-2 hours
- Minor complaints, routine check-ups, mild symptoms

Consider: severity, acuity, deterioration risk
Multiple symptoms = higher triage
Chronic disease symptoms (diabetes, thyroid) = at least SEMI_URGENT
Cardiac/respiratory = URGENT minimum

Use tools to review medical history and current medications.
    """
)


@nurse_agent.tool
def get_patient_symptoms(ctx: RunContext[PatientData]) -> list[str]:
    """Get patient's current symptoms."""
    return ctx.deps.symptoms


@nurse_agent.tool
def get_medical_history(ctx: RunContext[PatientData]) -> str:
    """Get patient's medical history including past diagnoses and treatments."""
    if ctx.deps.medical_history:
        return f"Medical History: {ctx.deps.medical_history}"
    return "No medical history available."


@nurse_agent.tool
def get_current_medications(ctx: RunContext[PatientData]) -> str:
    """Get medications patient is currently taking."""
    if ctx.deps.current_medications:
        return f"Current medications: {', '.join(ctx.deps.current_medications)}"
    return "No current medications."