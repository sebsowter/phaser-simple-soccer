import { BOUNDS_BORDER } from "../constants";
import { PitchScene } from "../scenes";

export default class Pitch extends Phaser.GameObjects.Group {
  public scene: PitchScene;

  private _bounds: Phaser.Geom.Rectangle;
  private _image: Phaser.GameObjects.Image;

  constructor(scene: PitchScene) {
    super(scene);

    this.scene.add.existing(this);

    this._image = this.scene.add.image(0, 0, "pitch").setOrigin(0, 0);

    this._bounds = new Phaser.Geom.Rectangle(
      BOUNDS_BORDER,
      BOUNDS_BORDER,
      this._image.width - BOUNDS_BORDER * 2,
      this._image.height - BOUNDS_BORDER * 2
    );

    const coords = [
      [0, 0, this._image.width, BOUNDS_BORDER],
      [0, this._image.height - BOUNDS_BORDER, this._image.width, BOUNDS_BORDER],
      [0, 0, BOUNDS_BORDER, (this._image.height - 120) / 2],
      [0, this._image.height, BOUNDS_BORDER, (this._image.height - 120) / 2],
      [this._image.width, 0, BOUNDS_BORDER, (this._image.height - 120) / 2],
      [
        this._image.width,
        this._image.height,
        BOUNDS_BORDER,
        (this._image.height - 120) / 2,
      ],
    ];

    const rectangles = coords.map((coord: number[]) => {
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

    this.scene.physics.world.enable(
      rectangles,
      Phaser.Physics.Arcade.STATIC_BODY
    );
  }

  public get bounds(): Phaser.Geom.Rectangle {
    return this._bounds;
  }

  public get width(): any {
    return this.bounds.width;
  }

  public get height(): any {
    return this.bounds.height;
  }

  public get x(): number {
    return this.bounds.x;
  }

  public get y(): number {
    return this.bounds.y;
  }

  public get midpoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.x + this.width / 2,
      this.y + this.height / 2
    );
  }
}
