import { Scene } from 'phaser';
import { GAME_CONFIG, DRAWING_OBJECTS, ASSET_PATHS, TEXTURE_ATLAS, ATLAS_FRAMES, MESSAGES } from '../constants/GameConstants';
import { ShapeTransform } from '../utils/ShapeTransform';
import { SkeletonGenerator } from '../systems/SkeletonGenerator';
import { DrawingSystem } from '../systems/DrawingSystem';
import { ProgressManager } from '../managers/ProgressManager';
import { OverlayManager } from '../managers/OverlayManager';
import { UIManager } from '../ui/UIManager';
import { SkeletonRenderer } from '../renderers/SkeletonRenderer';

export class Game extends Scene {
    private shapeTransform: ShapeTransform;
    private skeletonGenerator: SkeletonGenerator;
    private drawingSystem: DrawingSystem;
    private progressManager: ProgressManager;
    private overlayManager: OverlayManager;
    private uiManager: UIManager;
    private skeletonRenderer: SkeletonRenderer;

    private currentImageIndex: number = 0;
    private currentImageKey: string = DRAWING_OBJECTS[0];
    private currentImage: Phaser.GameObjects.Image | null = null;

    private gameCompleted: boolean = false;
    private skeletonPolylines: Array<Array<[number, number]>> = [];

    constructor() {
        super('Game');
    }

    setupResizeHandler() {
        this.scale.on('resize', () => {
            this.progressManager.updateProgressBarPosition();
            this.uiManager.updateInstallButtonPosition();
            this.uiManager.updateTextSizes();
        });
    }

    preload() {
        for (const [key, path] of Object.entries(ASSET_PATHS.DRAWING_OBJECTS)) {
            this.load.image(key, path);
        }
        this.load.atlas(TEXTURE_ATLAS.KEY, TEXTURE_ATLAS.PATH, TEXTURE_ATLAS.JSON_PATH);
    }

    create() {
        this.initializeSystems();
        this.createBackgrounds();
        this.createUI();
        this.initializeGame();
        this.setupResizeHandler();
    }

    private initializeSystems(): void {
        this.shapeTransform = new ShapeTransform(this);
        this.skeletonGenerator = new SkeletonGenerator(this);
        this.drawingSystem = new DrawingSystem(this, this.shapeTransform);
        this.progressManager = new ProgressManager(this, this.shapeTransform, this.drawingSystem);
        this.overlayManager = new OverlayManager(this);
        this.uiManager = new UIManager(this, this.shapeTransform);
        this.skeletonRenderer = new SkeletonRenderer(this, this.shapeTransform);
    }

    private createBackgrounds(): void {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        
        const bg1 = this.add.image(centerX, centerY, TEXTURE_ATLAS.KEY, ATLAS_FRAMES.BG1);
        const bg1Frame = this.textures.get(TEXTURE_ATLAS.KEY).get(ATLAS_FRAMES.BG1);
        const bg1ScaleX = (screenWidth / bg1Frame.width) * GAME_CONFIG.BG_SCALE_EXTRA;
        const bg1ScaleY = (screenHeight / bg1Frame.height) * GAME_CONFIG.BG_SCALE_EXTRA;
        bg1.setScale(bg1ScaleX, bg1ScaleY);
        
        const bg2TargetWidth = screenWidth - (GAME_CONFIG.SCREEN_MARGIN * 2);
        const bg2 = this.add.image(centerX, centerY, TEXTURE_ATLAS.KEY, ATLAS_FRAMES.BG2);
        const bg2Frame = this.textures.get(TEXTURE_ATLAS.KEY).get(ATLAS_FRAMES.BG2);
        const bg2Scale = bg2TargetWidth / bg2Frame.width;
        bg2.setScale(bg2Scale);
    }

    private createUI(): void {
        this.uiManager.createTitleTexts();
        this.uiManager.createInstallButton();
    }

    private initializeGame(): void {
        this.createCurrentImage();
        this.createPaintTexture();
        this.progressManager.createProgressBar();
        this.generateSkeleton();
        this.initializeDrawingSystem();
        this.setupMouseEvents();
        this.updateProgress();
    }

    private createCurrentImage(): void {
        const shapeTransformData = this.shapeTransform.getShapeTransform(this.currentImageKey);
        this.currentImage = this.add.image(shapeTransformData.centerX, shapeTransformData.centerY, this.currentImageKey);
        this.currentImage.setScale(shapeTransformData.scale);
    }

    private createPaintTexture(): void {
        this.drawingSystem.setCurrentImageKey(this.currentImageKey);
        this.progressManager.setCurrentImageKey(this.currentImageKey);
        this.drawingSystem.createPaintTexture(this.currentImageKey);
    }

    private generateSkeleton(): void {
        this.skeletonPolylines = this.skeletonGenerator.generateSkeleton(this.currentImageKey);
        this.skeletonRenderer.renderSkeletonLines(this.skeletonPolylines, this.currentImageKey);
    }

    private initializeDrawingSystem(): void {
        this.drawingSystem.initializeDrawingSystem(this.skeletonPolylines);
    }

    private setupMouseEvents(): void {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.onMouseDown(pointer.x, pointer.y);
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.drawingSystem.getIsDrawing()) {
                this.onMouseMove(pointer.x, pointer.y);
            }
        });

        this.input.on('pointerup', () => {
            this.onMouseUp();
        });

        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-R', () => {
                this.resetDrawing();
            });
        }
        
        this.input.keyboard?.addKey('R')?.on('down', () => {
            this.resetDrawing();
        });
        
        this.input.keyboard?.addKey('ESC')?.on('down', () => {
            this.resetDrawing();
        });
    }

    private onMouseDown(x: number, y: number): void {
        if (this.gameCompleted) {
            console.log(MESSAGES.DRAWING_DISABLED);
            return;
        }
        
        if (!this.drawingSystem.onMouseDown(x, y)) {
            return;
        }
    }

    private onMouseMove(x: number, y: number): void {
        if (this.gameCompleted) return;
        
        if (!this.drawingSystem.onMouseMove(x, y)) {
            this.resetDrawing(true);
            return;
        }
        
        this.updateProgress();
    }

    private onMouseUp(): void {
        if (!this.drawingSystem.getIsDrawing()) return;
        
        console.log('Mouse up - resetting drawing without fail screen');
        this.drawingSystem.onMouseUp();
        this.resetDrawing(false);
    }

    private updateProgress(): void {
        if (this.gameCompleted) return;

        const progress = this.progressManager.updateProgress();
        
        if (progress >= GAME_CONFIG.COMPLETION_THRESHOLD && !this.gameCompleted) {
            this.completeGame();
        }
    }

    private completeGame(): void {
        console.log(MESSAGES.GAME_COMPLETED);
        this.gameCompleted = true;
        
        this.drawingSystem.setIsDrawing(false);
        this.drawingSystem.paintEntireShapeGreen(this.currentImageKey);
        this.overlayManager.createConfettiEffect();
        this.overlayManager.showSuccessOverlay();
        this.progressManager.completeProgress();
        
        this.game.canvas.style.cursor = 'default';
        
        this.time.delayedCall(GAME_CONFIG.NEXT_IMAGE_DELAY, () => {
            this.nextImage();
        });
    }

    private nextImage(): void {
        this.currentImageIndex = (this.currentImageIndex + 1) % DRAWING_OBJECTS.length;
        this.currentImageKey = DRAWING_OBJECTS[this.currentImageIndex];
        
        console.log(`Switching to next image: ${this.currentImageKey}`);
        
        this.overlayManager.removeOverlay();
        
        if (this.currentImage) {
            this.currentImage.destroy();
            this.currentImage = null;
        }
        
        this.resetDrawingForNewImage();
        this.createCurrentImage();
        this.createPaintTexture();
        this.generateSkeleton();
        this.initializeDrawingSystem();
        this.updateProgress();
        
        console.log(`Successfully switched to image: ${this.currentImageKey}`);
    }

    private resetDrawingForNewImage(): void {
        this.gameCompleted = false;
        this.drawingSystem.setIsDrawing(false);
        
        this.skeletonRenderer.clearSkeletonLines();
        this.skeletonPolylines = [];
        
        this.game.canvas.style.cursor = 'default';
    }

    private resetDrawing(showFailure: boolean = false): void {
        console.log('Resetting drawing...');
        
        this.drawingSystem.resetDrawing();
        this.gameCompleted = false;
        this.updateProgress();
        
        console.log('Drawing reset complete');
        
        if (showFailure) {
            this.overlayManager.showFailureOverlay();
        }
    }

    getCurrentImageKey(): string {
        return this.currentImageKey;
    }
}