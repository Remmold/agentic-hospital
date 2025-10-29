// Static locations in the hospital (in pixels)
export const LOCATIONS = {
    // NEW: Hospital entrance
    ENTRANCE: { x: 21 * 32, y: 33 * 32, name: 'Hospital Entrance' },
    
    // Examination Rooms
    NURSE_OFFICE: { x: 32 * 32, y: 18 * 32, name: 'Examination Room 1' }, // Nurses office
    DOCTORS_OFFICE: { x: 37 * 32, y: 12 * 32, name: 'Examination Room 2' }, // Doctors office
    EXAM_ROOM_3: { x: 30 * 32, y: 10 * 32, name: 'Examination Room 3' },
    
    WAITING_AREA_1: { x: 15 * 32, y: 25 * 32, name: 'Waiting Area 1' },
    WAITING_AREA_2: { x: 25 * 32, y: 25 * 32, name: 'Waiting Area 2' },
    
    RECEPTION: { x: 17 * 32, y: 26 * 32, name: 'Reception' },
    LAB: { x: 20 * 32, y: 20 * 32, name: 'Laboratory' },
    
    HALLWAY_NORTH: { x: 20 * 32, y: 15 * 32, name: 'North Hallway' },
    HALLWAY_SOUTH: { x: 20 * 32, y: 35 * 32, name: 'South Hallway' },
    HALLWAY_WEST: { x: 10 * 32, y: 25 * 32, name: 'West Hallway' },
    HALLWAY_EAST: { x: 30 * 32, y: 25 * 32, name: 'East Hallway' }
};

// Map agent types to locations
export const AGENT_LOCATIONS = {
    'Nurse': 'NURSE_OFFICE',
    'Doctor': 'DOCTORS_OFFICE',
    'Lab': 'LAB'
};

// Helper to get random location
export function getRandomLocation() {
    const keys = Object.keys(LOCATIONS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return LOCATIONS[randomKey];
}