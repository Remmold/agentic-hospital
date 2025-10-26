from dataclasses import dataclass
from typing import Literal
from hs_pipeline.agents.nurse_agent import PatientData, NurseAssessment
from hs_pipeline.agents.lab_agent import LabResults
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from dotenv import load_dotenv
from hs_pipeline.utils.constants import CHOSEN_LLM
from hs_pipeline.database_management.db_manager import get_db

load_dotenv()


@dataclass
class DoctorDeps:
    patient_data: PatientData
    nurse_assessment: NurseAssessment
    lab_results: list[LabResults] | None = None
    department: str = "General"  # For RAG retrieval by department


class DoctorDiagnosis(BaseModel):
    diagnosis: str | None = None
    recommended_treatment: str | None = None
    follow_up_needed: bool | None = None
    next_step: Literal["finish_chain", "order_test"]
    context_for_next: str
    ordered_test: str | None = None
    reasoning: str = Field(description="Explain your decision process and confidence level")
    tests_completed_count: int = Field(description="How many tests have been run so far")
    

doctor_agent = Agent(
    CHOSEN_LLM,
    deps_type=DoctorDeps,
    output_type=DoctorDiagnosis,
    system_prompt="""
        You are an evolving doctor agent who learns from experience.
        
        YOUR GOAL: Accurate diagnosis with appropriate testing (not too many, not too few).
        
        WORKFLOW:
        1. Call get_nurse_assessment() to understand triage level and concerns
        2. Call search_similar_cases() to find past cases like this one
        3. Call search_relevant_experiences() to retrieve lessons learned from mistakes
        4. If you've ordered tests, call get_lab_results() to review them
        5. Decide: Need more tests? Or ready to diagnose?
        
        DECISION FRAMEWORK:
        - If similar cases succeeded with 0 tests → consider immediate diagnosis
        - If experiences warn "this symptom needs testing" → order tests
        - If symptoms are conclusive and low-risk → diagnose
        - If symptoms are ambiguous or high-risk → test first
        - If test results are inconclusive → order different test
        
        YOU CAN DIAGNOSE WITH 0 TESTS if:
        - You found similar cases that worked
        - No experiences warn against it
        - Symptoms are clear and specific
        - Risk of misdiagnosis is low
        
        YOU SHOULD ORDER TESTS if:
        - Experiences suggest testing is needed
        - Symptoms are vague or overlap multiple diseases
        - High-risk conditions (cardiac, severe infection, etc.)
        - Previous tests were inconclusive
        
        LEARNING PROCESS:
        - You WILL make mistakes early on
        - Wrong diagnosis = reflection creates experience principle
        - Correct diagnosis = case added to medical records
        - Over time, you'll learn efficient testing patterns
        
        BE SPECIFIC:
        - Diagnosis must be an actual disease name (not "unknown" or "unclear")
        - If truly unsure after testing, explain why in reasoning
        - Treatment should match the diagnosis
        
        EXPLAIN YOUR REASONING:
        - What similar cases did you find?
        - What experiences guided you?
        - Tests completed: X
        - Why you're confident (or why you need more info)
        - Risk assessment
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
    """Get all lab test results completed so far."""
    if ctx.deps.lab_results:
        result_str = f"Total tests completed: {len(ctx.deps.lab_results)}\n\n"
        for i, result in enumerate(ctx.deps.lab_results, 1):
            result_str += f"Test {i}: {result.tests_ran}\nResults: {result.test_outcome}\n\n"
        return result_str
    else:
        return "Total tests completed: 0\nNo tests have been run yet."


@doctor_agent.tool
def search_similar_cases(ctx: RunContext[DoctorDeps], query: str = "") -> str:
    """
    Search Medical Case Base for similar past cases.
    Returns top-3 similar cases with their diagnosis and treatment.
    
    Args:
        query: Description to search for (e.g., "chest pain elderly male")
               Leave empty to auto-generate from current patient
    """
    db = get_db()
    
    # Auto-generate query if not provided
    if not query:
        patient = ctx.deps.patient_data
        symptoms_str = ", ".join(patient.symptoms)
        query = f"Age {patient.age}, {symptoms_str}"
    
    try:
        results = db.search_similar_cases(
            department=ctx.deps.department,
            query=query,
            n_results=3
        )
        
        if not results['ids'][0]:
            return "No similar cases found in Medical Case Base yet."
        
        output = f"Found {len(results['ids'][0])} similar cases:\n\n"
        
        for i, case_id in enumerate(results['ids'][0], 1):
            case = db.get_case_details(case_id)
            if case:
                output += f"Case {i}:\n"
                output += f"  Age: {case['patient_age']}, Gender: {case['patient_gender']}\n"
                output += f"  Symptoms: {case['symptoms']}\n"
                output += f"  Tests ordered: {case['examination_ordered']}\n"
                output += f"  Diagnosis: {case['diagnosis']}\n"
                output += f"  Treatment: {case['treatment_plan']}\n"
                output += f"  Outcome: {case['outcome']}\n\n"
        
        return output
    except Exception as e:
        return f"Error searching cases: {str(e)}"


@doctor_agent.tool
def search_relevant_experiences(ctx: RunContext[DoctorDeps], query: str = "") -> str:
    """
    Search Experience Base for relevant principles learned from past mistakes.
    Returns top-4 most relevant experience principles.
    
    Args:
        query: What to search for (e.g., "chest pain testing")
               Leave empty to auto-generate from current patient
    """
    db = get_db()
    
    # Auto-generate query if not provided
    if not query:
        patient = ctx.deps.patient_data
        symptoms_str = ", ".join(patient.symptoms)
        query = f"{symptoms_str} diagnosis"
    
    try:
        results = db.search_relevant_experiences(
            department=ctx.deps.department,
            query=query,
            n_results=4
        )
        
        if not results['ids'][0]:
            return "No relevant experiences found yet. You're learning from scratch!"
        
        output = f"Found {len(results['ids'][0])} relevant experiences:\n\n"
        
        for i, exp_id in enumerate(results['ids'][0], 1):
            exp = db.get_experience_details(exp_id)
            if exp:
                output += f"Experience {i}:\n"  
                output += f"  Principle: {exp['principle_text']}\n"
                output += f"  Validation accuracy: {exp['validation_accuracy']:.2f}\n\n"
        
        return output
    except Exception as e:
        return f"Error searching experiences: {str(e)}"