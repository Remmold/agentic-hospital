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
    lab_results: list[LabResults] | None = None

class DoctorDiagnosis(BaseModel):
    diagnosis: str| None = None
    recommended_treatment: str| None = None
    follow_up_needed: bool| None = None
    next_step: Literal["finish_chain","order_test"] # Add more steps for more advanced agent looping for mvp this is enough i think
    context_for_next: str
    ordered_test: str | None = Field(default=None, description="When next_step = order_test you can order diffrent tests they should have short test description 'bloodtest' or similar. this is passed to lab agent")

doctor_agent = Agent(
   CHOSEN_LLM,
    deps_type=DoctorDeps,
    output_type=DoctorDiagnosis,
    system_prompt=(
        "You are a doctor reviewing patient cases and nurse assessments. "
        "When calling tools, use ONLY the exact tool names: get_nurse_assessment, get_lab_results "
        
        "WORKFLOW: "
        "1. ALWAYS start by calling get_nurse_assessment and get_lab_results to see what information you have "
        "2. Check the nurse's urgency assessment - if HIGH urgency, you need multiple tests before diagnosing "
        "3. Order tests one at a time and wait for results "
        "4. After EACH test result, call get_lab_results to review ALL tests done so far "
        "5. You need AT LEAST 2 DIFFERENT types of tests for urgent cases before making a diagnosis "
        "6. Only set next_step='finish_chain' when you have sufficient test evidence "
        
        "IMPORTANT RULES: "
        "- Check get_lab_results after EVERY test to see what's already been done "
        "- DO NOT order a test that already appears in get_lab_results output "
        "- For HIGH urgency cases: require at least 2 different test types before diagnosing "
        "- For MEDIUM/LOW urgency: at least 1 test required "
        "- If a test comes back inconclusive or normal but symptoms suggest otherwise, order a different test type "
        "- List your reasoning: what tests have been done, what's still unknown, why you're confident enough to diagnose "
        "CRITICAL: When calling final_result, return a SINGLE object, NOT an array."
    )
)

@doctor_agent.tool
def get_nurse_assessment(ctx: RunContext[DoctorDeps]) -> str:
    """Get the nurse's assessment including urgency and notes."""
    return f"Urgency: {ctx.deps.nurse_assessment.urgency}, Notes: {ctx.deps.nurse_assessment.notes}"


@doctor_agent.tool
def get_lab_results(ctx: RunContext[DoctorDeps]) -> str:
    """Get the lab report from ran test"""
    if ctx.deps.lab_results:
        return_string = ""
        for results in ctx.deps.lab_results:
            return_string += f"\n test_type: {results.tests_ran} test_outcome: {results.test_outcome}"
        return return_string
    else:
        return "No tests ran yet"
    