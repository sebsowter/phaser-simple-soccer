import { DELTA, BALL_DRAG, BALL_BOUNCE, BALL_RADIUS } from "../constants";

export default class Ball extends Phaser.Physics.Arcade.Image {
  public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "sprites", 0);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setSize(BALL_RADIUS * 2, BALL_RADIUS * 2);
    this.setCircle(BALL_RADIUS);
    this.setBounce(BALL_BOUNCE, BALL_BOUNCE);
    this.setDrag(BALL_DRAG, BALL_DRAG);
    this.setDamping(true);
    this.setDepth(3);
  }

  public kick(vector: Phaser.Math.Vector2, power: number): this {
    vector.normalize();

    this.setVelocity(vector.x * power, vector.y * power);

    return this;
  }

  public place(x: number, y: number): this {
    this.setVelocity(0, 0);
    this.setAngularVelocity(0);
    this.setPosition(x, y);

    return this;
  }

  public trap(): this {
    this.setVelocity(0, 0);
    this.setAngularVelocity(0);

    return this;
  }

  public timeToCoverDistance(distance: number, velocity: number): number {
    let position = 0;
    let time = 0;

    while (velocity > 0.1 && position < distance) {
      velocity *= Math.pow(this.body.drag.x, DELTA);
      position += velocity * DELTA;
      time += DELTA;

      if (velocity <= 0.1) {
        time = -1;
      }
    }

    return time;
  }

  public futurePosition(time: number): Phaser.Math.Vector2 {
    const position = this.position.clone();
    const velocity = this.body.velocity.clone();

    for (let i = 0; i < time / (DELTA * 1000); i++) {
      velocity.x *= Math.pow(BALL_DRAG, DELTA);
      velocity.y *= Math.pow(BALL_DRAG, DELTA);
      position.x += velocity.x * DELTA;
      position.y += velocity.y * DELTA;
    }

    return position;
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  public get bounds(): Phaser.Geom.Circle {
    return new Phaser.Geom.Circle(this.x, this.y, BALL_RADIUS);
  }
}
