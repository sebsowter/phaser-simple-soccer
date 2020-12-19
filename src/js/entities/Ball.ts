import { DRAG, TIME_DELTA, TIME_DELTA_MILI } from "../constants";

export default class Ball extends Phaser.Physics.Arcade.Image {
  public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const RADIUS = 4;

    super(scene, x, y, "sprites", 0);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.body.setBounce(0.5, 0.5);
    this.body.setDrag(DRAG, DRAG);
    this.body.useDamping = true;

    this.setSize(RADIUS * 2, RADIUS * 2);
    this.setCircle(RADIUS);
  }

  public kick(angle: number, power: number): void {
    this.setVelocity(power * Math.cos(angle), power * Math.sin(angle));
  }

  public place(x: number, y: number): void {
    this.setVelocity(0, 0);
    this.setPosition(x, y);
  }

  public trap(): void {
    this.setVelocity(0, 0);
  }

  public timeToCoverDistance(distance: number, speed: number): number {
    let position = 0;
    let time = 0;

    while (speed > 0.1 && position < distance) {
      speed *= DRAG;
      position += TIME_DELTA * speed;
      time += TIME_DELTA;

      if (speed <= 0.1) {
        time = -1;
      }
    }

    return time;
  }

  public futurePosition(time: number): Phaser.Math.Vector2 {
    const position = this.position.clone();
    const velocity = this.body.velocity.clone();

    for (let i = 0; i < time / TIME_DELTA_MILI; i++) {
      velocity.x *= DRAG;
      velocity.y *= DRAG;
      position.x += TIME_DELTA * velocity.x;
      position.y += TIME_DELTA * velocity.y;
    }

    return position;
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
}
