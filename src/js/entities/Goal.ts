export default class GoalGroup extends Phaser.GameObjects.Group {
  public goal: Phaser.GameObjects.Image;
  public facing: Phaser.Math.Vector2;
  public scored: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, facing: number) {
    super(scene);

    this.facing = new Phaser.Math.Vector2(facing, 0);
    this.goal = this.scene.add
      .image(x - facing * 28, y, "goal")
      .setFlipX(facing < 0)
      .setDepth(8);

    const top = this.scene.add.rectangle(
      x - facing * 30,
      y - 64,
      60,
      4,
      0xffffff
    );
    const back = this.scene.add.rectangle(x - facing * 60, y, 4, 132, 0xffffff);
    const bottom = this.scene.add.rectangle(
      x - facing * 30,
      y + 64,
      60,
      4,
      0xffffff
    );

    this.scene.add.existing(this);
    this.scene.physics.world.enable(top);
    this.scene.physics.world.enable(back);
    this.scene.physics.world.enable(bottom);

    const b = bottom.body as Phaser.Physics.Arcade.Body;
    b.setImmovable(true);
    const j = back.body as Phaser.Physics.Arcade.Body;
    j.setImmovable(true);
    const t = top.body as Phaser.Physics.Arcade.Body;
    t.setImmovable(true);

    this.add(this.goal);
    this.add(back);
    this.add(top);
    this.add(bottom);
  }

  public get width(): number {
    return this.goal.width;
  }

  public get height(): number {
    return this.goal.height;
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2().setFromObject(this.goal);
  }
}
