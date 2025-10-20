from pathlib import Path
import os
from dotenv import load_dotenv
from pydantic_ai.models.openai import OpenAIChatModel

load_dotenv()

"""Paths"""
PROJECT_ROOT = Path(__file__).parents[1]
DATA_PATH = PROJECT_ROOT / "ocr" / "data"
AGENT_JSON_STRUCTURE_PATH = PROJECT_ROOT / "agents" / "json_structures"

"""LLM constants"""
GEMINI_LLM = 'gemini-2.5-flash' #Currently functions well for agent_loop but 10 calls per minute limit
LAMA_VERSATILE_LLM = 'groq:llama-3.3-70b-versatile' #currently non functional for agent_loop
LAMA_INSTANT_LLM = 'groq:llama-3.1-8b-instant' #Terrible for agent_loop

CHATGPT_LLM = OpenAIChatModel(
    model_name=os.getenv('AZURE_OPENAI_DEPLOYMENT'),  # 'gpt-4o-mini'
    provider='azure'
)

# LLM used throughout the project
CHOSEN_LLM = CHATGPT_LLM
