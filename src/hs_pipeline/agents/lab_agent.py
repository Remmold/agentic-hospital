from dataclasses import dataclass
from hs_pipeline.agents.nurse_agent import PatientData
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from hs_pipeline.utils.constants import CHOSEN_LLM


@dataclass
class LabAgentDeps:
    disease: str
    patient_data: PatientData
    test_type: str


class LabResults(BaseModel):
    tests_ran: str
    test_outcome: str


lab_agent = Agent(
    CHOSEN_LLM,
    deps_type=LabAgentDeps,
    output_type=LabResults,
    system_prompt="""
You're a lab technician. Generate realistic test results for the ordered test based on the patient's actual disease.

RULES:
- Report ONLY raw values (numbers, levels, counts)
- NEVER mention disease name or diagnose
- Just factual lab data

Good: "Fasting glucose: 145 mg/dL, HbA1c: 7.8%"
Bad: "High glucose consistent with diabetes"
    """
)


@lab_agent.tool
def get_test_context(ctx: RunContext[LabAgentDeps]) -> str:
    """Get all test context: patient info, disease, and ordered test."""
    return f"""Patient: {ctx.deps.patient_data.name}, Age {ctx.deps.patient_data.age}
Symptoms: {', '.join(ctx.deps.patient_data.symptoms)}
Actual disease: {ctx.deps.disease}
Ordered test: {ctx.deps.test_type}"""