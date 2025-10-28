"""Timeline utilities for extracting data from simulation events."""


def extract_lab_data(timeline: list) -> tuple[list[str], list[str]]:
    """
    Extract test names and results from timeline.
    
    Returns:
        (tests_ordered, test_results)
    """
    tests_ordered = []
    test_results = []
    
    for event in timeline:
        if event.get("agent") == "Lab":
            lab_data = event.get("decision", {})
            tests_ordered.append(lab_data.get("tests_ran", ""))
            test_results.append(lab_data.get("test_outcome", ""))
    
    return tests_ordered, test_results


def format_examination_data(tests_ordered: list[str], test_results: list[str]) -> tuple[str, str]:
    """
    Format lab data for storage.
    
    Returns:
        (examination_ordered, examination_results)
    """
    examination_ordered = ", ".join(tests_ordered) if tests_ordered else "None"
    examination_results = "\n".join(test_results) if test_results else "Clinical diagnosis"
    
    return examination_ordered, examination_results