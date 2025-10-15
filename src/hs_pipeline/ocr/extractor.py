"""Step 1: PDF/IMAGE Extraction"""

from hs_pipeline.utils.constants import DATA_PATH
from pathlib import Path
import pymupdf


# function to extract text from pdf
def extract_text_from_pdf(pdf_path: Path)-> str:
    """
    Transform 1 pdf into text.
    
    Args:
        pdf_path: Path to PDF file
        
    Returns:
        Extracted text as string, or empty string if extraction fails
    """

    try:
        if not pdf_path.exists():
            print(f"File not found: {pdf_path}")
            return ""
        
        if pdf_path.suffix.lower() != ".pdf":
            print(f"File is not a pdf: {pdf_path}")
            return ""
        
        doc = pymupdf.open(pdf_path)
        text = ""

        for page in doc:
            text += page.get_text()

        doc.close()
        if not text.strip():
            print(f"no text extracted from: {pdf_path.name}")

        return text
    
    except Exception as err:
        print(f"Error processing {pdf_path.name}: {err}")
        return ""


def extract_text_from_directory(directory:Path = DATA_PATH)-> list[dict[str,str]]:
    """
    Extract text from all PDFs in a folder.
    
    Args:
        directory: Path to folder containing PDFs
        
    Returns:
        List of dicts with keys: 'filename', 'text'
    """

    try:
        if not directory.exists():
            print(f"directory not found: {directory}")
            return []
        
        pdf_path_list = directory.glob("*.pdf")
        pdf_text_list = []

        for pdf_path in pdf_path_list:
            
            extracted_text = extract_text_from_pdf(pdf_path)

            pdf_text_dict = {}
            pdf_text_dict["filename"] = pdf_path.name
            pdf_text_dict["text"] = extracted_text
            pdf_text_list.append(pdf_text_dict)
            
        return pdf_text_list
    
    except Exception as err:
        print(f"error processing directory: {err}")

#TODO Function to convert image to text


