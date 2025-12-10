from dataclasses import dataclass
from hs_pipeline.simulation.agents.patient_generator import PatientData
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
    viewer_output: str = Field(
        description="Simple, non-technical summary for UI (1 sentence max)"
    )


lab_agent = Agent(
    CHOSEN_LLM,
    deps_type=LabAgentDeps,
    output_type=LabResults,
    system_prompt="""
You're a lab technician. Generate realistic test results for the ordered test based on the patient's actual disease.

RULES FOR test_outcome:
- Report ONLY raw values (numbers, levels, counts)
- NEVER mention disease name or diagnose
- Just factual lab data

Good: "Fasting glucose: 145 mg/dL, HbA1c: 7.8%"
Bad: "High glucose consistent with diabetes"

VIEWER OUTPUT (for UI display): Generate a simple, friendly 1 sentence summary:
- NO technical numbers or medical units
- NO medical jargon or complex terms
- Focus on what was done, not results
- Keep it brief and patient-friendly

Good viewer_output examples:
- "Blood work completed. Results sent to your doctor."
- "Imaging scan finished. Images ready for review."
- "Lab tests complete. Doctor will discuss findings with you."
- "X-ray imaging done. Results being analyzed."

Bad viewer_output examples:
- "Completed thyroid panel. TSH 3.2 µIU/mL, Free T4 1.1 ng/dL." (too technical)
- "Joint imaging shows mild space narrowing and osteophytes." (too medical)
    """
)


@lab_agent.tool
def get_test_context(ctx: RunContext[LabAgentDeps]) -> str:
    """Get all test context: patient info, disease, and ordered test."""
    return f"""Patient: {ctx.deps.patient_data.name}, Age {ctx.deps.patient_data.age}
Symptoms: {', '.join(ctx.deps.patient_data.symptoms)}
Actual disease: {ctx.deps.disease}
Ordered test: {ctx.deps.test_type}"""
