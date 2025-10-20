from google.genai.types import GenerateContentConfig, Schema

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