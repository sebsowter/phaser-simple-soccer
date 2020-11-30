export default class Info extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, index: number, isLeft: boolean) {
    super(scene, 0, 0);

    this.scene.add.existing(this);

    this.add(
      new Phaser.GameObjects.Line(
        this.scene,
        12,
        2,
        18,
        -22,
        0,
        0,
        isLeft ? 0xff0000 : 0x0000ff
      )
    );

    this.add(
      new Phaser.GameObjects.Rectangle(
        this.scene,
        24,
        -24,
        24,
        16,
        isLeft ? 0xff0000 : 0x0000ff
      )
    );

    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        18,
        -22,
        "font3x5",
        (index + 1).toString(),
        null
      )
        .setOrigin(0.25, 0.25)
        .setScale(2)
    );
  }
}
