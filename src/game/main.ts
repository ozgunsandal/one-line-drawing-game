import { Game as MainGame } from './scenes/Game';
import { AUTO, Game, Scale } from 'phaser';

const getScaleMode = (): number => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    return windowWidth > windowHeight ? Scale.FIT : 6;
};

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 375,
    height: 667,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scale: {
        mode: getScaleMode(),
        autoCenter: Scale.CENTER_BOTH,
        width: 375,
        height: 667
    },
    scene: [
        MainGame
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
