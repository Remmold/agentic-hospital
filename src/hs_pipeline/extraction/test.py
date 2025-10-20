import json

import hs_pipeline.extraction.extractor as extr
import hs_pipeline.extraction.parser as pars
import hs_pipeline.extraction.llm_parser as llm_pars
from hs_pipeline.utils.constants import DATA_PATH


# For testing purposes only
if __name__ == "__main__":
    # Just change to whatever directory should be tested using extraction
    test_directory = DATA_PATH / "images" # Options: "images", "spreadsheets", "docs", "pdfs"

    # Select which test to run
    test_to_run = 2

    if test_to_run == 1:
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

    elif test_to_run == 2:
        test_directory = DATA_PATH / "images" # Options: "images", "spreadsheets", "docs", "pdfs"

        # Gets the text for the first file in the directory
        text = extr.process_directory(test_directory)
        json_text = llm_pars.parse_document_with_llm(text[0]["text"])

        print(json.dumps(json_text, indent=2))
