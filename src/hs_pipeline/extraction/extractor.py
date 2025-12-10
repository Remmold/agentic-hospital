""" Step 1: File->text Extraction
    Processes a directory of mixed filetypes (PDF, DOCX, TXT, XLSX, Images)
    and extracts text from each file.
"""
from pathlib import Path
from PIL import Image, ImageEnhance
from docx import Document
from odf import text, teletype
from odf.opendocument import load as odf_load
from striprtf.striprtf import rtf_to_text
import pytesseract
import pymupdf
import io
import pandas as pd

# Temporary Tesseract Path (Actual exe download required to run image->text)
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    image = image.convert('L')
    width, height = image.size
    # Upscales image if its too small to read
    if width < 1000:
        scale = 1500 / width
        newsize = (int(width * scale), int(height * scale))
        image = image.resize(newsize, Image.Resampling.LANCZOS)

    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.5)
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.3)
    return image


def extract_text_from_image(image: Image.Image, preprocess: bool = True) -> str:
    if preprocess:
        image = preprocess_image_for_ocr(image)
    # Config explains what kind of format the text in the image has ie 'block of text' 'single column' etc
    custom_config = r'--oem 3 --psm 6'
    text = pytesseract.image_to_string(image, config=custom_config)
    return text


def extract_text_from_txt(txt_path: Path) -> str:
    try:
        return txt_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"Error processing {txt_path.name}: {e}")
        return ""


def extract_text_from_docx(docx_path: Path) -> str:
    try:
        doc = Document(docx_path)
        full_text = [para.text for para in doc.paragraphs]
        return "\n".join(full_text)
    except Exception as e:
        print(f"Error processing {docx_path.name}: {e}")
        return ""
    

def extract_text_from_odt(odt_path: Path) -> str:
    """Extracts text from an ODT file."""
    try:
        textdoc = odf_load(odt_path)
        all_paras = textdoc.getElementsByType(text.P)
        full_text = [teletype.extractText(para) for para in all_paras]
        return "\n".join(full_text)
    except Exception as e:
        print(f"Error processing {odt_path.name}: {e}")
        return ""


def extract_text_from_rtf(rtf_path: Path) -> str:
    """Extracts text from an RTF file using the striprtf library."""
    try:
        # Read the file and pass the content directly to the function
        rtf_content = rtf_path.read_text(encoding='latin-1')
        return rtf_to_text(rtf_content)
    except Exception as e:
        print(f"Error processing {rtf_path.name}: {e}")
        return ""


def extract_text_from_spreadsheet(file_path: Path) -> str:
    """Extracts text from various spreadsheet files (xls, xlsx, xlsm, ods)."""
    try:
        # For CSV files
        if file_path.suffix.lower() == '.csv':
            df = pd.read_csv(file_path, header=None)
            return df.to_string(index=False, header=False)

        # For Excel and ODS files, read all sheets
        xls = pd.ExcelFile(file_path)
        full_text = []
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
            full_text.append(df.to_string(index=False, header=False))
        return "\n\n--- New Sheet ---\n\n".join(full_text)
    except Exception as e:
        print(f"Error processing {file_path.name}: {e}")
        return ""


def extract_text_from_image_file(image_path: Path, preprocess: bool = True) -> str:
    try:
        image = Image.open(image_path)
        text = extract_text_from_image(image=image, preprocess=preprocess)
        if not text.strip():
            print(f"No text extracted from: {image_path.name}")
        return text
    except Exception as err:
        print(f"Error processing {image_path.name}: {err}")
        return ""

def extract_ordered_content_from_pdf(pdf_path: Path) -> str:
    doc = pymupdf.open(pdf_path)
    full_text = ""
    for page_num, page in enumerate(doc):
        # print(f"Processing page {page_num + 1} of {pdf_path.name}...") # Uncomment for verbose output
        blocks = page.get_text("dict")["blocks"]
        blocks.sort(key=lambda b: (b["bbox"][1], b["bbox"][0]))
        for block in blocks:
            if block["type"] == 0:  # Text block
                for line in block["lines"]:
                    for span in line["spans"]:
                        full_text += span["text"]
                    full_text += "\n"
            elif block["type"] == 1:  # Image block
                try:
                    pix = page.get_pixmap(clip=block["bbox"])
                    image_data = pix.tobytes("png")
                    image = Image.open(io.BytesIO(image_data))
                    image_text = extract_text_from_image(image)
                    if image_text.strip():
                        full_text += f"\n--- OCR Image Content ---\n{image_text}\n--- End Image Content ---\n"
                except Exception as e:
                    print(f"Warning: Could not process an image on page {page_num + 1} of {pdf_path.name}. Error: {e}")
    doc.close()
    return full_text


def extract_text_from_file(file_path: Path) -> str:
    """
    Extracts text from a file by dispatching to the correct function
    based on the file extension.
    """
    extension = file_path.suffix.lower()
    
    print(f"-> Processing '{file_path.name}'...")
    if extension in ['.xlsx', '.xls', '.xlsm', '.ods', '.csv']:
        return extract_text_from_spreadsheet(file_path)
    elif extension == ".pdf":
        return extract_ordered_content_from_pdf(file_path)
    elif extension in ['.png', '.jpg', '.jpeg', '.tiff','.tif', '.bmp', '.gif']:
        return extract_text_from_image_file(file_path, preprocess=True)
    elif extension == ".docx":
        return extract_text_from_docx(file_path)
    elif extension == ".txt":
        return extract_text_from_txt(file_path)
    elif extension == ".odt":
        return extract_text_from_odt(file_path)
    elif extension == ".rtf":
        return extract_text_from_rtf(file_path)
    else:
        print(f"   Unsupported file type: {file_path.name}")
        return ""


def process_directory(directory_path: Path) -> list[dict[str, str]]:
    """
    Extracts text from all supported files in a given directory.
    
    Args:
        directory_path: The path to the directory to process.
        
    Returns:
        A list of dictionaries, where each dictionary contains the
        'filename' and extracted 'text'.
    """
    if not directory_path.is_dir():
        print(f"Error: Provided path '{directory_path}' is not a directory.")
        return []

    extracted_data = []
    for file_path in directory_path.iterdir():
        if file_path.is_file():
            text = extract_text_from_file(file_path)
            if text:
                extracted_data.append({
                    "filename": file_path.name,
                    "text": text
                })
    return extracted_data

