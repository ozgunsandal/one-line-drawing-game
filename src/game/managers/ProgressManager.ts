import { GAME_CONFIG, COLORS } from '../constants/GameConstants';
import { ShapeTransform } from '../utils/ShapeTransform';
import { DrawingSystem } from '../systems/DrawingSystem';

export class ProgressManager {
    private scene: Phaser.Scene;
    private shapeTransform: ShapeTransform;
    private drawingSystem: DrawingSystem;
    
    private progressBarBg: Phaser.GameObjects.Graphics;
    private progressBarFill: Phaser.GameObjects.Graphics;
    private progressText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, shapeTransform: ShapeTransform, drawingSystem: DrawingSystem) {
        this.scene = scene;
        this.shapeTransform = shapeTransform;
        this.drawingSystem = drawingSystem;
    }

    createProgressBar(): void {
        const { barX, barY, barWidth, barHeight } = this.shapeTransform.getProgressBarTransform();

        this.progressBarBg = this.scene.add.graphics();
        this.progressBarBg.fillStyle(COLORS.PROGRESS_BG);
        this.progressBarBg.fillRoundedRect(barX, barY, barWidth, barHeight, 10);
        this.progressBarBg.lineStyle(2, COLORS.PROGRESS_BORDER);
        this.progressBarBg.strokeRoundedRect(barX, barY, barWidth, barHeight, 10);

        this.progressBarFill = this.scene.add.graphics();

        this.progressText = this.scene.add.text(barX + barWidth / 2, barY + barHeight / 2, '0%', {
            fontSize: `${GAME_CONFIG.PROGRESS_FONT_SIZE}px`,
            color: COLORS.TEXT_WHITE,
            fontFamily: 'Arial'
        }).setOrigin(0.5, 0.5);

        this.progressText.setText('0%');
        this.progressText.setPosition(barX + barWidth / 2, barY + barHeight / 2);
    }

    updateProgressBarPosition(): void {
        if (!this.progressBarBg || !this.progressBarFill || !this.progressText) return;

        const { barX, barY, barWidth, barHeight } = this.shapeTransform.getProgressBarTransform();

        this.progressBarBg.clear();
        this.progressBarBg.fillStyle(COLORS.PROGRESS_BG);
        this.progressBarBg.fillRoundedRect(barX, barY, barWidth, barHeight, 10);
        this.progressBarBg.lineStyle(2, COLORS.PROGRESS_BORDER);
        this.progressBarBg.strokeRoundedRect(barX, barY, barWidth, barHeight, 10);

        this.progressText.setPosition(barX + barWidth / 2, barY + barHeight / 2);
        this.updateProgress();
    }

    updateProgress(): number {
        const greenAreaPercentage = this.calculateGreenAreaFromHistogram();
        const progress = Math.min(100, Math.max(0, greenAreaPercentage));

        const { barX, barY, barWidth, barHeight } = this.shapeTransform.getProgressBarTransform();
        const fillWidth = (barWidth - 4) * (progress / 100);

        this.progressBarFill.clear();
        if (fillWidth > 0) {
            this.progressBarFill.fillStyle(COLORS.DRAWING_GREEN);
            this.progressBarFill.fillRoundedRect(barX + 2, barY + 2, fillWidth, barHeight - 4, 8);
        }

        this.progressText.setText(`${Math.round(progress)}%`);
        this.progressText.setPosition(barX + barWidth / 2, barY + barHeight / 2);

        if (progress >= 100) {
            this.progressText.setStyle({ color: COLORS.TEXT_BLACK });
        } else {
            this.progressText.setStyle({ color: COLORS.TEXT_WHITE });
        }

        console.log(`Green area coverage: ${Math.round(progress)}%`);
        return progress;
    }

    private calculateGreenAreaFromHistogram(): number {
        const paintedTexture = this.drawingSystem.getPaintedTexture();
        const canvas = paintedTexture.canvas;
        const context = canvas.getContext('2d');
        if (!context) return 0;

        const currentImageKey = this.getCurrentImageKey();
        const texture = this.scene.textures.get(currentImageKey);
        const imageWidth = texture.source[0].width;
        const imageHeight = texture.source[0].height;

        try {
            const paintedImageData = context.getImageData(0, 0, imageWidth, imageHeight);
            const paintedData = paintedImageData.data;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageWidth;
            tempCanvas.height = imageHeight;
            const tempContext = tempCanvas.getContext('2d');
            if (!tempContext) return 0;

            tempContext.drawImage(texture.source[0].image as HTMLImageElement, 0, 0);
            const originalImageData = tempContext.getImageData(0, 0, imageWidth, imageHeight);
            const originalData = originalImageData.data;

            let totalValidPixels = 0;
            let greenPixels = 0;

            for (let i = 0; i < originalData.length; i += 4) {
                const originalAlpha = originalData[i + 3];
                
                if (originalAlpha > GAME_CONFIG.ALPHA_THRESHOLD) {
                    totalValidPixels++;
                    
                    const paintedR = paintedData[i];
                    const paintedG = paintedData[i + 1];
                    const paintedB = paintedData[i + 2];
                    const paintedAlpha = paintedData[i + 3];
                    
                    if (paintedAlpha > 0 && 
                        paintedG > GAME_CONFIG.GREEN_PIXEL_THRESHOLD && 
                        paintedR < GAME_CONFIG.NON_GREEN_THRESHOLD && 
                        paintedB < GAME_CONFIG.NON_GREEN_THRESHOLD) {
                        greenPixels++;
                    }
                }
            }

            if (totalValidPixels === 0) return 0;
            
            const greenPercentage = (greenPixels / totalValidPixels) * 100;
            console.log(`Green pixels: ${greenPixels}, Total valid pixels: ${totalValidPixels}, Percentage: ${greenPercentage.toFixed(2)}%`);
            return greenPercentage;
            
        } catch (error) {
            console.error('Error calculating green area histogram:', error);
            return 0;
        }
    }

    completeProgress(): void {
        this.progressText.setText('100%');
        this.progressText.setStyle({ color: COLORS.DRAWING_GREEN });
        
        const { barX, barY, barWidth, barHeight } = this.shapeTransform.getProgressBarTransform();
        this.progressText.setPosition(barX + barWidth / 2, barY + barHeight / 2);
        
        this.progressBarFill.clear();
        this.progressBarFill.fillStyle(COLORS.DRAWING_GREEN);
        this.progressBarFill.fillRoundedRect(barX + 2, barY + 2, barWidth - 4, barHeight - 4, 8);
    }

    setCurrentImageKey(imageKey: string): void {
        this.currentImageKey = imageKey;
    }

    private currentImageKey: string = 'potion-bottle';

    private getCurrentImageKey(): string {
        return this.currentImageKey;
    }

    destroy(): void {
        if (this.progressBarBg) {
            this.progressBarBg.destroy();
        }
        if (this.progressBarFill) {
            this.progressBarFill.destroy();
        }
        if (this.progressText) {
            this.progressText.destroy();
        }
    }
}