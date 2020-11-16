export default class Ball extends Phaser.Physics.Arcade.Image {
  public body: Phaser.Physics.Arcade.Body;
  public futurePosition: Phaser.Math.Vector2;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "sprites", 0);

    this.setData({ scored: 0 });

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.body.setFriction(0.5, 0.5);
    this.body.setSize(16, 16);
  }

  public get futurePositio2n() {
    return new Phaser.Math.Vector2();
  }
}
