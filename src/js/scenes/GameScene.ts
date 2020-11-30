import { Ball, Goal, Team } from "../entities";
import { redRegions, blueRegions } from "../constants";

export default class GameScene extends Phaser.Scene {
  public ball: Ball;
  public teamA: Team;
  public teamB: Team;
  public goalA: Goal;
  public goalB: Goal;
  public pitch: Phaser.Geom.Rectangle;
  public spot: any;
  public spot2: any;

  constructor() {
    super({
      key: "game",
      active: false,
      visible: false,
    });
  }

  public init(): void {
    this.data.set(
      {
        goalkeeperHasBall: false,
        gameOn: false,
      },
      false
    );
  }

  public create(): void {
    const BORDER = 64;
    const pitch = this.add.image(0, 0, "pitch").setOrigin(0, 0);
    const { width, height } = pitch;

    this.pitch = new Phaser.Geom.Rectangle(BORDER, BORDER, 6 * 192, 3 * 192);
    this.ball = new Ball(this, width / 2, height / 2).setDepth(3);
    this.goalA = new Goal(this, BORDER, height / 2, 1);
    this.goalB = new Goal(this, width - BORDER, height / 2, -1);
    this.teamA = new Team(this, 1, true, this.goalB, redRegions).setDepth(2);
    this.teamB = new Team(this, 2, false, this.goalA, blueRegions).setDepth(2);
    this.teamA.setOpponents(this.teamB);
    this.teamB.setOpponents(this.teamA);

    this.physics.add.collider(this.ball, [this.goalA, this.goalB]);
    this.physics.add.collider(
      [this.teamA, this.teamB],
      [this.goalA, this.goalB]
    );
    this.physics.add.collider(this.teamA, [this.teamA, this.teamB]);
    this.physics.add.collider(this.teamB, [this.teamA, this.teamB]);
    this.physics.add.overlap(
      this.ball,
      [this.goalA.goal, this.goalB.goal],
      function (ball: Ball, goal: Phaser.GameObjects.Image) {
        console.log("Goooooal!");
      }
    );

    this.physics.world.setBounds(
      BORDER,
      BORDER,
      width - BORDER * 2,
      height - BORDER * 2
    );

    this.cameras.main.setBounds(0, 0, width, height);

    this.spot = this.add
      .circle(this.ball.x, this.ball.y, 8, 0xff9900)
      .setDepth(4);
    this.spot2 = this.add
      .circle(this.ball.x, this.ball.y, 8, 0xff9900)
      .setDepth(4);

    /*
    this.spot = this.add
      .circle(this.ball.x, this.ball.y, 8, 0xff9900)
      .setDepth(4);

    this.ball.kick(0, 750);

    const p = this.ball.futurePosition(3000);

    this.spot.x = p.x;
    this.spot.y = p.y;

    const c = new Phaser.Math.Vector2(490, 0);

    const pred = this.ball.timeToCoverDistance(
      new Phaser.Math.Vector2(),
      c,
      750
    );

    this.add
      .circle(this.ball.x + c.x, this.ball.y - 20, 8, 0x00ffff)
      .setDepth(4);
    console.log("pred", pred);
    //this.test();
    */
  }

  public update(): void {
    switch (this.gameOn) {
      case false:
        if (
          !this.gameOn &&
          this.teamA.isAllPlayersHome &&
          this.teamB.isAllPlayersHome
        ) {
          this.gameOn = true;
        }
        break;
    }
  }

  public set goalkeeperHasBall(value: boolean) {
    this.data.set("goalkeeperHasBall", value);
  }

  public get goalkeeperHasBall(): boolean {
    return this.data.get("goalkeeperHasBall");
  }

  public set gameOn(value: boolean) {
    this.data.set("gameOn", value);
  }

  public get gameOn(): boolean {
    return this.data.get("gameOn");
  }

  private test(): void {
    const point1 = new Phaser.GameObjects.Sprite(
      this,
      200,
      352,
      "sprites",
      3
    ).setDepth(4);
    this.add.existing(point1);

    const pin = -0.52;
    const point2 = new Phaser.GameObjects.Sprite(this, 500, 352, "sprites", 4)
      .setDepth(4)
      .setRotation(Math.PI * pin);
    this.add.existing(point2);

    const v1 = new Phaser.Math.Vector2(1, 0);
    const v2 = new Phaser.Math.Vector2(1, 0);
    console.log("v1", v1);
    console.log("v2", v2);
    v2.rotate(Math.PI * pin);
    //v2.setAngle(Math.PI * -0.45);
    console.log("v2", v2);
    const dot = v1.dot(v2);
    console.log("dot", dot);
  }
}
