import "phaser";
import { LoaderScene, PitchScene } from "./scenes";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 704,
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
  },
  parent: "phaser",
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
      gravity: {
        y: 0,
      },
    },
  },
  scene: [LoaderScene, PitchScene],
};

window.addEventListener("load", function () {
  const game = new Phaser.Game(config);
});
