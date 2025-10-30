/**
 * Manages collision objects from Tiled object layers
 */
export class CollisionManager {
    constructor(scene, map) {
        this.scene = scene;
        this.map = map;
        this.collisionGroup = null;

        this.setupCollisions();
    }

    // Set up collision objects from Tiled object layer
    setupCollisions() {
        // Get the prop_collisions object layer
        const collisionLayer = this.map.getObjectLayer('prop_collisions');

        if (!collisionLayer) {
            console.warn('No prop_collisions layer found in tilemap');
            return;
        }

        // Create a static physics group for collision objects
        this.collisionGroup = this.scene.physics.add.staticGroup();

        // Convert each object to a physics body
        collisionLayer.objects.forEach(obj => {
            let collisionBody;

            // Check if it's a circle/ellipse
            if (obj.ellipse) {
                // Create circle collision
                const radius = obj.width / 2;
                collisionBody = this.scene.add.circle(
                    obj.x + radius,  // Center X
                    obj.y + radius,  // Center Y
                    radius,
                    0xff0000,
                    0 // Alpha 0 = invisible
                );

                // Add to physics with circle body
                this.scene.physics.add.existing(collisionBody, true);
                collisionBody.body.setCircle(radius);
            } else {
                // Create rectangle collision (default)
                collisionBody = this.scene.add.rectangle(
                    obj.x + obj.width / 2,  // Center X
                    obj.y + obj.height / 2, // Center Y
                    obj.width,
                    obj.height,
                    0xff0000,
                    0 // Alpha 0 = invisible
                );

                // Add to physics
                this.scene.physics.add.existing(collisionBody, true);
            }

            this.collisionGroup.add(collisionBody);

            const shapeType = obj.ellipse ? 'circle' : 'rectangle';
            console.log(`Added ${shapeType} collision: ${obj.name || 'unnamed'} at (${obj.x}, ${obj.y})`);
        });

        console.log(`Total collision objects loaded: ${collisionLayer.objects.length}`);
    }

    /* Get the collision group for use in physics colliders
     * @returns {Phaser.Physics.Arcade.StaticGroup}
     */
    getCollisionGroup() {
        return this.collisionGroup;
    }

    // Enable debug visualization of collision shapes (only if DEV_MODE is enabled)
    enableDebug() {
        if (!this.collisionGroup) return;

        // Only show debug visuals if DEV_MODE is true
        if (this.scene.DEV_MODE) {
            this.collisionGroup.getChildren().forEach(body => {
                body.setAlpha(0.3); // Make visible with transparency
                body.setFillStyle(0xff0000); // Red color
            });
            console.log('[CollisionManager] Debug visualization enabled');
        } else {
            // Keep invisible in production
            this.disableDebug();
        }
    }

    // Disable debug visualization
    disableDebug() {
        if (!this.collisionGroup) return;

        this.collisionGroup.getChildren().forEach(body => {
            body.setAlpha(0); // Make invisible
        });
    }
}
