"""
Simulation Agents Package

AI agents for medical diagnosis simulation:
- Nurse Agent: Triage and initial assessment
- Doctor Agent: Medical reasoning and diagnosis
- Lab Agent: Test execution and results
- Reflection Agent: Learning from errors
"""

from hs_pipeline.simulation.agents.patient_generator import (
    PatientData,
    generate_random_patient,
    generate_patient_for_department,
    generate_patient_data,
    generate_disease,
    get_department_for_disease,
)
from hs_pipeline.simulation.agents.nurse_agent import nurse_agent, NurseAssessment
from hs_pipeline.simulation.agents.doctor_agent import doctor_agent, DoctorDeps, DoctorDiagnosis
from hs_pipeline.simulation.agents.lab_agent import lab_agent, LabAgentDeps, LabResults
from hs_pipeline.simulation.agents.reflection_agent import (
    reflection_agent,
    create_learning_principle,
    ExperiencePrinciple,
)
from hs_pipeline.simulation.agents.disease_validation import validate_diagnosis
from hs_pipeline.simulation.agents.agent_utils import (
    run_agent_with_retry,
    extract_tool_calls,
    extract_lab_data,
    format_examination_data,
)

__all__ = [
    # Patient generation
    "PatientData",
    "generate_random_patient",
    "generate_patient_for_department",
    "generate_patient_data",
    "generate_disease",
    "get_department_for_disease",
    # Agents
    "nurse_agent",
    "NurseAssessment",
    "doctor_agent",
    "DoctorDeps",
    "DoctorDiagnosis",
    "lab_agent",
    "LabAgentDeps",
    "LabResults",
    "reflection_agent",
    "create_learning_principle",
    "ExperiencePrinciple",
    # Utilities
    "validate_diagnosis",
    "run_agent_with_retry",
    "extract_tool_calls",
    "extract_lab_data",
    "format_examination_data",
]
