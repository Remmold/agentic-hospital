
import time


def show_tool_calls(result, agent_name):
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name') and hasattr(part, 'args'):
                    print(f"{agent_name} uses: {part.tool_name}")
                    print(f"   Args: {part.args}")


def extract_tool_calls(result):
    tools = []
    for msg in result.all_messages():
        if hasattr(msg, 'parts'):
            for part in msg.parts:
                if hasattr(part, 'tool_name') and hasattr(part, 'args'):
                    tools.append(part.tool_name)
    return tools


def run_agent_with_retry(agent, context, deps, max_attempts=3):
    for attempt in range(max_attempts):
        try:
            return agent.run_sync(context, deps=deps)
        except Exception as e:
            if attempt == max_attempts - 1:
                print(f"Failed after {max_attempts} attempts: {e}")
                raise
            print(f"Attempt {attempt + 1} failed, retrying...")
            time.sleep(1)
