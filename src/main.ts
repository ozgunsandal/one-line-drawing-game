import StartGame from './game/main';
import { LocalizationManager } from './game/localization/LocalizationManager';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize localization and update page title
    const localization = LocalizationManager.getInstance();
    localization.updatePageTitle();

    StartGame('game-container');
});