"""(alternative) Step 2: Raw text parsing utilizing LLM"""
import google.genai as genai
import json
from dotenv import load_dotenv

from hs_pipeline.extraction.llm_config import config

load_dotenv()

def parse_document_with_llm(text: str) -> dict:
    """
    Use LLM to extract structured information from medical document.
    Works with any language, any format.
    """
    prompt = f"""
    Extract medical information from this document:

    {text}

    Identify:
    - Document date (when was this created?), keep in YYYY-MM-DD format
    - Document type (e.g., "Doctor Visit", "Lab Result", "Injury Report")
    - Provider name (doctor, therapist, or healthcare professional who created this document)
    - Clinical content:
    * Chief complaint or reason for visit
    * Symptoms reported by patient
    * Examination findings
    * Diagnosis
    * Treatment plan and recommendations
    * Medications prescribed
    * Follow-up instructions

    If information is not present, use null for strings or empty array for lists.
    """
    
    # Call LLM (Gemini)
    parsed_response = call_llm(prompt, config)
    
    return parsed_response

# Get the response from the Gemini model
def call_llm(prompt, config):
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