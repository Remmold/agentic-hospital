/**
 * AStarPathfinder
 * Implements the A* pathfinding algorithm for grid-based navigation
 * 
 * The A* algorithm finds the shortest path between two points by:
 * 1. Maintaining an "open set" of nodes to explore
 * 2. Using a heuristic (Manhattan distance) to prioritize promising paths
 * 3. Tracking the cost to reach each node (g-score)
 * 4. Tracking the estimated total cost (f-score = g-score + heuristic)
 */

export class AStarPathfinder {
    constructor(grid) {
        this.grid = grid;
    }

    /**
     * Find the shortest path between two world positions
     * Uses the A* algorithm to navigate around obstacles
     * 
     * @returns {Array<{x: number, y: number}>} Array of world positions forming the path (empty if no path found)
     */
    findPath(startX, startY, endX, endY) {
        // Convert world coordinates to tile coordinates
        const start = this.grid.worldToTile(startX, startY);
        const end = this.grid.worldToTile(endX, endY);

        // Check if target is walkable
        if (!this.grid.isWalkable(end.x, end.y)) {
            console.warn('[AStarPathfinder] Target tile is not walkable');
            return [];
        }

        // Initialize open set with starting node
        const openSet = [start];

        // Track where we came from for path reconstruction
        const cameFrom = new Map();

        // Cost from start to node
        const gScore = new Map();

        // Estimated total cost (g-score + heuristic)
        const fScore = new Map();

        // Helper to create unique keys for nodes
        const key = (node) => `${node.x},${node.y}`;

        // Initialize scores for start node
        gScore.set(key(start), 0);
        fScore.set(key(start), this.heuristic(start, end));

        // Main A* loop
        while (openSet.length > 0) {
            // Sort by f-score (lowest first)
            openSet.sort((a, b) => fScore.get(key(a)) - fScore.get(key(b)));

            // Get node with lowest f-score
            const current = openSet.shift();

            // Check if we reached the goal
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }

            // Check all neighbors
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                // Calculate tentative g-score (cost to reach neighbor through current)
                const tentativeGScore = gScore.get(key(current)) + 1;
                const neighborKey = key(neighbor);

                // If this path to neighbor is better than any previous one
                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    // Record the best path so far
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));

                    // Add neighbor to open set if not already there
                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        // No path found
        return [];
    }

    /**
     * Get walkable neighbors of a tile (up, right, down, left)
     * 
     * @param {Object} node - Tile coordinates {x, y}
     * @returns {Array<{x: number, y: number}>} Array of walkable neighbor tiles
     * @private
     */
    getNeighbors(node) {
        const neighbors = [];

        const directions = [
            { x: 0, y: -1 },  // Up
            { x: 1, y: 0 },   // Right
            { x: 0, y: 1 },   // Down
            { x: -1, y: 0 }   // Left
        ];

        for (const dir of directions) {
            const newX = node.x + dir.x;
            const newY = node.y + dir.y;

            // Only include walkable tiles
            if (this.grid.isWalkable(newX, newY)) {
                neighbors.push({ x: newX, y: newY });
            }
        }

        return neighbors;
    }

    /**
     * Calculate heuristic distance between two tiles
     * Uses Manhattan distance (|dx| + |dy|) which is optimal for grid-based movement
     * 
     * @param {Object} a - First tile {x, y}
     * @param {Object} b - Second tile {x, y}
     * @returns {number} Manhattan distance between tiles
     * @private
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Reconstruct the path from start to goal
     * Follows the cameFrom map backwards from goal to start
     * 
     * @param {Map} cameFrom - Map of node -> previous node
     * @param {Object} current - Goal tile {x, y}
     * @returns {Array<{x: number, y: number}>} Path as array of world coordinates
     * @private
     */
    reconstructPath(cameFrom, current) {
        const path = [current];
        const key = (node) => `${node.x},${node.y}`;

        // Follow cameFrom pointers backwards
        while (cameFrom.has(key(current))) {
            current = cameFrom.get(key(current));
            path.unshift(current);  // Add to front of array
        }

        // Convert tile coordinates to world coordinates
        return path.map(tile => this.grid.tileToWorld(tile.x, tile.y));
    }
}
