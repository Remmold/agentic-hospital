"""(alternative) Step 2: Raw text parsing utilizing LLM"""
import google.genai as genai
from google.genai.types import GenerateContentConfig, Schema
import json

def parse_document_with_llm(text: str, filename: str) -> dict:
    """
    Use LLM to extract structured information from medical document.
    Works with any language, any format.
    """
    prompt = f"""
    Extract medical information from this document:

    {text}

    Identify:
    - Document date (when was this created?)
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

    response_schema = Schema(
        type="object",
        properties={
            "document_date": Schema(
                type="string",
                description="Document date in YYYY-MM-DD format, or 'Unknown'"
            ),
            "document_type": Schema(
                type="string",
                description="Type of medical document (e.g., Doctor Visit Note, Lab Result, Injury Report)"
            ),
            "provider_name": Schema(
                type="string",
                nullable=True,
                description="Name of healthcare provider, doctor, or therapist who created this document"
            ),
            "clinical_content": Schema(
                type="object",
                properties={
                    "chief_complaint": Schema(
                        type="string",
                        nullable=True,
                        description="Primary reason for visit or main complaint"
                    ),
                    "symptoms": Schema(
                        type="array",
                        items=Schema(type="string"),
                        description="List of symptoms reported or observed"
                    ),
                    "examination": Schema(
                        type="string",
                        nullable=True,
                        description="Physical examination findings and observations"
                    ),
                    "diagnosis": Schema(
                        type="string",
                        nullable=True,
                        description="Medical diagnosis or assessment"
                    ),
                    "treatment_plan": Schema(
                        type="string",
                        nullable=True,
                        description="Recommended treatment, therapy, or care plan"
                    ),
                    "medications": Schema(
                        type="array",
                        items=Schema(type="string"),
                        description="List of medications prescribed or administered"
                    ),
                    "follow_up": Schema(
                        type="string",
                        nullable=True,
                        description="Follow-up instructions or next appointment details"
                    )
                },
                required=["symptoms", "medications"]
            )
        },
        required=["document_date", "document_type", "clinical_content"]
    )
    
    # Configure to return JSON
    config = GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=response_schema
    )
    
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
    import hs_pipeline.ocr.extractor as extr

    filename = extr.DATA_PATH / "test.pdf"
    text = extr.extract_text_from_pdf(filename)
    json_text = parse_document_with_llm(text, filename)

    print(type(json_text))
    print(json.dumps(json_text, indent=2))