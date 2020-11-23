export default class Goal extends Phaser.Physics.Arcade.Image {
  public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, isLeft: boolean) {
    super(scene, x, y, "goal");

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setOrigin(isLeft ? 1 : 0, 0.5);
    this.setData("scored", 0);
  }

  public set scored(value: number) {
    this.setData("scored", value);
  }

  public get scored(): number {
    return this.getData("scored");
  }
}
