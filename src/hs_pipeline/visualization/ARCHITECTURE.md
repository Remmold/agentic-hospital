# 🏥 Hospital Simulation - Visualization Architecture

## 📚 Table of Contents
- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Core Concepts](#core-concepts)
- [Adding New Features](#adding-new-features)
- [Import Patterns](#import-patterns)
- [Best Practices](#best-practices)

---

## Overview

The visualization layer is a Phaser 3-based hospital simulation that displays patient journeys through a medical facility. The codebase is organized into focused, single-responsibility modules for maintainability and clarity.

**Key Technologies:**
- Phaser 3.60 (Game framework)
- Vanilla JavaScript (ES6 modules)
- Tiled (Map editor)

---

## Directory Structure

```
visualization/
├── animation/           # Character animation systems
├── assets/              # Game assets (sprites, maps, sounds)
├── core/                # Core systems and utilities
├── input/               # Input handling and movement
├── pathfinding/         # A* pathfinding implementation
├── patient/             # Patient queue and spawning
├── physics/             # Collision and spatial systems
├── rendering/           # Visual effects and depth sorting
├── scenes/              # Phaser scene management
├── simulation/          # Patient simulation logic
├── staff/               # Staff NPC management
├── ui/                  # User interface components
├── game.js              # Game entry point
├── index.html           # Application entry
└── styles.css           # UI styles
```

---

## Core Concepts

### **Event-Driven Architecture**

The system uses a centralized EventBus for communication:

```javascript
// core/EventBus.js
EventBus.emit(EVENT_NAMES.PATIENT_CASE_LOADED, {
    caseData: data,
    sprite: sprite,
    patientId: id
});

// Listeners in scenes/SceneEventHandlers.js
EventBus.on(EVENT_NAMES.PATIENT_CASE_LOADED, (event) => {
    // Handle event
});
```

**Available Events:**
- `SIMULATION_PAUSE` - Pause/resume simulation
- `SIMULATION_SPEED` - Change playback speed
- `PATIENT_CASE_LOADED` - New patient case loaded
- `PATIENT_CLICKED` - Patient sprite clicked
- `PATIENT_CHIP_CLICKED` - Patient UI chip clicked
- `SIMULATION_STEP_CHANGED` - Timeline step changed
- `SIMULATION_COMPLETE` - Patient completed journey

---

### **Patient Flow**

1. **Spawning:** `patient/PatientSpawner.js` creates new patients
2. **Queue Management:** `patient/PatientQueue.js` manages active/waiting/completed lists
3. **Simulation:** `simulation/PatientSimulation.js` coordinates the patient's journey
4. **Movement:** `simulation/PatientMovement.js` handles pathfinding
5. **Animation:** `simulation/PatientAnimations.js` manages sprite animations

```
PatientSpawner
    └── Creates PatientSimulation
        ├── Uses PatientMovement (pathfinding)
        ├── Uses PatientAnimations (sprite animations)
        └── Emits EventBus events
            └── SceneEventHandlers responds
                └── Updates UI
```

---

### **Scene Lifecycle**

```
HospitalScene (Main orchestrator)
    ├── preload()  - Load assets via MapLoader
    ├── create()   - Initialize systems
    │   ├── SceneInitializer.setupManagers()
    │   ├── SceneInitializer.setupPlayer()
    │   ├── SceneInitializer.setupPathfinding()
    │   └── SceneEventHandlers.setupAllHandlers()
    ├── update()   - Game loop (60 FPS)
    └── shutdown() - Cleanup resources
```

---

## Directory Details

<details>

<summary>animation/ - Character Animation Systems</summary>

### **`animation/`** - Character Animation Systems

**Purpose:** Manage character sprites and animations

**Files:**
- `AnimationManager.js` - Animation configurations and playback
- `AnimationUtils.js` - Helper functions for animation operations
- `CharacterFactory.js` - Creates character sprites with animations

**Usage:**
```javascript
import { CharacterFactory } from './animation/CharacterFactory.js';

const sprite = CharacterFactory.createCharacter(
    scene, 'patient', 'pat_5', x, y, options
);
CharacterFactory.playAnimation(sprite, 'walk', 'up');
```

</details>

---

<details>

<summary>core/ - Foundation Systems</summary>

### **`core/`** - Foundation Systems

**Purpose:** Core utilities needed throughout the application

**Files:**
- `Constants.js` - Location data, agent locations, game constants
- `EventBus.js` - Centralized event system
- `DebugManager.js` - Debug visualization and logging
- `MapLoader.js` - Loads tilemap and assets

**When to add here:**
- System-wide configuration
- Cross-cutting concerns
- Scene setup utilities
</details>

---

<details>

<summary>input/ - Input and Movement Control</summary>

### **`input/`** - Input and Movement Control

**Purpose:** Handle player input and character movement

**Files:**
- `InputManager.js` - Keyboard input (WASD, Arrow keys)
- `MovementController.js` - Apply input to sprite movement

**Usage:**
```javascript
const input = inputManager.getMovementInput();
movementController.handleMovement(input);
```
</details>

---

<details>

<summary>pathfinding/ - A* Pathfinding</summary>

### **`pathfinding/`** - A* Pathfinding

**Purpose:** Navigate characters through the hospital

**Files:**
- `PathfindingManager.js` - High-level pathfinding API
- `PathfindingGrid.js` - Grid representation of walkable areas
- `AStarPathfinder.js` - A* algorithm implementation

**Usage:**
```javascript
pathfinding.moveToPoint(sprite, targetX, targetY, speed, onComplete);
```
</details>

---

<details>

<summary>patient/ - Patient System</summary>

### **`patient/`** - Patient System

**Purpose:** Manage patient spawning, queueing, and lifecycle

**Files:**
- `PatientQueueManager.js` - Main interface (wraps Queue + Spawner)
- `PatientQueue.js` - Queue state (active/waiting/completed)
- `PatientSpawner.js` - Spawns patients, loads case files
- `PatientSpriteRegistry.js` - Tracks used patient sprites

**Patient States:**
1. **Active** - Currently going through timeline
2. **Waiting** - In waiting room, queued for timeline
3. **Completed** - Finished timeline and exited
</details>

---

<details>

<summary>physics/ - Collision and Spatial Systems</summary>

### **`physics/`** - Collision and Spatial Systems

**Purpose:** Handle collision detection and zone management from tilemap

**Files:**
- `CollisionManager.js` - Prop collision from object layer
- `ZoneManager.js` - Depth zones for room-based rendering

**Both parse Tiled object layers:**
- `prop_collisions` → CollisionManager
- `depth_zones` → ZoneManager
</details>

---

<details>

<summary>rendering/ - Visual Systems</summary>

### **`rendering/`** - Visual Systems

**Purpose:** Visual effects and rendering management

**Files:**
- `DepthManager.js` - Sprite depth sorting based on Y position and zones
- `DoorManager.js` - Door triggers and animations
- `GlowManager.js` - Selection glow effect around patients

**Depth Layers:**
```
-1000: floor
20:    wall_behind
40:    props_behind
11-19: PLAYER (behind wall zones)
41-49: PLAYER (behind dynamic zones)
50:    props_dynamic
60:    props
100+:  PLAYER (outside zones)
10000: props_in_front
30000: walls_inside, labels
```
</details>

---

<details>

<summary>scenes/ - Scene Management</summary>

### **`scenes/`** - Scene Management

**Purpose:** Phaser scene setup and coordination

**Files:**
- `HospitalScene.js` - Main game scene (orchestrator)
- `SceneEventHandlers.js` - EventBus subscriptions
- `SceneInitializer.js` - Scene component setup

**Separation of concerns:**
- HospitalScene = High-level flow
- SceneEventHandlers = Event logic
- SceneInitializer = Setup/initialization
</details>

---

<details>

<summary>simulation/ - Patient Simulation Logic</summary>

### **`simulation/`** - Patient Simulation Logic

**Purpose:** Patient journey simulation and timeline execution

**Files:**
- `PatientSimulation.js` - Main coordinator (588 lines)
- `PatientMovement.js` - Movement between locations
- `PatientAnimations.js` - Animation management

**Patient Journey:**
1. Spawn at entrance
2. Go to reception desk
3. Go to waiting room (if not first)
4. Execute timeline (Doctor → Nurse → Lab → etc.)
5. Return to entrance
6. Exit
</details>

---

<details>

<summary>staff/ - Staff NPC Management</summary>

### **`staff/`** - Staff NPC Management

**Purpose:** Manage hospital staff NPCs

**Files:**
- `StaffManager.js` - Staff spawning and behavior
- `StaffConfig.js` - Staff configuration data (17 NPCs)

**Staff Types:**
- Doctors (1)
- Nurses (4)
- Lab Technicians (3)
- Receptionists (2)
- Pharmacists (2)
- Conference Attendees (7)

**Adding Staff:**
```javascript
// In StaffConfig.js
export const STAFF_CONFIG = [
    // ... existing staff ...
    {
        id: 'new_staff_id',
        spritesheet: 'nurse_5',
        initialPosition: { ...LOCATIONS.SOMEWHERE },
        patrol: false, // or array of waypoints
        idleAction: 'idle',
        idleDirection: 'down'
    }
];
```
</details>

---

<details>

<summary>ui/ - User Interface</summary>

### **`ui/`** - User Interface

**Purpose:** Frontend UI components (React/HTML)

**Files:**
- `UIManager.js` - Patient timeline display, controls, patient selector

**UI Elements:**
- Patient case viewer
- Timeline steps
- Pause/Play controls
- Speed controls
- Patient selector chips
</details>

---

## Adding New Features

### **Adding a New Manager**

1. **Choose appropriate directory:**
   - Visual effects? → `rendering/`
   - Physics/collision? → `physics/`
   - Input/control? → `input/`
   - Core utility? → `core/`

2. **Create the manager:**
```javascript
// rendering/NewManager.js
export class NewManager {
    constructor(scene) {
        this.scene = scene;
    }
    
    // Methods...
}
```

3. **Register in SceneInitializer:**
```javascript
// scenes/SceneInitializer.js
setupManagers() {
    // ... existing managers
    this.scene.newManager = new NewManager(this.scene);
}
```

---

### **Adding a New Event**

1. **Define event in EventBus:**
```javascript
// core/EventBus.js
export const EVENT_NAMES = {
    // ... existing events
    NEW_EVENT: 'newEvent'
};
```

2. **Emit the event:**
```javascript
EventBus.emit(EVENT_NAMES.NEW_EVENT, { data: value });
```

3. **Listen for the event:**
```javascript
// scenes/SceneEventHandlers.js
setupNewEventHandler() {
    const unsubscribe = EventBus.on(EVENT_NAMES.NEW_EVENT, (e) => {
        // Handle event
    });
    this.eventUnsubscribers.push(unsubscribe);
}
```

---

### **Adding a New Staff Member**

Simply add to `staff/StaffConfig.js`:
```javascript
{
    id: 'janitor_1',
    spritesheet: 'janitor_1',
    initialPosition: { ...LOCATIONS.HALLWAY },
    patrol: [
        { ...LOCATIONS.POINT_A, idleMs: 3000 },
        { ...LOCATIONS.POINT_B, idleMs: 3000 }
    ],
    idleAction: 'idle',
    idleDirection: 'right'
}
```

---

## Import Patterns

### **Relative Imports**
```javascript
// Within same directory
import { Something } from './Something.js';

// From parent directory
import { Something } from '../parent/Something.js';

// From sibling directory
import { Something } from '../sibling/Something.js';
```

### **Common Import Chains**
```javascript
// Scene imports
import { MapLoader } from '../core/MapLoader.js';
import { CharacterFactory } from '../animation/CharacterFactory.js';
import { EventBus, EVENT_NAMES } from '../core/EventBus.js';

// Patient system imports
import { PatientSimulation } from '../simulation/PatientSimulation.js';
import { PatientQueue } from './PatientQueue.js';

// Manager imports
import { CollisionManager } from '../physics/CollisionManager.js';
import { DepthManager } from '../rendering/DepthManager.js';
```

---

## Best Practices

### **File Organization**
- ✅ Keep files under 300 lines
- ✅ One class per file
- ✅ Single responsibility principle
- ✅ Export only what's needed

### **Naming Conventions**
- **Files:** PascalCase (e.g., `PatientSpawner.js`)
- **Classes:** PascalCase (e.g., `class PatientQueue`)
- **Variables:** camelCase (e.g., `patientId`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `EVENT_NAMES`)
- **Private methods:** Use JSDoc `@private` tag

### **Documentation**
- ✅ Add JSDoc to all public methods
- ✅ Include `@param` and `@returns` tags
- ✅ Document complex logic inline
- ✅ Explain "why", not just "what"

### **Event Handling**
- ✅ Always unsubscribe in cleanup
- ✅ Store unsubscribe functions
- ✅ Use EVENT_NAMES constants
- ✅ Include relevant data in event payload

### **Error Handling**
- ✅ Use try-catch for critical operations
- ✅ Log errors with context
- ✅ Fail gracefully
- ✅ Provide fallback values

### **Code Style**
```javascript
// Good: Clear, documented, single responsibility
/**
 * Spawn a patient at the entrance
 * @param {string} spritesheet - Patient sprite key
 * @param {Object} caseData - Medical case data
 */
spawnPatient(spritesheet, caseData) {
    // Implementation
}

// Bad: No docs, unclear purpose
spawnP(s, d) {
    // Implementation
}
```

---

## Common Patterns

### **Manager Pattern**
```javascript
export class SomethingManager {
    constructor(scene, dependencies) {
        this.scene = scene;
        // Store dependencies
    }
    
    // Public API methods
    
    // Private helper methods (use @private in JSDoc)
}
```

### **EventBus Pattern**
```javascript
// Emitter
EventBus.emit(EVENT_NAMES.SOMETHING_HAPPENED, {
    data: value,
    timestamp: Date.now()
});

// Listener
const unsubscribe = EventBus.on(EVENT_NAMES.SOMETHING_HAPPENED, (e) => {
    console.log(e.detail.data);
});

// Cleanup
unsubscribe();
```

### **Factory Pattern**
```javascript
// animation/CharacterFactory.js
export class CharacterFactory {
    static createCharacter(scene, type, spritesheet, x, y, options) {
        // Create with defaults
        // Setup animations
        // Return configured sprite
    }
}
```

---

## Performance Considerations

- **Object Pooling:** Consider for frequently created/destroyed objects
- **Event Cleanup:** Always unsubscribe to prevent memory leaks
- **Depth Updates:** Only update when position changes significantly
- **Animation Caching:** Animations are created once per sprite type
- **Pathfinding:** Use cached paths when possible

---

## Testing Checklist

When making changes, verify:
- [ ] No console errors
- [ ] All imports resolve correctly
- [ ] EventBus listeners are cleaned up
- [ ] Animations play correctly
- [ ] Pathfinding works
- [ ] Patient queue flows properly
- [ ] UI updates correctly
- [ ] No memory leaks (check DevTools)

---

## Troubleshooting

### **Import Errors**
- Check relative path is correct
- Verify file extension `.js` is included
- Ensure export/import names match

### **Event Not Firing**
- Verify EVENT_NAME is correct
- Check event is being emitted
- Ensure listener is registered before emit

### **Animation Issues**
- Check sprite has `uniqueId` set
- Verify animation key exists
- Ensure CharacterFactory.createAnimations() was called

### **Pathfinding Fails**
- Check collision layer exists
- Verify PathfindingGrid is initialized
- Ensure target is walkable

---

## Contributing

When adding new features:
1. Choose the appropriate directory
2. Follow naming conventions
3. Add comprehensive JSDoc
4. Update this ARCHITECTURE.md if needed
5. Test thoroughly
6. Update imports in dependent files

---

## Questions?

For architecture questions or suggestions, contact the development team.

**Last Updated:** 2025-11-07