"""
Experiences Database Operations

Handles CRUD operations for learning experiences including:
- Adding new experiences to DuckDB and ChromaDB
- Semantic search for relevant experiences
- Tracking experience retrieval and outcomes
- Performance monitoring and deprecation
"""

from typing import Any
import duckdb
import chromadb


class ExperiencesMixin:
    """Mixin providing experience operations for AgentHospitalDB."""
    
    # These will be provided by the core class
    duckdb: duckdb.DuckDBPyConnection
    chroma: chromadb.Client
    _current_session_experiences: list[str]
    
    def get_experiences_collection(self):
        """Global vector store for all experiences."""
        return self.chroma.get_or_create_collection(
            name="experiences",
            metadata={"type": "experience_base"}
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
    
    def search_relevant_experiences(
        self,
        query: str,
        department: str | None = None,
        n_results: int = 4,
        only_active: bool = True
    ) -> dict[str, Any]:
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
    
    def get_experience_details(self, experience_id: str) -> dict[str, Any] | None:
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
    
    def track_experience_retrieval(self, experience_ids: list[str]):
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
    
    def track_experience_outcome(self, experience_ids: list[str], led_to_correct: bool):
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
    
    def get_experience_performance(self, experience_id: str) -> dict[str, Any]:
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
    
    def get_all_experience_stats(self) -> list[dict[str, Any]]:
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
        department: str | None = None,
        accuracy_threshold: float = 0.3,
        min_usage: int = 3
    ) -> list[dict[str, Any]]:
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
