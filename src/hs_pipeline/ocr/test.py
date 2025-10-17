import hs_pipeline.ocr.extractor as extr
import hs_pipeline.ocr.parser as pars
from hs_pipeline.utils.constants import DATA_PATH


# Just change to whatever directory should be tested using extraction
test_directory = DATA_PATH / "images" # Options: "images", "spreadsheets", "docs", "pdfs"

print(f"--- Starting extraction from directory: {test_directory} ---")
results = extr.process_directory(test_directory)
print(f"\n--- Extraction complete. Found text in {len(results)} files. ---\n")

# Print a summary of the results
for result in results:
    print("="*50)
    print(f"FILE: {result['filename']}")
    print("="*50)
    # Print the first 200 characters of the extracted text as a preview
    print(result['text'][:200].strip())
    print("\n")
