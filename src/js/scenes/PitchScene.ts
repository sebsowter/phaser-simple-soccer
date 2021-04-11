import { updateUi } from "../utils";
import { Ball, Goal, Team, Pitch, Score } from "../gameObjects";
import { teams } from "../constants";

export default class PitchScene extends Phaser.Scene {
  private _ball: Ball;
  private _teamA: Team;
  private _teamB: Team;
  private _goalA: Goal;
  private _goalB: Goal;
  private _pitch: Pitch;
  private _score: Score;

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
        ballInGoal: false,
      },
      false
    );
  }

  public create() {
    this._pitch = new Pitch(this);
    this._goalA = new Goal(this, this.pitch.x, this.pitch.midpoint.y, 1);
    this._goalB = new Goal(
      this,
      this.pitch.x + this.pitch.width,
      this.pitch.midpoint.y,
      -1
    );
    this._ball = new Ball(this, this.pitch.midpoint.x, this.pitch.midpoint.y);
    this._teamA = new Team(this, teams[0], true, this.goalB, this.goalA);
    this._teamB = new Team(this, teams[1], false, this.goalA, this.goalB);
    this._score = new Score(this, this.game.renderer.width / 2, 8);

    this.teamA.setOpponents(this.teamB);
    this.teamB.setOpponents(this.teamA);

    this.physics.add.collider(this.teamA, this.teamB);
    this.physics.add.collider(this.teamB, this.teamA);
    this.physics.add.collider(this._ball, [this.goalA, this.goalB, this.pitch]);
    this.physics.add.collider(
      [this.teamA, this.teamB],
      [this.goalA, this.goalB, this.pitch]
    );
  }

  public update() {
    if (this.data.get("ballInGoal")) {
      if (!this.goalA.isBallInGoal && !this.goalB.isBallInGoal) {
        this.data.set("ballInGoal", false);
      }
    } else {
      if (this.goalA.isBallInGoal) {
        this.goalA.incrementScore();
        this._score.setText(`${this.goalB.scored}-${this.goalA.scored}`);
        this.data.set("ballInGoal", true);
      } else if (this.goalB.isBallInGoal) {
        this.goalB.incrementScore();
        this._score.setText(`${this.goalB.scored}-${this.goalA.scored}`);
        this.data.set("ballInGoal", true);
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
