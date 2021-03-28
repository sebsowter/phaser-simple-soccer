import {
  Ball,
  Goal,
  PlayerBase,
  Team,
  TeamStates,
  PlayerFieldStates,
  PlayerKeeperStates,
} from "../entities";
import { redRegions, blueRegions } from "../constants";
import { setText } from "../utils";

export default class GameScene extends Phaser.Scene {
  public ball: Ball;
  public teamA: Team;
  public teamB: Team;
  public goalA: Goal;
  public goalB: Goal;
  public scoreText: Phaser.GameObjects.BitmapText;

  private _pitch: Phaser.Geom.Rectangle;

  constructor() {
    super({
      key: "game",
      active: false,
      visible: false,
    });
  }

  public init() {
    this.data.set(
      {
        goalkeeperHasBall: false,
        gameOn: false,
      },
      false
    );
  }

  public create() {
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

    this._pitch = new Phaser.Geom.Rectangle(
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

    this.scoreText = new Phaser.GameObjects.BitmapText(
      this,
      width / 2,
      12,
      "font3x5",
      "0-0",
      null,
      Phaser.GameObjects.BitmapText.ALIGN_CENTER
    )
      .setOrigin(0.5, 0)
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

  public update() {
    if (!this.gameOn && this.isAllPlayersHome) {
      this.setGameOn(true);
    }

    [this.teamA, this.teamB].forEach((team: Team) => {
      const teamState =
        team.state === TeamStates.Attacking
          ? "Attacking"
          : team.state === TeamStates.PrepareForKickOff
          ? "PrepareForKickOff"
          : "Defending";
      setText(`#${team.name}-state`, teamState);
      setText(
        `#${team.name}-closest`,
        team.closestPlayer ? (team.closestPlayer.index + 1).toString() : "-"
      );
      setText(
        `#${team.name}-controlling`,
        team.controllingPlayer
          ? (team.controllingPlayer.index + 1).toString()
          : "-"
      );
      setText(
        `#${team.name}-supporting`,
        team.supportingPlayer
          ? (team.supportingPlayer.index + 1).toString()
          : "-"
      );
      setText(
        `#${team.name}-receiving`,
        team.receivingPlayer ? (team.receivingPlayer.index + 1).toString() : "-"
      );

      team.players.forEach((player: PlayerBase, index: number) => {
        const selector = `#${team.name}-${index + 1}`;

        let state;

        if (index > 0) {
          state =
            player.state === PlayerFieldStates.ChaseBall
              ? "ChaseBall"
              : player.state === PlayerFieldStates.Dribble
              ? "Dribble"
              : player.state === PlayerFieldStates.KickBall
              ? "KickBall"
              : player.state === PlayerFieldStates.ReceiveBall
              ? "ReceiveBall"
              : player.state === PlayerFieldStates.ReturnToHome
              ? "ReturnToHome"
              : player.state === PlayerFieldStates.SupportAttacker
              ? "SupportAttacker"
              : "Wait";
        } else {
          state =
            player.state === PlayerKeeperStates.InterceptBall
              ? "InterceptBall"
              : player.state === PlayerKeeperStates.PutBallBackInPlay
              ? "PutBallBackInPlay"
              : player.state === PlayerKeeperStates.ReturnToHome
              ? "ReturnToHome"
              : "TendGoal";
        }

        setText(selector, `${player.isAtHome} : ${state}`);
      });
    });
  }

  public reset() {
    if (this.gameOn) {
      this.setGameOn(false);
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

  public get isAllPlayersHome(): boolean {
    return this.teamA.isAllPlayersHome && this.teamB.isAllPlayersHome;
  }

  public setGoalkeeperHasBall(value: boolean) {
    this.data.set("goalkeeperHasBall", value);
  }

  public get goalkeeperHasBall(): boolean {
    return this.data.get("goalkeeperHasBall");
  }

  public setGameOn(value: boolean) {
    this.data.set("gameOn", value);
  }

  public get gameOn(): boolean {
    return this.data.get("gameOn");
  }

  public get pitch(): Phaser.Geom.Rectangle {
    return this._pitch;
  }
}
