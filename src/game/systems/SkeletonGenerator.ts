import { GAME_CONFIG } from '../constants/GameConstants';

export class SkeletonGenerator {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    generateSkeleton(currentImageKey: string): Array<Array<[number, number]>> {
        const texture = this.scene.textures.get(currentImageKey);
        const canvas = this.scene.textures.createCanvas('skeleton-canvas', texture.source[0].width, texture.source[0].height);
        
        if (!canvas || !canvas.canvas) return [];
        
        const context = canvas.canvas.getContext('2d');
        if (!context) return [];
        
        context.drawImage(texture.source[0].image as HTMLImageElement, 0, 0);
        const imageData = context.getImageData(0, 0, texture.source[0].width, texture.source[0].height);
        
        const binaryImage = this.createBinaryImage(imageData);
        const preprocessed = this.preprocessBinaryImage(binaryImage);
        const skeletonData = this.zhangSuenThinning(preprocessed);
        const cleaned = this.cleanSkeleton(skeletonData);
        const polylines = this.skeletonToPolylines(cleaned);
        const smoothed = this.smoothPolylines(polylines);
        
        this.scene.textures.remove('skeleton-canvas');
        return smoothed;
    }

    private createBinaryImage(imageData: ImageData): number[][] {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const binary: number[][] = [];
        
        for (let y = 0; y < height; y++) {
            binary[y] = [];
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const alpha = data[index + 3];
                binary[y][x] = alpha > GAME_CONFIG.ALPHA_THRESHOLD ? 1 : 0;
            }
        }
        
        return binary;
    }

    private preprocessBinaryImage(image: number[][]): number[][] {
        let result = image.map(row => [...row]);
        
        result = this.morphologicalErode(result);
        result = this.morphologicalDilate(result);
        
        result = this.fillSmallHoles(result);
        
        return result;
    }

    private morphologicalErode(image: number[][]): number[][] {
        const height = image.length;
        const width = image[0].length;
        const result: number[][] = [];
        
        for (let y = 0; y < height; y++) {
            result[y] = [];
            for (let x = 0; x < width; x++) {
                if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
                    result[y][x] = 0;
                    continue;
                }
                
                let min = 1;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        min = Math.min(min, image[y + dy][x + dx]);
                    }
                }
                result[y][x] = min;
            }
        }
        
        return result;
    }

    private morphologicalDilate(image: number[][]): number[][] {
        const height = image.length;
        const width = image[0].length;
        const result: number[][] = [];
        
        for (let y = 0; y < height; y++) {
            result[y] = [];
            for (let x = 0; x < width; x++) {
                if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
                    result[y][x] = image[y][x];
                    continue;
                }
                
                let max = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        max = Math.max(max, image[y + dy][x + dx]);
                    }
                }
                result[y][x] = max;
            }
        }
        
        return result;
    }

    private fillSmallHoles(image: number[][]): number[][] {
        const height = image.length;
        const width = image[0].length;
        const result = image.map(row => [...row]);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (image[y][x] === 0) {
                    let surroundingCount = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            surroundingCount += image[y + dy][x + dx];
                        }
                    }
                    if (surroundingCount >= GAME_CONFIG.SMALL_HOLE_THRESHOLD) {
                        result[y][x] = 1;
                    }
                }
            }
        }
        
        return result;
    }

    private zhangSuenThinning(image: number[][]): number[][] {
        const height = image.length;
        const width = image[0].length;
        let result = image.map(row => [...row]);
        let hasChanged = true;
        
        while (hasChanged) {
            hasChanged = false;
            
            for (let step = 0; step < 2; step++) {
                const toDelete: Array<[number, number]> = [];
                
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        if (result[y][x] === 1) {
                            const neighbors = this.getNeighbors(result, x, y);
                            const transitions = this.countTransitions(neighbors);
                            const blackNeighbors = neighbors.reduce((sum, n) => sum + n, 0);
                            
                            if (blackNeighbors >= 2 && blackNeighbors <= 6 && transitions === 1) {
                                if (step === 0) {
                                    if ((neighbors[0] * neighbors[2] * neighbors[4]) === 0 && 
                                        (neighbors[2] * neighbors[4] * neighbors[6]) === 0) {
                                        toDelete.push([x, y]);
                                        hasChanged = true;
                                    }
                                } else {
                                    if ((neighbors[0] * neighbors[2] * neighbors[6]) === 0 && 
                                        (neighbors[0] * neighbors[4] * neighbors[6]) === 0) {
                                        toDelete.push([x, y]);
                                        hasChanged = true;
                                    }
                                }
                            }
                        }
                    }
                }
                
                for (const [x, y] of toDelete) {
                    result[y][x] = 0;
                }
            }
        }
        
        return result;
    }

    private getNeighbors(image: number[][], x: number, y: number): number[] {
        return [
            image[y-1][x],
            image[y-1][x+1],
            image[y][x+1],
            image[y+1][x+1],
            image[y+1][x],
            image[y+1][x-1],
            image[y][x-1],
            image[y-1][x-1]
        ];
    }

    private countTransitions(neighbors: number[]): number {
        let transitions = 0;
        for (let i = 0; i < 8; i++) {
            if (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) {
                transitions++;
            }
        }
        return transitions;
    }

    private cleanSkeleton(skeleton: number[][]): number[][] {
        const height = skeleton.length;
        const width = skeleton[0].length;
        let result = skeleton.map(row => [...row]);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (result[y][x] === 1) {
                    let neighborCount = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            neighborCount += skeleton[y + dy][x + dx];
                        }
                    }
                    if (neighborCount === 0) {
                        result[y][x] = 0;
                    }
                }
            }
        }
        
        for (let pass = 0; pass < 2; pass++) {
            let changed = true;
            while (changed) {
                changed = false;
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        if (result[y][x] === 1) {
                            let neighborCount = 0;
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    if (dx === 0 && dy === 0) continue;
                                    neighborCount += result[y + dy][x + dx];
                                }
                            }
                            if (neighborCount === 1) {
                                result[y][x] = 0;
                                changed = true;
                            }
                        }
                    }
                }
            }
        }
        
        return result;
    }

    private skeletonToPolylines(skeleton: number[][]): Array<Array<[number, number]>> {
        const height = skeleton.length;
        const width = skeleton[0].length;
        const visited = skeleton.map(row => row.map(() => false));
        const polylines: Array<Array<[number, number]>> = [];
        
        const endpoints: Array<[number, number]> = [];
        const junctions: Array<[number, number]> = [];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (skeleton[y][x] === 1) {
                    let neighborCount = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            neighborCount += skeleton[y + dy][x + dx];
                        }
                    }
                    
                    if (neighborCount === 1) {
                        endpoints.push([x, y]);
                    } else if (neighborCount > 2) {
                        junctions.push([x, y]);
                    }
                }
            }
        }
        
        for (const [startX, startY] of endpoints) {
            if (!visited[startY][startX]) {
                const polyline = this.traceOrderedPolyline(skeleton, visited, startX, startY);
                if (polyline.length > 1 && this.calculatePolylineLength(polyline) > GAME_CONFIG.MIN_POLYLINE_LENGTH) {
                    polylines.push(polyline);
                }
            }
        }
        
        for (const [startX, startY] of junctions) {
            if (!visited[startY][startX]) {
                this.traceFromJunction(skeleton, visited, startX, startY, polylines);
            }
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (skeleton[y][x] === 1 && !visited[y][x]) {
                    const polyline = this.traceOrderedPolyline(skeleton, visited, x, y);
                    if (polyline.length > 1 && this.calculatePolylineLength(polyline) > GAME_CONFIG.MIN_POLYLINE_LENGTH) {
                        polylines.push(polyline);
                    }
                }
            }
        }
        
        return polylines;
    }

    private traceFromJunction(skeleton: number[][], visited: boolean[][], junctionX: number, junctionY: number, polylines: Array<Array<[number, number]>>) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        visited[junctionY][junctionX] = true;
        
        for (const [dx, dy] of directions) {
            const nx = junctionX + dx;
            const ny = junctionY + dy;
            
            if (nx >= 0 && nx < skeleton[0].length && 
                ny >= 0 && ny < skeleton.length && 
                skeleton[ny][nx] === 1 && 
                !visited[ny][nx]) {
                
                const polyline: Array<[number, number]> = [[junctionX, junctionY]];
                const branchPolyline = this.traceOrderedPolyline(skeleton, visited, nx, ny);
                polyline.push(...branchPolyline);
                
                if (polyline.length > 1 && this.calculatePolylineLength(polyline) > GAME_CONFIG.MIN_POLYLINE_LENGTH) {
                    polylines.push(polyline);
                }
            }
        }
    }

    private traceOrderedPolyline(skeleton: number[][], visited: boolean[][], startX: number, startY: number): Array<[number, number]> {
        const polyline: Array<[number, number]> = [];
        let currentX = startX;
        let currentY = startY;
        let prevX = -1;
        let prevY = -1;
        
        while (currentX !== -1 && currentY !== -1 && !visited[currentY][currentX]) {
            visited[currentY][currentX] = true;
            polyline.push([currentX, currentY]);
            
            let nextX = -1;
            let nextY = -1;
            
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];
            
            for (const [dx, dy] of directions) {
                const nx = currentX + dx;
                const ny = currentY + dy;
                
                if (nx >= 0 && nx < skeleton[0].length && 
                    ny >= 0 && ny < skeleton.length && 
                    skeleton[ny][nx] === 1 && 
                    !visited[ny][nx] &&
                    !(nx === prevX && ny === prevY)) {
                    nextX = nx;
                    nextY = ny;
                    break;
                }
            }
            
            prevX = currentX;
            prevY = currentY;
            currentX = nextX;
            currentY = nextY;
        }
        
        return polyline;
    }

    private smoothPolylines(polylines: Array<Array<[number, number]>>): Array<Array<[number, number]>> {
        return polylines.map(polyline => this.simplifyPolyline(polyline));
    }

    private simplifyPolyline(polyline: Array<[number, number]>): Array<[number, number]> {
        if (polyline.length <= 2) return polyline;
        
        const simplified = this.douglasPeucker(polyline, GAME_CONFIG.SKELETON_TOLERANCE);
        return this.mergeCloseSegments(simplified);
    }

    private mergeCloseSegments(polyline: Array<[number, number]>): Array<[number, number]> {
        if (polyline.length <= 2) return polyline;
        
        const result: Array<[number, number]> = [polyline[0]];
        
        for (let i = 1; i < polyline.length; i++) {
            const lastPoint = result[result.length - 1];
            const currentPoint = polyline[i];
            
            const distance = Math.sqrt(
                Math.pow(currentPoint[0] - lastPoint[0], 2) + 
                Math.pow(currentPoint[1] - lastPoint[1], 2)
            );
            
            if (distance >= GAME_CONFIG.MIN_SEGMENT_LENGTH || i === polyline.length - 1) {
                result.push(currentPoint);
            }
        }
        
        return result;
    }

    private douglasPeucker(points: Array<[number, number]>, tolerance: number): Array<[number, number]> {
        if (points.length <= 2) return points;
        
        let maxDistance = 0;
        let index = 0;
        const start = points[0];
        const end = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.perpendicularDistance(points[i], start, end);
            if (distance > maxDistance) {
                maxDistance = distance;
                index = i;
            }
        }
        
        if (maxDistance > tolerance) {
            const leftPart = this.douglasPeucker(points.slice(0, index + 1), tolerance);
            const rightPart = this.douglasPeucker(points.slice(index), tolerance);
            
            return leftPart.slice(0, -1).concat(rightPart);
        } else {
            return [start, end];
        }
    }

    private perpendicularDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
        const A = lineEnd[0] - lineStart[0];
        const B = lineEnd[1] - lineStart[1];
        const C = lineStart[0] - point[0];
        const D = lineStart[1] - point[1];
        
        const dot = A * C + B * D;
        const lenSq = A * A + B * B;
        
        if (lenSq === 0) {
            return Math.sqrt(C * C + D * D);
        }
        
        const param = -dot / lenSq;
        
        let closestX, closestY;
        
        if (param < 0) {
            closestX = lineStart[0];
            closestY = lineStart[1];
        } else if (param > 1) {
            closestX = lineEnd[0];
            closestY = lineEnd[1];
        } else {
            closestX = lineStart[0] + param * A;
            closestY = lineStart[1] + param * B;
        }
        
        const dx = point[0] - closestX;
        const dy = point[1] - closestY;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    private calculatePolylineLength(polyline: Array<[number, number]>): number {
        let totalLength = 0;
        
        for (let i = 1; i < polyline.length; i++) {
            const dx = polyline[i][0] - polyline[i-1][0];
            const dy = polyline[i][1] - polyline[i-1][1];
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        
        return totalLength;
    }
}