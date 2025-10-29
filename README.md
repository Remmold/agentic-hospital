# Hospital Simulation System

**Multi-Agent Medical Diagnosis Simulation with Visual Environment**

## Project Overview

An interactive hospital simulation system that visualizes AI agents (doctors, nurses, lab staff) diagnosing patients through a step-by-step workflow. The system uses synthetic medical simulation data to animate agent movements through a digital hospital, tracking diagnostic accuracy and learning from outcomes.

### Key Components

1. **Agent-Based Simulation**: `Pydantic AI`-based medical agents (Nurse, Doctor, Lab, etc) that process patient cases through triage, examination, and testing
2. **Visual Environment**: `Phaser.js`-powered 2D hospital with tile-based rooms and animated character sprites
3. **Streamlit Dashboard**: Interface for selecting cases, viewing simulation steps, and tracking diagnostic outcomes (*in development - might drop later*)
4. **Learning Loop**: Agents improve diagnostic accuracy by analyzing successful vs unsuccessful cases

## Project Structure
### agents/
AI agent implementations that simulate medical staff decision-making. Each agent (Nurse, Doctor, Lab) has structured inputs/outputs and follows clinical workflows. Agents use LLMs to make realistic decisions based on patient data and previous steps in the diagnostic process.

### database_management/
Storage layer for patient cases, learning, and diagnostic outcomes. Intended for tracking agent performance over time and enabling the learning system to analyze patterns in successful vs unsuccessful diagnoses.

### extraction/
(Legacy) PDF text extraction and medical document parsing. Originally designed to convert different medical documents into structured data. Contains OCR utilities and LLM-based parsing. Currently unused but retained for potential integration with real medical documents.

### simulation/
Orchestrates multi-agent diagnostic workflows. The `runner.py` coordinates agent interactions (Nurse → Doctor → Lab), manages state between steps, and outputs JSON timelines. The `ui/data/` subfolder contains pre-configured case scenarios for testing.

### ui/
Streamlit dashboard for case selection and simulation playback. Provides a two-column interface: left side shows patient info and controls (Start/Pause/Reset), right side displays the step-by-step timeline as agents make decisions. Links to the Phaser visualization for spatial representation.

### utils/
Shared utilities, constants, and helper functions used across modules. Includes common data structures, configuration management, and reusable logic for agent coordination.

### visualization/
Phaser.js-powered 2D hospital environment. Contains the Tiled map (`hospital_scene.json`), all tilesets (floors, walls, props, borders), character spritesheets, and the game logic (`game.js`, `HospitalScene.js`, etc).

(To be implemented) Reads JSON timelines from the simulation module and animates agents moving through rooms to perform diagnostic tasks.

## Current Status: MVP Phase

### ✅ Completed
- Agent-based simulation pipeline (Nurse → Doctor → Lab)
- JSON timeline generation from agent decisions
- Learning system (agents improve from mistakes)
- Character sprite loading and positioning
- Layer depth management for sprite occlusion
- Animation system (idle, walking)
- Streamlit case selection interface

### 🚧 In Progress
- AI-agent integration with Phaser
- A* pathfinding
- Simulation playback from JSON timeline

### 📋 Planned
- Custom user input scenario
- Diagnostic outcome metrics
- Polishing of depth zones, collision, etc

## Installation

### Prerequisites
- **Python 3.9+**
- **uv** (Python package manager)
- **Node.js** (optional, for Phaser development)

### Setup & Run

1. **Clone the repository**
```bash
   git clone <repository-url>
   cd hospital-simulation-pipeline
```

2. **Install Python dependencies**
```bash
   uv sync
```

3. **Run Phaser visualization**
```bash
   cd src/hs_pipeline/visualization
   python -m http.server 8000
```
   Open browser to `http://localhost:8000`

## Technology Stack

- **Backend**: Python 3.9, OpenAI API, Pydantic & Pydantic AI
- **Frontend**: Streamlit (dashboard), Phaser 3 (visualization)
- **Map Editor**: Tiled (2D map creation)
- **Asset Management**: Custom 32x32px tilesets

## Design Philosophy

- **Modular Architecture**: Each agent operates independently
- **Data-Driven**: Simulation behavior defined by JSON configurations
- **Visual First**: Every agent action is visually represented
- **Iterative Learning**: System improves through outcome analysis
