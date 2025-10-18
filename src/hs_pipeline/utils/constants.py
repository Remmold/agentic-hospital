import os
from pathlib import Path
"""Paths"""
PROJECT_ROOT = Path(__file__).parents[1]
DATA_PATH = PROJECT_ROOT / "ocr" / "data"
AGENT_JSON_STRUCTURE_PATH = PROJECT_ROOT / "agents" / "json_structures"

"""LLM constants"""
CHOSEN_LLM = 'gemini-2.5-flash'