"""Step 1: PDF/IMAGE Extraction"""

from hs_pipeline.utils.constants import DATA_PATH
from pathlib import Path
from PIL import Image,ImageEnhance
import pytesseract
import pymupdf

# Temporary Tesseract Path (Actual exe download required to run image->text)
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


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

def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """
    Preprocess image to improve OCR accuracy.
    
    Args:
        image: PIL Image object
        
    Returns:
        Preprocessed PIL Image object
    """
    # Convert to grayscale
    image = image.convert('L')
    
    # Increase contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)
    
    # Increase sharpness
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(2.0)

    return image


def extract_text_from_image(image_path: Path, preprocess: bool = True) -> str:
    """
    Extract text from a single image file using OCR.
    
    Args:
        image_path: Path to image file (png, jpg, jpeg, tiff, bmp, gif)
        preprocess: Whether to preprocess image for better OCR (default True)
        
    Returns:
        Extracted text as string, or empty string if extraction fails
    """
    try:
        # Validation
        if not image_path.exists():
            print(f"File not found: {image_path}")
            return ""
        
        valid_extensions = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif']
        if image_path.suffix.lower() not in valid_extensions:
            print(f"File is not a supported image: {image_path}")
            return ""
        
        # Open the image file
        image = Image.open(image_path)
        
        # Preprocess if requested
        if preprocess:
            image = preprocess_image_for_ocr(image)
        
        # Apply OCR to extract text
        # Using PSM 6 (assume uniform block of text)
        custom_config = r'--psm 3 --psm 6'
        text = pytesseract.image_to_string(image, config=custom_config)
        
        # Check if we got anything
        if not text.strip():
            print(f"No text extracted from: {image_path.name}")
        
        return text
    
    except Exception as err:
        print(f"Error processing {image_path.name}: {err}")
        return ""


if __name__ == "__main__":
   text = extract_text_from_image(DATA_PATH / "image.png")
   print(text)