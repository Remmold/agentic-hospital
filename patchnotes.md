# Patch 1: Outdoor Madness

**Release Date:** November 17, 2025

## New Features

**World Expansion**
- Map expanded from 40x30 to 40x50 tiles
- Added hospital parking lot and patient homes
- Implemented dynamic camera system with scrollable viewport
- Patients now travel between home and hospital

**Staff Behavior System**
- Staff can now trigger temporary movement events
- Examination nurses greet patients at reception
- Enhanced Doctor AI decision-making

**Simulation Controls**
- Speed adjustment functionality added to UI
- Redesigned play/pause button visuals

## Bug Fixes
- Fixed doctors and nurses using incorrect sprites
- Resolved pathfinding issue causing all patients to visit the same lab regardless of scan type (MRI/CT/X-Ray)
- Fixed staff getting permanently stuck in idle state
- Corrected sprite positioning with proper origin and offset values

## Technical Improvements
- Reflection agent now retries up to 5 times when creating learning principles
- Automated Python script moves completed cases and ensures unique patient names
- Updated location coordinates across all laboratories
- Added depth zones and collision detection for outdoor areas

- Added pathfinding code documentation
