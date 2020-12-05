export default class GoalGroup extends Phaser.GameObjects.Group {
  public goal: Phaser.GameObjects.Image;
  public facing: Phaser.Math.Vector2;
  public scored: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, facing: number) {
    super(scene);

    this.facing = new Phaser.Math.Vector2(facing, 0);
    this.goal = this.scene.add
      .image(x - facing * 32, y, "goal")
      .setFlipX(facing < 0)
      .setDepth(8);

    const top = new Phaser.GameObjects.Rectangle(
      this.scene,
      x - facing * 34,
      y - 60,
      60,
      8
    );
    const back = new Phaser.GameObjects.Rectangle(
      this.scene,
      x - facing * 60,
      y,
      8,
      128
    );
    const bottom = new Phaser.GameObjects.Rectangle(
      this.scene,
      x - facing * 34,
      y + 60,
      60,
      8
    );
    const bottomPost = new Phaser.GameObjects.Ellipse(
      this.scene,
      x - facing * 4,
      y + 60,
      8,
      8
    );
    const topPost = new Phaser.GameObjects.Ellipse(
      this.scene,
      x - facing * 4,
      y - 60,
      8,
      8
    );

    this.scene.add.existing(this);
    this.scene.physics.world.enable(back, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(top, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(topPost, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(bottom, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(
      bottomPost,
      Phaser.Physics.Arcade.STATIC_BODY
    );

    this.add(this.goal);
    this.add(back);
    this.add(top);
    this.add(topPost);
    this.add(bottom);
    this.add(bottomPost);

    //bottomPost.body.setBounce(1, 1);
    //bottomPost.body.setBounce(1, 1);
  }

  public get width(): number {
    return this.goal.width;
  }

  public get height(): number {
    return this.goal.height - 2 * 8;
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2().setFromObject(this.goal);
  }
}
