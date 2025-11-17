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
            debug: false // Set to true to see object shapes
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

const collapseBtn = document.getElementById('collapseBtn');
const infoPanel = document.getElementById('information-panel');
const mainSection = document.getElementById('main-section');

collapseBtn.addEventListener('click', () => {
    infoPanel.classList.toggle('collapsed');
    mainSection.classList.toggle('left-collapsed');
});

export { game, scene };
