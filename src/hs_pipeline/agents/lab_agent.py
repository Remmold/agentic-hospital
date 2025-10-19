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
@dataclass
class LabResults:
    tests_ran:str
    test_outcome:str

lab_agent = Agent(
    CHOSEN_LLM,
    deps_type=LabAgentDeps,
    output_type=LabResults,
    system_prompt="You work the lab to run tests for doctors"
)