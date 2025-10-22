"""Usage example for batched document aggregator"""
from pathlib import Path
from hs_pipeline.extraction.aggregator import DocumentAggregator
from hs_pipeline.utils.constants import DATA_PATH

# Process 150 PDFs from patient folder
patient_folder = Path(DATA_PATH / "2006")

# Create aggregator with 80K char batches
aggregator = DocumentAggregator(batch_char_limit=80000)

# Process folder - automatically batches and rate limits
timeline = aggregator.process_patient_folder(patient_folder)

# Save timeline
output_path = Path(DATA_PATH /"output"/"patient_timeline.json")
aggregator.save_timeline(timeline, output_path)

# Access timeline for agents
print(f"\nTimeline has {len(timeline.timeline)} dated entries")
print(f"First entry: {timeline.timeline[0].date} - {timeline.timeline[0].document_type}")