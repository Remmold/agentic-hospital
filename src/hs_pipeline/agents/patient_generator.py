from hs_pipeline.agents.nurse_agent import PatientData
from pydantic_ai import Agent
from dotenv import load_dotenv
from hs_pipeline.utils.constants import CHOSEN_LLM
import random
load_dotenv()

# Create the generation agent
patient_generator = Agent(
    CHOSEN_LLM,
    output_type=PatientData,  # Returns PatientData
    system_prompt="You generate realistic patient data for medical simulations - without making it overly obvious what the disease is."
)
def generate_disease():
    diseases = ["appendicitis", "type_2_diabetes", "pneumonia", "migraine", "gastroenteritis"]
    return random.choice(diseases)

def generate_patient_data(disease: str) -> PatientData:
    result = patient_generator.run_sync(
        f"Generate realistic patient data for someone with {disease}."
    )
    return result.output

if __name__ == "__main__":
    # Test the generators
    disease = generate_disease()
    print(f"Generated disease: {disease}")
    
    patient = generate_patient_data(disease)
    print(f"Generated patient: {patient}")
    