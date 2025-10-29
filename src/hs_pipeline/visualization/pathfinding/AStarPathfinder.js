export class AStarPathfinder {
    constructor(grid) {
        this.grid = grid;
    }

    findPath(startX, startY, endX, endY) {
        const start = this.grid.worldToTile(startX, startY);
        const end = this.grid.worldToTile(endX, endY);

        // CHECK IF END TILE IS WALKABLE
        if (!this.grid.isWalkable(end.x, end.y)) {
            console.warn('Target tile is not walkable!');
            return [];
        }

        const openSet = [start];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const key = (node) => `${node.x},${node.y}`;
        gScore.set(key(start), 0);
        fScore.set(key(start), this.heuristic(start, end));

        while (openSet.length > 0) {
            openSet.sort((a, b) => fScore.get(key(a)) - fScore.get(key(b)));
            const current = openSet.shift();

            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }

            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                const tentativeGScore = gScore.get(key(current)) + 1;
                const neighborKey = key(neighbor);

                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));

                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return [];
    }

    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}
        ];

        for (const dir of directions) {
            const newX = node.x + dir.x;
            const newY = node.y + dir.y;

            if (this.grid.isWalkable(newX, newY)) {
                neighbors.push({x: newX, y: newY});
            }
        }

        return neighbors;
    }

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        const key = (node) => `${node.x},${node.y}`;

        while (cameFrom.has(key(current))) {
            current = cameFrom.get(key(current));
            path.unshift(current);
        }

        return path.map(tile => this.grid.tileToWorld(tile.x, tile.y));
    }
}