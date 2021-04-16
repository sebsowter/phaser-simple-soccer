import { PitchScene } from "../scenes";

export default class GoalGroup extends Phaser.GameObjects.Group {
  public scene: PitchScene;

  private _scored: number = 0;
  private _facing: Phaser.Math.Vector2;
  private _bounds: Phaser.Geom.Rectangle;
  private _image: Phaser.GameObjects.Image;

  constructor(scene: PitchScene, x: number, y: number, facing: number) {
    super(scene);

    this.scene.add.existing(this);

    this._facing = new Phaser.Math.Vector2(facing, 0);

    this._image = this.scene.add
      .image(x - facing * 32, y, "goal")
      .setFlipX(facing < 0)
      .setDepth(8);

    this._bounds = new Phaser.Geom.Rectangle(
      x + (facing > 0 ? -64 : 16),
      y - 56,
      48,
      112
    );

    const rectangleCoords = [
      [x - facing * 60, y, 8, 128],
      [x - facing * 34, y - 60, 60, 8],
      [x - facing * 34, y + 60, 60, 8],
    ];

    const rectangles = rectangleCoords.map((coord: number[]) => {
      return new Phaser.GameObjects.Rectangle(
        this.scene,
        coord[0],
        coord[1],
        coord[2],
        coord[3]
      );
    });

    rectangles.forEach((rectangle: Phaser.GameObjects.Rectangle) => {
      this.add(rectangle);
    });

    const circleCoords = [
      [x - facing * 4, y + 60, 8, 8],
      [x - facing * 4, y - 60, 8, 8],
    ];

    const circles = circleCoords.map((coord: number[]) => {
      return new Phaser.GameObjects.Ellipse(
        this.scene,
        coord[0],
        coord[1],
        coord[2],
        coord[3]
      );
    });

    circles.forEach((circle: Phaser.GameObjects.Ellipse) => {
      this.add(circle);
    });

    this.scene.physics.world.enable(
      [...rectangles, ...circles],
      Phaser.Physics.Arcade.STATIC_BODY
    );
  }

  public incrementScore() {
    this._scored++;
  }

  public get scored(): number {
    return this._scored;
  }

  public get facing(): Phaser.Math.Vector2 {
    return this._facing;
  }

  public get bounds(): Phaser.Geom.Rectangle {
    return this._bounds;
  }

  public get height(): number {
    return this.bounds.height;
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this._image.x + this._facing.x * 32,
      this._image.y
    );
  }

  public get isBallInGoal(): boolean {
    return Phaser.Geom.Intersects.CircleToRectangle(
      this.scene.ball.bounds,
      this.bounds
    );
  }
}
