import { languageData, SupportedLanguage, LocalizationKey } from './languages';

export type { SupportedLanguage, LocalizationKey };

export class LocalizationManager {
    private static instance: LocalizationManager;
    private currentLanguage: SupportedLanguage = 'en';
    
    private constructor() {
        this.detectLanguage();
    }
    
    public static getInstance(): LocalizationManager {
        if (!LocalizationManager.instance) {
            LocalizationManager.instance = new LocalizationManager();
        }
        return LocalizationManager.instance;
    }
    
    private detectLanguage(): void {
        
        const browserLang = navigator.language.toLowerCase();
        
        
        if (browserLang.startsWith('tr')) {
            this.currentLanguage = 'tr';
        } else if (browserLang.startsWith('ar')) {
            this.currentLanguage = 'ar';
        } else {
            this.currentLanguage = 'en'; // Default English
        }
    }
    
    public getCurrentLanguage(): SupportedLanguage {
        return this.currentLanguage;
    }
    
    public getText(key: LocalizationKey): string {
        const languageTexts = languageData[this.currentLanguage];
        return languageTexts[key] || languageData.en[key];
    }
    
    public updatePageTitle(): void {
        document.title = this.getText('page_title');
        
        
        if (this.isRTL()) {
            document.documentElement.setAttribute('dir', 'rtl');
            document.documentElement.setAttribute('lang', this.currentLanguage);
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
            document.documentElement.setAttribute('lang', this.currentLanguage);
        }
    }
    
    public isRTL(): boolean {
        return this.currentLanguage === 'ar';
    }
    
    public getResponsiveFontSize(baseSize: number, textKey: LocalizationKey, screenWidth: number): number {
        const text = this.getText(textKey);
        const textLength = text.length;
        
       
        let scaleFactor = 1;
        
       
        if (textKey === 'title') {
            if (textLength > 20) {
                scaleFactor = Math.max(0.7, Math.min(1, (screenWidth - 40) / (textLength * 12)));
            } else if (textLength > 15) {
                scaleFactor = Math.max(0.8, Math.min(1, (screenWidth - 40) / (textLength * 14)));
            }
        }
        
        
        if (textKey === 'subtitle') {
            const estimatedWidth = textLength * (baseSize * 0.6); 
            if (estimatedWidth > screenWidth - 40) {
                scaleFactor = Math.max(0.6, (screenWidth - 40) / estimatedWidth);
            }
        }
        
        return Math.round(baseSize * scaleFactor);
    }
    
    public shouldWrapText(textKey: LocalizationKey, fontSize: number, screenWidth: number): boolean {
        const text = this.getText(textKey);
        const estimatedWidth = text.length * (fontSize * 0.6);
        return estimatedWidth > screenWidth - 40;
    }
    
    public getWordWrapWidth(screenWidth: number): number {
        return Math.max(200, screenWidth - 40);
    }
}