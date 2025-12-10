# Hospital Simulation System

**Multi-Agent Medical Diagnosis Simulation with Visual Environment**

🔗 **[Live Demo](https://hospital-simulation.lifeatlas.online/)**

## Project Overview

An interactive hospital simulation system that visualizes AI agents (doctors, nurses, lab staff) diagnosing patients through a step-by-step workflow. The system uses synthetic medical simulation data to animate agent movements through a digital hospital, tracking diagnostic accuracy and learning from outcomes.

### Key Components

1. **Agent-Based Simulation**: `Pydantic AI`-based medical agents (Nurse, Doctor, Lab, Reflection) that process patient cases through triage, examination, and testing
2. **Visual Environment**: `Phaser.js`-powered 2D hospital with tile-based rooms, animated character sprites, and A* pathfinding
3. **Learning Loop**: Agents improve diagnostic accuracy by analyzing successful vs unsuccessful cases

## Project Structure

### simulation/
**Main application module.** Contains all core simulation components:
- **agents/**: AI agent implementations (Nurse, Doctor, Lab, Reflection) with LLM-based decision-making
- **database/**: DuckDB + ChromaDB storage for cases, learning experiences, and diagnostic outcomes
- **runner.py**: Orchestrates agent interactions and outputs JSON timelines for visualization

See [simulation/README.md](src/hs_pipeline/simulation/README.md) for details.

### extraction/
Document parsing utilities for converting medical documents into structured data. Contains both programmatic parsing and LLM-based parsing for PDFs, images (OCR via Tesseract), and various document formats. See [extraction/README.md](src/hs_pipeline/extraction/README.md) for details.

### utils/
Shared utilities, constants, and helper functions used across modules. Includes LLM configuration, disease definitions, and reusable logic for agent coordination.

### visualization/
Phaser.js-powered 2D hospital environment. Contains the Tiled map, all tilesets (floors, walls, props, outdoor areas), character spritesheets, and game logic. Reads JSON timelines from `simulation_results/` and animates agents moving through rooms to perform diagnostic tasks. See [visualization/ARCHITECTURE.md](src/hs_pipeline/visualization/ARCHITECTURE.md) for details.

## Current Status

### ✅ Completed
- Agent-based simulation pipeline (Nurse → Doctor → Lab → Reflection)
- JSON timeline generation from agent decisions
- Learning system (agents improve from mistakes via reflection)
- AI agent integration with Phaser visualization
- A* pathfinding for character movement
- Simulation playback from JSON timeline
- Character sprite loading and positioning
- Layer depth management for sprite occlusion
- Animation system (idle, walking)
- Staff NPC behavior and events
- Outdoor environment (parking lot, patient homes)
- Dynamic camera system with scrollable viewport
- Simulation speed controls

### 📋 Planned / Future Enhancements
- Custom user input scenarios (live chat/document upload)
- Diagnostic outcome metrics dashboard
- Additional polish (depth zones, collision refinement)
- Improve pathfinding (currently using tile-based pathfinding)
- Improve NPC behavior (currently using simple A* pathfinding)
- Patient follow camera (in separate viewport/canvas)

## Installation

### Prerequisites
- **Python 3.11+**
- **uv** (Python package manager)

### Setup & Run

1. **Clone the repository**
```bash
git clone https://github.com/LifeAtlas/hospital-simulation-pipeline.git
cd hospital-simulation-pipeline
```

2. **Configure environment**
```bash
cp .example.env .env
# Edit .env with your API keys (see .example.env for required variables)
```

3. **Install Python dependencies**
```bash
uv sync
```

4. **Run the visualization locally**
```bash
cd src/hs_pipeline/visualization
python -m http.server 8000
```
Open browser to `http://localhost:8000`

## Technology Stack

- **Backend**: Python 3.11+, Pydantic AI, Gemini/Azure OpenAI
- **Database**: DuckDB (structured), ChromaDB (vector search)
- **Frontend**: Phaser 3 (visualization)
- **Map Editor**: Tiled (2D map creation)
- **Asset Management**: 32x32px tilesets + character spritesheets

## Design Philosophy

- **Modular Architecture**: Each agent operates independently with clear interfaces
- **Data-Driven**: Simulation behavior defined by JSON configurations
- **Visual First**: Every agent action is visually represented in the hospital
- **Iterative Learning**: System improves through outcome analysis and reflection


