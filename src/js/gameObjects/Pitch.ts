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

    const top = new Phaser.GameObjects.Rectangle(
      this.scene,
      0,
      0,
      this._image.width,
      BOUNDS_BORDER
    ).setOrigin(0, 0);

    const bottom = new Phaser.GameObjects.Rectangle(
      this.scene,
      0,
      this._image.height - BOUNDS_BORDER,
      this._image.width,
      BOUNDS_BORDER
    ).setOrigin(0, 0);

    const leftTop = new Phaser.GameObjects.Rectangle(
      this.scene,
      0,
      0,
      BOUNDS_BORDER,
      (this._image.height - 120) / 2
    ).setOrigin(0, 0);

    const leftBottom = new Phaser.GameObjects.Rectangle(
      this.scene,
      0,
      this._image.height,
      BOUNDS_BORDER,
      (this._image.height - 120) / 2
    ).setOrigin(0, 1);

    const rightTop = new Phaser.GameObjects.Rectangle(
      this.scene,
      this._image.width,
      0,
      BOUNDS_BORDER,
      (this._image.height - 120) / 2
    ).setOrigin(1, 0);

    const rightBottom = new Phaser.GameObjects.Rectangle(
      this.scene,
      this._image.width,
      this._image.height,
      BOUNDS_BORDER,
      (this._image.height - 120) / 2
    ).setOrigin(1, 1);

    this.add(top);
    this.add(bottom);
    this.add(rightTop);
    this.add(rightBottom);
    this.add(leftTop);
    this.add(leftBottom);

    this.scene.physics.world.enable(
      [top, bottom, leftTop, leftBottom, rightTop, rightBottom],
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
