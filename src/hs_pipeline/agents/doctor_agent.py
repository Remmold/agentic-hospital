from dataclasses import dataclass
from typing import Literal
from hs_pipeline.agents.patient_generator import PatientData
from hs_pipeline.agents.nurse_agent import NurseAssessment
from hs_pipeline.agents.lab_agent import LabResults
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from hs_pipeline.utils.constants import CHOSEN_LLM
from hs_pipeline.database_management.db_manager import get_db


@dataclass
class DoctorDeps:
    patient_data: PatientData
    nurse_assessment: NurseAssessment
    lab_results: list[LabResults] | None = None
    department: str = "General"


class DoctorDiagnosis(BaseModel):
    diagnosis: str | None = None
    recommended_treatment: str | None = None
    follow_up_needed: bool | None = None
    next_step: Literal["finish_chain", "order_test"]
    context_for_next: str
    ordered_test: str | None = None
    reasoning: str = Field(description="Decision process and confidence")
    tests_completed_count: int = Field(description="Number of tests completed")
    

doctor_agent = Agent(
    CHOSEN_LLM,
    deps_type=DoctorDeps,
    output_type=DoctorDiagnosis,
    system_prompt="""
You're a learning doctor who improves through experience.

WORKFLOW (always in order):
1. get_nurse_assessment() - understand urgency
2. search_similar_cases() - learn from past successes across ALL departments
3. search_relevant_experiences() - avoid past mistakes from ALL cases
4. get_lab_results() - check existing tests BEFORE ordering new ones
5. Decide: diagnose or test?

TESTING RULES:
- ALWAYS check get_lab_results() before ordering tests
- If tests_completed > 0, review results first
- Don't repeat completed tests
- Order tests only for: unclear symptoms, high-risk cases, or when experiences suggest it
- You CAN diagnose with 0 tests if symptoms are clear and similar cases worked

DIAGNOSIS RULES:
- Use specific disease names (not "unknown")
- Be confident or explain why you need more info
- Treatment must match diagnosis

REASONING:
Include: similar cases found, relevant experiences, tests completed, risk level, confidence
    """
)


@doctor_agent.tool
def get_nurse_assessment(ctx: RunContext[DoctorDeps]) -> str:
    """Get nurse's triage assessment."""
    na = ctx.deps.nurse_assessment
    return f"Urgency: {na.urgency}\nReasoning: {na.triage_reasoning}\nVitals concern: {na.vital_signs_concern}"


@doctor_agent.tool
def get_lab_results(ctx: RunContext[DoctorDeps]) -> str:
    """Get all completed lab tests."""
    if not ctx.deps.lab_results:
        return "Tests completed: 0\nNo tests run yet."
    
    result_str = f"Tests completed: {len(ctx.deps.lab_results)}\n\n"
    for i, result in enumerate(ctx.deps.lab_results, 1):
        result_str += f"Test {i}: {result.tests_ran}\nResults: {result.test_outcome}\n\n"
    return result_str


@doctor_agent.tool
def search_similar_cases(
    ctx: RunContext[DoctorDeps], 
    query: str = "",
    search_all_departments: bool = True
) -> str:
    """
    Search past cases with similar presentations.
    
    Args:
        query: Search query (auto-generated from patient if empty)
        search_all_departments: If True, search ALL departments; if False, only current department
    """
    db = get_db()
    
    if not query:
        symptoms_str = ", ".join(ctx.deps.patient_data.symptoms)
        query = f"Age {ctx.deps.patient_data.age}, {symptoms_str}"
    
    # Search globally or within department
    dept_filter = None if search_all_departments else ctx.deps.department
    results = db.search_similar_cases(query, department=dept_filter, n_results=3)
    
    if not results['ids'][0]:
        scope = "any department" if search_all_departments else ctx.deps.department
        return f"No similar cases found in {scope} yet."
    
    output = f"Found {len(results['ids'][0])} similar cases"
    if search_all_departments:
        output += " (across all departments)"
    output += ":\n\n"
    
    for i, case_id in enumerate(results['ids'][0], 1):
        case = db.get_case_details(case_id)
        if case:
            output += f"Case {i} [{case['department']}]: Age {case['patient_age']}, {case['patient_gender']}\n"
            output += f"  Symptoms: {case['symptoms']}\n"
            output += f"  Tests: {case['examination_ordered']}\n"
            output += f"  Diagnosis: {case['diagnosis']}, Outcome: {case['outcome']}\n\n"
    
    return output


@doctor_agent.tool
def search_relevant_experiences(
    ctx: RunContext[DoctorDeps], 
    query: str = "",
    search_all_departments: bool = True
) -> str:
    """
    Search lessons learned from past mistakes.
    
    Args:
        query: Search query (auto-generated from patient if empty)
        search_all_departments: If True, search ALL departments; if False, only current department
    """
    db = get_db()
    
    if not query:
        query = f"{', '.join(ctx.deps.patient_data.symptoms)} diagnosis"
    
    # Search globally or within department
    dept_filter = None if search_all_departments else ctx.deps.department
    results = db.search_relevant_experiences(query, department=dept_filter, n_results=4)
    
    if not results['ids'][0]:
        scope = "any department" if search_all_departments else ctx.deps.department
        return f"No experiences in {scope} yet - learning from scratch!"
    
    # Auto-track retrieval
    db.track_experience_retrieval(results['ids'][0])
    
    output = f"Found {len(results['ids'][0])} relevant experiences"
    if search_all_departments:
        output += " (across all departments)"
    output += ":\n\n"
    
    for i, exp_id in enumerate(results['ids'][0], 1):
        exp = db.get_experience_details(exp_id)
        if exp:
            output += f"{i}. [{exp['department']}] {exp['principle_text']}\n"
            output += f"   (Validation: {exp['validation_accuracy']:.0%})\n\n"
    
    return output