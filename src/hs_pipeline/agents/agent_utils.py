"""Agent utilities - retry logic, tool extraction, and timeline parsing."""
import time



# RETRY & ERROR HANDLING
def run_agent_with_retry(agent, context, deps, max_attempts=3):
    """Run agent with automatic retry on failure."""
    for attempt in range(max_attempts):
        try:
            return agent.run_sync(context, deps=deps)
        except Exception as e:
            if attempt == max_attempts - 1:
                print(f"Failed after {max_attempts} attempts: {e}")
                raise
            print(f"Attempt {attempt + 1} failed, retrying...")
            time.sleep(1)



# TOOL CALL EXTRACTION
def extract_tool_calls(result) -> list[str]:
    """Extract list of tool names used by agent."""
    tools = []
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name') and hasattr(part, 'args'):
                    tools.append(part.tool_name)
    return tools


def show_tool_calls(result, agent_name: str):
    """Print tool calls for debugging."""
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name') and hasattr(part, 'args'):
                    print(f"{agent_name} uses: {part.tool_name}")
                    print(f"   Args: {part.args}")



# TIMELINE PARSING
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