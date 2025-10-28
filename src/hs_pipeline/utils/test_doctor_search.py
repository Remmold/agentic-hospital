"""
Test what doctor sees when searching
Uses ONLY public database API methods
"""
from hs_pipeline.database_management.db_manager import get_db

db = get_db()

print("="*60)
print("DOCTOR SEARCH SIMULATION")
print("="*60)
print("\nThis shows what doctor agent sees when searching for experiences\n")

# Realistic patient scenarios
scenarios = [
    {
        "name": "Migraine Patient",
        "symptoms": ["headache", "nausea", "light sensitivity"],
        "department": "Neurology"
    },
    {
        "name": "Cardiac Patient",
        "symptoms": ["chest pain", "shortness of breath", "sweating"],
        "department": "Cardiology"
    },
    {
        "name": "Epilepsy Patient",
        "symptoms": ["dizziness", "confusion", "light sensitivity"],
        "department": "Neurology"
    },
    {
        "name": "Appendicitis Patient",
        "symptoms": ["abdominal pain", "nausea", "fever"],
        "department": "Gastroenterology"
    }
]

found_any = False

for scenario in scenarios:
    print(f"\n{'='*60}")
    print(f"SCENARIO: {scenario['name']}")
    print(f"Symptoms: {', '.join(scenario['symptoms'])}")
    print(f"Department: {scenario['department']}")
    print("="*60)
    
    # Doctor creates this query
    symptoms_str = ", ".join(scenario['symptoms'])
    query = f"{symptoms_str} diagnosis"
    
    print(f"\nDoctor query: '{query}'")
    print("-" * 60)
    
    try:
        results = db.search_relevant_experiences(
            department=scenario['department'],
            query=query,
            n_results=4
        )
        
        if results['ids'][0]:
            found_any = True
            print(f"✓ Found {len(results['ids'][0])} relevant experiences:\n")
            
            for i, exp_id in enumerate(results['ids'][0], 1):
                exp = db.get_experience_details(exp_id)
                if exp:
                    print(f"{i}. {exp['principle_text']}")
                    print(f"   Confidence: {exp['validation_accuracy']:.2f}")
                    print()
        else:
            print("✗ No experiences found for this query")
            print("  Possible reasons:")
            print("  • No experiences in this department yet")
            print("  • Query keywords don't match principle text")
            print("  • Need more learning data")
            
    except Exception as e:
        print(f"✗ Error: {e}")

print("\n" + "="*60)
print("ANALYSIS")
print("="*60)

if not found_any:
    print("\n❌ No experiences found for ANY scenario")
    print("\nThis means:")
    print("  • Database is empty (no wrong diagnoses yet)")
    print("  • Need to run simulations to generate data")
    print("\nTo fix:")
    print("  1. Run: python runner_final.py")
    print("  2. Wait for wrong diagnoses")
    print("  3. Check experiences with: python check_experiences.py")
else:
    print("\n✓ Some experiences are being retrieved!")
    print("\nNext steps:")
    print("  1. Check simulation JSON files")
    print("  2. Look for 'search_relevant_experiences' in tools_used")
    print("  3. Check if doctor mentions experiences in reasoning")
    print("\nIf doctor ISN'T using them:")
    print("  → Make sure doctor_agent.py has updated prompt")
    print("  → Check that doctor calls search_relevant_experiences")
    print("  → Strengthen emphasis on following experiences")

print("\n" + "="*60)
print("DEPARTMENT COVERAGE")
print("="*60)

# Quick check of each department
print("\nChecking which departments have experiences...\n")

for dept in ["Neurology", "Cardiology", "Respiratory", "Gastroenterology", "Endocrinology", "Rheumatology", "General"]:
    try:
        results = db.search_relevant_experiences(
            department=dept,
            query="diagnosis",
            n_results=1
        )
        
        if results['ids'][0]:
            print(f"✓ {dept}: Has experiences")
        else:
            print(f"✗ {dept}: No experiences yet")
    except:
        print(f"✗ {dept}: Error checking")

print("\nTo build experiences in empty departments:")
print("  Set TARGET_DEPARTMENT = 'DepartmentName' in runner_final.py")