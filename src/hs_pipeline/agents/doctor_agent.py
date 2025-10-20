from dataclasses import dataclass
from typing import Literal
from hs_pipeline.agents.nurse_agent import PatientData,NurseAssessment
from hs_pipeline.agents.lab_agent import LabResults
from pydantic import BaseModel, Field, model_validator
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
    ordered_test: str | None = None
    tests_completed_count: int = Field(description="How many tests have been run")

    @model_validator(mode='after')
    def validate_testing(self):
        """Enforce minimum testing before diagnosis."""
        if self.next_step == "finish_chain":
            if self.diagnosis and self.tests_completed_count == 0:
                raise ValueError("Cannot diagnose without any tests")
        return self

doctor_agent = Agent(
    CHOSEN_LLM,
    deps_type=DoctorDeps,
    output_type=DoctorDiagnosis,
    system_prompt="""
        You are a doctor. Patient safety is paramount.

        MANDATORY WORKFLOW:
        1. Call get_nurse_assessment and get_lab_results FIRST
        2. Check urgency and existing tests

        TESTING REQUIREMENTS (STRICTLY ENFORCED):
        - CRITICAL: Need 3+ different tests before diagnosis
        - URGENT: Need 2+ different tests before diagnosis
        - SEMI_URGENT: Need 1+ test before diagnosis
        - NON_URGENT: Need 1+ test before diagnosis

        YOU CANNOT DIAGNOSE WITHOUT TESTS. Period.

        If you have 0 tests → Order a test, set next_step='order_test'
        If you have some tests but not enough → Order another test
        Only when you meet minimum tests → Diagnose (with an actual disease, "None" is not sufficient) and set next_step='finish_chain'

        After EACH test:
        1. Call get_lab_results to see all tests done
        2. Count how many different test types you have
        3. If below minimum → order another test
        4. If at/above minimum AND results are conclusive → diagnose

        EXPLAIN YOUR REASONING:
        - Tests completed: X/Y required
        - What tests show
        - Why you're confident (or why you need more tests)

        Never skip tests to save time. Patient safety > speed.
    """
)

@doctor_agent.tool
def get_nurse_assessment(ctx: RunContext[DoctorDeps]) -> str:
    """Get the nurse's triage assessment including urgency level and reasoning."""
    return f"""
        Triage Level: {ctx.deps.nurse_assessment.urgency}
        Triage Reasoning: {ctx.deps.nurse_assessment.triage_reasoning}
        Vital Signs Concern: {ctx.deps.nurse_assessment.vital_signs_concern}
        Notes: {ctx.deps.nurse_assessment.notes}
    """


@doctor_agent.tool
def get_lab_results(ctx: RunContext[DoctorDeps]) -> str:
    """Get all lab test results and count them."""
    if ctx.deps.lab_results:
        result_str = f"Total tests completed: {len(ctx.deps.lab_results)}\n\n"
        for i, result in enumerate(ctx.deps.lab_results, 1):
            result_str += f"Test {i}: {result.tests_ran}\nResults: {result.test_outcome}\n\n"
        return result_str
    else:
        return "Total tests completed: 0\nNo tests have been run yet."
    