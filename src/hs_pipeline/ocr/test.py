import hs_pipeline.ocr.extractor as extr
import hs_pipeline.ocr.parser as pars

text = extr.extract_text_from_pdf(extr.DATA_PATH / "test.pdf")

name = pars.extract_patient_name(text)
date = pars.extract_date(text)
print(f"namn: {name}")
print(f"date: {date}")
