import PlayerBase from "./PlayerBase";

export default class Ball extends Phaser.Physics.Arcade.Image {
  //public player: PlayerBase;
  public body: Phaser.Physics.Arcade.Body;

  private _futurePosition: Phaser.Math.Vector2;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "sprites", 0);

    this.setData({ scored: 0 });

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.body.setDrag(300, 300);

    this.kick(Math.PI / 4, 400);
  }

  public timeToCoverDistance(
    pointA: Phaser.Math.Vector2,
    pointB: Phaser.Math.Vector2,
    power: number
  ): number {
    return 2000;
  }

  public set futurePosition(value: Phaser.Math.Vector2) {
    this._futurePosition = value;
  }

  public get futurePosition(): Phaser.Math.Vector2 {
    return this._futurePosition;
  }

  public calcFuturePosition(time: number): Phaser.Math.Vector2 {
    return this._futurePosition;
  }

  public kick(angle: number, power: number): void {
    this.setVelocity(power * Math.cos(angle), power * Math.sin(angle));

    this.futurePosition = new Phaser.Math.Vector2(
      power * Math.cos(angle),
      power * Math.sin(angle)
    );
  }

  public trap(player: PlayerBase): void {
    this.setVelocity(0, 0);
  }

  public place(x: number, y: number): void {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
  }
}
