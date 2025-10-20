from pathlib import Path
"""Paths"""
PROJECT_ROOT = Path(__file__).parents[1]
DATA_PATH = PROJECT_ROOT / "ocr" / "data"
AGENT_JSON_STRUCTURE_PATH = PROJECT_ROOT / "agents" / "json_structures"

"""LLM constants"""
GEMINI_LLM = 'gemini-2.5-flash' #Currently functions well for agent_loop but 10 calls per minute limit
LAMA_VERSATILE_LLM = 'groq:llama-3.3-70b-versatile' #currently non functional for agent_loop
LAMA_INSTANT_LLM = 'groq:llama-3.1-8b-instant' #Terrible for agent_loop

# LLM used throughout the project
CHOSEN_LLM = GEMINI_LLM
