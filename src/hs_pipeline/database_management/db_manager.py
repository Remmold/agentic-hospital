"""
Agent Hospital Database Manager - Global semantic search with optional department filtering
"""
import duckdb
import chromadb
from pathlib import Path
from typing import Optional, Dict, Any, List


class AgentHospitalDB:
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
        self._current_session_experiences = []
    
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
    
    # Global ChromaDB collections (not department-specific)
    def get_medical_cases_collection(self):
        """Global vector store for all medical cases."""
        return self.chroma.get_or_create_collection(
            name="medical_cases",
            metadata={"type": "medical_records"}
        )
    
    def get_experiences_collection(self):
        """Global vector store for all experiences."""
        return self.chroma.get_or_create_collection(
            name="experiences",
            metadata={"type": "experience_base"}
        )
    
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
        """Add case to both DuckDB and global ChromaDB collection."""
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
        
        # Vectorize for semantic search
        case_text = f"""Age: {patient_age}, Gender: {patient_gender}
Medical History: {medical_history}
Symptoms: {symptoms}
Examination: {examination_ordered}
Results: {examination_results}
Diagnosis: {diagnosis}
Treatment: {treatment_plan}"""
        
        collection = self.get_medical_cases_collection()
        collection.add(
            documents=[case_text],
            ids=[case_id],
            metadatas=[{
                "department": department,
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
        """Add experience to both DuckDB and global ChromaDB collection."""
        self.duckdb.execute("""
            INSERT INTO experiences
            (experience_id, department, principle_text, validation_accuracy)
            VALUES (?, ?, ?, ?)
        """, [experience_id, department, principle_text, validation_accuracy])
        self.duckdb.commit()
        
        collection = self.get_experiences_collection()
        collection.add(
            documents=[principle_text],
            ids=[experience_id],
            metadatas=[{
                "department": department,
                "validation_accuracy": validation_accuracy
            }]
        )
    
    def search_similar_cases(
        self,
        query: str,
        department: Optional[str] = None,
        n_results: int = 3
    ) -> Dict[str, Any]:
        """
        Semantic search across all cases, optionally filtered by department.
        
        Args:
            query: Search query (symptoms, age, etc.)
            department: Optional department filter
            n_results: Number of results
        """
        collection = self.get_medical_cases_collection()
        
        # Build where clause for department filtering
        where = {"department": department} if department else None
        
        return collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where
        )
    
    def search_relevant_experiences(
        self,
        query: str,
        department: Optional[str] = None,
        n_results: int = 4,
        only_active: bool = True
    ) -> Dict[str, Any]:
        """
        Semantic search across all experiences, optionally filtered by department.
        
        Args:
            query: Search query
            department: Optional department filter
            n_results: Number of results
            only_active: Filter to active experiences only
        """
        collection = self.get_experiences_collection()
        
        # Get extra results to filter inactive ones
        results = collection.query(
            query_texts=[query],
            n_results=n_results * 2 if only_active else n_results,
            where={"department": department} if department else None
        )
        
        # Filter to active experiences
        if only_active and results['ids'][0]:
            filtered_ids = []
            filtered_docs = []
            filtered_meta = []
            
            for i, exp_id in enumerate(results['ids'][0]):
                exp = self.get_experience_details(exp_id)
                if exp and exp['is_active']:
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
    
    def get_case_details(self, case_id: str) -> Optional[Dict[str, Any]]:
        """Get full case details from DuckDB."""
        result = self.duckdb.execute("""
            SELECT case_id, department, patient_age, patient_gender, medical_history,
                   symptoms, examination_ordered, examination_results, diagnosis,
                   treatment_plan, outcome, created_at
            FROM medical_cases
            WHERE case_id = ?
        """, [case_id]).fetchone()
        
        if result:
            return {
                'case_id': result[0],
                'department': result[1],
                'patient_age': result[2],
                'patient_gender': result[3],
                'medical_history': result[4],
                'symptoms': result[5],
                'examination_ordered': result[6],
                'examination_results': result[7],
                'diagnosis': result[8],
                'treatment_plan': result[9],
                'outcome': result[10],
                'created_at': result[11]
            }
        return None
    
    def get_experience_details(self, experience_id: str) -> Optional[Dict[str, Any]]:
        """Get full experience details from DuckDB."""
        result = self.duckdb.execute("""
            SELECT experience_id, department, principle_text, validation_accuracy,
                   times_retrieved, times_led_to_correct, times_led_to_incorrect,
                   is_active, created_at, updated_at
            FROM experiences
            WHERE experience_id = ?
        """, [experience_id]).fetchone()
        
        if result:
            return {
                'experience_id': result[0],
                'department': result[1],
                'principle_text': result[2],
                'validation_accuracy': result[3],
                'times_retrieved': result[4],
                'times_led_to_correct': result[5],
                'times_led_to_incorrect': result[6],
                'is_active': result[7],
                'created_at': result[8],
                'updated_at': result[9]
            }
        return None
    
    def track_experience_retrieval(self, experience_ids: List[str]):
        """Increment retrieval count for experiences."""
        self._current_session_experiences.extend(experience_ids)
        
        for exp_id in experience_ids:
            self.duckdb.execute("""
                UPDATE experiences 
                SET times_retrieved = times_retrieved + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE experience_id = ?
            """, [exp_id])
        self.duckdb.commit()
    
    def track_experience_outcome(self, experience_ids: List[str], led_to_correct: bool):
        """Track whether experiences led to correct diagnosis."""
        for exp_id in experience_ids:
            self.duckdb.execute("""
                UPDATE experiences
                SET times_led_to_correct = times_led_to_correct + ?,
                    times_led_to_incorrect = times_led_to_incorrect + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE experience_id = ?
            """, [
                1 if led_to_correct else 0,
                0 if led_to_correct else 1,
                exp_id
            ])
        self.duckdb.commit()
    
    def get_experience_performance(self, experience_id: str) -> Dict[str, Any]:
        """Get performance metrics for an experience."""
        result = self.duckdb.execute("""
            SELECT 
                experience_id, principle_text, times_retrieved,
                times_led_to_correct, times_led_to_incorrect,
                CASE 
                    WHEN times_retrieved > 0 
                    THEN CAST(times_led_to_correct AS FLOAT) / times_retrieved 
                    ELSE validation_accuracy 
                END as actual_accuracy,
                validation_accuracy, is_active
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
    
    def get_all_experience_stats(self) -> List[Dict[str, Any]]:
        """Get statistics for all experiences."""
        results = self.duckdb.execute("""
            SELECT 
                experience_id, department, principle_text, times_retrieved,
                times_led_to_correct, times_led_to_incorrect,
                CASE 
                    WHEN times_retrieved > 0 
                    THEN CAST(times_led_to_correct AS FLOAT) / times_retrieved 
                    ELSE validation_accuracy 
                END as success_rate,
                validation_accuracy, is_active, created_at
            FROM experiences
            ORDER BY times_retrieved DESC, success_rate DESC
        """).fetchall()
        
        return [
            {
                'experience_id': r[0], 'department': r[1], 'principle_text': r[2],
                'times_retrieved': r[3], 'times_led_to_correct': r[4],
                'times_led_to_incorrect': r[5], 'success_rate': r[6],
                'validation_accuracy': r[7], 'is_active': r[8], 'created_at': r[9]
            }
            for r in results
        ]
    
    def deprecate_experience(self, experience_id: str):
        """Mark experience as inactive."""
        self.duckdb.execute("""
            UPDATE experiences 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE experience_id = ?
        """, [experience_id])
        self.duckdb.commit()
    
    def remove_experience(self, experience_id: str):
        """Permanently remove experience from both DuckDB and ChromaDB."""
        exp = self.get_experience_details(experience_id)
        
        self.duckdb.execute("DELETE FROM experiences WHERE experience_id = ?", [experience_id])
        self.duckdb.commit()
        
        try:
            collection = self.get_experiences_collection()
            collection.delete(ids=[experience_id])
            print(f"✓ Removed: {experience_id}")
        except Exception as e:
            print(f"⚠️ ChromaDB delete warning: {e}")
    
    def get_low_performing_experiences(
        self, 
        department: Optional[str] = None,
        accuracy_threshold: float = 0.3,
        min_usage: int = 3
    ) -> List[Dict[str, Any]]:
        """Find low-performing experiences."""
        query = """
            SELECT 
                experience_id, department, principle_text, times_retrieved,
                times_led_to_correct, times_led_to_incorrect,
                CAST(times_led_to_correct AS FLOAT) / times_retrieved as actual_accuracy
            FROM experiences
            WHERE is_active = TRUE
                AND times_retrieved >= ?
                AND CAST(times_led_to_correct AS FLOAT) / times_retrieved <= ?
        """
        
        params = [min_usage, accuracy_threshold]
        if department:
            query += " AND department = ?"
            params.append(department)
        
        query += " ORDER BY actual_accuracy ASC, times_retrieved DESC"
        results = self.duckdb.execute(query, params).fetchall()
        
        return [
            {
                "experience_id": r[0], "department": r[1], "principle_text": r[2],
                "times_retrieved": r[3], "times_led_to_correct": r[4],
                "times_led_to_incorrect": r[5], "actual_accuracy": r[6]
            }
            for r in results
        ]
    
    def close(self):
        if self._duckdb_conn:
            self._duckdb_conn.close()
            self._duckdb_conn = None
    
    # Session management
    def start_new_session(self):
        """Start new simulation session."""
        self._current_session_experiences = []
    
    def get_session_experiences(self) -> List[str]:
        """Get experience IDs from current session."""
        return list(set(self._current_session_experiences))
    
    def track_session_outcome(self, was_correct: bool):
        """Track outcome for all experiences in session."""
        experience_ids = self.get_session_experiences()
        if experience_ids:
            self.track_experience_outcome(experience_ids, was_correct)
            print(f"📊 Tracked {len(experience_ids)} experience(s): {'correct' if was_correct else 'incorrect'}")
        self.start_new_session()


# Singleton
_db = None

def get_db() -> AgentHospitalDB:
    global _db
    if _db is None:
        _db = AgentHospitalDB()
    return _db