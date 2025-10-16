"""Step 1: PDF/IMAGE Extraction"""

from hs_pipeline.utils.constants import DATA_PATH
from pathlib import Path
from PIL import Image,ImageEnhance
import pytesseract
import pymupdf
import io


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

def     preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """
    Preprocess image to improve OCR accuracy.
    
    Args:
        image: PIL Image object
        
    Returns:
        Preprocessed PIL Image object
    """
    # Convert to grayscale
    image = image.convert('L')
    
    # Upscale image
    width, height = image.size
    if width < 1000:
        scale =1500/width
        newsize = (int(width*scale),int(height*scale))
        image = image.resize(newsize, Image.Resampling.LANCZOS)

    # Increase contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.5)
    
    # Increase sharpness
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.3)

    return image


def extract_text_from_image_path(image_path: Path, preprocess: bool = False) -> str:
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
        
        text = extract_text_from_image(image=image,preprocess=preprocess)
        
        # Check if we got anything
        if not text.strip():
            print(f"No text extracted from: {image_path.name}")
        
        return text
    
    except Exception as err:
        print(f"Error processing {image_path.name}: {err}")
        return ""

def extract_text_from_image(image: Image.Image, preprocess: bool = True) -> str:
    """
    Performs OCR on a PIL Image object.
    
    Args:
        image: The PIL Image object to process.
        preprocess: Whether to preprocess the image.
        
    Returns:
        The extracted text as a string.
    """
    if preprocess:
        image = preprocess_image_for_ocr(image)
    
    custom_config = r'--oem 3 --psm 6'
    text = pytesseract.image_to_string(image, config=custom_config)
    return text

def extract_ordered_content_from_pdf(pdf_path: Path) -> str:
    """
    Extracts text and OCR'd image text from a PDF in content order.
    """
    doc = pymupdf.open(pdf_path)
    full_text = ""

    for page_num, page in enumerate(doc):
        print(f"Processing page {page_num + 1}...")
        blocks = page.get_text("dict")["blocks"]
        blocks.sort(key = lambda b:(b["bbox"][1],b["bbox"][0]))
        for block in blocks:
            # If its a text block
            if block["type"] == 0:
                blocktext = ""
                for line in block["lines"]:
                    linetext = ""
                    for span in line["spans"]:
                        linetext += span["text"] 
                    blocktext += linetext + "\n"
                full_text += blocktext + "\n"
            elif block["type"] == 1:  # This is an image block
                try:
                    bbox = block["bbox"]
                    width = bbox[2] - bbox[0]
                    height = bbox[3] - bbox[1]
                    #if width < 200 and height < 200:
                        #print("Skipping small image")
                        #continue
                    pix = page.get_pixmap(clip = bbox)
                    image_data = pix.tobytes("png")
                    # Open the image from the in-memory bytes
                    image = Image.open(io.BytesIO(image_data))
                    
                    # Use your refactored function to get the text from the PIL image
                    image_text = extract_text_from_image(image)
                    
                    if image_text.strip():
                        full_text += f"\n Image content: {image_text} \n"

                except Exception as e:
                    print(f"Warning: Could not process an image on page {page_num + 1}. Error: {e}")

    doc.close()
    return full_text
if __name__ == "__main__":
    pdf_path = DATA_PATH / "scanned"
    text = extract_ordered_content_from_pdf(pdf_path)
    import hs_pipeline.ocr.llm_parser as parser
    import json
    print(text)
    json_text = parser.parse_document_with_llm(text, pdf_path)

    print(type(json_text))
    print(json.dumps(json_text, indent=2, ensure_ascii=False))