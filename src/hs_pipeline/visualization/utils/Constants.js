// Static locations in the hospital (in pixels)
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
        // // Right wall chairs
        CHAIR_9: { x: 38 * 32, y: 25 * 32, name: 'Waiting Room Chair 9' },
        CHAIR_10: { x: 38 * 32, y: 26 * 32, name: 'Waiting Room Chair 10' },
        CHAIR_11: { x: 38 * 32, y: 27 * 32, name: 'Waiting Room Chair 11' },
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
        PATIENT_SEAT: { x: 35 * 32, y: 17 * 32, name: 'Patient seat' }
    },

    // Lab
    LAB: {
        base: { x: 20 * 32, y: 20 * 32, name: 'default' },
        NURSE_POSITION: { x: 21 * 32, y: 19 * 32, name: 'Lab Nurse Position' },
        BIG_MACHINE: { x: 21 * 32, y: 18 * 32, name: 'Lab Big Machine' },
        SMALL_MACHINE: { x: 21 * 32, y: 19 * 32, name: 'Lab Small Machine' },
        PATIENT_CHAIR: { x: 23 * 32, y: 21 * 32, name: 'Lab Small Machine' },
        PATIENT_SEAT: { x: 35 * 32, y: 17 * 32, name: 'Patient Seat' }
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

    // Labs
    LAB_DEFAULT: { x: 20 * 32, y: 20 * 32, name: 'Lab (Blood Test)' },
    LAB_NURSE_POSITION: { x: 20 * 32, y: 20 * 32, name: 'Lab Nurse Position' },
    XRAY_TECH_POSITION: { x: 37 * 32, y: 2 * 32, name: 'X-Ray Tech Position' },
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
 */
export function getLocation(locationKey) {
    if (typeof locationKey === 'object' && locationKey.x && locationKey.y) {
        return locationKey;
    }

    if (typeof locationKey !== 'string') {
        console.error('[getLocation] Invalid location key:', locationKey);
        return null;
    }

    // Handle flat locations
    if (LOCATIONS[locationKey]) {
        const loc = LOCATIONS[locationKey];
        if (loc.x !== undefined && loc.y !== undefined) {
            return loc;
        }
        if (loc.base) {
            return loc.base;
        }
    }

    // Handle nested locations (RECEPTION.LEFT, WAITING_ROOM.CHAIR_1, etc)
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
