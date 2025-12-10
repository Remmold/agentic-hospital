"""
Hospital Simulation Pipeline - Multi-Agent Medical Diagnosis System.

A simulation system where AI agents (Nurse, Doctor, Lab) collaborate to diagnose
patients through a step-by-step workflow. The system visualizes agent movements
through a Phaser.js-powered 2D hospital environment, tracking diagnostic accuracy
and learning from outcomes.

Modules:
    simulation: Main simulation module containing:
        - agents: AI agent implementations (Nurse, Doctor, Lab, Reflection)
        - database: DuckDB + ChromaDB storage layer
        - runner: Simulation orchestration
    extraction: Document parsing utilities (PDF, images, OCR)
    visualization: Phaser.js 2D hospital environment
    utils: Shared constants, helpers, and configuration

Backward Compatibility:
    The `agents` and `database_management` modules have been moved into
    `simulation`. The old import paths still work but are deprecated.
"""

__version__ = "0.1.0"

# Backward compatibility: Re-export from new locations
# These allow old imports to continue working:
#   from hs_pipeline.agents import ...
#   from hs_pipeline.database_management import ...
# 
# New preferred imports:
#   from hs_pipeline.simulation.agents import ...
#   from hs_pipeline.simulation.database import ...

# Note: We don't import here to avoid circular imports.
# The old modules in agents/ and database_management/ still exist
# and will work, but are considered deprecated.
