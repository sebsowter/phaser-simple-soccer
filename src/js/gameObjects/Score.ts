export default class Score extends Phaser.GameObjects.BitmapText {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene,
      x,
      y,
      "font3x5",
      "0-0",
      null,
      Phaser.GameObjects.BitmapText.ALIGN_CENTER
    );

    this.scene.add.existing(this);

    this.setOrigin(0.5, 0);
    this.setScale(8);
    this.setDepth(10);
  }
}
