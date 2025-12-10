"""
Simulation Database Package

Provides storage layer for patient cases, learning experiences, and diagnostic outcomes.
Uses DuckDB (structured data) and ChromaDB (semantic search).
"""

from hs_pipeline.simulation.database.core import AgentHospitalDB, get_db

__all__ = ["AgentHospitalDB", "get_db"]
