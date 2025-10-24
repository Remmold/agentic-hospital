"""Document aggregator with intelligent batching, deduplication, and filtering"""
from pathlib import Path
from typing import Optional
import json
import time
import hashlib

from hs_pipeline.extraction.timeline_model import TimelineEntry, PatientTimeline
from hs_pipeline.extraction.extractor import extract_text_from_file
from hs_pipeline.extraction.llm_parser import parse_documents_batch


class DocumentAggregator:
    """Process patient folder with batched LLM calls, deduplication, and quality filtering"""
    
    def __init__(self, batch_char_limit: int = 80000):
        self.batch_char_limit = batch_char_limit
        self.processed_count = 0
        self.failed_files = []
        self.filtered_empty = 0
        self.filtered_duplicates = 0
        self.seen_entries = set()  # Track content hashes for deduplication
    
    def process_patient_folder(self, folder_path: Path) -> PatientTimeline:
        """
        Process all documents in folder/subfolders.
        Uses intelligent batching, deduplication, and quality filtering.
        """
        folder_path = Path(folder_path)
        if not folder_path.is_dir():
            raise ValueError(f"{folder_path} is not a directory")
        
        print(f"\nProcessing patient folder: {folder_path.name}")
        print("=" * 60)
        
        # Step 1: Extract text from all files
        print("\n[1/3] Extracting text from all documents...")
        extracted_docs = self._extract_all_documents(folder_path)
        
        # Step 2: Batch documents by size
        print(f"\n[2/3] Batching {len(extracted_docs)} documents...")
        batches = self._create_batches(extracted_docs)
        print(f"Created {len(batches)} batches (limit: {self.batch_char_limit} chars/batch)")
        
        # Step 3: Parse batches with LLM
        print(f"\n[3/3] Parsing batches with LLM...")
        timeline = PatientTimeline(patient_folder=folder_path.name)
        
        for batch_idx, batch in enumerate(batches, 1):
            print(f"  Batch {batch_idx}/{len(batches)} ({len(batch)} documents)...", end=" ")
            
            try:
                parsed_results = parse_documents_batch(batch)
                
                # Create timeline entries with quality checks
                for doc, parsed in zip(batch, parsed_results):
                    entry = self._create_timeline_entry(doc['filename'], parsed)
                    
                    if entry and self._should_include_entry(entry):
                        timeline.add_entry(entry)
                        self.processed_count += 1
                
                print("✓")
                
                # Rate limiting: wait 6 seconds between batches (10 calls/minute)
                if batch_idx < len(batches):
                    time.sleep(6)
                    
            except Exception as e:
                print(f"✗ Error: {e}")
                for doc in batch:
                    self.failed_files.append((doc['filename'], str(e)))
        
        # Sort timeline chronologically
        timeline.sort_timeline()
        
        # Print summary
        self._print_summary(timeline)
        
        return timeline
    
    def _create_timeline_entry(self, filename: str, parsed: dict) -> Optional[TimelineEntry]:
        """Create timeline entry from parsed data"""
        try:
            return TimelineEntry(
                filename=filename,
                date=parsed.get("document_date", "Unknown"),
                document_type=parsed.get("document_type", "Unknown"),
                provider_name=parsed.get("provider_name"),
                clinical_content=parsed.get("clinical_content", {})
            )
        except Exception as e:
            print(f"   ⚠ Error creating entry for {filename}: {e}")
            return None
    
    def _should_include_entry(self, entry: TimelineEntry) -> bool:
        """
        Quality filter: decide if entry should be included in timeline.
        Returns False for empty entries or duplicates.
        """
        # Filter 1: Check if entry has any meaningful clinical content
        if self._is_empty_entry(entry):
            self.filtered_empty += 1
            return False
        
        # Filter 2: Check for duplicates based on content hash
        content_hash = self._get_entry_hash(entry)
        if content_hash in self.seen_entries:
            self.filtered_duplicates += 1
            return False
        
        self.seen_entries.add(content_hash)
        return True
    
    def _is_empty_entry(self, entry: TimelineEntry) -> bool:
        """Check if entry has any meaningful clinical content"""
        clinical = entry.clinical_content
        
        # Check if any field has content
        has_complaint = clinical.get("chief_complaint")
        has_symptoms = clinical.get("symptoms") and len(clinical.get("symptoms", [])) > 0
        has_exam = clinical.get("examination")
        has_diagnosis = clinical.get("diagnosis")
        has_treatment = clinical.get("treatment_plan")
        has_meds = clinical.get("medications") and len(clinical.get("medications", [])) > 0
        has_followup = clinical.get("follow_up")
        
        return not any([
            has_complaint, has_symptoms, has_exam, 
            has_diagnosis, has_treatment, has_meds, has_followup
        ])
    
    def _get_entry_hash(self, entry: TimelineEntry) -> str:
        """
        Generate hash of entry content for deduplication.
        Uses date + clinical content (ignoring filename).
        """
        # Create string representation of key content
        content_str = json.dumps({
            "date": entry.date,
            "type": entry.document_type,
            "provider": entry.provider_name,
            "clinical": entry.clinical_content
        }, sort_keys=True)
        
        return hashlib.md5(content_str.encode()).hexdigest()
    
    def _extract_all_documents(self, folder_path: Path) -> list[dict]:
        """Extract text from all files in folder/subfolders"""
        extracted = []
        
        all_files = [f for f in folder_path.rglob("*") 
                     if f.is_file() and not f.name.startswith('.')]
        
        for idx, file_path in enumerate(all_files, 1):
            print(f"  [{idx}/{len(all_files)}] {file_path.name}...", end=" ")
            
            try:
                text = extract_text_from_file(file_path)
                
                if text and len(text.strip()) >= 50:
                    extracted.append({
                        'filename': file_path.name,
                        'text': text,
                        'char_count': len(text)
                    })
                    print("✓")
                else:
                    print("⚠ Insufficient text")
                    self.failed_files.append((file_path.name, "Insufficient text"))
                    
            except Exception as e:
                print(f"✗ {e}")
                self.failed_files.append((file_path.name, str(e)))
        
        return extracted
    
    def _create_batches(self, documents: list[dict]) -> list[list[dict]]:
        """
        Greedy batching: group documents by size until hitting char limit.
        Large outliers go in their own batch.
        """
        batches = []
        current_batch = []
        current_size = 0
        
        for doc in documents:
            doc_size = doc['char_count']
            
            # If single doc exceeds limit, put it alone
            if doc_size > self.batch_char_limit:
                if current_batch:
                    batches.append(current_batch)
                    current_batch = []
                    current_size = 0
                batches.append([doc])
                continue
            
            # If adding this doc exceeds limit, start new batch
            if current_size + doc_size > self.batch_char_limit:
                batches.append(current_batch)
                current_batch = [doc]
                current_size = doc_size
            else:
                current_batch.append(doc)
                current_size += doc_size
        
        # Add final batch
        if current_batch:
            batches.append(current_batch)
        
        return batches
    
    def _print_summary(self, timeline: PatientTimeline):
        """Print processing summary"""
        print(f"\n{'=' * 60}")
        print(f"PROCESSING COMPLETE")
        print(f"{'=' * 60}")
        print(f"✓ Successfully processed: {self.processed_count} documents")
        print(f"✓ Timeline entries: {len(timeline.timeline)}")
        print(f"⚠ Undated documents: {len(timeline.undated_documents)}")
        print(f"🔍 Filtered (empty): {self.filtered_empty}")
        print(f"🔍 Filtered (duplicates): {self.filtered_duplicates}")
        print(f"✗ Failed: {len(self.failed_files)}")
        
        if timeline.timeline:
            print(f"\nTimeline spans: {timeline.timeline[0].date} to {timeline.timeline[-1].date}")
    
    def save_timeline(self, timeline: PatientTimeline, output_path: Path):
        """Save timeline as JSON"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(timeline.to_dict(), f, indent=2, ensure_ascii=False)
        
        print(f"\n📁 Saved timeline to: {output_path}")