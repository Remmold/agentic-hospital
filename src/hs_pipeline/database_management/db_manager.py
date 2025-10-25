"""
Agent Hospital Database Manager
Matches the flowchart: Medical Records Retrieval + Experience Base
"""
import duckdb
import chromadb
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime


class AgentHospitalDB:
    """Manages structured (DuckDB) and vector (ChromaDB) databases."""
    
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
        
        # Medical Cases - stores FULL case information
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
        
        # Experiences - short principles from reflection
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
        
        # Disease knowledge (for patient generation)
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
    
    # ChromaDB collections
    def get_medical_cases_collection(self, department: str = "general"):
        """Vector store for semantic search of medical cases."""
        return self.chroma.get_or_create_collection(
            name=f"medical_cases_{department}",
            metadata={"type": "medical_records", "department": department}
        )
    
    def get_experiences_collection(self, department: str = "general"):
        """Vector store for semantic search of experiences."""
        return self.chroma.get_or_create_collection(
            name=f"experiences_{department}",
            metadata={"type": "experience_base", "department": department}
        )
    
    # Add data methods
    def add_medical_case(
        self,
        case_id: str,
        department: str,
        patient_age: int,
        patient_gender: str,
        medical_history: str,
        symptoms: str,
        examination_ordered: str,
        examination_results: str,
        diagnosis: str,
        treatment_plan: str,
        outcome: str = "success"
    ):
        """Add a successful case to Medical Case Base (both DuckDB + ChromaDB)."""
        
        # Store in DuckDB
        self.duckdb.execute("""
            INSERT INTO medical_cases 
            (case_id, department, patient_age, patient_gender, medical_history, 
             symptoms, examination_ordered, examination_results, diagnosis, 
             treatment_plan, outcome)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            case_id, department, patient_age, patient_gender, medical_history,
            symptoms, examination_ordered, examination_results, diagnosis,
            treatment_plan, outcome
        ])
        self.duckdb.commit()
        
        # Vectorize and store in ChromaDB for semantic search
        case_text = f"""Age: {patient_age}, Gender: {patient_gender}
Medical History: {medical_history}
Symptoms: {symptoms}
Examination: {examination_ordered}
Results: {examination_results}
Diagnosis: {diagnosis}
Treatment: {treatment_plan}"""
        
        collection = self.get_medical_cases_collection(department)
        collection.add(
            documents=[case_text],
            ids=[case_id],
            metadatas=[{
                "age": patient_age,
                "gender": patient_gender,
                "diagnosis": diagnosis
            }]
        )
    
    def add_experience(
        self,
        experience_id: str,
        department: str,
        principle_text: str,
        validation_accuracy: float = 1.0
    ):
        """Add a validated experience principle (both DuckDB + ChromaDB)."""
        
        # Store in DuckDB
        self.duckdb.execute("""
            INSERT INTO experiences
            (experience_id, department, principle_text, validation_accuracy)
            VALUES (?, ?, ?, ?)
        """, [experience_id, department, principle_text, validation_accuracy])
        self.duckdb.commit()
        
        # Vectorize and store in ChromaDB for semantic search
        collection = self.get_experiences_collection(department)
        collection.add(
            documents=[principle_text],
            ids=[experience_id],
            metadatas=[{"validation_accuracy": validation_accuracy}]
        )
    
    # Semantic search methods
    def search_similar_cases(
        self,
        department: str,
        query: str,
        n_results: int = 3
    ) -> Dict[str, Any]:
        """Semantic search for similar medical cases."""
        collection = self.get_medical_cases_collection(department)
        return collection.query(
            query_texts=[query],
            n_results=n_results
        )
    
    def search_relevant_experiences(
        self,
        department: str,
        query: str,
        n_results: int = 4,
        only_active: bool = True
    ) -> Dict[str, Any]:
        """Semantic search for relevant experience principles."""
        collection = self.get_experiences_collection(department)
        
        # Get results from ChromaDB
        results = collection.query(
            query_texts=[query],
            n_results=n_results * 2 if only_active else n_results  # Get extra in case some inactive
        )
        
        # Filter to only active experiences if requested
        if only_active and results['ids'][0]:
            filtered_ids = []
            filtered_docs = []
            filtered_meta = []
            
            for i, exp_id in enumerate(results['ids'][0]):
                exp = self.get_experience_details(exp_id)
                if exp and exp.get('is_active', True):
                    filtered_ids.append(exp_id)
                    filtered_docs.append(results['documents'][0][i])
                    filtered_meta.append(results['metadatas'][0][i])
                    
                    if len(filtered_ids) >= n_results:
                        break
            
            return {
                'ids': [filtered_ids],
                'documents': [filtered_docs],
                'metadatas': [filtered_meta]
            }
        
        return results
    
    # Retrieval for doctor agent prompting
    def get_case_details(self, case_id: str) -> Dict[str, Any]:
        """Get full case details from DuckDB."""
        result = self.duckdb.execute("""
            SELECT * FROM medical_cases WHERE case_id = ?
        """, [case_id]).fetchone()
        
        if result:
            columns = [desc[0] for desc in self.duckdb.description]
            return dict(zip(columns, result))
        return None
    
    def get_experience_details(self, experience_id: str) -> Dict[str, Any]:
        """Get experience principle from DuckDB."""
        result = self.duckdb.execute("""
            SELECT * FROM experiences WHERE experience_id = ?
        """, [experience_id]).fetchone()
        
        if result:
            columns = [desc[0] for desc in self.duckdb.description]
            return dict(zip(columns, result))
        return None
    
    # Experience tracking and management
    def track_experience_usage(
        self, 
        experience_id: str, 
        led_to_correct: bool
    ):
        """Track when an experience is used and whether it helped."""
        self.duckdb.execute("""
            UPDATE experiences 
            SET times_retrieved = times_retrieved + 1,
                times_led_to_correct = times_led_to_correct + ?,
                times_led_to_incorrect = times_led_to_incorrect + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE experience_id = ?
        """, [
            1 if led_to_correct else 0,
            0 if led_to_correct else 1,
            experience_id
        ])
        self.duckdb.commit()
    
    def get_experience_performance(self, experience_id: str) -> Dict[str, Any]:
        """Get performance metrics for an experience."""
        result = self.duckdb.execute("""
            SELECT 
                experience_id,
                principle_text,
                times_retrieved,
                times_led_to_correct,
                times_led_to_incorrect,
                CASE 
                    WHEN times_retrieved > 0 
                    THEN CAST(times_led_to_correct AS FLOAT) / times_retrieved 
                    ELSE validation_accuracy 
                END as actual_accuracy,
                validation_accuracy as initial_validation_accuracy,
                is_active
            FROM experiences
            WHERE experience_id = ?
        """, [experience_id]).fetchone()
        
        if result:
            return {
                "experience_id": result[0],
                "principle_text": result[1],
                "times_retrieved": result[2],
                "times_led_to_correct": result[3],
                "times_led_to_incorrect": result[4],
                "actual_accuracy": result[5],
                "initial_validation_accuracy": result[6],
                "is_active": result[7]
            }
        return None
    
    def deprecate_experience(self, experience_id: str):
        """Mark an experience as inactive (don't delete, keep for analysis)."""
        self.duckdb.execute("""
            UPDATE experiences 
            SET is_active = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE experience_id = ?
        """, [experience_id])
        self.duckdb.commit()
    
    def get_low_performing_experiences(
        self, 
        department: str, 
        accuracy_threshold: float = 0.6,
        min_usage: int = 5
    ):
        """Find experiences that are performing poorly."""
        results = self.duckdb.execute("""
            SELECT 
                experience_id,
                principle_text,
                times_retrieved,
                CAST(times_led_to_correct AS FLOAT) / times_retrieved as actual_accuracy
            FROM experiences
            WHERE department = ?
                AND is_active = TRUE
                AND times_retrieved >= ?
                AND CAST(times_led_to_correct AS FLOAT) / times_retrieved < ?
            ORDER BY actual_accuracy ASC
        """, [department, min_usage, accuracy_threshold]).fetchall()
        
        return [
            {
                "experience_id": r[0],
                "principle_text": r[1],
                "times_retrieved": r[2],
                "actual_accuracy": r[3]
            }
            for r in results
        ]
    
    def close(self):
        if self._duckdb_conn:
            self._duckdb_conn.close()
            self._duckdb_conn = None


# Singleton
_db = None

def get_db() -> AgentHospitalDB:
    global _db
    if _db is None:
        _db = AgentHospitalDB()
    return _db