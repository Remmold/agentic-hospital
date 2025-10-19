from dataclasses import dataclass
from typing import Literal
from hs_pipeline.agents.nurse_agent import PatientData,NurseAssessment
from hs_pipeline.agents.lab_agent import LabResults
from pydantic import BaseModel,Field
from pydantic_ai import Agent,RunContext
from dotenv import load_dotenv
from hs_pipeline.utils.constants import CHOSEN_LLM
load_dotenv()

@dataclass
class DoctorDeps:
    patient_data:PatientData
    nurse_assessment:NurseAssessment
    lab_results: LabResults | None = None

class DoctorDiagnosis(BaseModel):
    diagnosis: str| None = None
    recommended_treatment: str| None = None
    follow_up_needed: bool| None = None
    next_step: Literal["finish_chain","order_test"] # Add more steps for more advanced agent looping for mvp this is enough i think
    context_for_next: str
    ordered_test:str  = Field(description="When next_step = order_test you can order diffrent tests they should have short test description 'bloodtest' or similar. this is passed to lab agent",default=None)
    

doctor_agent = Agent(
   CHOSEN_LLM,
    deps_type=DoctorDeps,
    output_type=DoctorDiagnosis,
    system_prompt=(
    "You are a doctor reviewing patient cases and nurse assessments. "
    "You can order tests - your imagination is the only limit. "
    "IMPORTANT: Do not make a final diagnosis until you have ordered and reviewed enough tests. "
    "When you set next_step='finish_chain', you MUST provide: diagnosis, recommended_treatment, and follow_up_needed. "
    "Don't worry about costs when ordering tests."
    )
)

@doctor_agent.tool
def get_nurse_assessment(ctx: RunContext[DoctorDeps]) -> str:
    """Get the nurse's assessment including urgency and notes."""
    return f"Urgency: {ctx.deps.nurse_assessment.urgency}, Notes: {ctx.deps.nurse_assessment.notes}"
@doctor_agent.tool
def get_lab_results(ctx: RunContext[DoctorDeps]) -> str:
    """Get the lab report from ran test"""
    return f"test_type: {ctx.deps.lab_results.tests_ran} test_outcome: {ctx.deps.lab_results.test_outcome}"

