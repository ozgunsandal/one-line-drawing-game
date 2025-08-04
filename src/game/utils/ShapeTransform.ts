import { GAME_CONFIG } from '../constants/GameConstants';

export interface ShapeTransformData {
    centerX: number;
    centerY: number;
    scale: number;
    startX: number;
    startY: number;
    imageWidth: number;
    imageHeight: number;
    brushSize: number;
}

export interface ProgressBarTransformData {
    barX: number;
    barY: number;
    barWidth: number;
    barHeight: number;
}

export class ShapeTransform {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    getShapeTransform(currentImageKey: string): ShapeTransformData {
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;
        const screenWidth = this.scene.cameras.main.width;
        
        const bg2Frame = this.scene.textures.get('texture').get('drawing-bg2.png');
        const bg2TargetWidth = screenWidth - (GAME_CONFIG.SCREEN_MARGIN * 2);
        const bg2Scale = bg2TargetWidth / bg2Frame.width;
        
        const texture = this.scene.textures.get(currentImageKey);
        const imageWidth = texture.source[0].width;
        const imageHeight = texture.source[0].height;
        const bg2Width = bg2Frame.width * bg2Scale;
        const bg2Height = bg2Frame.height * bg2Scale;
        const imageScaleX = (bg2Width * GAME_CONFIG.IMAGE_SCALE_FACTOR) / imageWidth;
        const imageScaleY = (bg2Height * GAME_CONFIG.IMAGE_SCALE_FACTOR) / imageHeight;
        const scale = Math.min(imageScaleX, imageScaleY);
        
        const finalImageWidth = imageWidth * scale;
        const finalImageHeight = imageHeight * scale;
        const startX = centerX - finalImageWidth / 2;
        const startY = centerY - finalImageHeight / 2;
        
        const dynamicBrushSize = GAME_CONFIG.BRUSH_SIZE_BASE * scale;
        
        return { 
            centerX, 
            centerY, 
            scale, 
            startX, 
            startY, 
            imageWidth: finalImageWidth, 
            imageHeight: finalImageHeight, 
            brushSize: dynamicBrushSize 
        };
    }

    getProgressBarTransform(): ProgressBarTransformData {
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;
        const screenWidth = this.scene.cameras.main.width;
        
        const bg2Frame = this.scene.textures.get('texture').get('drawing-bg2.png');
        const bg2TargetWidth = screenWidth - (GAME_CONFIG.SCREEN_MARGIN * 2);
        const bg2Scale = bg2TargetWidth / bg2Frame.width;
        const bg2Height = bg2Frame.height * bg2Scale;
        
        const barWidth = bg2TargetWidth - GAME_CONFIG.PROGRESS_BAR_MARGIN;
        const barHeight = GAME_CONFIG.PROGRESS_BAR_HEIGHT;
        
        const bg2TopY = centerY - (bg2Height / 2);
        const barX = centerX - (barWidth / 2);
        const barY = bg2TopY - barHeight - GAME_CONFIG.PROGRESS_BAR_OFFSET;
        
        return { barX, barY, barWidth, barHeight };
    }

    getInstallButtonTransform(): { btnX: number; btnY: number; scale: number } {
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        
        const btnFrame = this.scene.textures.get('texture').get('installBtn.png');
        const btnWidth = btnFrame.width;
        const btnHeight = btnFrame.height;
        
        const scale = Math.min(GAME_CONFIG.INSTALL_BUTTON_MAX_WIDTH / btnWidth, 1);
        const scaledHeight = btnHeight * scale;
        const btnX = screenWidth / 2;
        const btnY = screenHeight - GAME_CONFIG.INSTALL_BUTTON_MARGIN - (scaledHeight / 2);
        
        return { btnX, btnY, scale };
    }
}