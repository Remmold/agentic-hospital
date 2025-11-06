/**
 * @fileoverview Game-wide constants including locations, agent mappings, and configuration
 * Central configuration file for all static game data
 * 
 * @module utils/Constants
 * @author Hospital Simulation Team
 */

/**
 * Static locations in the hospital (in pixels)
 * All coordinates are based on 32x32 pixel tiles
 * 
 * @constant {Object} LOCATIONS
 */
export const LOCATIONS = {
    // Hospital entrance/exit
    ENTRANCE: { x: 21 * 32, y: 33 * 32, name: 'Hospital Entrance' },

    // Reception & Waiting Area - TWO DESKS
    RECEPTION: {
        base: { x: 17 * 32, y: 26 * 32, name: 'Reception Desk' },
        LEFT_COMPUTER: { x: 18 * 32, y: 792, name: 'Reception Desk' },
        RIGHT_COMPUTER: { x: 21 * 32, y: 792, name: 'Reception Desk' },
        LEFT: { x: 17 * 32, y: 26 * 32, name: 'Reception Desk Left' },
        RIGHT: { x: 20 * 32, y: 26 * 32, name: 'Reception Desk Right' },
        QUEUE_1: { x: 17 * 32, y: 27 * 32, name: 'Reception Queue 1' },
        QUEUE_2: { x: 20 * 32, y: 27 * 32, name: 'Reception Queue 2' },
    },

    // Waiting room with 11 chair positions (nested)
    WAITING_ROOM: {
        base: { x: 34 * 32, y: 26 * 32, name: 'Waiting Room' },
        // Top wall chairs
        CHAIR_1: { x: 32 * 32, y: 24 * 32, name: 'Waiting Room Chair 1' },
        CHAIR_2: { x: 34 * 32, y: 24 * 32, name: 'Waiting Room Chair 2' },
        CHAIR_3: { x: 35 * 32, y: 24 * 32, name: 'Waiting Room Chair 3' },
        CHAIR_4: { x: 37 * 32, y: 24 * 32, name: 'Waiting Room Chair 4' },
        // Bottom wall chairs
        CHAIR_5: { x: 32 * 32, y: 29 * 32, name: 'Waiting Room Chair 5' },
        CHAIR_6: { x: 33 * 32, y: 29 * 32, name: 'Waiting Room Chair 6' },
        CHAIR_7: { x: 36 * 32, y: 29 * 32, name: 'Waiting Room Chair 7' },
        CHAIR_8: { x: 37 * 32, y: 29 * 32, name: 'Waiting Room Chair 8' },
        // Right wall chairs
        CHAIR_9: { x: 38 * 32, y: 25 * 32, name: 'Waiting Room Chair 9' },
        CHAIR_10: { x: 38 * 32, y: 26 * 32, name: 'Waiting Room Chair 10' },
        CHAIR_11: { x: 38 * 32, y: 27 * 32, name: 'Waiting Room Chair 11' },
    },

    // Pharmacy
    PHARMACY: {
        base: { x: 5 * 32, y: 26 * 32, name: 'base' },
        PHARMACIST_BEHIND_COUNTER_1: { x: 2 * 32, y: 20 * 32, name: 'Pharmacist Behind Counter 1' },
        PHARMACIST_BEHIND_COUNTER_2: { x: 5 * 32, y: 20 * 32, name: 'Pharmacist Behind Counter 2' },
        PATIENT_IN_FRONT_OF_COUNTER_1: { x: 5 * 32, y: 27 * 32, name: 'Patient In Front Of Counter 1' },
        PATIENT_IN_FRONT_OF_COUNTER_2: { x: 6 * 32, y: 27 * 32, name: 'Patient In Front Of Counter 2' }
    },

    // Examination Rooms - DOCTORS_OFFICE with multiple sub-positions
    DOCTORS_OFFICE: {
        base: { x: 37 * 32, y: 12 * 32, name: 'Doctor\'s Office' },
        DOCTORS_CHAIR: { x: 1220, y: 365, name: 'Doctor\'s Chair' },
        PATIENT_CHAIR: { x: 38 * 32, y: 12 * 32, name: 'Patient Chair' },
        EXAM_BENCH: { x: 36 * 32, y: 12 * 32, name: 'Exam Bench' }
    },

    // Examination Rooms - NURSE_OFFICE with multiple sub-positions
    NURSE_OFFICE: {
        base: { x: 34 * 32, y: 17 * 32, name: 'Nurse Office' },
        NURSE_DESK: { x: 34 * 32, y: 17 * 32, name: 'Nurse\'s desk' },
        NURSE_BY_PATIENT_SEAT: { x: 36 * 32, y: 18 * 32, name: 'Nurse by patient seat' },
        PATIENT_SEAT: { x: 35 * 32, y: 17 * 32, name: 'Patient seat' }
    },

    // Lab
    LAB: {
        base: { x: 21 * 32, y: 20 * 32, name: 'default' },
        NURSE_POSITION: { x: 21 * 32, y: 20 * 32, name: 'Lab Nurse Position' },
        BIG_MACHINE: { x: 21 * 32, y: 17.2 * 32, name: 'Lab Big Machine' },
        SMALL_MACHINE: { x: 21 * 32, y: 19.8 * 32, name: 'Lab Small Machine' },
        PATIENT_CHAIR: { x: 23 * 32, y: 21 * 32, name: 'Patient Chair' },
    },

    // MRI
    MRI: {
        base: { x: 2 * 32, y: 7 * 32, name: 'MRI Room' },
        STAFF_CHAIR: { x: 3 * 32, y: 6 * 32, name: 'Doctor/nurse\'s desk' },
        PATIENT_CHAIR: { x: 2 * 32, y: 7 * 32, name: 'Patient\'s chair' },
        MRI_MACHINE: { x: 2 * 32, y: 7 * 32, name: 'In machine' },
        BEHIND_CURTAIN: { x: 2 * 32, y: 7 * 32, name: 'Behind curtain' },
        ON_SCALE: { x: 2 * 32, y: 7 * 32, name: 'On scale' },
    },

    // Conference Room
    CONFERENCE_ROOM: {
        BASE: { x: 19 * 32, y: 6.5 * 32, name: 'Conference Room Base' },
        BOTTOM_CHAIR_1: { x: 16.5 * 32, y: 9.8 * 32, name: 'Conference Room Chair 1' },
        BOTTOM_CHAIR_2: { x: 17.5 * 32, y: 9.8 * 32, name: 'Conference Room Chair 2' },
        BOTTOM_CHAIR_3: { x: 18.5 * 32, y: 9.8 * 32, name: 'Conference Room Chair 3' },
        BOTTOM_CHAIR_4: { x: 19.5 * 32, y: 9.8 * 32, name: 'Conference Room Chair 4' },
        BOTTOM_CHAIR_5: { x: 20.5 * 32, y: 9.8 * 32, name: 'Conference Room Chair 5' },
        BOTTOM_CHAIR_6: { x: 21.5 * 32, y: 9.8 * 32, name: 'Conference Room Chair 6' },
        BOTTOM_CHAIR_7: { x: 22.5 * 32, y: 9.8 * 32, name: 'Conference Room Chair 7' },
        TOP_CHAIR_1: { x: 16.5 * 32, y: 7.5 * 32, name: 'Conference Room Chair 8' },
        TOP_CHAIR_2: { x: 17.5 * 32, y: 7.5 * 32, name: 'Conference Room Chair 9' },
        TOP_CHAIR_3: { x: 18.5 * 32, y: 7.5 * 32, name: 'Conference Room Chair 10' },
        TOP_CHAIR_4: { x: 19.5 * 32, y: 7.5 * 32, name: 'Conference Room Chair 11' },
        TOP_CHAIR_5: { x: 20.5 * 32, y: 7.5 * 32, name: 'Conference Room Chair 12' },
        TOP_CHAIR_6: { x: 21.5 * 32, y: 7.5 * 32, name: 'Conference Room Chair 13' },
        TOP_CHAIR_7: { x: 22.5 * 32, y: 7.5 * 32, name: 'Conference Room Chair 14' },
    },

    // Labs
    LAB_DEFAULT: { x: 23 * 32, y: 16 * 32, name: 'Lab (Blood Test)' },
    LAB_NURSE_POSITION: { x: 20 * 32, y: 20 * 32, name: 'Lab Nurse Position' },
    XRAY_TECH_POSITION: { x: 34 * 32, y: 6.8 * 32, name: 'X-Ray Tech Position' },
    XRAY_VIEW_WINDOW_POSITION: { x: 37 * 32, y: 6.8 * 32, name: 'X-Ray View Window Position' },
    LAB_MRI: { x: 2 * 32, y: 7 * 32, name: 'MRI Room' },
    LAB_XRAY: { x: 37 * 32, y: 2 * 32, name: 'X-Ray Room' },
    LAB_BLOOD: { x: 32 * 32, y: 15 * 32, name: 'Blood Test Room' },
    LAB_CT: { x: 38 * 32, y: 18 * 32, name: 'CT Scan Room' },
};

/**
 * Map agent types to their default locations
 * Used by patient simulation to determine where agents work
 * 
 * @constant {Object} AGENT_LOCATIONS
 */
export const AGENT_LOCATIONS = {
    'Nurse': 'NURSE_OFFICE',
    'Doctor': 'DOCTORS_OFFICE',
    'Lab': 'LAB_DEFAULT',
    'Reflection': 'DOCTORS_OFFICE' // Reflection step happens at doctor's office
};

/**
 * Map test types to their corresponding lab locations
 * Used to route patients to correct lab based on test type
 * 
 * @constant {Object} LAB_TEST_LOCATIONS
 */
export const LAB_TEST_LOCATIONS = {
    'mri': 'LAB_MRI',
    'xray': 'LAB_XRAY',
    'x-ray': 'LAB_XRAY',
    'blood': 'LAB_DEFAULT',
    'ct': 'LAB_MRI',
    'ct scan': 'LAB_MRI'
};

/**
 * Phone animation timing configuration
 * Controls how long characters hold phones and wait between calls
 * 
 * @constant {Object} PHONE_ANIMATION
 */
export const PHONE_ANIMATION = {
    HOLD_MIN: 5000,      // Minimum hold time (ms)
    HOLD_MAX: 15000,     // Maximum hold time (ms)
    WAIT_MIN: 3000,      // Minimum wait between cycles (ms)
    WAIT_MAX: 7000       // Maximum wait between cycles (ms)
};

/**
 * Get a random location from all available locations
 * Useful for testing or random NPC placement
 * 
 * @returns {Object} Random location with x, y, and name properties
 * 
 * @example
 * const randomLoc = getRandomLocation();
 * sprite.setPosition(randomLoc.x, randomLoc.y);
 */
export function getRandomLocation() {
    const keys = Object.keys(LOCATIONS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return LOCATIONS[randomKey];
}

/**
 * Get location coordinates - handles both flat and nested locations
 * Supports string keys like 'ENTRANCE' or 'RECEPTION.LEFT'
 * Also accepts location objects directly
 * 
 * @param {string|Object} locationKey - Location key or location object
 * @returns {Object|null} Location object with x, y coordinates, or null if not found
 * 
 * @example
 * // Flat location
 * const entrance = getLocation('ENTRANCE'); // { x: 672, y: 1056, name: 'Hospital Entrance' }
 * 
 * // Nested location
 * const leftDesk = getLocation('RECEPTION.LEFT'); // { x: 544, y: 832, name: 'Reception Desk Left' }
 * 
 * // Pass through object
 * const loc = getLocation({ x: 100, y: 200 }); // Returns { x: 100, y: 200 }
 */
export function getLocation(locationKey) {
    // If already an object with x and y, return it
    if (typeof locationKey === 'object' && locationKey.x && locationKey.y) {
        return locationKey;
    }

    // Must be a string key
    if (typeof locationKey !== 'string') {
        console.error('[getLocation] Invalid location key:', locationKey);
        return null;
    }

    // Handle flat locations (e.g., 'ENTRANCE')
    if (LOCATIONS[locationKey]) {
        const loc = LOCATIONS[locationKey];
        // If location has x and y directly, return it
        if (loc.x !== undefined && loc.y !== undefined) {
            return loc;
        }
        // If location has a 'base' property, return that
        if (loc.base) {
            return loc.base;
        }
    }

    // Handle nested locations (e.g., 'RECEPTION.LEFT', 'WAITING_ROOM.CHAIR_1')
    const parts = locationKey.split('.');
    if (parts.length === 2) {
        const room = LOCATIONS[parts[0]];
        const position = room?.[parts[1]];
        if (position && position.x !== undefined) {
            return position;
        }
    }

    console.error(`[getLocation] Location not found: ${locationKey}`);
    return null;
}