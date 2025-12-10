"""
Hybrid Validation: Rule-based + LLM fallback
Copy-paste ready - just import and use!
"""
from typing import Tuple, Literal
from pydantic import BaseModel
from pydantic_ai import Agent
from hs_pipeline.utils.constants import CHOSEN_LLM
import re



# LLM VALIDATOR (only used for uncertain cases)
class ValidationResult(BaseModel):
    """LLM validation result."""
    is_match: bool
    confidence: Literal["high", "medium", "low"]
    reasoning: str


llm_validator = Agent(
    CHOSEN_LLM,
    output_type=ValidationResult,
    system_prompt="""
    You are a medical validation expert. Compare two disease names and determine if they refer to the same condition.
    
    Consider:
    - Exact matches (Pneumonia = Pneumonia)
    - Abbreviations (MI = Myocardial Infarction)
    - Synonyms (Heart Attack = Myocardial Infarction)
    - Modifiers don't change core disease (Acute MI = MI)
    - Subtypes are the same (Type 2 Diabetes = Diabetes Mellitus)
    
    Return:
    - is_match: True if same condition
    - confidence: high/medium/low
    - reasoning: Brief explanation
    """
)



# RULE-BASED VALIDATION (fast, deterministic)
def normalize_disease_name(disease: str) -> str:
    """Normalize disease name for comparison."""
    if not disease:
        return ""
    
    disease = disease.lower().strip()
    disease = disease.replace("_", " ").replace("-", " ")
    disease = re.sub(r'\s+', ' ', disease)
    
    # Common abbreviations
    abbreviations = {
        "mi": "myocardial infarction",
        "cad": "coronary artery disease",
        "copd": "chronic obstructive pulmonary disease",
        "pe": "pulmonary embolism",
        "uti": "urinary tract infection",
        "dm": "diabetes mellitus",
        "htn": "hypertension",
    }
    
    if disease in abbreviations:
        disease = abbreviations[disease]
    
    # Remove modifiers
    prefixes = ["acute ", "chronic ", "severe ", "mild ", "moderate ",
                "suspected ", "possible ", "primary ", "secondary ", "type "]
    for prefix in prefixes:
        if disease.startswith(prefix):
            disease = disease[len(prefix):].strip()
    
    # Remove parenthetical info
    disease = re.sub(r'\([^)]*\)', '', disease).strip()
    
    return disease


def extract_primary_diagnosis(diagnosis_text: str) -> str:
    """Extract primary diagnosis from complex text."""
    if not diagnosis_text:
        return ""
    
    # Take first clause
    primary = diagnosis_text.split(',')[0].split(';')[0].strip()
    primary = primary.split(' with ')[0].strip()
    
    return normalize_disease_name(primary)


def validate_with_rules(doctor_diagnosis: str, actual_disease: str) -> Tuple[bool | None, str, float]:
    """
    Rule-based validation.
    Returns: (is_correct or None, reason, confidence)
    None = uncertain, need LLM
    """
    if not doctor_diagnosis or not actual_disease:
        return False, "Missing diagnosis", 0.0
    
    norm_doctor = extract_primary_diagnosis(doctor_diagnosis)
    norm_actual = normalize_disease_name(actual_disease)
    
    # Exact match
    if norm_doctor == norm_actual:
        return True, f"Exact match: '{norm_doctor}'", 1.0
    
    # Known synonyms
    synonyms = {
        frozenset(["heart attack", "myocardial infarction", "mi"]),
        frozenset(["stroke", "cerebrovascular accident", "cva"]),
        frozenset(["hypertension", "high blood pressure", "htn"]),
        frozenset(["diabetes", "diabetes mellitus", "dm"]),
        frozenset(["appendicitis", "acute appendicitis"]),
        frozenset(["pneumonia", "lung infection"]),
        frozenset(["gastroenteritis", "stomach flu"]),
        frozenset(["migraine", "migraine headache"]),
        frozenset(["rheumatoid arthritis", "ra"]),
    }
    
    for synonym_set in synonyms:
        if norm_doctor in synonym_set and norm_actual in synonym_set:
            return True, f"Synonym match: '{norm_doctor}' ≈ '{norm_actual}'", 0.95
    
    # Partial match - uncertain
    if norm_doctor in norm_actual or norm_actual in norm_doctor:
        return None, f"Uncertain partial match", 0.5
    
    # Clear mismatch
    words_doctor = set(norm_doctor.split())
    words_actual = set(norm_actual.split())
    
    if len(words_doctor.intersection(words_actual)) == 0:
        return False, f"Clear mismatch: '{norm_doctor}' != '{norm_actual}'", 0.9
    
    # Some overlap but uncertain
    return None, f"Uncertain match", 0.3



# LLM VALIDATION (for uncertain cases)
def validate_with_llm(doctor_diagnosis: str, actual_disease: str) -> Tuple[bool, str]:
    """LLM-based validation."""
    try:
        result = llm_validator.run_sync(
            f"""
            Compare these diagnoses:
            
            Doctor diagnosed: {doctor_diagnosis}
            Actual disease: {actual_disease}
            
            Are these the same condition?
            """
        )
        
        match_result = result.output
        reason = f"LLM ({match_result.confidence}): {match_result.reasoning}"
        
        return match_result.is_match, reason
        
    except Exception as e:
        return False, f"LLM validation failed: {e}"


# MAIN VALIDATION FUNCTION (the only one you need to call)
def validate_diagnosis(
    doctor_diagnosis: str,
    actual_disease: str,
    use_llm: Literal["never", "fallback", "always"] = "fallback"
) -> Tuple[bool, str]:
    """
    Hybrid validation with configurable LLM usage.
    
    Args:
        doctor_diagnosis: What the doctor diagnosed
        actual_disease: Ground truth disease
        use_llm: When to use LLM
            - "never": Only rules (fast, free)
            - "fallback": Rules first, LLM if uncertain (RECOMMENDED)
            - "always": Always LLM (most robust, costly)
    
    Returns:
        (is_correct: bool, reason: str)
    
    Example:
        >>> validate_diagnosis("Acute MI", "myocardial_infarction")
        (True, "Exact match: 'myocardial infarction'")
        
        >>> validate_diagnosis("Diabetes", "diabetes_mellitus", use_llm="fallback")
        (True, "Exact match: 'diabetes mellitus'")
    """
    
    # Always use LLM
    if use_llm == "always":
        return validate_with_llm(doctor_diagnosis, actual_disease)
    
    # Try rules first
    is_correct, reason, confidence = validate_with_rules(doctor_diagnosis, actual_disease)
    
    # If rules are confident, use that result
    if is_correct is not None and (use_llm == "never" or confidence > 0.85):
        return is_correct, reason
    
    # Fallback to LLM for uncertain cases
    if use_llm == "fallback":
        print(f"Rules uncertain, using LLM validation...")
        return validate_with_llm(doctor_diagnosis, actual_disease)
    
    # "never" mode but uncertain - default to False
    return False, f"Uncertain: {reason}"


if __name__ == "__main__":
    print("Testing hybrid validation...\n")
    
    tests = [
        ("Acute Myocardial Infarction", "myocardial_infarction"),
        ("Diabetes", "diabetes_mellitus"),
        ("Pneumonia", "pneumonia"),
        ("Community-Acquired Pneumonia", "pneumonia"),  # Uncertain
        ("Pneumonia", "appendicitis"),
    ]
    
    for doctor, actual in tests:
        is_correct, reason = validate_diagnosis(doctor, actual, use_llm="fallback")
        status = "✓" if is_correct else "✗"
        print(f"{status} '{doctor}' vs '{actual}'")
        print(f"   {reason}\n")
