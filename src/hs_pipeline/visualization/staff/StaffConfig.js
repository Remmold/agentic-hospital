/**
 * StaffConfig.js
 * Configuration data for all hospital staff NPCs
 * Defines positions, patrol routes, and idle behaviors
 * 
 * @module ./StaffConfig
 * @requires utils/Constants
 */

import { LOCATIONS } from '../core/Constants.js';

/**
 * Staff configuration array
 * Each entry defines a staff member's appearance, position, and behavior
 * 
 * @typedef {Object} StaffConfigEntry
 * @property {string} id - Unique staff identifier
 * @property {string} spritesheet - Sprite sheet key to use
 * @property {Object} initialPosition - Starting position {x, y}
 * @property {Array|boolean} patrol - Array of waypoints or false if stationary
 * @property {string} idleAction - Animation action when idle ('idle', 'sit')
 * @property {string} idleDirection - Direction to face when idle
 * @property {number} [idleMs] - Milliseconds to idle (optional)
 */

/**
 * All staff member configurations
 * @type {StaffConfigEntry[]}
 */
export const STAFF_CONFIG = [
    // Doctors Office - Main Doctor
    {
        id: 'doctor_1',
        spritesheet: 'doctor_1',
        initialPosition: { ...LOCATIONS.DOCTORS_OFFICE.DOCTORS_CHAIR },
        patrol: false,
        idleAction: 'sit',
        idleDirection: 'down',
        idleMs: 3000
    },

    // X-Ray Technician - Patrols between control panel and viewing window
    {
        id: 'doctor_xray',
        spritesheet: 'xray_1',
        initialPosition: { ...LOCATIONS.XRAY_TECH_POSITION },
        patrol: [
            { ...LOCATIONS.XRAY_VIEW_WINDOW_POSITION, idleMs: 7000, idleDirection: 'up' },
            { ...LOCATIONS.XRAY_TECH_POSITION, idleMs: 6000, idleDirection: 'up' },
        ],
        idleAction: 'sit',
        idleDirection: 'up',
        idleMs: 3000
    },

    // Lab Nurse - Patrols between lab machines
    {
        id: 'lab_nurse',
        spritesheet: 'nurse_1',
        initialPosition: { ...LOCATIONS.LAB.NURSE_POSITION },
        patrol: [
            { ...LOCATIONS.LAB.BIG_MACHINE, idleMs: 5000, idleDirection: 'up' },
            { ...LOCATIONS.LAB.SMALL_MACHINE, idleMs: 5000 }
        ],
        idleAction: 'idle',
        idleDirection: 'right'
    },

    // Examination Nurse - Stationary in nurse office
    {
        id: 'examination_nurse',
        spritesheet: 'nurse_5',
        initialPosition: { ...LOCATIONS.NURSE_OFFICE.NURSE_BY_PATIENT_SEAT },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'left'
    },

    // MRI Technician - Stationary at MRI control station
    {
        id: 'mri_nurse',
        spritesheet: 'mri_1',
        initialPosition: { ...LOCATIONS.MRI.STAFF_CHAIR },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'right'
    },

    // Reception - Left Desk
    {
        id: 'receptionist_1',
        spritesheet: 'nurse_2',
        initialPosition: { ...LOCATIONS.RECEPTION.LEFT_COMPUTER },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'down',
        idleMs: 3000
    },

    // Reception - Right Desk
    {
        id: 'receptionist_2',
        spritesheet: 'nurse_3',
        initialPosition: { ...LOCATIONS.RECEPTION.RIGHT_COMPUTER },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'down',
        idleMs: 3000
    },

    // Pharmacy - First Pharmacist
    {
        id: 'pharmacist_1',
        spritesheet: 'doctor_9',
        initialPosition: { ...LOCATIONS.PHARMACY.PHARMACIST_BEHIND_COUNTER_1 },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'down',
        idleMs: 3000
    },

    // Pharmacy - Second Pharmacist
    {
        id: 'pharmacist_2',
        spritesheet: 'doctor_10',
        initialPosition: { ...LOCATIONS.PHARMACY.PHARMACIST_BEHIND_COUNTER_2 },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'down',
        idleMs: 3000
    },

    // Conference Room - Attendee 1 (Bottom Row, Seat 2)
    {
        id: 'conference_2',
        spritesheet: 'doctor_7',
        initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.BOTTOM_CHAIR_2 },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'up',
        idleMs: 3000
    },

    // Conference Room - Attendee 2 (Bottom Row, Seat 3)
    {
        id: 'conference_3',
        spritesheet: 'doctor_6',
        initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.BOTTOM_CHAIR_3 },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'up',
        idleMs: 3000
    },

    // Conference Room - Attendee 3 (Bottom Row, Seat 4)
    {
        id: 'conference_4',
        spritesheet: 'doctor_5',
        initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.BOTTOM_CHAIR_4 },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'up',
        idleMs: 3000
    },

    // Conference Room - Attendee 4 (Bottom Row, Seat 6)
    {
        id: 'conference_5',
        spritesheet: 'nurse_10',
        initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.BOTTOM_CHAIR_6 },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'up',
        idleMs: 3000
    },

    // Conference Room - Attendee 5 (Top Row, Seat 2 - Sitting)
    {
        id: 'conference_6',
        spritesheet: 'nurse_9',
        initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.TOP_CHAIR_2 },
        patrol: false,
        idleAction: 'sit',
        idleDirection: 'down',
        idleMs: 3000
    },

    // Conference Room - Attendee 6 (Top Row, Seat 4)
    {
        id: 'conference_7',
        spritesheet: 'nurse_8',
        initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.TOP_CHAIR_4 },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'down',
        idleMs: 3000
    },

    // Conference Room - Attendee 7 (Top Row, Seat 6)
    {
        id: 'conference_8',
        spritesheet: 'nurse_7',
        initialPosition: { ...LOCATIONS.CONFERENCE_ROOM.TOP_CHAIR_6 },
        patrol: false,
        idleAction: 'idle',
        idleDirection: 'down',
        idleMs: 3000
    }
];