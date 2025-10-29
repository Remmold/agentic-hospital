import { HospitalScene } from './scenes/HospitalScene.js';

let game;
let scene;

// Initialize Phaser with Arcade Physics
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 960,
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // Set to true to see collision boxes
        }
    },
    scene: HospitalScene
};

window.onload = () => {
    game = new Phaser.Game(config);
    game.events.on('ready', () => {
        scene = game.scene.getScene('HospitalScene');
    });
};

export { game, scene };
