import { updateUi } from "../utils";
import { Ball, Goal, Team, Pitch, Score } from "../gameObjects";

export default class PitchScene extends Phaser.Scene {
  private _ball: Ball;
  private _teamA: Team;
  private _teamB: Team;
  private _goalA: Goal;
  private _goalB: Goal;
  private _pitch: Pitch;
  private _score: Score;
  public _circle: any;

  constructor() {
    super({
      key: "pitch",
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
    this._pitch = new Pitch(this);
    this._ball = new Ball(
      this,
      this._pitch.x + this._pitch.width / 2,
      this._pitch.y + this._pitch.height / 2
    );
    this._goalA = new Goal(
      this,
      this._pitch.x,
      this._pitch.y + this._pitch.height / 2,
      1
    );
    this._goalB = new Goal(
      this,
      this._pitch.x + this._pitch.width,
      this._pitch.y + this._pitch.height / 2,
      -1
    );
    this._teamA = new Team(this, 1, true, this._goalB, this._goalA);
    this._teamB = new Team(this, 2, false, this._goalA, this._goalB);
    this._teamA.setOpponents(this._teamB);
    this._teamB.setOpponents(this._teamA);
    this._score = new Score(this, this.game.renderer.width / 2, 12);
    this._circle = this.add.circle(0, 0, 8, 0x00ffff);

    this.physics.add.collider(this._ball, [
      this._goalA,
      this._goalB,
      this._pitch,
    ]);
    this.physics.add.collider(
      [this._teamA, this._teamB],
      [this._goalA, this._goalB, this._pitch]
    );
    this.physics.add.collider(this._teamA, this._teamB);
    this.physics.add.collider(this._teamB, this._teamA);
  }

  public update() {
    if (!this.gameOn) {
      if (!this._goalA.ballInGoal && !this._goalB.ballInGoal) {
        this.setGameOn(true);
      }
    } else {
      if (this._goalA.ballInGoal) {
        this._goalA.incrementScore();
        this._score.setText(`${this._goalB.scored}-${this._goalA.scored}`);
        this.setGameOn(false);
      } else if (this._goalB.ballInGoal) {
        this._goalB.incrementScore();
        this._score.setText(`${this._goalB.scored}-${this._goalA.scored}`);
        this.setGameOn(false);
      }
    }

    updateUi(this);
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

  public get pitch(): Pitch {
    return this._pitch;
  }

  public get ball(): Ball {
    return this._ball;
  }

  public get teamA(): Team {
    return this._teamA;
  }

  public get teamB(): Team {
    return this._teamB;
  }

  public get goalA(): Goal {
    return this._goalA;
  }

  public get goalB(): Goal {
    return this._goalB;
  }
}
