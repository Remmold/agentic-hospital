# Hospital Simulation Pipeline

**The Goal**:
A modular Python application for extracting, parsing, and structuring medical document data to simulate hospital workflows.

## Project Overview

This project processes medical PDF documents (athletic trainer notes, injury reports, doctor notes) and converts them into structured FHIR-compliant data. The extracted information is used to simulate and compare patient flow through traditional hospitals versus AI-enhanced digital hospitals.

### Key Features

- **PDF Text Extraction**: Extracts text from medical documents using PyMuPDF
- **Medical Data Parsing**: Identifies patient information, clinical sections (SOAP notes), and medical entities
- **FHIR Conversion**: Transforms parsed data into FHIR-compliant JSON format
- **Patient Grouping**: Organizes multiple documents by patient for longitudinal analysis
- **Hospital Simulation**: Compares workflow efficiency between traditional and AI-powered hospitals

## Project Structure
```
hospital-simulation-pipeline/
├── src/
│   └── hs_pipeline/
│       ├── ocr/              # PDF extraction and parsing
│       │   └── data/         # Input data (PDF documents)
│       ├── nlp/              # Medical entity extraction
│       ├── fhir/             # FHIR conversion
│       ├── simulation/       # Hospital workflow simulation
│       └── utils/            # Shared utilities & constants
├── pyproject.toml            # Project configuration
├── uv.lock                   # Dependency lock file
└── README.md                 # This file
```

## Installation

### Prerequisites

- Python 3.9 or higher
- uv (fast Python package installer)

### Setup

1. **Clone the repository**
    ```bash
    git clone 
    cd hospital-simulation-pipeline
    ```

2. **Install dependencies**
    ```bash
    uv sync
    ```

    This will create a virtual environment and install all dependencies from `uv.lock`.

### Required Dependencies
```
pymupdf>=1.23.0
fhir.resources>=7.0.0
spacy>=3.7.0
pandas>=2.0.0
```

## Development

This project is under active development. The codebase is designed with modularity and scalability in mind.

### Design Principles

- **Modular Architecture**: Each component has a single, well-defined responsibility
- **Separation of Concerns**: OCR, parsing, NLP, and FHIR conversion are independent modules
- **Extensibility**: Easy to add new document types, extraction patterns, or FHIR resources
- **Testability**: Functions are designed to be easily unit tested