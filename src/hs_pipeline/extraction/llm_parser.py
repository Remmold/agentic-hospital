"""Step 2: Raw text parsing utilizing LLM"""
import google.genai as genai
import json
from google.genai.types import GenerateContentConfig, Schema
from hs_pipeline.utils.constants import CHOSEN_LLM
from dotenv import load_dotenv

load_dotenv()

from hs_pipeline.extraction.llm_config import config as full_doc_config, batch_config


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


def parse_documents_batch(documents: list[dict]) -> list[dict]:
    """
    Parse multiple documents in one LLM call.
    
    Args:
        documents: List of dicts with 'filename' and 'text' keys
        
    Returns:
        List of parsed document dicts in same order
    """
    prompt_parts = ["""Extract medical information from these documents. Follow these field definitions EXACTLY:

CRITICAL FIELD DISTINCTIONS:

"chief_complaint": Primary reason for visit - must be COMPLETE thought
CORRECT: "nausea and not feeling well", "LBP", "pain in low back", "feeling better today"
WRONG: "any stiffness in his low back" (incomplete fragment - missing verb context)
  RULE: Only extract if it forms a complete, understandable statement. Skip grammatically incomplete fragments. Short entries like acronyms are OK if they're clear complaints.

"examination": Physical findings OBSERVED during exam
CORRECT: "swelling noted in left ankle", "range of motion 45 degrees", "+ Thomas test", "heart rate 72 bpm"
WRONG: Do NOT include treatments, exercises, or clinical interpretations

"treatment_plan": Interventions/treatments PERFORMED
CORRECT: "ice applied x20min", "hip flexor stretching x10", "bike 15min", "passive stretches 3x30sec"
WRONG: Do NOT include examination findings

"medications": ONLY pharmaceutical drugs
CORRECT: "Ibuprofen 200mg", "Tylenol", "Albuterol"
WRONG: "ICE", "physical therapy", "MHP" (these go in treatment_plan)

"diagnosis": The actual medical DIAGNOSIS only
CORRECT: "Non-specific low back pain", "Abnormal ECG", "Gastroenteritis"
WRONG: Do NOT include test results, examination findings, or clinical interpretations - only the diagnosis itself

"symptoms": What patient EXPERIENCES
CORRECT: "pain", "nausea", "stiffness", "fever"
WRONG: Do NOT include treatments or test results

Documents to parse:
"""]
    
    for doc in documents:
        prompt_parts.append(f"\n---DOCUMENT: {doc['filename']}---\n")
        prompt_parts.append(doc['text'])
    
    prompt_parts.append("\n\nReturn an array with one entry per document in the same order. Follow the field definitions exactly.")
    prompt = "".join(prompt_parts)
    
    client = genai.Client()
    response = client.models.generate_content(
        model=CHOSEN_LLM,
        contents=prompt,
        config=batch_config
    )
    
    return json.loads(response.text)


def parse_document_with_llm(text: str) -> dict:
    """
    Use LLM to extract structured information from medical document.
    Works with any language, any format.
    """
    prompt = f"""
    Extract medical information from this document. Follow these field definitions EXACTLY:

    CRITICAL FIELD DISTINCTIONS:

    "chief_complaint": Primary reason for visit - must be COMPLETE thought
    CORRECT: "nausea and not feeling well", "LBP", "pain in low back", "feeling better today"
    WRONG: "any stiffness in his low back" (incomplete fragment - missing verb context)
      RULE: Only extract if it forms a complete, understandable statement. Skip grammatically incomplete fragments. Short entries like acronyms are OK if they're clear complaint
    "examination": Physical findings OBSERVED during exam
    CORRECT: "swelling noted", "ROM limited to 45 degrees", "+ Thomas test"
    WRONG: Do NOT include treatments, exercises, or interpretations

    "treatment_plan": Interventions/treatments PERFORMED
    CORRECT: "ice applied x20min", "stretches x10", "bike 15min"
    WRONG: Do NOT include examination findings

    "medications": ONLY pharmaceutical drugs
    CORRECT: "Ibuprofen", "Tylenol"
    WRONG: "ICE", "PT" (these go in treatment_plan)

    "diagnosis": The actual medical DIAGNOSIS only
    CORRECT: "Low back pain", "Abnormal ECG"
    WRONG: Do NOT include test results or interpretations - only diagnosis

    "symptoms": What patient EXPERIENCES
    CORRECT: "pain", "nausea", "stiffness"
    WRONG: Do NOT include treatments

    Document text:
    {text}

    Extract all fields following the definitions above exactly.
    """
    
    client = genai.Client()
    response = client.models.generate_content(
        model=CHOSEN_LLM,
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
        model=CHOSEN_LLM,
        contents=prompt,
        config=config
    )
    
    return json.loads(response.text)


# For testing purposes
if __name__ == "__main__":
    from hs_pipeline.extraction import extractor as extr

    filename = extr.DATA_PATH / "test.pdf"
    text = extr.extract_ordered_content_from_pdf(filename)
    json_text = parse_document_with_llm(text)

    print(type(json_text))
    print(json.dumps(json_text, indent=2))