"""
Agent Hospital Database Core

Main database class that combines connection management with medical cases
and experiences operations via mixins. Uses DuckDB for structured data and
ChromaDB for semantic vector search.
"""

import duckdb
import chromadb
from pathlib import Path

from hs_pipeline.simulation.database.medical_cases import MedicalCasesMixin
from hs_pipeline.simulation.database.experiences import ExperiencesMixin


class AgentHospitalDB(MedicalCasesMixin, ExperiencesMixin):
    """Manages structured (DuckDB) and vector (ChromaDB) databases with global semantic search."""
    
    def __init__(
        self, 
        db_path: str = "data/agent_hospital.db",
        chroma_path: str = "data/chroma_db"
    ):
        self.db_path = db_path
        self.chroma_path = chroma_path
        
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        Path(chroma_path).mkdir(parents=True, exist_ok=True)
        
        self._duckdb_conn = None
        self._chroma_client = None
        self._current_session_experiences: list[str] = []
    
    @property
    def duckdb(self) -> duckdb.DuckDBPyConnection:
        if self._duckdb_conn is None:
            self._duckdb_conn = duckdb.connect(self.db_path)
        return self._duckdb_conn
    
    @property
    def chroma(self) -> chromadb.Client:
        if self._chroma_client is None:
            self._chroma_client = chromadb.PersistentClient(path=self.chroma_path)
        return self._chroma_client
    
    def init_tables(self):
        """Initialize DuckDB tables."""
        self.duckdb.execute("""
            CREATE TABLE IF NOT EXISTS medical_cases (
                case_id VARCHAR PRIMARY KEY,
                department VARCHAR,
                patient_age INTEGER,
                patient_gender VARCHAR,
                medical_history TEXT,
                symptoms TEXT,
                examination_ordered TEXT,
                examination_results TEXT,
                diagnosis VARCHAR,
                treatment_plan TEXT,
                outcome VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.duckdb.execute("""
            CREATE TABLE IF NOT EXISTS experiences (
                experience_id VARCHAR PRIMARY KEY,
                department VARCHAR,
                principle_text TEXT,
                validation_accuracy FLOAT,
                times_retrieved INTEGER DEFAULT 0,
                times_led_to_correct INTEGER DEFAULT 0,
                times_led_to_incorrect INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.duckdb.execute("""
            CREATE TABLE IF NOT EXISTS disease_knowledge (
                disease_id VARCHAR PRIMARY KEY,
                disease_name VARCHAR,
                department VARCHAR,
                symptoms TEXT,
                typical_exam_results TEXT,
                treatment_options TEXT
            )
        """)
        
        self.duckdb.commit()
    
    def close(self):
        """Close database connections."""
        if self._duckdb_conn:
            self._duckdb_conn.close()
            self._duckdb_conn = None
    
    # Session management
    def start_new_session(self):
        """Start new simulation session."""
        self._current_session_experiences = []
    
    def get_session_experiences(self) -> list[str]:
        """Get experience IDs from current session."""
        return list(set(self._current_session_experiences))
    
    def track_session_outcome(self, was_correct: bool):
        """Track outcome for all experiences in session."""
        experience_ids = self.get_session_experiences()
        if experience_ids:
            self.track_experience_outcome(experience_ids, was_correct)
            print(f"Tracked {len(experience_ids)} experience(s): {'correct' if was_correct else 'incorrect'}")
        self.start_new_session()


# Singleton
_db = None


def get_db() -> AgentHospitalDB:
    """Get the singleton database instance."""
    global _db
    if _db is None:
        _db = AgentHospitalDB()
    return _db
