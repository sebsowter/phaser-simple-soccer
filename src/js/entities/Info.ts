export default class Info extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, index: number, isLeft: boolean) {
    super(scene, 0, 0);

    this.scene.add.existing(this);

    this.setDepth(5);

    this.add(
      new Phaser.GameObjects.Line(
        this.scene,
        16,
        0,
        0,
        0,
        16,
        -16,
        isLeft ? 0xff0000 : 0x0000ff
      )
    );

    this.add(
      new Phaser.GameObjects.Rectangle(
        this.scene,
        16,
        -30,
        10,
        14,
        isLeft ? 0xff0000 : 0x0000ff
      ).setOrigin(0, 0)
    );

    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        18,
        -28,
        "font3x5",
        (index + 1).toString(),
        null
      )
        .setOrigin(0, 0)
        .setScale(2)
    );
  }
}
