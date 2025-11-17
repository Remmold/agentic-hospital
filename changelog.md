# CHANGELOG

## Patch 1: Outdoor Madness

## 2025-11-10 - Pull-Request #22 & #23
- Ensured doctor/nursesprites weren't used interchangably.
- Updated Location coordinates for various labratories
- Fixed bug that caused patients to always walk to the same general lab even for MRI/CT/X-Ray scans.
- Add simulation speed functionality to UI aswell as Updated visuals for the play/pause button.
- Updated Doctor agent to rely less on database and use its own brain a bit more
- Updated Reflection agent to retry until successfully creating learning principle or max 5 retries
- Created python script that automaticly moves completed simulation cases to phaser portion of code and ensures unique names for each patient

## 2025-11-11 - Pull-Request #24
- Fixed sprite origin and x/y-offset for correct positioning on tiles
- Updated `[LOCATIONS]` in `Constants.js` to match the new positioning
- Updated Glow to match new y-offset
- Add comments to pathfinding/ files for clarity

## 2025-11-12 - Pull-Request #25
- Add Staff event system that triggers temporary deviations in movement
- Fix permanent Idle in staff events
- Add Staff event for examination nurse (now greets patients)
- Update constants to  more specific locations

## 2025-11-13 Pull-Request #26
- expand tilemap from 40x30 to 40x50
- Add new Camera system
- Make game window scrollable

## 2025-11-17 Pull-Request #27 & #28
- Update start/stop location for patients (house)
- Add Hospital Parking lot
- Add Patient Home
- Add depthzones and collision objects
