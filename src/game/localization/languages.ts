export type SupportedLanguage = 'en' | 'tr' | 'ar';
export type LocalizationKey = 'title' | 'subtitle' | 'install_button' | 'page_title';

export interface LanguageData {
  [key: string]: string;
}

export interface LanguagesData {
  [key: string]: LanguageData;
}

export const languageData: LanguagesData = {
  en: {
    title: "CAN YOU DRAW IT?",
    subtitle: "no lifting finger and overlapping lines", 
    install_button: "INSTALL",
    page_title: "Can you draw it?"
  },
  tr: {
    title: "ÇİZEBİLİR MİSİN?",
    subtitle: "parmağını kaldırma ve çizgilerin üstünden geçme",
    install_button: "İNDİR",
    page_title: "Çizebilir misin?"
  },
  ar: {
    title: "هل يمكنك رسمه؟",
    subtitle: "لا رفع إصبع وخطوط متداخلة",
    install_button: "ثَبَّتَ",
    page_title: "هل يمكنك رسمه؟"
  }
};