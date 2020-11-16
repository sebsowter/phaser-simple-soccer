export default class Goal extends Phaser.Physics.Arcade.Image {
  public body: Phaser.Physics.Arcade.Body;
  public scored: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, null);

    this.setData({ scored: 0 });

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.body.setSize(64, 128);
  }
}
