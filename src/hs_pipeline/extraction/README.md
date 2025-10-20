# Document Text Extraction Module

This Python module is a robust tool designed to extract plain text from a wide variety of file formats within a specified directory. It serves as a unified solution for converting documents, spreadsheets, images, and PDFs into raw text for further processing, such as data analysis or indexing.

The script is built to be resilient, handling errors on a per-file basis so that one corrupted or unsupported file does not stop the entire extraction process.

---

## Key Features

* **Multi-Format Support**: Processes a wide range of common file types.
* **Directory Processing**: Automatically scans a given folder and processes all supported files.
* **OCR Integration**: Uses Tesseract OCR to extract text from images and from scanned documents embedded within PDFs.
* **Smart PDF Parsing**: Intelligently handles both text-based and image-based PDFs, preserving the logical reading order of content.
* **Robust Error Handling**: Skips individual files that cause errors and continues processing the rest of the directory.

---

## Supported File Types

The module can extract text from the following file formats:

* **Documents**
    * `.docx` (Microsoft Word)
    * `.odt` (OpenDocument Text)
    * `.rtf` (Rich Text Format)
* **Spreadsheets**
    * `.xlsx` (Microsoft Excel)
    * `.xls` (Older Microsoft Excel)
    * `.xlsm` (Excel with Macros)
    * `.ods` (OpenDocument Spreadsheet)
    * `.csv` (Comma-Separated Values)
* **Images (with OCR)**
    * `.png`
    * `.jpg` / `.jpeg`
    * `.tif` / `.tiff`
    * `.bmp`
    * `.gif`
* **PDFs**
    * `.pdf` (Handles both native text and scanned images)
* **Plain Text**
    * `.txt`

---

## Requirements


### 1. Tesseract OCR
To extract text from images, you must have **Google's Tesseract OCR engine** installed on your system.

After installation, the `TESSERACT_PATH` constant in the script must be updated to point to your Tesseract executable file.

```python
# Update this path to your local Tesseract installation
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
```

---

## How to Use

The module is designed to be used programmatically. The main entry point is the `process_directory` function, which takes a directory path and returns a list of dictionaries containing the extracted text.

### Example Usage:

```python
from pathlib import Path

# the hs_pipeline module can be used to access this function
from hs_pipeline.ocr.extractor import process_directory

# 1. Define the path to the directory containing your files
my_documents_path = Path("/path/to/your/documents")

# 2. Call the processing function
extracted_results = process_directory(my_documents_path)

# 3. Loop through the results to see the output
print(f"Successfully extracted text from {len(extracted_results)} files.")
for item in extracted_results:
    print("-" * 40)
    print(f"File: {item['filename']}")
    # Print the first 300 characters as a preview
    print(f"Extracted Text Preview: {item['text'][:300].strip()}...")
    print("-" * 40)
```