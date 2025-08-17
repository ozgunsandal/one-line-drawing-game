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

    private tutorialHand: Phaser.GameObjects.Image | null = null;
    private tutorialActive: boolean = false;
    private lastUserInteractionAt: number = 0;
    private tutorialTween: Phaser.Tweens.Tween | null = null;

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
        this.setupIdleTutorialWatcher();
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
            this.noteUserInteraction();
            this.onMouseDown(pointer.x, pointer.y);
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.noteUserInteraction();
            if (this.tutorialActive) return;
            if (this.drawingSystem.getIsDrawing()) {
                this.onMouseMove(pointer.x, pointer.y);
            }
        });

        this.input.on('pointerup', () => {
            this.noteUserInteraction();
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
        this.stopTutorialIfActive();
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
            const reason = this.drawingSystem.getLastFailureReason();
            const showFail = reason === 'intersection';
            this.resetDrawing(!!showFail);
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

    private noteUserInteraction(): void {
        this.lastUserInteractionAt = this.time.now;
    }

    private setupIdleTutorialWatcher(): void {
        this.lastUserInteractionAt = this.time.now;
        this.time.addEvent({
            delay: 250,
            loop: true,
            callback: () => {
                if (this.gameCompleted) return;
                if (this.tutorialActive) return;
                if (this.input.activePointer.isDown) return;
                if (this.drawingSystem.getIsDrawing()) return;
                const idleMs = this.time.now - this.lastUserInteractionAt;
                if (idleMs >= 2000) {
                    this.startTutorial();
                }
            }
        });
    }

    private startTutorial(): void {
        if (this.tutorialActive) return;
        if (!this.skeletonPolylines.length) return;

        const polyline = this.skeletonPolylines.reduce((longest, pl) => pl.length > longest.length ? pl : longest, this.skeletonPolylines[0]);
        if (!polyline || polyline.length < 3) return;

        const maxPoints = Math.min(12, Math.max(3, Math.floor(polyline.length * 0.12)));
        const startIndex = Math.max(0, Math.min(polyline.length - maxPoints, Math.floor(polyline.length * 0.4)));
        const tutorialPoints = polyline.slice(startIndex, startIndex + maxPoints);

        const st = this.shapeTransform.getShapeTransform(this.currentImageKey);
        const worldPoints = tutorialPoints.map(p => ({ x: st.startX + p[0] * st.scale, y: st.startY + p[1] * st.scale }));

        const handFrame = this.textures.get(TEXTURE_ATLAS.KEY).get(ATLAS_FRAMES.HAND);
        const handFrameWidth = handFrame.width;
        const handFrameHeight = handFrame.height;
        const fingerTipOriginX = 80 / handFrameWidth;
        const fingerTipOriginY = 30 / handFrameHeight;
        const screenHeight = this.cameras.main.height;
        const maxHandHeight = screenHeight * 0.14;
        const minHandHeight = 32;
        const targetHandHeight = Phaser.Math.Clamp(st.brushSize * 6, minHandHeight, maxHandHeight);
        const handScale = targetHandHeight / handFrameHeight;

        if (!this.tutorialHand) {
            this.tutorialHand = this.add.image(worldPoints[0].x, worldPoints[0].y, TEXTURE_ATLAS.KEY, ATLAS_FRAMES.HAND)
                .setDepth(1000)
                .setOrigin(fingerTipOriginX, fingerTipOriginY)
                .setScale(handScale)
                .setAlpha(0.9);
        } else {
            this.tutorialHand
                .setVisible(true)
                .setOrigin(fingerTipOriginX, fingerTipOriginY)
                .setScale(handScale)
                .setPosition(worldPoints[0].x, worldPoints[0].y);
        }

        this.drawingSystem.onMouseDown(worldPoints[0].x, worldPoints[0].y);

        this.tutorialActive = true;
        const tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];
        for (let i = 1; i < worldPoints.length; i++) {
            const from = worldPoints[i - 1];
            const to = worldPoints[i];
            const dist = Math.hypot(to.x - from.x, to.y - from.y);
            const duration = Math.max(1000, Math.min(2000, dist * 5));
            tweens.push({
                targets: this.tutorialHand!,
                x: to.x,
                y: to.y,
                duration,
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    if (!this.tutorialActive) return;
                    this.drawingSystem.onMouseMove(this.tutorialHand!.x, this.tutorialHand!.y);
                }
            });
        }

        let idx = 1;
        const runNext = () => {
            if (!this.tutorialActive) return;
            if (idx >= worldPoints.length) {
                this.drawingSystem.onMouseUp();
                this.drawingSystem.resetDrawing();
                if (this.tutorialHand) this.tutorialHand.setVisible(false);
                this.tutorialActive = false;
                this.tutorialTween = null;
                return;
            }
            const from = worldPoints[idx - 1];
            const to = worldPoints[idx];
            const dist = Math.hypot(to.x - from.x, to.y - from.y);
            const duration = Math.max(500, Math.min(1000, dist * 5));

            this.tutorialTween = this.tweens.add({
                targets: this.tutorialHand!,
                x: to.x,
                y: to.y,
                duration,
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    if (!this.tutorialActive) return;
                    this.drawingSystem.onMouseMove(this.tutorialHand!.x, this.tutorialHand!.y);
                },
                onComplete: () => {
                    idx++;
                    runNext();
                }
            });
        };
        runNext();
    }

    private stopTutorialIfActive(): void {
        if (!this.tutorialActive) return;
        this.tutorialActive = false;
        this.tutorialTween?.stop();
        this.tutorialTween = null;
        if (this.tutorialHand) {
            this.tutorialHand.setVisible(false);
        }
        this.drawingSystem.onMouseUp();
        this.drawingSystem.resetDrawing();
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