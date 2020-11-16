export default class PlayerBase extends Phaser.Physics.Arcade.Sprite {
  public body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    options?: any
  ) {
    super(scene, x, y, "sprites", frame);

    this.setData({ jumpVelocity: -260, walkVelocity: 128 });

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.body.setSize(16, 16).setCollideWorldBounds(true);
  }

  public setState(value: number): this {
    return super.setState(value);
  }

  public preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
  }
}
