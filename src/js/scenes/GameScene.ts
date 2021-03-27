import { Ball, Goal, Team } from "../entities";
import { redRegions, blueRegions } from "../constants";

export default class GameScene extends Phaser.Scene {
  public ball: Ball;
  public teamA: Team;
  public teamB: Team;
  public goalA: Goal;
  public goalB: Goal;
  public pitch: Phaser.Geom.Rectangle;
  public scoreText: Phaser.GameObjects.BitmapText;

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

    this.physics.world.setBounds(
      BORDER,
      BORDER,
      width - BORDER * 2,
      height - BORDER * 2
    );

    this.cameras.main.setBounds(0, 0, width, height);

    this.pitch = new Phaser.Geom.Rectangle(
      BORDER,
      BORDER,
      width - BORDER * 2,
      height - BORDER * 2
    );

    this.ball = new Ball(this, width / 2, height / 2).setDepth(3);

    this.goalA = new Goal(this, BORDER, height / 2, 1);
    this.goalB = new Goal(this, width - BORDER, height / 2, -1);

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

    const ball2 = new Ball(this, width / 2, height / 2).setDepth(3);
    ball2.setDrag(0.5, 0.5);
    ball2.setDamping(true);
    ball2.kick(45, 200);

    const p = ball2.futurePosition(10000);

    const c = this.add.rectangle(p.x, p.y, 8, 8, 0xff0000).setDepth(3);

    this.scoreText = new Phaser.GameObjects.BitmapText(
      this,
      width / 2,
      12,
      "font3x5",
      "0-0",
      null,
      Phaser.GameObjects.BitmapText.ALIGN_CENTER
    )
      .setOrigin(1 / 16, 0)
      .setScale(8)
      .setDepth(10);

    this.add.existing(this.scoreText);

    this.physics.add.collider(this.ball, [this.goalA, this.goalB]);
    this.physics.add.collider(
      [this.teamA, this.teamB],
      [this.goalA, this.goalB]
    );
    this.physics.add.collider(this.teamA, this.teamB);
    this.physics.add.collider(this.teamB, this.teamA);
    this.physics.add.overlap(
      this.ball,
      this.goalA.target,
      function () {
        this.goalA.score();
      },
      null,
      this
    );
    this.physics.add.overlap(
      this.ball,
      this.goalB.target,
      function () {
        this.goalB.score();
      },
      null,
      this
    );
  }

  public update(): void {
    if (
      !this.gameOn &&
      this.teamA.isAllPlayersHome &&
      this.teamB.isAllPlayersHome
    ) {
      this.gameOn = true;
    }
  }

  public reset(): void {
    if (this.gameOn) {
      this.gameOn = false;
      this.scoreText.setText(`${this.goalB.scored}-${this.goalA.scored}`);
      this.teamA.kickOff();
      this.teamB.kickOff();
      this.time.delayedCall(
        1000,
        function () {
          this.ball.place(1280 / 2, 704 / 2);
        },
        [],
        this
      );
    }
  }

  public setGoalkeeperHasBall(value: boolean): void {
    this.goalkeeperHasBall = value;
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
