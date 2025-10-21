import streamlit as st
from pathlib import Path
import json
import time

# Configure page
st.set_page_config(
    page_title="Medical Simulation System",
    page_icon="🏥",
    layout="wide"
)

# Session state initialization
if 'current_step' not in st.session_state:
    st.session_state.current_step = 0
if 'simulation_data' not in st.session_state:
    st.session_state.simulation_data = None
if 'is_running' not in st.session_state:
    st.session_state.is_running = False
if 'selected_case' not in st.session_state:
    st.session_state.selected_case = None


def load_case_files():
    """Load all available case files from the data directory."""
    ui_root = Path(__file__).parent
    data_path = ui_root / "data"
    
    cases = {}
    if data_path.exists():
        for file_path in data_path.glob("*.json"):
            case_name = file_path.stem.title()
            cases[case_name] = file_path
    
    return cases


def load_simulation_data(file_path: Path):
    """Load simulation data from JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def display_patient_info(patient_data, actual_disease=None):
    """Display patient information in a card."""
    st.markdown("### 👤 Patient Information")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Name", patient_data['name'])
    with col2:
        st.metric("Age", f"{patient_data['age']} years")
    with col3:
        if actual_disease:
            st.metric("Actual Condition", actual_disease.title(), 
                     help="Hidden from agents during simulation")
    
    st.markdown("**Presenting Symptoms:**")
    symptoms_text = ", ".join(patient_data['symptoms'])
    st.info(symptoms_text)


def display_step(step_data, is_current=False):
    """Display a single simulation step."""
    agent = step_data['agent']
    decision = step_data['decision']
    tools = step_data.get('tools_used', [])
    
    # Agent emoji mapping
    agent_emoji = {
        "Nurse": "🌡️",
        "Doctor": "👨‍⚕️",
        "Lab": "🔬"
    }
    
    # Build expander label with key info
    if agent == "Nurse":
        urgency = decision.get('urgency', 'non_urgent')
        urgency_display = {
            "urgent": "🔴 Urgent",
            "semi_urgent": "🟡 Semi Urgent",
            "non_urgent": "🟢 Non Urgent"
        }
        vital_concern = decision.get('vital_signs_concern', False)
        vital_text = "⚠️ Vital Concern" if vital_concern else "✅ No Vital Concern"
        label = f"{agent_emoji.get(agent)} Step {step_data['step']}: {agent} - {urgency_display.get(urgency)} • {vital_text}"
    elif agent == "Doctor":
        tests = decision.get('tests_completed_count', 0)
        diagnosis = decision.get('diagnosis', '')
        if diagnosis:
            label = f"{agent_emoji.get(agent)} Step {step_data['step']}: {agent} - Tests: {tests} • 🎯 {diagnosis}"
        else:
            ordered = decision.get('ordered_test', '')
            label = f"{agent_emoji.get(agent)} Step {step_data['step']}: {agent} - Tests: {tests}" + (f" • 🧪 {ordered}" if ordered else "")
    elif agent == "Lab":
        test_name = decision.get('tests_ran', 'Test')
        label = f"{agent_emoji.get(agent)} Step {step_data['step']}: {agent} - {test_name}"
    else:
        label = f"{agent_emoji.get(agent, '👤')} Step {step_data['step']}: {agent}"
    
    # Always use expander, but expand the current step
    with st.expander(label, expanded=is_current):
        # Display based on agent type
        if agent == "Nurse":
            display_nurse_assessment(decision)
        elif agent == "Doctor":
            display_doctor_decision(decision)
        elif agent == "Lab":
            display_lab_results(decision)
        
        # Show tools used
        if tools:
            st.markdown("**🔧 Tools Used:**")
            st.code(", ".join(tools))


def display_nurse_assessment(decision):
    """Display nurse triage assessment."""
    st.markdown("**📋 Assessment:**")
    st.write(decision.get('triage_reasoning', 'No reasoning provided'))
    
    if decision.get('notes'):
        st.info(f"📝 {decision['notes']}")
    
    # Next action at bottom
    next_step = decision.get('next_step', 'N/A').replace('_', ' ').title()
    st.caption(f"→ Next Action: {next_step}")


def display_doctor_decision(decision):
    """Display doctor's decision."""
    next_step = decision.get('next_step', '')
    
    if decision.get('recommended_treatment') or decision.get('context_for_next'):
        st.markdown("**📋 Clinical Details:**")
        
        if decision.get('recommended_treatment'):
            st.markdown(f"**💊 Treatment:** {decision['recommended_treatment']}")
        
        if decision.get('follow_up_needed'):
            st.warning("📅 Follow-up appointment needed")
        
        if decision.get('context_for_next'):
            st.write(decision['context_for_next'])
    
    # Next action at bottom
    st.caption(f"→ Next Action: {next_step.replace('_', ' ').title()}")


def display_lab_results(decision):
    """Display lab test results."""
    st.markdown("**📊 Results:**")
    results = decision.get('test_outcome', 'No results available')
    st.code(results, language="text")


def display_final_summary(simulation_data):
    """Display final diagnosis summary."""
    final = simulation_data.get('final_diagnosis')
    
    if not final:
        st.warning("Simulation incomplete - no final diagnosis")
        return
    
    st.success("✅ Simulation Complete!")
    
    col1, col2 = st.columns(2)
    
    with col1:
        patient_data = st.session_state.simulation_data
        symptoms_text = ", ".join(patient_data['patient']['symptoms'])
        st.markdown(f"**Symptoms:** {symptoms_text}")
        if final.get('diagnosis'):
            st.markdown(f"**Diagnosis:** {final['diagnosis']}")
        else:
            st.warning("No diagnosis made")
        
        if final.get('recommended_treatment'):
            st.markdown(f"**Treatment:** {final['recommended_treatment']}")
    
    with col2:
        st.metric("Total Steps", simulation_data.get('total_steps', 0))
        st.metric("Tests Ordered", final.get('tests_completed_count', 0))


def run_simulation():
    """Animate through simulation steps."""
    if not st.session_state.simulation_data:
        return
    
    timeline = st.session_state.simulation_data['timeline']
    
    if st.session_state.current_step < len(timeline):
        st.session_state.current_step += 1
        time.sleep(2.0)  # Increased delay for better readability
        st.rerun()
    else:
        st.session_state.is_running = False


def reset_simulation():
    """Reset simulation to beginning."""
    st.session_state.current_step = 0
    st.session_state.is_running = False


def main():
    st.title("🏥 Hospital Simulation")
    
    cases = load_case_files()
    
    if not cases:
        st.error("No case files found in data directory")
        st.stop()
    
    
    with st.container(border=True):
        # Two column layout
        col1, col2 = st.columns([1, 1])
        
        with col1:
            # Show case selection only when starting fresh (no progress)
            if st.session_state.current_step == 0:
                # Case selection
                st.subheader("📋 Case Selection")
                
                selected_case_name = st.selectbox(
                    "Choose a case:",
                    options=list(cases.keys()),
                    index=0,
                    label_visibility="collapsed"
                )
                
                # Load case if selection changed
                if selected_case_name != st.session_state.selected_case:
                    st.session_state.selected_case = selected_case_name
                    st.session_state.simulation_data = load_simulation_data(cases[selected_case_name])
                    reset_simulation()
                
                if st.button("▶️ Start Simulation", use_container_width=True, type="primary"):
                    st.session_state.is_running = True
                    st.rerun()
                
                # Patient information
                if st.session_state.simulation_data:
                    data = st.session_state.simulation_data
                    display_patient_info(data['patient'], data.get('actual_disease'))
            
            # Show controls when simulation has started (running or paused)
            else:
                if st.session_state.simulation_data:
                    timeline_length = len(st.session_state.simulation_data['timeline'])
                    progress = st.session_state.current_step / timeline_length if timeline_length > 0 else 0
                    st.progress(progress)
                    st.caption(f"Step {st.session_state.current_step} of {timeline_length}")
                
                col_a, col_b = st.columns(2)
                with col_a:
                    # Show Resume or Pause button based on state
                    if st.session_state.is_running:
                        if st.button("⏸️ Pause", use_container_width=True):
                            st.session_state.is_running = False
                            st.rerun()
                    else:
                        if st.button("▶️ Resume", use_container_width=True, type="primary"):
                            st.session_state.is_running = True
                            st.rerun()
                
                with col_b:
                    if st.button("⏹️ New Simulation", use_container_width=True):
                        reset_simulation()
                        st.rerun()
                
                # Show patient info during simulation too
                if st.session_state.simulation_data:
                    data = st.session_state.simulation_data
                    # display_patient_info(data['patient'], data.get('actual_disease'))
                    
                    # Show final summary if simulation complete
                    timeline_length = len(data['timeline'])
                    if st.session_state.current_step >= timeline_length:
                        st.markdown("### 🎯 Final Summary")
                        display_final_summary(data)
        
        with col2:
            # Simulation Timeline
            if st.session_state.simulation_data:
                if st.session_state.current_step > 0:
                    st.markdown("### 📊 Simulation Timeline")
                    
                    data = st.session_state.simulation_data
                    timeline = data['timeline']
                    timeline_length = len(timeline)
                    simulation_complete = st.session_state.current_step >= timeline_length
                    
                    # Display steps up to current step
                    for i in range(st.session_state.current_step):
                        if i < len(timeline):
                            # Last step should be collapsed if simulation is complete
                            is_current = (i == st.session_state.current_step - 1) and not simulation_complete
                            display_step(timeline[i], is_current)
                else:
                    st.subheader("Case Simulation")
                    st.info("👈 Select a case and click Start to begin the simulation")
                
                # Auto-advance if running (must be outside the current_step check)
                if st.session_state.is_running:
                    run_simulation()
            else:
                st.info("👈 Select a case and click Start to begin the simulation")


if __name__ == "__main__":
    main()
