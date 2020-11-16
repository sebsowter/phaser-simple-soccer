export default class LoaderScene extends Phaser.Scene {
  public preload(): void {
    this.load.image("pitch", "./assets/images/pitch.png");
    this.load.spritesheet("sprites", "./assets/images/sprites.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  public create(): void {
    this.scene.start("game");
  }
}
