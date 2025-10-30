// Static locations in the hospital (in pixels)
export const LOCATIONS = {
    // NEW: Hospital entrance
    ENTRANCE: { x: 21 * 32, y: 33 * 32, name: 'Hospital Entrance' },
    
    // Examination Rooms
    NURSE_OFFICE: { x: 34 * 32, y: 18 * 32, name: 'Examination Room 1' }, // Nurses office
    DOCTORS_OFFICE: { x: 37 * 32, y: 12 * 32, name: 'Examination Room 2' }, // Doctors office
    
    RECEPTION: { x: 17 * 32, y: 26 * 32, name: 'Reception' },
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