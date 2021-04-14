import { BALL_DRAG, BALL_BOUNCE, BALL_RADIUS } from "../constants";
import { PitchScene } from "../scenes";

export default class SoccerBall extends Phaser.Physics.Arcade.Image {
  public scene: PitchScene;
  public body: Phaser.Physics.Arcade.Body;

  constructor(scene: PitchScene, x: number, y: number) {
    super(scene, x, y, "sprites", 0);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setSize(BALL_RADIUS * 2, BALL_RADIUS * 2);
    this.setCircle(BALL_RADIUS);
    this.setBounce(BALL_BOUNCE, BALL_BOUNCE);
    this.setFrictionX(0);
    this.setDepth(3);
  }

  public preUpdate(time: number, delta: number) {
    const direction = this.body.velocity.clone().normalize();
    const dragForce = (delta / 1000) * BALL_DRAG;
    const drag = new Phaser.Math.Vector2(
      direction.x * dragForce,
      direction.y * dragForce
    );
    const velocity = this.body.velocity.clone().add(drag);

    if (
      Math.abs(velocity.x) > Math.abs(this.body.velocity.x) ||
      Phaser.Math.Fuzzy.Equal(velocity.x, 0, 0.5)
    ) {
      velocity.x = 0;
    }

    if (
      Math.abs(velocity.y) > Math.abs(this.body.velocity.y) ||
      Phaser.Math.Fuzzy.Equal(velocity.y, 0, 0.5)
    ) {
      velocity.y = 0;
    }

    this.setVelocity(velocity.x, velocity.y);
  }

  public addNoiseToKick(
    position: Phaser.Math.Vector2,
    target: Phaser.Math.Vector2
  ): Phaser.Math.Vector2 {
    const displacement = Math.PI * 0.01 * (-1 + Math.random() * 2);

    return target.clone().subtract(position).rotate(displacement).add(position);
  }

  public kick(vector: Phaser.Math.Vector2, power: number): this {
    const direction = vector.clone().normalize();

    this.setVelocity(direction.x * power, direction.y * power);

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
    const term = velocity * velocity + 2 * distance * BALL_DRAG;

    if (term <= 0) {
      return -1;
    }

    return (Math.sqrt(term) - velocity) / BALL_DRAG;
  }

  public futurePosition(time: number): Phaser.Math.Vector2 {
    const direction = this.body.velocity.clone().normalize();
    const dragForce = 0.5 * BALL_DRAG * time * time;
    const drag = new Phaser.Math.Vector2(
      direction.x * dragForce,
      direction.y * dragForce
    );
    const velocity = new Phaser.Math.Vector2(
      this.body.velocity.x * time,
      this.body.velocity.y * time
    );

    return this.position.add(velocity).add(drag);
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  public get bounds(): Phaser.Geom.Circle {
    return new Phaser.Geom.Circle(this.x, this.y, BALL_RADIUS);
  }
}
