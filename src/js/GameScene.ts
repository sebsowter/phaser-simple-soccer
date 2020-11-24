import { Ball, Goal, Team } from "./entities";
import { redRegions, blueRegions } from "./constants";

export default class GameScene extends Phaser.Scene {
  public ball: Ball;
  public teamA: Team;
  public teamB: Team;
  public goalA: Goal;
  public goalB: Goal;

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

    this.goalA = new Goal(this, BORDER, height / 2, true);
    this.goalB = new Goal(this, width - BORDER, height / 2, false).setFlipX(
      true
    );
    this.ball = new Ball(this, width / 2, height / 2).setDepth(2);
    this.teamA = new Team(
      this,
      1,
      true,
      this.goalB,
      this.goalA,
      redRegions
    ).setDepth(2);
    this.teamB = new Team(
      this,
      2,
      false,
      this.goalA,
      this.goalB,
      blueRegions
    ).setDepth(2);
    this.teamA.setOpponents(this.teamB);
    this.teamB.setOpponents(this.teamA);

    const point1 = new Phaser.GameObjects.Sprite(
      this,
      200,
      352,
      "sprites",
      1
    ).setDepth(4);
    this.add.existing(point1);

    const pin = -0.52;
    const point2 = new Phaser.GameObjects.Sprite(this, 500, 352, "sprites", 2)
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

    this.physics.world.setBounds(
      BORDER,
      BORDER,
      width - BORDER * 2,
      height - BORDER * 2
    );

    this.cameras.main.setBounds(0, 0, width, height);
  }

  public update(): void {
    switch (this.gameOn) {
      case false:
        if (this.teamA.allPlayersHome && this.teamB.allPlayersHome) {
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
}
