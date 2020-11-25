export default class LoaderScene extends Phaser.Scene {
  public preload(): void {
    this.load.image("goal", "./assets/images/goal.png");
    this.load.image("pitch", "./assets/images/pitch.png");
    this.load.spritesheet("sprites", "./assets/images/sprites.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  public create(): void {
    this.scene.start("game");
  }
}
