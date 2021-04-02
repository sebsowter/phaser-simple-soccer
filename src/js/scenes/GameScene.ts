import {
  Ball,
  Goal,
  PlayerBase,
  Team,
  TeamStates,
  PlayerFieldStates,
  PlayerKeeperStates,
  PlayerModes,
} from "../gameObjects";
import { setText } from "../utils";

export default class GameScene extends Phaser.Scene {
  private _ball: Ball;
  private _teamA: Team;
  private _teamB: Team;
  private _goalA: Goal;
  private _goalB: Goal;
  private _pitch: Phaser.Geom.Rectangle;
  private _scoreText: Phaser.GameObjects.BitmapText;
  public _circle: any;

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

    this.cameras.main.setBounds(0, 0, pitch.width, pitch.height);

    this._pitch = new Phaser.Geom.Rectangle(
      BORDER,
      BORDER,
      pitch.width - BORDER * 2,
      pitch.height - BORDER * 2
    );
    this._ball = new Ball(this, pitch.width / 2, pitch.height / 2).setDepth(3);
    this._goalA = new Goal(this, BORDER, pitch.height / 2, 1);
    this._goalB = new Goal(this, pitch.width - BORDER, pitch.height / 2, -1);
    this._teamA = new Team(this, 1, true, this._goalB, this._goalA).setDepth(2);
    this._teamB = new Team(this, 2, false, this._goalA, this._goalB).setDepth(
      2
    );
    this._teamA.setOpponents(this._teamB);
    this._teamB.setOpponents(this._teamA);

    this._scoreText = new Phaser.GameObjects.BitmapText(
      this,
      pitch.width / 2,
      12,
      "font3x5",
      "0-0",
      null,
      Phaser.GameObjects.BitmapText.ALIGN_CENTER
    );
    this._scoreText.setOrigin(0.5, 0);
    this._scoreText.setScale(8);
    this._scoreText.setDepth(10);

    this.add.existing(this._scoreText);

    this._circle = this.add.circle(0, 0, 8, 0x00ffff);

    this.physics.add.collider(this._ball, [this._goalA, this._goalB]);
    this.physics.add.collider(
      [this._teamA, this._teamB],
      [this._goalA, this._goalB]
    );
    this.physics.add.collider(this._teamA, this._teamB);
    this.physics.add.collider(this._teamB, this._teamA);
    this.physics.add.overlap(
      this._ball,
      this._goalA.bounds,
      function () {
        this._goalA.incrementScore();
      },
      null,
      this
    );
    this.physics.add.overlap(
      this._ball,
      this._goalB.bounds,
      function () {
        this._goalB.incrementScore();
      },
      null,
      this
    );
  }

  public update() {
    if (!this.gameOn && this.isAllPlayersHome) {
      this.setGameOn(true);
    }

    this.updateUi();
  }

  public reset() {
    if (this.gameOn) {
      this.setGameOn(false);
      this._scoreText.setText(`${this._goalB.scored}-${this._goalA.scored}`);
      this._teamA.kickOff();
      this._teamB.kickOff();
      this.time.delayedCall(
        250,
        function () {
          this.ball.place(1280 / 2, 704 / 2);
        },
        [],
        this
      );
    }
  }

  public setGoalkeeperHasBall(value: boolean) {
    this.data.set("goalkeeperHasBall", value);
  }

  public setGameOn(value: boolean) {
    this.data.set("gameOn", value);
  }

  public get goalkeeperHasBall(): boolean {
    return this.data.get("goalkeeperHasBall");
  }

  public get gameOn(): boolean {
    return this.data.get("gameOn");
  }

  public get isAllPlayersHome(): boolean {
    return this._teamA.isAllPlayersHome && this._teamB.isAllPlayersHome;
  }

  public get pitch(): Phaser.Geom.Rectangle {
    return this._pitch;
  }

  public get ball(): Ball {
    return this._ball;
  }

  private updateUi() {
    function getTeamState(team: Team): string {
      switch (team.state) {
        case TeamStates.Attacking:
          return "Attacking";
        case TeamStates.PrepareForKickOff:
          return "PrepareForKickOff";
        case TeamStates.Defending:
        default:
          return "Defending";
      }
    }

    function getPlayerMode(player: PlayerBase): string {
      switch (player.mode) {
        case PlayerModes.Track:
          return "Track";
        case PlayerModes.Seek:
          return "Seek";
        case PlayerModes.Pursuit:
          return "Pursuit";
        case PlayerModes.Interpose:
        default:
          return "Interpose";
      }
    }

    function getPlayerState(player: PlayerBase): string {
      if (player.role === "GK") {
        switch (player.state) {
          case PlayerKeeperStates.InterceptBall:
            return "InterceptBall";
          case PlayerKeeperStates.PutBallBackInPlay:
            return "PutBallBackInPlay";
          case PlayerKeeperStates.ReturnToHome:
            return "ReturnToHome";
          case PlayerKeeperStates.TendGoal:
          default:
            return "TendGoal";
        }
      }

      switch (player.state) {
        case PlayerFieldStates.ChaseBall:
          return "ChaseBall";
        case PlayerFieldStates.Dribble:
          return "Dribble";
        case PlayerFieldStates.KickBall:
          return "KickBall";
        case PlayerFieldStates.ReceiveBall:
          return "ReceiveBall";
        case PlayerFieldStates.ReturnToHome:
          return "ReturnToHome";
        case PlayerFieldStates.SupportAttacker:
          return "Support";
        case PlayerFieldStates.Wait:
        default:
          return "Wait";
      }
    }

    setText(`#pitch-gameon`, this.gameOn.toString());

    [this._teamA, this._teamB].forEach((team: Team) => {
      setText(`#${team.name}-state`, getTeamState(team));
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
        setText(`#${team.name}-${index + 1}`, getPlayerState(player));
        setText(`#${team.name}-home-${index + 1}`, `${player.isAtHome}`);
        setText(`#${team.name}-mode-${index + 1}`, getPlayerMode(player));
      });
    });
  }
}
