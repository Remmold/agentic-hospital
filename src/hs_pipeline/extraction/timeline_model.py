"""Timeline model for patient medical history"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class TimelineEntry:
    """Single document entry in patient timeline"""
    filename: str
    date: str  # "YYYY-MM-DD" or "Unknown"
    document_type: str
    provider_name: Optional[str]
    clinical_content: dict  # Matches your llm_config schema
    
    def has_valid_date(self) -> bool:
        return self.date != "Unknown"
    
    def get_date_obj(self) -> Optional[datetime]:
        if not self.has_valid_date():
            return None
        try:
            return datetime.strptime(self.date, "%Y-%m-%d")
        except:
            return None


@dataclass 
class PatientTimeline:
    """Complete medical timeline for one patient"""
    patient_folder: str
    timeline: list[TimelineEntry] = field(default_factory=list)
    undated_documents: list[TimelineEntry] = field(default_factory=list)
    
    def add_entry(self, entry: TimelineEntry):
        if entry.has_valid_date():
            self.timeline.append(entry)
        else:
            self.undated_documents.append(entry)
    
    def sort_timeline(self):
        """Sort timeline chronologically"""
        self.timeline.sort(key=lambda e: e.get_date_obj() or datetime.min)
    
    def to_dict(self) -> dict:
        """Convert to dict for agent consumption"""
        return {
            "patient_folder": self.patient_folder,
            "timeline": [
                {
                    "date": e.date,
                    "filename": e.filename,
                    "type": e.document_type,
                    "provider": e.provider_name,
                    "clinical_content": e.clinical_content
                }
                for e in self.timeline
            ],
            "undated_documents": [
                {
                    "filename": e.filename,
                    "type": e.document_type,
                    "provider": e.provider_name,
                    "clinical_content": e.clinical_content
                }
                for e in self.undated_documents
            ]
        }