"""
Medical Cases Database Operations

Handles CRUD operations for medical case records including:
- Adding new cases to DuckDB and ChromaDB
- Semantic search across cases
- Retrieving case details
"""

from typing import Any
import duckdb
import chromadb


class MedicalCasesMixin:
    """Mixin providing medical case operations for AgentHospitalDB."""
    
    # These will be provided by the core class
    duckdb: duckdb.DuckDBPyConnection
    chroma: chromadb.Client
    
    def get_medical_cases_collection(self):
        """Global vector store for all medical cases."""
        return self.chroma.get_or_create_collection(
            name="medical_cases",
            metadata={"type": "medical_records"}
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
    
    def search_similar_cases(
        self,
        query: str,
        department: str | None = None,
        n_results: int = 3
    ) -> dict[str, Any]:
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
    
    def get_case_details(self, case_id: str) -> dict[str, Any] | None:
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
