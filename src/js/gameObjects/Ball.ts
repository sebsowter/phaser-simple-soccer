import { DRAG, DRAG_DELTA, TIME_DELTA, TIME_DELTA_MILI } from "../constants";

export default class Ball extends Phaser.Physics.Arcade.Image {
  public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const RADIUS = 4;

    super(scene, x, y, "sprites", 0);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setBounce(0.5, 0.5);
    this.setDrag(DRAG, DRAG);
    this.setDamping(true);
    this.setSize(RADIUS * 2, RADIUS * 2);
    this.setCircle(RADIUS);
  }

  public kick(rotation: number, power: number) {
    this.setVelocity(power * Math.cos(rotation), power * Math.sin(rotation));
  }

  public place(x: number, y: number) {
    this.setVelocity(0, 0);
    this.setAngularVelocity(0);
    this.setPosition(x, y);
  }

  public trap() {
    this.setVelocity(0, 0);
    this.setAngularVelocity(0);
  }

  public timeToCoverDistance(distance: number, velocity: number): number {
    let position = 0;
    let time = 0;

    while (velocity > 0.1 && position < distance) {
      velocity *= DRAG_DELTA;
      position += velocity * TIME_DELTA;
      time += TIME_DELTA;

      if (velocity <= 0.1) {
        time = -1;
      }
    }

    return time;
  }

  public futurePosition(time: number): Phaser.Math.Vector2 {
    const position = this.position.clone();
    const velocity = this.body.velocity.clone();

    for (let i = 0; i < time / TIME_DELTA_MILI; i++) {
      velocity.x *= DRAG_DELTA;
      velocity.y *= DRAG_DELTA;
      position.x += velocity.x * TIME_DELTA;
      position.y += velocity.y * TIME_DELTA;
    }

    return position;
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
}
