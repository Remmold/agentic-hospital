/**
 * PatientSpriteRegistry
 * Centralized management of patient sprite selection and randomization
 * Handles sprite range configuration and weighted selection logic
 */
export class PatientSpriteRegistry {
    static SPRITE_MIN = 1;
    static SPRITE_MAX = 29;

    // Track recently used sprites to avoid repetition
    static lastThreeSprites = [];

    /**
     * Get next patient sprite with weighted randomization
     * Ensures no repeated sprites in the last 3 selections
     * @returns {string} Sprite key (e.g., 'pat_5')
     */
    static getNextSprite() {
        let randomNum;
        let attempts = 0;

        // Keep trying until we get a sprite that's not in the last 3 used
        do {
            randomNum = Math.floor(
                Math.random() * (this.SPRITE_MAX - this.SPRITE_MIN + 1)
            ) + this.SPRITE_MIN;
            attempts++;
        } while (this.lastThreeSprites.includes(randomNum) && attempts < 10);

        // Add to recent history
        this.lastThreeSprites.push(randomNum);

        // Keep only last 3 sprites in memory
        if (this.lastThreeSprites.length > 3) {
            this.lastThreeSprites.shift();
        }

        console.log(
            `[PatientSpriteRegistry] Selected sprite: pat_${randomNum}, Recent: [${this.lastThreeSprites.join(', ')}]`
        );

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
        this.lastThreeSprites = [];
    }
}
