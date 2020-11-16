import { PlayerProps } from "../types";

export default class PlayerBase extends Phaser.Physics.Arcade.Sprite {
  public body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    props: PlayerProps
  ) {
    super(scene, x, y, "sprites", frame);

    this.setData(props);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    //this.body.setSize(16, 16).setCollideWorldBounds(true);
  }

  public setState(value: number): this {
    return super.setState(value);
  }

  public preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
  }

  public returnHome(): void {}

  public get isHome(): boolean {
    return true;
  }
}
