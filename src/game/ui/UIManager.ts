import { GAME_CONFIG, COLORS, ATLAS_FRAMES, MESSAGES } from '../constants/GameConstants';
import { ShapeTransform } from '../utils/ShapeTransform';

export class UIManager {
    private scene: Phaser.Scene;
    private shapeTransform: ShapeTransform;
    
    private titleText: Phaser.GameObjects.Text | null = null;
    private subtitleText: Phaser.GameObjects.Text | null = null;
    private installButton: Phaser.GameObjects.Image | null = null;
    private installButtonText: Phaser.GameObjects.Text | null = null;

    constructor(scene: Phaser.Scene, shapeTransform: ShapeTransform) {
        this.scene = scene;
        this.shapeTransform = shapeTransform;
    }

    createTitleTexts(): void {
        const centerX = this.scene.cameras.main.width / 2;
        
        this.titleText = this.scene.add.text(centerX, GAME_CONFIG.TITLE_TOP_MARGIN, MESSAGES.TITLE, {
            fontSize: `${GAME_CONFIG.TITLE_FONT_SIZE}px`,
            color: COLORS.TEXT_WHITE,
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);
        
        this.subtitleText = this.scene.add.text(
            centerX, 
            GAME_CONFIG.TITLE_TOP_MARGIN + GAME_CONFIG.SUBTITLE_OFFSET, 
            MESSAGES.SUBTITLE, 
            {
                fontSize: `${GAME_CONFIG.SUBTITLE_FONT_SIZE}px`,
                color: COLORS.TEXT_RED,
                fontFamily: 'Arial'
            }
        ).setOrigin(0.5, 0);
    }

    createInstallButton(): void {
        this.installButton = this.scene.add.image(0, 0, 'texture', ATLAS_FRAMES.INSTALL_BTN);
        
        const { btnX, btnY, scale } = this.shapeTransform.getInstallButtonTransform();
        this.installButton.setScale(scale);
        this.installButton.setPosition(btnX, btnY);
        
        this.installButtonText = this.scene.add.text(btnX, btnY, MESSAGES.INSTALL_BUTTON, {
            fontSize: `${GAME_CONFIG.INSTALL_BUTTON_FONT_SIZE}px`,
            color: COLORS.TEXT_WHITE,
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);
        
        this.setupInstallButtonEvents();
    }

    private setupInstallButtonEvents(): void {
        if (!this.installButton || !this.installButtonText) return;

        this.installButton.setInteractive();
        
        this.installButton.on('pointerdown', () => {
            this.installButton?.setTint(0xcccccc);
            this.installButtonText?.setTint(0xcccccc);
            
            try {
                (window as any).ExitApi.exit();
            } catch (error) {
            }
            
            try {
                (window as any).callFacebookCTA();
            } catch (error) {
            }
        });
        
        this.installButton.on('pointerup', () => {
            this.installButton?.clearTint();
            this.installButtonText?.clearTint();
        });
        
        this.installButton.on('pointerout', () => {
            this.installButton?.clearTint();
            this.installButtonText?.clearTint();
        });
    }

    updateInstallButtonPosition(): void {
        if (!this.installButton || !this.installButtonText) return;

        const { btnX, btnY, scale } = this.shapeTransform.getInstallButtonTransform();
        
        this.installButton.setPosition(btnX, btnY);
        this.installButtonText.setPosition(btnX, btnY);
        this.installButtonText.setFontSize(Math.round(GAME_CONFIG.INSTALL_BUTTON_FONT_SIZE * scale));
    }

    destroy(): void {
        if (this.titleText) {
            this.titleText.destroy();
        }
        if (this.subtitleText) {
            this.subtitleText.destroy();
        }
        if (this.installButton) {
            this.installButton.destroy();
        }
        if (this.installButtonText) {
            this.installButtonText.destroy();
        }
    }
}