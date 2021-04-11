import { FPS, DELTA, BALL_DRAG, BALL_BOUNCE, BALL_RADIUS } from "../constants";
import { PitchScene } from "../scenes";
import { positionInFuture } from "../utils";

const drag = 320;

export default class Ball extends Phaser.Physics.Arcade.Image {
  public scene: PitchScene;
  public body: Phaser.Physics.Arcade.Body;

  constructor(scene: PitchScene, x: number, y: number) {
    super(scene, x, y, "sprites", 0);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setSize(BALL_RADIUS * 2, BALL_RADIUS * 2);
    this.setCircle(BALL_RADIUS);
    this.setBounce(BALL_BOUNCE, BALL_BOUNCE);
    //this.setDrag(drag, drag);
    this.setFrictionX(0);
    //this.setDamping(true);
    this.setDepth(3);
    console.log("this", this);
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  public get bounds(): Phaser.Geom.Circle {
    return new Phaser.Geom.Circle(this.x, this.y, BALL_RADIUS);
  }

  public preUpdate(time: number, delta: number) {
    //const friction = drag;
    //const norm = this.body.velocity.clone().normalize();
    //const velocity = this.body.velocity.clone();
    //console.log(velocity.x);
    //console.log("this.body", this.body.speed);
    //velocity.x += 1 * drag;
    //velocity.y += norm.y * drag;
    //velocity.x = Math.abs(velocity.x) > -drag ? velocity.x : 0;
    //velocity.y = Math.abs(velocity.y) > friction ? velocity.y : 0;
    //console.log("ScalarToVectorx", this.body.velocity.x);
    const norm = this.body.velocity.clone().normalize();
    const velocity = new Phaser.Math.Vector2(
      this.body.velocity.x - norm.x * ((delta / 1000) * -BALL_DRAG),
      this.body.velocity.y - norm.y * ((delta / 1000) * -BALL_DRAG)
    );

    this.setVelocity(
      this.body.speed < 4 ? 0 : velocity.x,
      this.body.speed < 4 ? 0 : velocity.y
    );
    //super.preUpdate(time, delta);
  }

  public kick(vector: Phaser.Math.Vector2, power: number): this {
    const velocity = vector.clone().normalize();

    this.setVelocity(velocity.x * power, velocity.y * power);

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
    var term = velocity * velocity + 2 * distance * BALL_DRAG;

    if (term <= 0) {
      return -1;
    }

    return (Math.sqrt(term) - velocity) / BALL_DRAG;
  }

  public futurePosition(time: number): Phaser.Math.Vector2 {
    const dragForce = 0.5 * BALL_DRAG * time * time;
    const dragDirection = this.body.velocity.clone().normalize();
    const drag = new Phaser.Math.Vector2(
      dragForce * dragDirection.x,
      dragForce * dragDirection.y
    );

    return new Phaser.Math.Vector2(
      this.position.x + this.body.velocity.x * time + drag.x,
      this.position.y + this.body.velocity.y * time + drag.y
    );
  }

  public futurePosition2(
    seconds: number,
    delta: number = DELTA
  ): Phaser.Math.Vector2 {
    const position = new Phaser.Math.Vector2(
      positionInFuture(this.body.velocity.x, seconds, this.body.drag.x, delta),
      positionInFuture(this.body.velocity.y, seconds, this.body.drag.y, delta)
    );

    return new Phaser.Math.Vector2(
      this.position.x + position.x,
      this.position.y + position.y
    );
  }
}
