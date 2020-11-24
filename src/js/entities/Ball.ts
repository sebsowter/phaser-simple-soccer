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

    this.setData({ scored: 0, isKicking: false });
    this.kick(Math.PI * 1.2, 200);
  }

  public kick(angle: number, power: number): void {
    //console.log("Kick!", power);
    if (!this.getData("isKicking")) {
      this.setData({ isKicking: true });
      this.setVelocity(power * Math.cos(angle), power * Math.sin(angle));
      this.futurePosition(2000);
      this.scene.time.delayedCall(
        250,
        function () {
          this.setData({ isKicking: false });
        },
        [],
        this
      );
    }
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
    /*
    const frame =  (1000 / 60);
    const speed = power * Math.pow(this.body.drag.x, delta / 1000);
    const friction = power / this.body.drag.x;
    const distance = Phaser.Math.Distance.BetweenPoints(from, to);
    const time = speed * speed + 2 * distance * friction;

    
    const position = from.clone().setAngle(0).x;
    const target = to.clone().setAngle(0).x;
    const velocity = new Phaser.Math.Vector2().setFromObject(
      this.body.velocity
    ).setAngle(0).x


    let i = 0;
    let time = 0;

    while() {
      const drag = Math.pow(DRAG, i);

      velocity *= drag;
      position += Math.sqrt(velocity);


      time+=frame
      i++
    }

    return time <= 0 ? -1 : time;
*/
    return 2000;
  }

  public futurePosition(time: number): Phaser.Math.Vector2 {
    const delta = 1 / 60;
    const frames = time / (delta * 1000);
    const position = new Phaser.Math.Vector2().setFromObject(this);
    const velocity = new Phaser.Math.Vector2().setFromObject(
      this.body.velocity
    );

    for (let i = 0; i < frames; i++) {
      velocity.x *= DRAG;
      velocity.y *= DRAG;
      position.x += delta * velocity.x;
      position.y += delta * velocity.y;
    }

    this.scene.add.circle(position.x, position.y, 8, 0xff9900).setDepth(2);

    return new Phaser.Math.Vector2(position.x, position.y);
  }
}
