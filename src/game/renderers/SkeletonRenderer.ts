import { COLORS } from '../constants/GameConstants';
import { ShapeTransform } from '../utils/ShapeTransform';

export class SkeletonRenderer {
    private scene: Phaser.Scene;
    private shapeTransform: ShapeTransform;
    private skeletonLines: Phaser.GameObjects.Graphics[] = [];
    private showSkeleton = false;

    constructor(scene: Phaser.Scene, shapeTransform: ShapeTransform) {
        this.scene = scene;
        this.shapeTransform = shapeTransform;
    }

    renderSkeletonLines(polylines: Array<Array<[number, number]>>, currentImageKey: string): void {
        for (const line of this.skeletonLines) {
            line.destroy();
        }
        this.skeletonLines = [];
        
        if (!this.showSkeleton) return;
        
        const shapeTransformData = this.shapeTransform.getShapeTransform(currentImageKey);
        
        for (const polyline of polylines) {
            if (polyline.length < 2) continue;
            
            const graphics = this.scene.add.graphics();
            graphics.lineStyle(2, COLORS.SKELETON_COLOR, 1);
            
            let worldX = shapeTransformData.startX + (polyline[0][0] * shapeTransformData.scale);
            let worldY = shapeTransformData.startY + (polyline[0][1] * shapeTransformData.scale);
            graphics.moveTo(worldX, worldY);
            
            for (let i = 1; i < polyline.length; i++) {
                worldX = shapeTransformData.startX + (polyline[i][0] * shapeTransformData.scale);
                worldY = shapeTransformData.startY + (polyline[i][1] * shapeTransformData.scale);
                graphics.lineTo(worldX, worldY);
            }
            
            graphics.strokePath();
            this.skeletonLines.push(graphics);
        }
    }

    clearSkeletonLines(): void {
        for (const line of this.skeletonLines) {
            line.destroy();
        }
        this.skeletonLines = [];
    }

    setShowSkeleton(show: boolean): void {
        this.showSkeleton = show;
    }

    getShowSkeleton(): boolean {
        return this.showSkeleton;
    }

    destroy(): void {
        this.clearSkeletonLines();
    }
}