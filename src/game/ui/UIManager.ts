import { GAME_CONFIG, COLORS, ATLAS_FRAMES, MESSAGES } from '../constants/GameConstants';
import { ShapeTransform } from '../utils/ShapeTransform';
import { LocalizationManager } from '../localization/LocalizationManager';

export class UIManager {
    private scene: Phaser.Scene;
    private shapeTransform: ShapeTransform;
    private localization: LocalizationManager;
    
    private titleText: Phaser.GameObjects.Text | null = null;
    private subtitleText: Phaser.GameObjects.Text | null = null;
    private installButton: Phaser.GameObjects.Image | null = null;
    private installButtonText: Phaser.GameObjects.Text | null = null;

    constructor(scene: Phaser.Scene, shapeTransform: ShapeTransform) {
        this.scene = scene;
        this.shapeTransform = shapeTransform;
        this.localization = LocalizationManager.getInstance();
    }

    createTitleTexts(): void {
        const centerX = this.scene.cameras.main.width / 2;
        const screenWidth = this.scene.cameras.main.width;
        
        // Calculate responsive font sizes
        const titleFontSize = this.localization.getResponsiveFontSize(
            GAME_CONFIG.TITLE_FONT_SIZE, 
            'title', 
            screenWidth
        );
        
        const subtitleFontSize = this.localization.getResponsiveFontSize(
            GAME_CONFIG.SUBTITLE_FONT_SIZE, 
            'subtitle', 
            screenWidth
        );
        
        // Create title text with responsive settings
        this.titleText = this.scene.add.text(centerX, GAME_CONFIG.TITLE_TOP_MARGIN, MESSAGES.TITLE, {
            fontSize: `${titleFontSize}px`,
            color: COLORS.TEXT_WHITE,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            wordWrap: this.localization.shouldWrapText('title', titleFontSize, screenWidth) ? {
                width: this.localization.getWordWrapWidth(screenWidth),
                useAdvancedWrap: true
            } : undefined,
            align: 'center'
        }).setOrigin(0.5, 0);
        
        // Create subtitle text with responsive settings
        this.subtitleText = this.scene.add.text(
            centerX, 
            GAME_CONFIG.TITLE_TOP_MARGIN + GAME_CONFIG.SUBTITLE_OFFSET, 
            MESSAGES.SUBTITLE, 
            {
                fontSize: `${subtitleFontSize}px`,
                color: COLORS.TEXT_RED,
                fontFamily: 'Arial',
                wordWrap: this.localization.shouldWrapText('subtitle', subtitleFontSize, screenWidth) ? {
                    width: this.localization.getWordWrapWidth(screenWidth),
                    useAdvancedWrap: true
                } : undefined,
                align: 'center'
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

    updateTextSizes(): void {
        if (!this.titleText || !this.subtitleText) return;

        const screenWidth = this.scene.cameras.main.width;
        const centerX = screenWidth / 2;
        
        // Update title text
        const titleFontSize = this.localization.getResponsiveFontSize(
            GAME_CONFIG.TITLE_FONT_SIZE, 
            'title', 
            screenWidth
        );
        
        this.titleText.setFontSize(titleFontSize);
        this.titleText.setPosition(centerX, GAME_CONFIG.TITLE_TOP_MARGIN);
        
        if (this.localization.shouldWrapText('title', titleFontSize, screenWidth)) {
            this.titleText.setWordWrapWidth(this.localization.getWordWrapWidth(screenWidth));
        } else {
            this.titleText.setWordWrapWidth(screenWidth - 20);
        }
        
        // Update subtitle text
        const subtitleFontSize = this.localization.getResponsiveFontSize(
            GAME_CONFIG.SUBTITLE_FONT_SIZE, 
            'subtitle', 
            screenWidth
        );
        
        this.subtitleText.setFontSize(subtitleFontSize);
        this.subtitleText.setPosition(centerX, GAME_CONFIG.TITLE_TOP_MARGIN + GAME_CONFIG.SUBTITLE_OFFSET);
        
        if (this.localization.shouldWrapText('subtitle', subtitleFontSize, screenWidth)) {
            this.subtitleText.setWordWrapWidth(this.localization.getWordWrapWidth(screenWidth));
        } else {
            this.subtitleText.setWordWrapWidth(screenWidth - 20);
        }
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