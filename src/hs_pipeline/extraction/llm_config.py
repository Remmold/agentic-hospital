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
            description="Type of medical document (e.g., Doctor Visit Note, Lab Result, Injury Report, Athletic Trainer Note)"
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
                    description="Primary reason for visit or main complaint stated by patient. Example: 'Patient reports knee pain for 3 days'"
                ),
                "symptoms": Schema(
                    type="array",
                    items=Schema(type="string"),
                    description="List of symptoms reported by patient or observed by provider. Examples: 'headache', 'fever', 'nausea'. NOT treatments or exercises."
                ),
                "examination": Schema(
                    type="string",
                    nullable=True,
                    description="Physical examination findings and clinical observations made by the provider. What they FOUND during examination (e.g., 'swelling noted', 'range of motion limited', 'heart rate 72 bpm'). DO NOT include treatments, exercises, or interventions performed."
                ),
                "diagnosis": Schema(
                    type="string",
                    nullable=True,
                    description="Medical diagnosis or clinical assessment made by provider"
                ),
                "treatment_plan": Schema(
                    type="string",
                    nullable=True,
                    description="Treatments performed, interventions administered, exercises prescribed, or therapy conducted. Examples: 'ice pack applied', 'stretching exercises x10', 'prescribed ibuprofen'. This is what was DONE, not what was FOUND."
                ),
                "medications": Schema(
                    type="array",
                    items=Schema(type="string"),
                    description="List of medications prescribed or administered. Examples: 'Ibuprofen 200mg', 'Tylenol'. DO NOT include non-medication treatments like 'ICE' or 'physical therapy'."
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

# Configure to return JSON - single document
config = GenerateContentConfig(
    response_mime_type="application/json",
    response_schema=response_schema
)

# Batch configuration - array of documents
batch_response_schema = Schema(
    type="array",
    items=response_schema
)

batch_config = GenerateContentConfig(
    response_mime_type="application/json",
    response_schema=batch_response_schema
)