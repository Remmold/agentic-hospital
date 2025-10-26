"""
Reflection Agent - Learns from diagnostic errors
"""
from dataclasses import dataclass
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from hs_pipeline.utils.constants import CHOSEN_LLM
from hs_pipeline.agents.patient_generator import PatientData


@dataclass
class ReflectionDeps:
    """Dependencies for reflection."""
    patient_data: PatientData
    symptoms: str
    tests_ordered: list[str]
    test_results: list[str]
    wrong_diagnosis: str
    correct_diagnosis: str
    department: str


class ExperiencePrinciple(BaseModel):
    """Result of reflection - a learning principle."""
    principle_text: str = Field(
        description="Short, actionable principle (1-2 sentences max)"
    )
    reasoning: str = Field(
        description="Why this error happened and how principle prevents it"
    )
    confidence: float = Field(
        description="How confident this principle will help (0.0 to 1.0)",
        ge=0.0,
        le=1.0
    )


reflection_agent = Agent(
    CHOSEN_LLM,
    deps_type=ReflectionDeps,
    output_type=ExperiencePrinciple,
    system_prompt="""
    You analyze diagnostic errors and create SHORT, ACTIONABLE, SEARCHABLE learning principles.
    
    CRITICAL: Use exact symptom keywords from the patient in your principle!
    This makes principles findable when future doctors search for similar symptoms.
    
    GOOD PRINCIPLES (specific, actionable, searchable):
    ✓ "Chest pain in patients over 50 requires ECG and troponin before diagnosis"
    ✓ "Headache with fever and neck stiffness requires lumbar puncture to rule out meningitis"
    ✓ "Dizziness with light sensitivity requires neurological workup including EEG"
    
    BAD PRINCIPLES (vague, not searchable):
    ✗ "Be careful with chest pain"
    ✗ "Order more tests"
    ✗ "Don't rush diagnosis"
    ✗ "In patients with cardiac symptoms..." (too generic)
    
    FORMAT: [Exact symptoms from patient] + [Required action] + [Reason/Disease]
    
    EXAMPLES:
    Patient had: "chest pain, sweating, shortness of breath"
    Wrong diagnosis: Anxiety
    Correct: Myocardial infarction
    
    GOOD: "Chest pain with sweating and shortness of breath requires ECG and troponin to rule out MI"
    BAD: "Cardiac symptoms in elderly patients require testing"
    
    WHY: Future doctor searching "chest pain sweating" will find the GOOD principle!
    
    Keep it SHORT (max 2 sentences). Make it SPECIFIC. Use SYMPTOM KEYWORDS.
    
    Use tools to understand the case before creating the principle.
    """
)


@reflection_agent.tool
def get_patient_info(ctx: RunContext[ReflectionDeps]) -> str:
    """Get patient demographics and presentation."""
    p = ctx.deps.patient_data
    return f"""
Patient: {p.name}, {p.age}y {p.gender}
Medical History: {p.medical_history or 'None'}
Medications: {', '.join(p.current_medications) if p.current_medications else 'None'}
Symptoms: {ctx.deps.symptoms}
"""


@reflection_agent.tool
def get_diagnostic_process(ctx: RunContext[ReflectionDeps]) -> str:
    """Get what tests were ordered."""
    tests = ctx.deps.tests_ordered
    results = ctx.deps.test_results
    
    if not tests:
        return "NO TESTS ORDERED - this is likely the problem!"
    
    output = "Tests ordered:\n"
    for i, test in enumerate(tests):
        result = results[i] if i < len(results) else "No result"
        output += f"- {test}: {result}\n"
    return output


@reflection_agent.tool
def get_error_details(ctx: RunContext[ReflectionDeps]) -> str:
    """Get what doctor diagnosed vs actual."""
    return f"""
WRONG: Doctor diagnosed {ctx.deps.wrong_diagnosis}
CORRECT: Patient actually had {ctx.deps.correct_diagnosis}
Department: {ctx.deps.department}
"""


@reflection_agent.tool
def get_common_pitfalls(ctx: RunContext[ReflectionDeps]) -> str:
    """Identify common diagnostic patterns."""
    tests = ctx.deps.tests_ordered
    symptoms = ctx.deps.symptoms.lower()
    patterns = []
    
    # No tests ordered
    if len(tests) == 0:
        patterns.append("ERROR: No tests ordered before diagnosis - diagnosed based on symptoms only")
    
    # Chest pain without cardiac workup
    if "chest pain" in symptoms or "chest discomfort" in symptoms:
        if not any("ecg" in t.lower() or "troponin" in t.lower() for t in tests):
            patterns.append("MISSED: Chest pain without ECG or cardiac markers")
    
    # Headache + fever without meningitis workup
    if "headache" in symptoms and "fever" in symptoms:
        if not any("lumbar" in t.lower() or "csf" in t.lower() for t in tests):
            patterns.append("MISSED: Headache with fever - meningitis not ruled out")
    
    # Abdominal pain without imaging
    if "abdominal pain" in symptoms or "stomach pain" in symptoms:
        if not any("ct" in t.lower() or "ultrasound" in t.lower() for t in tests):
            patterns.append("MISSED: Abdominal pain without imaging")
    
    if patterns:
        return "Common pitfalls detected:\n" + "\n".join(f"- {p}" for p in patterns)
    return "No obvious pitfalls detected."


def create_learning_principle(
    patient_data: PatientData,
    symptoms: str,
    tests_ordered: list[str],
    test_results: list[str],
    wrong_diagnosis: str,
    correct_diagnosis: str,
    department: str = "General"
) -> ExperiencePrinciple | None:
    """
    Analyze error and create learning principle.
    
    Returns:
        ExperiencePrinciple or None if reflection fails
    """
    deps = ReflectionDeps(
        patient_data=patient_data,
        symptoms=symptoms,
        tests_ordered=tests_ordered,
        test_results=test_results,
        wrong_diagnosis=wrong_diagnosis,
        correct_diagnosis=correct_diagnosis,
        department=department
    )
    
    try:
        result = reflection_agent.run_sync(
            f"""
            Analyze this diagnostic error:
            
            Doctor diagnosed: {wrong_diagnosis}
            Actually was: {correct_diagnosis}
            
            What principle would prevent this mistake?
            Use the tools to understand what went wrong.
            """,
            deps=deps
        )
        
        principle = result.output
        
        # Basic validation - principle must be actionable
        if len(principle.principle_text) < 20:
            return None  # Too short
        
        if principle.confidence < 0.5:
            return None  # Agent not confident
        
        # Check if principle mentions action words
        action_words = ["requires", "order", "obtain", "check", "rule out", "perform", "before"]
        if not any(word in principle.principle_text.lower() for word in action_words):
            return None  # Not actionable
        
        return principle
        
    except Exception as e:
        print(f"Reflection failed: {e}")
        return None


# Test
if __name__ == "__main__":
    from hs_pipeline.agents.patient_generator import PatientData
    
    print("=== Testing Reflection Agent ===\n")
    
    # Test: Missed heart attack
    patient = PatientData(
        name="John Doe",
        age=58,
        gender="Male",
        symptoms=["chest pain", "shortness of breath", "sweating"],
        medical_history="Hypertension, high cholesterol",
        current_medications=["Lisinopril", "Atorvastatin"]
    )
    
    principle = create_learning_principle(
        patient_data=patient,
        symptoms="chest pain, shortness of breath, sweating",
        tests_ordered=[],  # NO TESTS!
        test_results=[],
        wrong_diagnosis="Anxiety disorder",
        correct_diagnosis="Myocardial Infarction",
        department="Cardiology"
    )
    
    if principle:
        print("✓ Reflection succeeded!\n")
        print(f"Principle: {principle.principle_text}")
        print(f"Reasoning: {principle.reasoning}")
        print(f"Confidence: {principle.confidence:.2f}")
    else:
        print("✗ Reflection failed")