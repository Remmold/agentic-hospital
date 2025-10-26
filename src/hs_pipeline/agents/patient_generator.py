"""
Improved Patient Generator - Department-based diseases with realistic data
"""
from dataclasses import dataclass
from mistralai import Optional
from pydantic_ai import Agent
from dotenv import load_dotenv
from hs_pipeline.utils.constants import CHOSEN_LLM
import random
load_dotenv()

@dataclass
class PatientData:
    """
    PatientData contains all the information that a nurse would need to assess 
    the situation and plan course of action.
    
    Updated to support real timeline data with medical history.
    """
    name: str
    age: int
    gender: str 
    symptoms: list[str]
    medical_history: Optional[str] = None
    current_medications: Optional[list[str]] = None

DISEASES_BY_DEPARTMENT = {
    "Cardiology": [
        "myocardial_infarction",
        "angina",
        "heart_failure",
        "atrial_fibrillation",
        "hypertension",
        "coronary_artery_disease",
    ],
    "Neurology": [
        "migraine",
        "stroke",
        "epilepsy",
        "meningitis",
        "parkinsons_disease",
        "multiple_sclerosis",
    ],
    "Respiratory": [
        "pneumonia",
        "asthma",
        "copd",
        "pulmonary_embolism",
        "tuberculosis",
        "bronchitis",
    ],
    "Gastroenterology": [
        "appendicitis",
        "gastroenteritis",
        "cholecystitis",
        "pancreatitis",
        "peptic_ulcer",
        "inflammatory_bowel_disease",
    ],
    "Endocrinology": [
        "diabetes_mellitus",
        "hyperthyroidism",
        "hypothyroidism",
        "cushings_syndrome",
        "addisons_disease",
    ],
    "Rheumatology": [
        "rheumatoid_arthritis",
        "osteoarthritis",
        "gout",
        "lupus",
        "fibromyalgia",
    ],
    "General": [
        "flu",
        "urinary_tract_infection",
        "cellulitis",
        "dehydration",
        "allergic_reaction",
    ]
}


def get_department_for_disease(disease: str) -> str:
    """Get the department for a given disease."""
    disease_lower = disease.lower().replace(" ", "_")
    
    for department, diseases in DISEASES_BY_DEPARTMENT.items():
        if disease_lower in [d.lower() for d in diseases]:
            return department
    
    return "General"


def generate_disease(department: str | None = None) -> tuple[str, str]:
    """
    Generate a disease, optionally from a specific department.
    
    Returns:
        (disease_name, department)
    """
    if department and department in DISEASES_BY_DEPARTMENT:
        disease = random.choice(DISEASES_BY_DEPARTMENT[department])
        return disease, department
    else:
        # Random department
        department = random.choice(list(DISEASES_BY_DEPARTMENT.keys()))
        disease = random.choice(DISEASES_BY_DEPARTMENT[department])
        return disease, department



# Patient generator agent
patient_generator = Agent(
    CHOSEN_LLM,
    output_type=PatientData,
    system_prompt="""
    You generate realistic patient data for medical simulations.
    
    IMPORTANT:
    - Make symptoms realistic but NOT overly obvious
    - Don't just list textbook symptoms - add variety
    - Include some red herrings or atypical presentations
    - Make medical history relevant but not a giveaway
    - Use realistic names, ages, and demographics
    
    For gender field: Use "Male", "Female", or "Other"
    
    EXAMPLES OF GOOD GENERATION:
    
    Disease: Myocardial Infarction
    Good: 58yo Male, "chest discomfort", "indigestion", "fatigue" (subtle presentation)
    Bad: 58yo Male, "crushing chest pain", "radiating to left arm" (too textbook)
    
    Disease: Appendicitis
    Good: 22yo Female, "stomach pain", "nausea", "loss of appetite" (vague at first)
    Bad: 22yo Female, "right lower quadrant pain" (too specific)
    
    Disease: Migraine
    Good: 35yo Female, "headache", "sensitive to light", history of headaches
    Bad: 35yo Female, "unilateral throbbing headache with aura" (too diagnostic)
    
    Make it challenging but realistic!
    """
)


def generate_patient_data(disease: str, department: str = "General") -> PatientData:
    """
    Generate realistic patient data for a given disease.
    
    Args:
        disease: The disease name
        department: Medical department (for context)
    
    Returns:
        PatientData with all fields populated
    """
    result = patient_generator.run_sync(
        f"""
        Generate realistic patient data for someone with {disease}.
        Department: {department}
        
        Make the symptoms realistic but not too obvious. Include:
        - Realistic name and age
        - Gender (Male/Female/Other)
        - Symptoms that are suggestive but not diagnostic
        - Relevant medical history if applicable
        - Current medications if appropriate
        
        Don't make it too easy - add some clinical challenge!
        """
    )
    
    patient = result.output
    
    # Ensure gender is set (fallback if LLM doesn't provide)
    if not hasattr(patient, 'gender') or not patient.gender:
        patient.gender = random.choice(["Male", "Female"])
    
    return patient




# Overarching functions for easy use
def generate_patient_for_department(department: str) -> tuple[PatientData, str]:
    """
    Generate a random patient for a specific department.
    
    Returns:
        (patient_data, disease)
    """
    disease, dept = generate_disease(department)
    patient = generate_patient_data(disease, dept)
    return patient, disease


def generate_random_patient() -> tuple[PatientData, str, str]:
    """
    Generate a completely random patient.
    
    Returns:
        (patient_data, disease, department)
    """
    disease, department = generate_disease()
    patient = generate_patient_data(disease, department)
    return patient, disease, department


if __name__ == "__main__":
    print("=== Testing Department-Based Disease Generation ===\n")
    
    # Test 1: Specific department
    print("TEST 1: Cardiology Patient")
    print("-" * 60)
    disease, dept = generate_disease("Cardiology")
    print(f"Disease: {disease}")
    print(f"Department: {dept}")
    
    patient = generate_patient_data(disease, dept)
    print(f"Patient: {patient.name}, {patient.age}y, {patient.gender}")
    print(f"Symptoms: {', '.join(patient.symptoms)}")
    print(f"History: {patient.medical_history}")
    print()
    
    # Test 2: Random patient
    print("TEST 2: Random Patient")
    print("-" * 60)
    patient2, disease2, dept2 = generate_random_patient()
    print(f"Department: {dept2}")
    print(f"Disease: {disease2}")
    print(f"Patient: {patient2.name}, {patient2.age}y, {patient2.gender}")
    print(f"Symptoms: {', '.join(patient2.symptoms)}")
    print()
    
    # Test 3: Show all departments
    print("TEST 3: Diseases by Department")
    print("-" * 60)
    for dept, diseases in DISEASES_BY_DEPARTMENT.items():
        print(f"{dept:20s}: {len(diseases)} diseases")
        print(f"  {', '.join(diseases[:3])}...")
    print()
    
    # Test 4: Generate one patient from each department
    print("TEST 4: One Patient from Each Department")
    print("-" * 60)
    for dept in ["Cardiology", "Neurology", "Respiratory"]:
        patient, disease = generate_patient_for_department(dept)
        print(f"{dept}: {disease} - {patient.age}y {patient.gender}, symptoms: {patient.symptoms[0]}")