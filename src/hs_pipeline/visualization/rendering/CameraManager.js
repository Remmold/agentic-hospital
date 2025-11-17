/**
 * CameraManager.js
 * Manages camera system including main camera scrolling and mini follow-camera
 * 
 * Features:
 * - Vertical scrolling via scrollbar
 * - Shift+drag panning
 * - Mini follow-camera in bottom-left corner
 * - Smooth camera transitions
 * 
 * Note: All HTML structure and CSS styling is in index.html and styles.css
 * This class only manages camera logic and event handling
 * 
 * @module rendering/CameraManager
 */

export class CameraManager {
    /**
     * Create camera manager
     * @param {Phaser.Scene} scene - The game scene
     */
    constructor(scene) {
        this.scene = scene;
        this.mainCamera = scene.cameras.main;
        this.miniCam = null;

        // Scrolling state
        this.isDragging = false;
        this.dragStartY = 0;
        this.cameraStartY = 0;

        // World dimensions (will be set in initialize)
        this.worldHeight = 0;
        this.cameraHeight = 0;
        this.maxScrollY = 0;

        // HTML elements (references to pre-existing elements)
        this.scrollbar = null;
        this.scrollThumb = null;
        this.miniCamBorder = null;
        this.miniCamLabel = null;

        console.log('[CameraManager] Created');
    }

    /**
     * Initialize camera system
     * Sets up world bounds, scrollbar, and controls
     * Assumes HTML elements already exist in index.html
     * 
     * @param {number} worldWidth - World width in pixels
     * @param {number} worldHeight - World height in pixels
     */
    initialize(worldWidth, worldHeight) {
        this.worldHeight = worldHeight;
        this.cameraHeight = this.scene.cameras.main.height;
        this.maxScrollY = worldHeight - this.cameraHeight;

        // Set world bounds for physics
        this.scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        // Configure main camera
        this.mainCamera.setBounds(0, 0, worldWidth, worldHeight);
        this.mainCamera.setScroll(0, 0); // Start at top (hospital)

        // Get references to HTML elements
        this.getHTMLElements();

        // Setup controls
        this.setupScrollbar();
        this.setupDragControls();
        // this.setupMiniCamera();

        console.log(`[CameraManager] Initialized - World: ${worldWidth}x${worldHeight}, MaxScroll: ${this.maxScrollY}`);
    }

    /**
     * Get references to pre-existing HTML elements
     * @private
     */
    getHTMLElements() {
        this.scrollbar = document.getElementById('camera-scrollbar');
        this.scrollThumb = document.getElementById('camera-scrollbar-thumb');
        this.miniCamBorder = document.getElementById('mini-cam-border');
        this.miniCamLabel = document.getElementById('mini-cam-label');

        if (!this.scrollbar || !this.scrollThumb) {
            console.error('[CameraManager] Camera scrollbar elements not found in HTML!');
        }

        if (!this.miniCamBorder || !this.miniCamLabel) {
            console.error('[CameraManager] Mini-cam border elements not found in HTML!');
        }
    }

    /**
     * Setup scrollbar drag functionality
     * @private
     */
    setupScrollbar() {
        if (!this.scrollbar || !this.scrollThumb) return;

        // Calculate thumb height proportional to visible area
        const thumbHeightRatio = this.cameraHeight / this.worldHeight;
        const scrollbarHeight = this.cameraHeight - 20; // Match CSS height
        const thumbHeight = Math.max(30, scrollbarHeight * thumbHeightRatio);

        // Set thumb height dynamically
        this.scrollThumb.style.height = `${thumbHeight}px`;

        // Setup drag functionality
        let isDraggingThumb = false;
        let startY = 0;
        let startThumbTop = 0;

        this.scrollThumb.addEventListener('mousedown', (e) => {
            isDraggingThumb = true;
            startY = e.clientY;
            startThumbTop = parseFloat(this.scrollThumb.style.top) || 0;
            this.scrollThumb.classList.add('dragging');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingThumb) return;

            const deltaY = e.clientY - startY;
            const scrollbarRect = this.scrollbar.getBoundingClientRect();
            const maxThumbTop = scrollbarRect.height - this.scrollThumb.clientHeight;

            // Calculate new thumb position
            let newThumbTop = startThumbTop + deltaY;
            newThumbTop = Math.max(0, Math.min(maxThumbTop, newThumbTop));

            // Update thumb position
            this.scrollThumb.style.top = `${newThumbTop}px`;

            // Calculate camera scroll position
            const scrollRatio = maxThumbTop > 0 ? newThumbTop / maxThumbTop : 0;
            const newCameraY = scrollRatio * this.maxScrollY;

            // Update camera
            this.mainCamera.setScroll(0, newCameraY);
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingThumb) {
                isDraggingThumb = false;
                this.scrollThumb.classList.remove('dragging');
            }
        });

        console.log('[CameraManager] Scrollbar setup complete');
    }

    /**
     * Setup camera drag controls (Shift + drag)
     * @private
     */
    setupDragControls() {
        this.scene.input.on('pointerdown', (pointer) => {
            // Only drag with shift key held
            if (pointer.event.shiftKey) {
                this.isDragging = true;
                this.dragStartY = pointer.y;
                this.cameraStartY = this.mainCamera.scrollY;
                pointer.event.preventDefault();
            }
        });

        this.scene.input.on('pointermove', (pointer) => {
            if (this.isDragging) {
                const deltaY = pointer.y - this.dragStartY;
                let newY = this.cameraStartY - deltaY;

                // Clamp to world bounds
                newY = Math.max(0, Math.min(this.maxScrollY, newY));

                this.mainCamera.setScroll(0, newY);
                this.updateScrollbarThumb();
                pointer.event.preventDefault();
            }
        });

        this.scene.input.on('pointerup', () => {
            this.isDragging = false;
        });

        console.log('[CameraManager] Drag controls setup (Shift + drag)');
    }

    /**
     * Setup mini follow camera in bottom-left corner
     * @private
     */
    setupMiniCamera() {
        // Get mini-cam border element to calculate position
        const border = document.getElementById('mini-cam-border');
        if (!border) {
            console.error('[CameraManager] Mini-cam border not found!');
            return;
        }

        // Get position of the border element
        const rect = border.getBoundingClientRect();

        // Create mini camera at the exact position of the HTML border
        this.miniCam = this.scene.cameras.add(rect.left, rect.top, 350, 350);
        this.miniCam.setZoom(0.5); // Zoomed out view
        this.miniCam.setBounds(0, 0, this.worldHeight > this.cameraHeight ? this.worldHeight : this.cameraHeight, this.worldHeight);
        this.miniCam.setBackgroundColor(0x1a1a1a); // Dark background
        this.miniCam.setAlpha(0.95);

        console.log(`[CameraManager] Mini-cam created at (${rect.left}, ${rect.top}, 350x350)`);
    }

    /**
     * Make mini-cam follow a sprite
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to follow
     */
    followSprite(sprite) {
        if (!this.miniCam || !sprite) return;

        this.miniCam.startFollow(sprite, false, 0.1, 0.1);

        // Update label with patient name if available
        if (this.miniCamLabel && sprite.simulationPlayer?.simulationData?.patient?.name) {
            this.miniCamLabel.textContent = `Following: ${sprite.simulationPlayer.simulationData.patient.name}`;
        }

        console.log('[CameraManager] Mini-cam following sprite');
    }

    /**
     * Stop mini-cam from following
     */
    stopFollowing() {
        if (!this.miniCam) return;

        this.miniCam.stopFollow();

        // Reset label
        if (this.miniCamLabel) {
            this.miniCamLabel.textContent = 'Follow Camera';
        }

        console.log('[CameraManager] Mini-cam stopped following');
    }

    /**
     * Update scrollbar thumb position based on camera scroll
     * @private
     */
    updateScrollbarThumb() {
        if (!this.scrollThumb || !this.scrollbar) return;

        const scrollRatio = this.maxScrollY > 0 ? this.mainCamera.scrollY / this.maxScrollY : 0;
        const scrollbarRect = this.scrollbar.getBoundingClientRect();
        const maxThumbTop = scrollbarRect.height - this.scrollThumb.clientHeight;

        const thumbTop = scrollRatio * maxThumbTop;
        this.scrollThumb.style.top = `${thumbTop}px`;
    }

    /**
     * Scroll camera to specific Y position
     * @param {number} y - Target Y position
     * @param {number} [duration=500] - Scroll duration in ms (0 = instant)
     */
    scrollToY(y, duration = 500) {
        y = Math.max(0, Math.min(this.maxScrollY, y));

        if (duration === 0) {
            this.mainCamera.setScroll(0, y);
            this.updateScrollbarThumb();
        } else {
            // Smooth scroll with tween
            this.scene.tweens.add({
                targets: this.mainCamera,
                scrollY: y,
                duration: duration,
                ease: 'Cubic.easeInOut',
                onUpdate: () => {
                    this.updateScrollbarThumb();
                }
            });
        }
    }

    /**
     * Pan camera by delta amount
     * @param {number} deltaY - Amount to pan (negative = up, positive = down)
     */
    panCamera(deltaY) {
        const newY = this.mainCamera.scrollY + deltaY;
        this.scrollToY(newY, 0);
    }

    /**
     * Reset camera to top (hospital view)
     * @param {boolean} [smooth=true] - Use smooth scrolling
     */
    resetView(smooth = true) {
        this.scrollToY(0, smooth ? 500 : 0);
        console.log('[CameraManager] Camera reset to top');
    }

    /**
     * Scroll to house area (bottom of map)
     * @param {boolean} [smooth=true] - Use smooth scrolling
     */
    scrollToHouse(smooth = true) {
        this.scrollToY(this.maxScrollY, smooth ? 500 : 0);
        console.log('[CameraManager] Camera scrolled to house area');
    }

    /**
     * Get current camera scroll position
     * @returns {{x: number, y: number}} Camera scroll position
     */
    getScrollPosition() {
        return {
            x: this.mainCamera.scrollX,
            y: this.mainCamera.scrollY
        };
    }

    /**
     * Cleanup camera system
     * Does not remove HTML elements (they stay in DOM)
     */
    destroy() {
        // Destroy mini camera
        if (this.miniCam) {
            this.miniCam.destroy();
        }

        console.log('[CameraManager] Destroyed (HTML elements preserved)');
    }
}
