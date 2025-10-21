import streamlit as st
from pathlib import Path
import json


# Activity Log module
def activity_log():
    st.subheader("Activity Log")
    print_timeline_steps()


def get_timeline():
    ui_root = Path(__file__).parent
    data_path = ui_root / "data"
    file_path = data_path / "output_random_hypothyroidism(new).json"
    print("Getting timeline from json...")
    with open(file=file_path, mode="r", encoding="utf-8") as file:
        json_dict = json.load(file)
        return json_dict["timeline"]
    

def print_timeline_steps():
    timeline_dict = get_timeline()
    for step in timeline_dict:
        st.code(body=step["agent"], language="json")


def main_app():
    st.set_page_config(page_title="Hospital Simulation")
    with st.container(border=True):
        activity_log()


main_app()