import { GAME_CONFIG, COLORS } from '../constants/GameConstants';
import { ShapeTransform } from '../utils/ShapeTransform';

export interface SkeletonSegment {
    start: { x: number, y: number };
    end: { x: number, y: number };
    length: number;
    covered: boolean;
}

export class DrawingSystem {
    private scene: Phaser.Scene;
    private shapeTransform: ShapeTransform;
    private paintedTexture: Phaser.Textures.CanvasTexture;
    private paintedImage: Phaser.GameObjects.Image;
    
    private isDrawing = false;
    private lastMouseX = 0;
    private lastMouseY = 0;
    private currentPath: Array<{x: number, y: number}> = [];
    private drawnPaths: Array<Array<{x: number, y: number}>> = [];
    
    private previewLine: Phaser.GameObjects.Graphics | null = null;
    private skeletonPolylines: Array<Array<[number, number]>> = [];
    private skeletonSpatialGrid: Map<string, Array<{start: [number, number], end: [number, number]}>> = new Map();
    //private lastMousePosition = {x: 0, y: 0};
    
    private textureRefreshNeeded = false;
    private textureRefreshThrottle = 0;
    
    private skeletonSegments: SkeletonSegment[] = [];
    private totalSkeletonLength: number = 0;

    constructor(scene: Phaser.Scene, shapeTransform: ShapeTransform) {
        this.scene = scene;
        this.shapeTransform = shapeTransform;
    }

    createPaintTexture(currentImageKey: string): void {
        const texture = this.scene.textures.get(currentImageKey);
        const width = texture.source[0].width;
        const height = texture.source[0].height;
        
        if (this.paintedTexture) {
            this.scene.textures.remove('painted-texture');
        }
        
        const canvasTexture = this.scene.textures.createCanvas('painted-texture', width, height);
        if (!canvasTexture) {
            console.error('Failed to create canvas texture');
            return;
        }
        
        this.paintedTexture = canvasTexture;
        
        if (this.paintedImage) {
            this.paintedImage.destroy();
        }
        
        const shapeTransformData = this.shapeTransform.getShapeTransform(currentImageKey);
        this.paintedImage = this.scene.add.image(shapeTransformData.centerX, shapeTransformData.centerY, 'painted-texture')
            .setScale(shapeTransformData.scale);
    }

    getPaintedTexture(): Phaser.Textures.CanvasTexture {
        return this.paintedTexture;
    }

    getPaintedImage(): Phaser.GameObjects.Image {
        return this.paintedImage;
    }

    initializeDrawingSystem(skeletonPolylines: Array<Array<[number, number]>>): void {
        this.skeletonPolylines = skeletonPolylines;
        this.currentPath = [];
        this.drawnPaths = [];
        console.log('Drawing system initialized with skeleton path-constrained drawing');
        
        this.buildSkeletonSpatialGrid();
        this.indexSkeletonSegments();
        // this.addPathCursorFeedback();
        this.startTextureRefreshSystem();
    }

    private buildSkeletonSpatialGrid(): void {
        this.skeletonSpatialGrid.clear();
        
        const shapeTransformData = this.shapeTransform.getShapeTransform(this.getCurrentImageKey());
        
        for (const polyline of this.skeletonPolylines) {
            for (let i = 0; i < polyline.length - 1; i++) {
                const segmentStart = polyline[i];
                const segmentEnd = polyline[i + 1];
                
                const worldStart: [number, number] = [
                    shapeTransformData.startX + (segmentStart[0] * shapeTransformData.scale),
                    shapeTransformData.startY + (segmentStart[1] * shapeTransformData.scale)
                ];
                const worldEnd: [number, number] = [
                    shapeTransformData.startX + (segmentEnd[0] * shapeTransformData.scale),
                    shapeTransformData.startY + (segmentEnd[1] * shapeTransformData.scale)
                ];
                
                this.addSegmentToSpatialGrid(worldStart, worldEnd);
            }
        }
        
        console.log(`Built spatial grid with ${this.skeletonSpatialGrid.size} cells`);
    }

    private addSegmentToSpatialGrid(start: [number, number], end: [number, number]): void {
        const minX = Math.min(start[0], end[0]);
        const maxX = Math.max(start[0], end[0]);
        const minY = Math.min(start[1], end[1]);
        const maxY = Math.max(start[1], end[1]);
        
        const startCellX = Math.floor(minX / GAME_CONFIG.GRID_SIZE);
        const endCellX = Math.floor(maxX / GAME_CONFIG.GRID_SIZE);
        const startCellY = Math.floor(minY / GAME_CONFIG.GRID_SIZE);
        const endCellY = Math.floor(maxY / GAME_CONFIG.GRID_SIZE);
        
        for (let cellX = startCellX; cellX <= endCellX; cellX++) {
            for (let cellY = startCellY; cellY <= endCellY; cellY++) {
                const cellKey = `${cellX},${cellY}`;
                if (!this.skeletonSpatialGrid.has(cellKey)) {
                    this.skeletonSpatialGrid.set(cellKey, []);
                }
                this.skeletonSpatialGrid.get(cellKey)!.push({start, end});
            }
        }
    }

    private indexSkeletonSegments(): void {
        this.skeletonSegments = [];
        this.totalSkeletonLength = 0;
        
        const shapeTransformData = this.shapeTransform.getShapeTransform(this.getCurrentImageKey());
        
        for (const polyline of this.skeletonPolylines) {
            for (let i = 0; i < polyline.length - 1; i++) {
                const start = polyline[i];
                const end = polyline[i + 1];
                
                const startWorldX = shapeTransformData.startX + (start[0] * shapeTransformData.scale);
                const startWorldY = shapeTransformData.startY + (start[1] * shapeTransformData.scale);
                const endWorldX = shapeTransformData.startX + (end[0] * shapeTransformData.scale);
                const endWorldY = shapeTransformData.startY + (end[1] * shapeTransformData.scale);
                
                const segmentLength = this.getDistance(startWorldX, startWorldY, endWorldX, endWorldY);
                
                const segment: SkeletonSegment = {
                    start: { x: startWorldX, y: startWorldY },
                    end: { x: endWorldX, y: endWorldY },
                    length: segmentLength,
                    covered: false
                };
                
                this.skeletonSegments.push(segment);
                this.totalSkeletonLength += segmentLength;
            }
        }
        
        console.log(`Indexed ${this.skeletonSegments.length} skeleton segments, total length: ${Math.round(this.totalSkeletonLength)}`);
    }

    private startTextureRefreshSystem(): void {
        this.scene.events.on('update', () => {
            if (this.textureRefreshNeeded) {
                const now = this.scene.time.now;
                if (now - this.textureRefreshThrottle >= GAME_CONFIG.TEXTURE_REFRESH_DELAY) {
                    this.paintedTexture.refresh();
                    this.textureRefreshNeeded = false;
                    this.textureRefreshThrottle = now;
                }
            }
        });
    }

    private scheduleTextureRefresh(): void {
        this.textureRefreshNeeded = true;
    }

    findNearestPointOnSkeleton(mouseX: number, mouseY: number): {x: number, y: number, onPath: boolean} {
        let nearestPoint = {x: mouseX, y: mouseY, onPath: false};
        let minDistance = Infinity;
        
        const cellX = Math.floor(mouseX / GAME_CONFIG.GRID_SIZE);
        const cellY = Math.floor(mouseY / GAME_CONFIG.GRID_SIZE);
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const checkCellKey = `${cellX + dx},${cellY + dy}`;
                const segments = this.skeletonSpatialGrid.get(checkCellKey);
                
                if (!segments) continue;
                
                for (const segment of segments) {
                    const closestPoint = this.getClosestPointOnLineSegment(
                        mouseX, mouseY, 
                        segment.start[0], segment.start[1], 
                        segment.end[0], segment.end[1]
                    );
                    
                    const distance = this.getDistance(mouseX, mouseY, closestPoint.x, closestPoint.y);
                    
                    if (distance < minDistance && distance <= GAME_CONFIG.SNAP_DISTANCE) {
                        minDistance = distance;
                        nearestPoint = {
                            x: closestPoint.x,
                            y: closestPoint.y,
                            onPath: true
                        };
                    }
                }
            }
        }
        
        return nearestPoint;
    }

    private getClosestPointOnLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): {x: number, y: number} {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            return {x: x1, y: y1};
        }
        
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const x = x1 + t * dx;
        const y = y1 + t * dy;
        
        return {x, y};
    }

    private hidePathPreview(): void {
        if (this.previewLine) {
            this.previewLine.destroy();
            this.previewLine = null;
        }
    }

    onMouseDown(x: number, y: number): boolean {
        const snapPoint = this.findNearestPointOnSkeleton(x, y);
        
        if (!snapPoint.onPath) {
            console.log('Mouse not on valid drawing path');
            return false;
        }
        
        this.hidePathPreview();
        
        this.isDrawing = true;
        this.currentPath = [{x: snapPoint.x, y: snapPoint.y}];
        this.lastMouseX = snapPoint.x;
        this.lastMouseY = snapPoint.y;
        
        this.paintBrushDot(snapPoint.x, snapPoint.y);
        console.log('Drawing started at snapped position:', snapPoint.x, snapPoint.y);
        return true;
    }

    onMouseMove(x: number, y: number): boolean {
        if (!this.isDrawing) return true;

        const snapPoint = this.findNearestPointOnSkeleton(x, y);
        
        const drawPoint = snapPoint.onPath ? snapPoint : {x, y, onPath: false};
        
        const distance = this.getDistance(this.lastMouseX, this.lastMouseY, drawPoint.x, drawPoint.y);
        
        if (this.checkNewSegmentIntersection(this.lastMouseX, this.lastMouseY, drawPoint.x, drawPoint.y)) {
            console.log('Line intersection detected! Resetting...');
            return false;
        }
        
        if (distance < GAME_CONFIG.MIN_MOVEMENT_DISTANCE) return true;
        
        this.drawOptimizedLine(this.lastMouseX, this.lastMouseY, drawPoint.x, drawPoint.y);
        this.markCoveredSegments(this.lastMouseX, this.lastMouseY, drawPoint.x, drawPoint.y);
        this.currentPath.push({x: drawPoint.x, y: drawPoint.y});
        
        this.lastMouseX = drawPoint.x;
        this.lastMouseY = drawPoint.y;
        return true;
    }

    onMouseUp(): void {
        console.log('Mouse up detected - stopping drawing');
        this.hidePathPreview();
    }

    private drawOptimizedLine(startX: number, startY: number, endX: number, endY: number): void {
        const distance = this.getDistance(startX, startY, endX, endY);
        const stepSize = Math.min(3, Math.max(1.5, distance / 8));
        const steps = Math.max(1, Math.ceil(distance / stepSize));
        
        if (steps > 1) {
            const dx = endX - startX;
            const dy = endY - startY;
            
            let lastX = startX;
            let lastY = startY;
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const currentX = startX + dx * t;
                const currentY = startY + dy * t;
                
                if (this.checkNewSegmentIntersection(lastX, lastY, currentX, currentY)) {
                    console.log('Line intersection detected during drawing! Resetting...');
                    return;
                }
                
                if (i < steps && distance > 3) {
                    this.paintBrushDot(currentX, currentY);
                }
                
                lastX = currentX;
                lastY = currentY;
            }
        }
        
        this.paintBrushStroke(startX, startY, endX, endY);
    }

    private paintBrushStroke(startX: number, startY: number, endX: number, endY: number): void {
        const canvas = this.paintedTexture.canvas;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        const shapeTransformData = this.shapeTransform.getShapeTransform(this.getCurrentImageKey());
        
        const localStartX = (startX - shapeTransformData.startX) / shapeTransformData.scale;
        const localStartY = (startY - shapeTransformData.startY) / shapeTransformData.scale;
        const localEndX = (endX - shapeTransformData.startX) / shapeTransformData.scale;
        const localEndY = (endY - shapeTransformData.startY) / shapeTransformData.scale;
        
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = '#00ff00';
        context.lineWidth = shapeTransformData.brushSize / shapeTransformData.scale;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        
        context.beginPath();
        context.moveTo(localStartX, localStartY);
        context.lineTo(localEndX, localEndY);
        context.stroke();
        
        this.scheduleTextureRefresh();
    }

    private paintBrushDot(x: number, y: number): void {
        const canvas = this.paintedTexture.canvas;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        const shapeTransformData = this.shapeTransform.getShapeTransform(this.getCurrentImageKey());
        
        const localX = (x - shapeTransformData.startX) / shapeTransformData.scale;
        const localY = (y - shapeTransformData.startY) / shapeTransformData.scale;
        
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = '#00ff00';
        
        context.beginPath();
        context.arc(localX, localY, (shapeTransformData.brushSize / 2) / shapeTransformData.scale, 0, Math.PI * 2);
        context.fill();
        
        this.scheduleTextureRefresh();
    }

    private markCoveredSegments(drawnStartX: number, drawnStartY: number, drawnEndX: number, drawnEndY: number): void {
        for (const segment of this.skeletonSegments) {
            if (!segment.covered) {
                const distance = this.lineToLineDistance(
                    drawnStartX, drawnStartY, drawnEndX, drawnEndY,
                    segment.start.x, segment.start.y, segment.end.x, segment.end.y
                );

                if (distance <= GAME_CONFIG.COVERAGE_RADIUS) {
                    segment.covered = true;
                }
            }
        }
    }

    private lineToLineDistance(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): number {
        const distances = [
            this.pointToLineDistance(x1, y1, x3, y3, x4, y4),
            this.pointToLineDistance(x2, y2, x3, y3, x4, y4),
            this.pointToLineDistance(x3, y3, x1, y1, x2, y2),
            this.pointToLineDistance(x4, y4, x1, y1, x2, y2)
        ];
        
        return Math.min(...distances);
    }

    private pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));
        
        const xx = x1 + param * C;
        const yy = y1 + param * D;
        
        const dx = px - xx;
        const dy = py - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    private hasNearbyDrawablePath(segStartX: number, segStartY: number, segEndX: number, segEndY: number): boolean {
        const threshold = GAME_CONFIG.NEAR_DRAWABLE_DISTANCE;
        for (const segment of this.skeletonSegments) {
            if (segment.covered) continue;
            const d = this.lineToLineDistance(
                segStartX, segStartY, segEndX, segEndY,
                segment.start.x, segment.start.y, segment.end.x, segment.end.y
            );
            if (d <= threshold) {
                return true;
            }
        }
        return false;
    }

    private checkNewSegmentIntersection(newStartX: number, newStartY: number, newEndX: number, newEndY: number): boolean {
        for (const path of this.drawnPaths) {
            for (let i = 0; i < path.length - 1; i++) {
                const segmentStart = path[i];
                const segmentEnd = path[i + 1];
                
                if (this.checkLineIntersection(
                    newStartX, newStartY, newEndX, newEndY,
                    segmentStart.x, segmentStart.y, segmentEnd.x, segmentEnd.y
                )) {
                    // Tolerate if there is a nearby drawable path to progress towards
                    if (this.hasNearbyDrawablePath(newStartX, newStartY, newEndX, newEndY)) {
                        continue;
                    }
                    return true;
                }
            }
        }
        
        if (this.currentPath.length > GAME_CONFIG.SKIP_RECENT_SEGMENTS) {
            for (let i = 0; i < this.currentPath.length - GAME_CONFIG.SKIP_RECENT_SEGMENTS; i++) {
                const segmentStart = this.currentPath[i];
                const segmentEnd = this.currentPath[i + 1];
                
                if (this.checkLineIntersection(
                    newStartX, newStartY, newEndX, newEndY,
                    segmentStart.x, segmentStart.y, segmentEnd.x, segmentEnd.y
                )) {
                    if (this.hasNearbyDrawablePath(newStartX, newStartY, newEndX, newEndY)) {
                        continue;
                    }
                    return true;
                }
            }
        }
        
        return false;
    }

    private checkLineIntersection(x1: number, y1: number, x2: number, y2: number, 
                                 x3: number, y3: number, x4: number, y4: number): boolean {
        
        const orientation1 = this.orientation(x1, y1, x2, y2, x3, y3);
        const orientation2 = this.orientation(x1, y1, x2, y2, x4, y4);
        const orientation3 = this.orientation(x3, y3, x4, y4, x1, y1);
        const orientation4 = this.orientation(x3, y3, x4, y4, x2, y2);
        
        if (orientation1 !== orientation2 && orientation3 !== orientation4) {
            return true;
        }
        
        if (orientation1 === 0 && this.onSegment(x1, y1, x3, y3, x2, y2)) return true;
        if (orientation2 === 0 && this.onSegment(x1, y1, x4, y4, x2, y2)) return true;
        if (orientation3 === 0 && this.onSegment(x3, y3, x1, y1, x4, y4)) return true;
        if (orientation4 === 0 && this.onSegment(x3, y3, x2, y2, x4, y4)) return true;
        
        return false;
    }

    private orientation(px: number, py: number, qx: number, qy: number, rx: number, ry: number): number {
        const val = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
        
        if (Math.abs(val) < GAME_CONFIG.INTERSECTION_EPSILON) return 0;
        return val > 0 ? 1 : -1;
    }
    
    private onSegment(px: number, py: number, qx: number, qy: number, rx: number, ry: number): boolean {
        return qx <= Math.max(px, rx) && qx >= Math.min(px, rx) &&
               qy <= Math.max(py, ry) && qy >= Math.min(py, ry);
    }

    resetDrawing(): void {
        const canvas = this.paintedTexture.canvas;
        const context = canvas.getContext('2d');
        if (context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            this.scheduleTextureRefresh();
        }

        this.drawnPaths = [];
        this.currentPath = [];
        this.isDrawing = false;
        
        for (const segment of this.skeletonSegments) {
            segment.covered = false;
        }
        
        console.log('Drawing reset complete');
    }

    paintEntireShapeGreen(currentImageKey: string): void {
        const canvas = this.paintedTexture.canvas;
        const context = canvas.getContext('2d');
        if (!context) return;

        const texture = this.scene.textures.get(currentImageKey);
        const imageWidth = texture.source[0].width;
        const imageHeight = texture.source[0].height;

        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageWidth;
            tempCanvas.height = imageHeight;
            const tempContext = tempCanvas.getContext('2d');
            if (!tempContext) return;

            tempContext.drawImage(texture.source[0].image as HTMLImageElement, 0, 0);
            const originalImageData = tempContext.getImageData(0, 0, imageWidth, imageHeight);
            const originalData = originalImageData.data;

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.globalCompositeOperation = 'source-over';

            const paintedImageData = context.createImageData(imageWidth, imageHeight);
            const paintedData = paintedImageData.data;

            for (let i = 0; i < originalData.length; i += 4) {
                const originalAlpha = originalData[i + 3];
                
                if (originalAlpha > GAME_CONFIG.ALPHA_THRESHOLD) {
                    paintedData[i] = COLORS.DRAWING_GREEN_RGB.r;
                    paintedData[i + 1] = COLORS.DRAWING_GREEN_RGB.g;
                    paintedData[i + 2] = COLORS.DRAWING_GREEN_RGB.b;
                    paintedData[i + 3] = 255;
                } else {
                    paintedData[i] = 0;
                    paintedData[i + 1] = 0;
                    paintedData[i + 2] = 0;
                    paintedData[i + 3] = 0;
                }
            }

            context.putImageData(paintedImageData, 0, 0);
            this.scheduleTextureRefresh();
            
        } catch (error) {
            console.error('Error painting entire shape green:', error);
        }
    }

    getSkeletonSegments(): SkeletonSegment[] {
        return this.skeletonSegments;
    }

    getTotalSkeletonLength(): number {
        return this.totalSkeletonLength;
    }

    getIsDrawing(): boolean {
        return this.isDrawing;
    }

    setIsDrawing(value: boolean): void {
        this.isDrawing = value;
    }

    private getDistance(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    setCurrentImageKey(imageKey: string): void {
        this.currentImageKey = imageKey;
    }

    private currentImageKey: string = 'potion-bottle';

    private getCurrentImageKey(): string {
        return this.currentImageKey;
    }

    destroy(): void {
        this.hidePathPreview();
        if (this.paintedImage) {
            this.paintedImage.destroy();
        }
        if (this.paintedTexture) {
            this.scene.textures.remove('painted-texture');
        }
    }
}