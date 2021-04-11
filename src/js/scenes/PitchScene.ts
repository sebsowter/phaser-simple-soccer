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
  public _circle1: any;
  public _circle2: any;
  public _circle3: any;

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
    this._goalA = new Goal(
      this,
      this.pitch.x,
      this.pitch.y + this.pitch.height / 2,
      1
    );
    this._goalB = new Goal(
      this,
      this.pitch.x + this.pitch.width,
      this.pitch.y + this.pitch.height / 2,
      -1
    );
    this._ball = new Ball(
      this,
      this.pitch.x + this.pitch.width / 2,
      this.pitch.y + this.pitch.height / 2
    );
    const ball = new Ball(
      this,
      this.pitch.x + this.pitch.width / 2,
      this.pitch.y + this.pitch.height / 2
    );
    ball.kick(new Phaser.Math.Vector2(1, 0), 320);
    this._teamA = new Team(this, 1, true, this.goalB, this.goalA);
    this._teamB = new Team(this, 2, false, this.goalA, this.goalB);
    this._circle1 = this.add.circle(0, 0, 8, 0x00ffff);
    this._circle2 = this.add.circle(0, 0, 8, 0xff00ff);
    this._circle3 = this.add.circle(0, 0, 8, 0xffff00);
    const pos1 = ball.futurePosition(0.5);
    const pos2 = ball.futurePosition(1);
    const pos3 = ball.futurePosition(2);
    console.log("0", ball.timeToCoverDistance(400, 320));
    console.log("0", ball.timeToCoverDistance(300, 320));
    console.log("0", ball.timeToCoverDistance(250, 320));
    console.log("1", ball.timeToCoverDistance(200, 320));
    console.log("2", ball.timeToCoverDistance(198, 320));
    console.log("2", ball.timeToCoverDistance(196, 320));
    console.log("2", ball.timeToCoverDistance(192, 320));
    console.log("3", ball.timeToCoverDistance(100, 320));
    //this._circle1.setPosition(pos1.x, pos1.y + 40);
    //this._circle2.setPosition(pos2.x, pos2.y + 80);
    //this._circle3.setPosition(pos3.x, pos3.y + 120);
    this._score = new Score(this, this.game.renderer.width / 2, 12);

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
    const ballInGoal = this.data.get("ballInGoal");

    if (!ballInGoal) {
      if (!this.goalA.isBallInGoal && !this.goalB.isBallInGoal) {
        this.data.set("ballInGoal", true);
      }
    } else {
      if (this.goalA.isBallInGoal) {
        this.goalA.incrementScore();
        this._score.setText(`${this.goalB.scored}-${this.goalA.scored}`);
        this.data.set("ballInGoal", false);
      } else if (this.goalB.isBallInGoal) {
        this.goalB.incrementScore();
        this._score.setText(`${this.goalB.scored}-${this.goalA.scored}`);
        this.data.set("ballInGoal", false);
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
