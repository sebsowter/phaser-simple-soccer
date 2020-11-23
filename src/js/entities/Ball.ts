import PlayerBase from "./PlayerBase";

const DRAG = 0.975;

export default class Ball extends Phaser.Physics.Arcade.Image {
  public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "sprites", 0);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.body.setDrag(DRAG, DRAG);
    this.body.useDamping = true;

    this.setData({ scored: 0 });
    this.kick(Math.PI * 1.2, 400);
  }

  public kick(angle: number, power: number): void {
    //console.log("Kick!", power);
    this.setVelocity(power * Math.cos(angle), power * Math.sin(angle));
    this.futurePosition(1000);
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
    power: number,
    delta: number = 16
  ): number {
    const speed = power * Math.pow(this.body.drag.x, delta / 1000);
    const friction = power / this.body.drag.x;
    const distance = Phaser.Math.Distance.BetweenPoints(from, to);
    const time = speed * speed + 2 * distance * friction;

    return 2000;
    if (time <= 0) return -1;

    return (0 - speed) / friction;
  }

  public futurePosition(time: number): Phaser.Math.Vector2 {
    const miliPerFrame = 1000 / 60;
    //console.log("miliPerFrame", miliPerFrame);
    const timeDelta = time / miliPerFrame;
    //console.log("timeDelta", timeDelta);
    const pow = Math.pow(DRAG, timeDelta);
    //console.log("pow", pow);
    //console.log("this.body.velocity.y", this.body.velocity.x);
    const positionX = this.x + this.body.velocity.x * pow;
    const positionY = this.y + this.body.velocity.y * pow;

    this.scene.add.circle(positionX, positionY, 8, 0xff9900);

    return new Phaser.Math.Vector2(positionX, positionY);
  }

  public preUpdate(time: Number, delta: number): void {
    //console.log("delta", Math.pow(DRAG * DRAG, delta / 1000));
    const delta2 = 1000 / delta / 60;
    //console.log("delta", delta2);
    const dragX = DRAG * delta2;
    //console.log("dragX", dragX);

    //this.body.velocity.x *= DRAG;
    // this.body.velocity.y *= DRAG;

    // this.body.speed = Math.sqrt(
    //   this.body.velocity.x * this.body.velocity.x +
    //     this.body.velocity.y * this.body.velocity.y
    // );
    //this.setVelocity(newX, newY);

    //console.log("ff", ff);
    //super.preUpdate(time, delta);
  }
}
