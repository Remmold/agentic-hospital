"""
Debug: Check if experiences are saved and retrievable
Uses ONLY public database API methods
"""
from hs_pipeline.simulation.database import get_db

db = get_db()

print("="*60)
print("CHECKING FOR EXPERIENCES")
print("="*60)

# Search all departments with broad queries
departments = ["Neurology", "Cardiology", "Respiratory", "Gastroenterology", "Endocrinology", "Rheumatology", "General"]

all_experiences = {}

for dept in departments:
    try:
        # Broad search to catch anything
        results = db.search_relevant_experiences(
            department=dept,
            query="diagnosis symptoms testing patient",
            n_results=20
        )
        
        if results['ids'][0]:
            experiences = []
            for exp_id in results['ids'][0]:
                exp = db.get_experience_details(exp_id)
                if exp:
                    experiences.append(exp)
            
            if experiences:
                all_experiences[dept] = experiences
                print(f"\n✓ {dept}: {len(experiences)} experiences")
                
    except Exception as e:
        print(f"✗ {dept}: Error - {e}")

print("\n" + "="*60)

if not all_experiences:
    print("NO EXPERIENCES FOUND")
    print("="*60)
    print("\nThis means:")
    print("  • No wrong diagnoses yet (all correct so far)")
    print("  • Or reflection agent isn't creating principles")
    print("  • Or database isn't saving them")
    print("\nTo generate experiences:")
    print("  1. Run: python runner_final.py")
    print("  2. Some diagnoses will be wrong")
    print("  3. Reflection agent creates principles")
    print("  4. Run this script again")
else:
    print("✓ EXPERIENCES FOUND")
    print("="*60)
    
    total = sum(len(exps) for exps in all_experiences.values())
    print(f"\nTotal: {total} experiences across {len(all_experiences)} departments\n")
    
    # Show all experiences
    for dept, experiences in all_experiences.items():
        print(f"\n{dept} ({len(experiences)} experiences):")
        print("-" * 60)
        for i, exp in enumerate(experiences, 1):
            print(f"\n{i}. {exp['principle_text']}")
            print(f"   Accuracy: {exp['validation_accuracy']:.2f}")

print("\n" + "="*60)
print("TESTING SPECIFIC SEARCHES")
print("="*60)

# Test specific symptom searches
test_searches = [
    ("headache nausea", "Neurology"),
    ("chest pain sweating", "Cardiology"),
    ("dizziness confusion", "Neurology"),
    ("abdominal pain fever", "Gastroenterology"),
]

for query, dept in test_searches:
    print(f"\nQuery: '{query}' in {dept}")
    
    try:
        results = db.search_relevant_experiences(
            department=dept,
            query=query,
            n_results=3
        )
        
        if results['ids'][0]:
            print(f"  ✓ Found {len(results['ids'][0])} results")
            for exp_id in results['ids'][0]:
                exp = db.get_experience_details(exp_id)
                if exp:
                    # Show first 80 chars
                    print(f"    • {exp['principle_text'][:80]}...")
        else:
            print("  ✗ No results")
    except Exception as e:
        print(f"  ✗ Error: {e}")

print("\n" + "="*60)
print("SUMMARY")
print("="*60)

if not all_experiences:
    print("\n🔴 No experiences yet - need to generate learning data")
    print("\nNext steps:")
    print("  1. Set NUM_SIMULATIONS = 10 in runner_final.py")
    print("  2. Run simulations")
    print("  3. Some will be wrong → creates experiences")
    print("  4. Run this script again to verify")
else:
    print("\n🟢 Experiences exist in database!")
    print(f"\nDepartments with data: {', '.join(all_experiences.keys())}")
    print("\nNext step: Check if doctor is USING these experiences")
    print("  → Look at simulation JSON timeline")
    print("  → Check 'search_relevant_experiences' in tools_used")
    print("  → Check doctor's reasoning for experience mentions")
