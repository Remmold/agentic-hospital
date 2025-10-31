// Static locations in the hospital (in pixels)
export const LOCATIONS = {
    // NEW: Hospital entrance
    ENTRANCE: { x: 21 * 32, y: 33 * 32, name: 'Hospital Entrance' },
    
    // Examination Rooms
    NURSE_OFFICE: {
        base: { x: 34 * 32, y: 17 * 32, name: 'Nurse Office' },
        NURSE_DESK: { x: 34 * 32, y: 17 * 32, name: 'Nurse\'s Desk' },
        PATIENT_SEAT: { x: 35 * 32, y: 17 * 32, name: 'Patient Seat' }
    },

    DOCTORS_OFFICE: {
        base: { x: 37 * 32, y: 12 * 32, name: 'Doctor\'s Office' },
        DOCTORS_CHAIR: { x: 37 * 32, y: 11 * 32, name: 'Doctor\'s Chair' },
        PATIENT_CHAIR: { x: 38 * 32, y: 12 * 32, name: 'Patient Chair' },
        EXAM_BENCH: { x: 34 * 32, y: 12 * 32, name: 'Exam Bench' }
    },

    RECEPTION: { x: 17 * 32, y: 26 * 32, name: 'Reception' },
    WAITING_ROOM_1: { x: 34 * 32, y: 26 * 32, name: 'Waiting Room Chair 1' },
    WAITING_ROOM_2: { x: 35 * 32, y: 26 * 32, name: 'Waiting Room Chair 2' },
    WAITING_ROOM_3: { x: 34 * 32, y: 27 * 32, name: 'Waiting Room Chair 3' },
    WAITING_ROOM_4: { x: 35 * 32, y: 27 * 32, name: 'Waiting Room Chair 4' },
    LAB_DEFAULT: { x: 20 * 32, y: 20 * 32, name: 'Laboratory' },
    LAB_MRI: { x: 2 * 32, y: 7 * 32, name: 'MRI Room' },
    LAB_XRAY: { x: 37 * 32, y: 2 * 32, name: 'X-Ray Room' },
    LAB_BLOOD: { x: 32 * 32, y: 15 * 32, name: 'Blood Test Room' },
    LAB_CT: { x: 38 * 32, y: 18 * 32, name: 'CT Scan Room' },

};

// Map agent types to locations
export const AGENT_LOCATIONS = {
    'Nurse': 'NURSE_OFFICE',
    'Doctor': 'DOCTORS_OFFICE',
    'Lab': 'LAB_DEFAULT'
};

// Map test types to lab locations
export const LAB_TEST_LOCATIONS = {
    'mri': 'LAB_MRI',
    'xray': 'LAB_XRAY',
    'x-ray': 'LAB_XRAY',
    'blood': 'LAB_DEFAULT',
    'ct': 'LAB_MRI',
    'ct scan': 'LAB_MRI'
};

// Helper to get random location
export function getRandomLocation() {
    const keys = Object.keys(LOCATIONS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return LOCATIONS[randomKey];
}

// Helper to get a random waiting room chair
export function getRandomWaitingRoomChair() {
    const chairs = [
        LOCATIONS.WAITING_ROOM_1,
        LOCATIONS.WAITING_ROOM_2,
        LOCATIONS.WAITING_ROOM_3,
        LOCATIONS.WAITING_ROOM_4
    ];
    return chairs[Math.floor(Math.random() * chairs.length)];
}

/**
 * Get location coordinates - handles both flat and nested locations
 * @param {string} locationKey - Key like 'RECEPTION' or 'DOCTORS_OFFICE.DOCTORS_CHAIR'
 * @returns {Object} Location object with x, y, name
 */
export function getLocation(locationKey) {
    // Handle flat locations (RECEPTION, ENTRANCE, etc.)
    if (LOCATIONS[locationKey]) {
        const loc = LOCATIONS[locationKey];
        // If it has x,y it's a flat location
        if (loc.x !== undefined && loc.y !== undefined) {
            return loc;
        }
        // Otherwise it's a nested room, use the base
        if (loc.base) {
            return loc.base;
        }
    }

    // Handle nested locations (DOCTORS_OFFICE.DOCTORS_CHAIR)
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
