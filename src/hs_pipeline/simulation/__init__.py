"""
Simulation Package

Main application module for the hospital simulation system. 
Orchestrates multi-agent diagnostic workflows through:
- AI agents (Nurse → Doctor → Lab → Reflection)
- Database storage for cases and learning experiences
- Simulation runner for end-to-end patient diagnosis

Usage:
    from hs_pipeline.simulation import SimulationRunner
    from hs_pipeline.simulation.agents import generate_random_patient
    from hs_pipeline.simulation.database import get_db
"""

from hs_pipeline.simulation.runner import SimulationRunner
from hs_pipeline.simulation.database import get_db, AgentHospitalDB

__all__ = [
    "SimulationRunner",
    "get_db",
    "AgentHospitalDB",
]
