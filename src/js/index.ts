import "phaser";
import { LoaderScene, GameScene } from "./scenes";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 704,
  zoom: 1,
  input: {
    keyboard: true,
    gamepad: true,
    mouse: false,
    touch: false,
  },
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
  },
  parent: "phaser",
  physics: {
    default: "arcade",
    arcade: {
      //debug: true,
      gravity: {
        y: 0,
      },
    },
  },
  scene: [LoaderScene, GameScene],
};

window.addEventListener("load", function () {
  const game = new Phaser.Game(config);
});
