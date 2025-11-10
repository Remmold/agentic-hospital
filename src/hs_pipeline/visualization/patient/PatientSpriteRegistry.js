/**
 * PatientSpriteRegistry
 * Centralized management of patient sprite selection and randomization
 * Handles sprite range configuration and weighted selection logic
 */
export class PatientSpriteRegistry {
    static SPRITE_MIN = 1;
    static SPRITE_MAX = 44;

    static lastUsedSprites = [];

    /**
     * Get next patient sprite with weighted randomization
     * Ensures no repeated sprites in the last 10 selections
     * @returns {string} Sprite key (e.g., 'pat_5')
     */
    static getNextSprite() {
        let randomNum;
        let attempts = 0;

        // Keep trying until we get a sprite that's not in the last 10 used
        do {
            randomNum = Math.floor(
                Math.random() * (this.SPRITE_MAX - this.SPRITE_MIN + 1)
            ) + this.SPRITE_MIN;
            attempts++;
        } while (this.lastUsedSprites.includes(randomNum) && attempts < 10);

        // Add to recent history
        this.lastUsedSprites.push(randomNum);

        // Keep only last X sprites in memory
        if (this.lastUsedSprites.length > 10) {
            this.lastUsedSprites.shift();
        }

        return `pat_${randomNum}`;
    }

    /**
     * Get a random patient sprite (simple, no repetition logic)
     * @returns {string} Sprite key (e.g., 'pat_5')
     */
    static getRandomSprite() {
        const randomNum = Math.floor(
            Math.random() * (this.SPRITE_MAX - this.SPRITE_MIN + 1)
        ) + this.SPRITE_MIN;
        return `pat_${randomNum}`;
    }

    /**
     * Reset sprite history (useful for testing or scene restarts)
     */
    static resetHistory() {
        this.lastUsedSprites = [];
    }
}
