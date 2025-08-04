import { GAME_CONFIG, COLORS, ATLAS_FRAMES } from '../constants/GameConstants';

export class OverlayManager {
    private scene: Phaser.Scene;
    private overlayBackground: Phaser.GameObjects.Rectangle | null = null;
    private overlayImage: Phaser.GameObjects.Image | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    showFailureOverlay(): void {
        this.removeOverlay();
        
        this.overlayBackground = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2, 
            this.scene.cameras.main.height / 2, 
            this.scene.cameras.main.width, 
            this.scene.cameras.main.height, 
            COLORS.OVERLAY_BACKGROUND, 
            COLORS.OVERLAY_ALPHA
        );
        this.overlayBackground.setDepth(1000);
        
        this.overlayImage = this.scene.add.image(
            this.scene.cameras.main.width / 2, 
            this.scene.cameras.main.height / 2, 
            'texture', 
            ATLAS_FRAMES.FAIL_IMAGE
        );
        this.overlayImage.setDepth(1001);
        
        this.scaleAndAnimateOverlay();
        
        this.scene.time.delayedCall(GAME_CONFIG.FAILURE_OVERLAY_DURATION, () => {
            this.removeOverlay();
        });
    }

    showSuccessOverlay(): void {
        this.removeOverlay();
        
        this.overlayBackground = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2, 
            this.scene.cameras.main.height / 2, 
            this.scene.cameras.main.width, 
            this.scene.cameras.main.height, 
            COLORS.OVERLAY_BACKGROUND, 
            COLORS.OVERLAY_ALPHA
        );
        this.overlayBackground.setDepth(1000);
        
        this.overlayImage = this.scene.add.image(
            this.scene.cameras.main.width / 2, 
            this.scene.cameras.main.height / 2, 
            'texture', 
            ATLAS_FRAMES.SUCCESS_IMAGE
        );
        this.overlayImage.setDepth(1001);
        
        this.scaleAndAnimateOverlay();
        
        this.scene.time.delayedCall(GAME_CONFIG.SUCCESS_OVERLAY_DURATION, () => {
            this.removeOverlay();
        });
    }

    private scaleAndAnimateOverlay(): void {
        if (!this.overlayImage) return;

        const screenWidth = this.scene.cameras.main.width;
        const imageWidth = this.overlayImage.width;
        const maxImageWidth = screenWidth * 0.6;
        let targetScale = 1;
        
        if (imageWidth > maxImageWidth) {
            targetScale = maxImageWidth / imageWidth;
        }
        
        this.overlayImage.setScale(0);
        this.scene.tweens.add({
            targets: this.overlayImage,
            scaleX: targetScale,
            scaleY: targetScale,
            duration: GAME_CONFIG.OVERLAY_ANIMATION_DURATION,
            ease: 'Back.easeOut'
        });
    }

    createConfettiEffect(): void {
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        
        for (let i = 0; i < GAME_CONFIG.CONFETTI_COUNT; i++) {
            const startX = Math.random() * screenWidth;
            const startY = -20;
            
            const size = 6 + Math.random() * 8;
            const confetti = this.scene.add.rectangle(
                startX, 
                startY, 
                size, 
                size, 
                COLORS.CONFETTI_COLORS[Math.floor(Math.random() * COLORS.CONFETTI_COLORS.length)]
            );
            confetti.setDepth(2000);
            
            const horizontalDrift = (Math.random() - 0.5) * 100;
            const rotationSpeed = (Math.random() - 0.5) * 8;
            
            this.scene.tweens.add({
                targets: confetti,
                x: startX + horizontalDrift,
                y: screenHeight + 50,
                rotation: rotationSpeed * Math.PI,
                duration: GAME_CONFIG.CONFETTI_FALL_DURATION + Math.random() * 2000,
                ease: 'Linear',
                delay: Math.random() * 1000,
                onComplete: () => {
                    confetti.destroy();
                }
            });
            
            this.scene.tweens.add({
                targets: confetti,
                x: `+=${(Math.random() - 0.5) * 60}`,
                duration: 1000 + Math.random() * 1000,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: 2,
                delay: Math.random() * 500
            });
            
            this.scene.tweens.add({
                targets: confetti,
                alpha: 0,
                duration: 1000,
                delay: 3500 + Math.random() * 1000
            });
        }
    }

    removeOverlay(): void {
        if (this.overlayBackground) {
            this.overlayBackground.destroy();
            this.overlayBackground = null;
        }
        
        if (this.overlayImage) {
            this.overlayImage.destroy();
            this.overlayImage = null;
        }
    }

    destroy(): void {
        this.removeOverlay();
    }
}