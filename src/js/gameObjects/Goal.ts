import { GameScene } from "../scenes";

export default class GoalGroup extends Phaser.GameObjects.Group {
  public scene: GameScene;

  private _scored: number = 0;
  private _facing: Phaser.Math.Vector2;
  private _bounds: Phaser.GameObjects.Rectangle;
  private _image: Phaser.GameObjects.Image;

  constructor(scene: GameScene, x: number, y: number, facing: number) {
    super(scene);

    this.scene.add.existing(this);

    this._facing = new Phaser.Math.Vector2(facing, 0);

    this._image = this.scene.add
      .image(x - facing * 32, y, "goal")
      .setFlipX(facing < 0)
      .setDepth(8);

    this._bounds = new Phaser.GameObjects.Rectangle(
      this.scene,
      x - facing * 42,
      y,
      64 - 20,
      128,
      0x00ffff,
      0
    ).setDepth(10);

    this.scene.add.existing(this._bounds);

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

    this.scene.physics.world.enable(
      this.bounds,
      Phaser.Physics.Arcade.STATIC_BODY
    );
    this.scene.physics.world.enable(back, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(top, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(topPost, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(bottom, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(
      bottomPost,
      Phaser.Physics.Arcade.STATIC_BODY
    );

    this.add(back).add(top).add(topPost).add(bottom).add(bottomPost);
  }

  public incrementScore() {
    if (this.scene.gameOn) {
      this._scored++;

      //this.scene.reset();
    }
  }

  public get scored(): number {
    return this._scored;
  }

  public get facing(): Phaser.Math.Vector2 {
    return this._facing;
  }

  public get bounds(): Phaser.GameObjects.Rectangle {
    return this._bounds;
  }

  public get width(): number {
    return this._image.width;
  }

  public get height(): number {
    return this._image.height - 2 * 8;
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this._image.x + this._facing.x * 32,
      this._image.y
    );
  }
}
