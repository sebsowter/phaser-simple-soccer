import "phaser";
import { LoaderScene, GameScene } from "./scenes";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 704,
  zoom: 1,
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
  new Phaser.Game(config);
});
