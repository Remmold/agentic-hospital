from dataclasses import dataclass
from hs_pipeline.agents.nurse_agent import PatientData,NurseAssessment
from pydantic import BaseModel,Field
from pydantic_ai import Agent,RunContext
from dotenv import load_dotenv
from hs_pipeline.utils.constants import CHOSEN_LLM
load_dotenv()

@dataclass
class LabAgentDeps:
    disease:str
    patient_data:PatientData
    test_type:str


class LabResults(BaseModel):
    tests_ran:str
    test_outcome:str


lab_agent = Agent(
    CHOSEN_LLM,
    deps_type=LabAgentDeps,
    output_type=LabResults,
    system_prompt=(
        "You are a lab technician running medical tests. "
        "Use the available tools to check what disease the patient has, their symptoms, and what test was ordered. "
        "Generate realistic test results that are consistent with the patient's actual disease. "
        
        "CRITICAL RULES: "
        "- Report ONLY raw test values and clinical measurements (numbers, levels, counts) "
        "- NEVER mention the disease name or make diagnostic conclusions "
        "- NEVER say things like 'consistent with [disease]' or 'indicates [disease]' "
        "- Just report the factual test data that a lab would provide "
        
        "Example GOOD result: 'Fasting glucose: 145 mg/dL, HbA1c: 7.8%' "
        "Example BAD result: 'High glucose consistent with diabetes' "
    )
)

@lab_agent.tool
def get_disease(ctx: RunContext[LabAgentDeps]) -> str:
    """Get the disease the patient has"""
    return ctx.deps.disease


@lab_agent.tool
def get_patient_data(ctx: RunContext[LabAgentDeps]) -> str:
    """Get patient information"""
    return f"Name: {ctx.deps.patient_data.name}, Age: {ctx.deps.patient_data.age}, Symptoms: {ctx.deps.patient_data.symptoms}"


@lab_agent.tool
def get_test_type(ctx: RunContext[LabAgentDeps]) -> str:
    """Get the type of test that was ordered"""
    return ctx.deps.test_type