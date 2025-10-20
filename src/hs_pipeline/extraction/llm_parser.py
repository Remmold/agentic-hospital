"""Step 2: Raw text parsing utilizing LLM"""
import google.genai as genai
import json
from google.genai.types import GenerateContentConfig, Schema
from dotenv import load_dotenv

load_dotenv()

from hs_pipeline.extraction.llm_config import config as full_doc_config


def get_patient_schema() -> Schema:
    """Schema for extracting patient data for simulation.
    This matches the PatientData class."""
    return Schema(
        type="object",
        properties={
            "name": Schema(type="string"),
            "age": Schema(type="integer"),
            "symptoms": Schema(type="array", items=Schema(type="string"))
        },
        required=["name", "age", "symptoms"]
    )


def parse_document_with_llm(text: str) -> dict:
    """
    Use LLM to extract structured information from medical document.
    Works with any language, any format.
    """
    prompt = f"""
    Extract medical information from this document:

    {text}

    Identify document date, type, provider, clinical content, etc.
    """
    
    client = genai.Client()
    response = client.models.generate_content(
        model="gemini-2.0-flash-exp",
        contents=prompt,
        config=full_doc_config
    )

    return json.loads(response.text)


def extract_patient_for_simulation(text: str) -> dict:
    """
    Extract just patient data for simulation.
    Returns: {name, age, symptoms}
    """
    prompt = f"""
    Extract patient information for simulation:

    {text}

    Extract:
    - Patient name (or "Anonymous" if not found)
    - Age (estimate if needed, default 45)
    - All symptoms mentioned

    Focus on current symptoms only.
    """
    
    config = GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=get_patient_schema()
    )
    
    client = genai.Client()
    response = client.models.generate_content(
        model="gemini-2.0-flash-exp",
        contents=prompt,
        config=config
    )
    
    return json.loads(response.text)


# For testing purposes
if __name__ == "__main__":
    import hs_pipeline.extraction.extractor as extr

    filename = extr.DATA_PATH / "test.pdf"
    text = extr.extract_ordered_content_from_pdf(filename)
    json_text = parse_document_with_llm(text, filename)

    print(type(json_text))
    print(json.dumps(json_text, indent=2))