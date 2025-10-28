"""Reflection Agent - Learns from errors."""
from dataclasses import dataclass
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from hs_pipeline.utils.constants import CHOSEN_LLM
from hs_pipeline.agents.patient_generator import PatientData


@dataclass
class ReflectionDeps:
    patient_data: PatientData
    symptoms: str
    tests_ordered: list[str]
    test_results: list[str]
    wrong_diagnosis: str
    correct_diagnosis: str
    department: str


class ExperiencePrinciple(BaseModel):
    principle_text: str = Field(description="Short actionable principle (max 2 sentences)")
    reasoning: str = Field(description="Why error happened and how to prevent it")
    confidence: float = Field(description="0.0 to 1.0", ge=0.0, le=1.0)


reflection_agent = Agent(
    CHOSEN_LLM,
    deps_type=ReflectionDeps,
    output_type=ExperiencePrinciple,
    system_prompt="""
Create SHORT, SEARCHABLE learning principles from diagnostic errors.

FORMAT: [Exact symptoms] + [Required action] + [Reason]

GOOD: "Chest pain with sweating requires ECG and troponin to rule out MI"
BAD: "Be careful with cardiac symptoms"

Use exact symptom keywords from patient for searchability.
Keep under 2 sentences. Be specific and actionable.
    """
)


@reflection_agent.tool
def get_patient_info(ctx: RunContext[ReflectionDeps]) -> str:
    """Get patient presentation."""
    p = ctx.deps.patient_data
    return f"{p.age}y {p.gender}, History: {p.medical_history or 'None'}, Symptoms: {ctx.deps.symptoms}"


@reflection_agent.tool
def get_error_details(ctx: RunContext[ReflectionDeps]) -> str:
    """Get diagnostic error details."""
    tests_info = f"Tests: {', '.join(ctx.deps.tests_ordered)}" if ctx.deps.tests_ordered else "NO TESTS ORDERED"
    return f"Wrong: {ctx.deps.wrong_diagnosis}\nCorrect: {ctx.deps.correct_diagnosis}\n{tests_info}"


def create_learning_principle(
    patient_data: PatientData,
    symptoms: str,
    tests_ordered: list[str],
    test_results: list[str],
    wrong_diagnosis: str,
    correct_diagnosis: str,
    department: str = "General"
) -> ExperiencePrinciple | None:
    """Analyze error and create learning principle."""
    deps = ReflectionDeps(
        patient_data, symptoms, tests_ordered, test_results,
        wrong_diagnosis, correct_diagnosis, department
    )
    
    try:
        result = reflection_agent.run_sync(
            f"Analyze: Doctor said {wrong_diagnosis}, actually {correct_diagnosis}. Create prevention principle.",
            deps=deps
        )
        
        principle = result.output
        
        # Validate
        if len(principle.principle_text) < 20 or principle.confidence < 0.5:
            return None
        
        action_words = ["requires", "order", "obtain", "check", "rule out", "before"]
        if not any(word in principle.principle_text.lower() for word in action_words):
            return None
        
        return principle
    except Exception as e:
        print(f"Reflection failed: {e}")
        return None