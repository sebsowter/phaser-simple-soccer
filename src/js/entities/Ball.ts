import PlayerBase from "./PlayerBase";
import { DRAG, TIME_DELTA } from "../constants";

export default class Ball extends Phaser.Physics.Arcade.Image {
  public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "sprites", 0);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.body.setDrag(DRAG, DRAG);
    this.body.useDamping = true;

    this.setData({ scored: 0 });
    this.kick(Math.PI * 1.2, 200);
  }

  public kick(angle: number, power: number): void {
    this.setVelocity(power * Math.cos(angle), power * Math.sin(angle));
    this.futurePosition(750);
  }

  public trap(player: PlayerBase): void {
    this.setVelocity(0, 0);
  }

  public place(x: number, y: number): void {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
  }

  public timeToCoverDistance(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    velocity: number
  ): number {
    let position = 0;
    let time = 0;

    while (
      velocity > 0.1 &&
      position < Phaser.Math.Distance.BetweenPoints(from, to)
    ) {
      velocity *= DRAG;
      position += TIME_DELTA * velocity;
      time += TIME_DELTA;

      if (velocity <= 0.1) {
        time = -1;
      }
    }

    return time;
  }

  public futurePosition(time: number): Phaser.Math.Vector2 {
    const position = new Phaser.Math.Vector2().setFromObject(this);
    const velocity = new Phaser.Math.Vector2().setFromObject(
      this.body.velocity
    );

    for (let i = 0; i < time / (TIME_DELTA * 1000); i++) {
      velocity.x *= DRAG;
      velocity.y *= DRAG;
      position.x += TIME_DELTA * velocity.x;
      position.y += TIME_DELTA * velocity.y;
    }

    //this.scene.add.circle(position.x, position.y, 8, 0xff9900).setDepth(2);

    return position;
  }
}
