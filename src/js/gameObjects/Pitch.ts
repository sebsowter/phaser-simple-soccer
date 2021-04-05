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

    this.scene.physics.world.enable(leftTop, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(
      leftBottom,
      Phaser.Physics.Arcade.STATIC_BODY
    );
    this.scene.physics.world.enable(
      rightTop,
      Phaser.Physics.Arcade.STATIC_BODY
    );
    this.scene.physics.world.enable(
      rightBottom,
      Phaser.Physics.Arcade.STATIC_BODY
    );
    this.scene.physics.world.enable(top, Phaser.Physics.Arcade.STATIC_BODY);
    this.scene.physics.world.enable(bottom, Phaser.Physics.Arcade.STATIC_BODY);

    this.add(rightTop)
      .add(rightBottom)
      .add(leftTop)
      .add(leftBottom)
      .add(top)
      .add(bottom);
  }

  public get bounds(): Phaser.Geom.Rectangle {
    return this._bounds;
  }

  public get width(): any {
    return this._bounds.width;
  }

  public get height(): any {
    return this._bounds.height;
  }

  public get x(): number {
    return this._bounds.x;
  }

  public get y(): number {
    return this._bounds.y;
  }
}
