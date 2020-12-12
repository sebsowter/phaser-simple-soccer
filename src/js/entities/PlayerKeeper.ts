import Team from "./Team";
import { PlayerProps } from "../types";
import { setText } from "../utils";
import {
  MAX_SHOT_POWER,
  MAX_PASS_POWER,
  POT_SHOT_CHANCE,
  PASS_THREAT_RADIUS,
  MIN_PASS_DISTANCE,
  RECEIVING_RANGE,
  KICKING_RANGE,
  PLAYER_COMFORT_DISTANCE,
  DRIBBLE_POWER,
  DRIBBLE_POWER_GOAL,
  TIME_DELTA_MILI,
  INTERCEPT_RANGE,
  GOAL_MOUTH_DISTANCE,
  KEEPER_RANGE,
} from "../constants";
import PlayerBase, { Modes } from "./PlayerBase";

enum States {
  TendGoal,
  ReturnToHome,
  PutBallBackInPlay,
  InterceptBall,
}

export default class PlayerKeeper extends PlayerBase {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    props: PlayerProps,
    index: number,
    name: string,
    home: Phaser.Math.Vector2,
    team: Team
  ) {
    super(scene, x, y, frame, props, index, name, home, team);

    this.setState(States.ReturnToHome);
  }

  private exitState(): void {
    switch (this.state) {
      case States.TendGoal:
      case States.ReturnToHome:
      case States.InterceptBall:
        this.setMode(Modes.Track);
        break;
    }
  }

  public setState(value: States): this {
    const selector = `#${this.getData("name")}-${this.getData("index") + 1}`;

    this.exitState();

    switch (value) {
      case States.TendGoal:
        setText(selector, "TendGoal");
        this.setMode(Modes.Seek);
        this.setTarget(this.getRearInterposeTarget);
        break;
      case States.ReturnToHome:
        setText(selector, "ReturnToHome");
        this.setTarget(this.home);
        this.setMode(Modes.Seek);
        break;
      case States.PutBallBackInPlay:
        setText(selector, "PutBallBackInPlay");
        this.team.setControllingPlayer(this);
        this.team.opponents.sendFieldPlayersToHome();
        this.team.sendFieldPlayersToHome();
        break;
      case States.InterceptBall:
        setText(selector, "InterceptBall");
        this.setMode(Modes.Pursuit);
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number): void {
    this.movePlayer(delta);

    switch (this.state) {
      case States.TendGoal:
        //console.log("TendGoal");
        //console.log("this.TendGoal", this.getRearInterposeTarget);
        this.setTarget(this.getRearInterposeTarget);
        const spot =
          this.getData("name") === "red" ? this.scene.spot1 : this.scene.spot2;
        spot.x = this.target.x;
        spot.y = this.target.y;

        if (this.isBallWithinKeeperRange) {
          this.scene.ball.trap();
          this.scene.setGoalkeeperHasBall(true);
          this.setState(States.PutBallBackInPlay);
        } else if (
          this.isBallWithinRangeForIntercept &&
          !this.team.isInControl
        ) {
          this.setState(States.InterceptBall);
        } else if (this.isTooFarFromGoalMouth && this.team.isInControl) {
          this.setState(States.ReturnToHome);
        }
        break;
      case States.ReturnToHome:
        if (this.isAtHome || !this.team.isInControl) {
          this.setState(States.TendGoal);
        }
        break;
      case States.PutBallBackInPlay:
        const canPass = this.team.findPass(
          this,
          MAX_PASS_POWER,
          MIN_PASS_DISTANCE
        );

        if (canPass[0]) {
          const receiver = canPass[1];
          const targetPos = canPass[2];
          const targetAngle = Phaser.Math.Angle.BetweenPoints(
            this.position,
            targetPos
          );

          this.scene.ball.kick(targetAngle, MAX_PASS_POWER);
          this.scene.setGoalkeeperHasBall(false);
          receiver.receivePass(targetPos);
          this.setMode(Modes.Track);
          this.setState(States.TendGoal);
        }
        break;
      case States.InterceptBall:
        if (this.isTooFarFromGoalMouth && !this.isClosestPlayerOnPitchToBall) {
          this.setState(States.ReturnToHome);
        } else if (this.isBallWithinKeeperRange) {
          this.scene.ball.trap();
          this.scene.setGoalkeeperHasBall(true);
          this.setState(States.PutBallBackInPlay);
        }
        break;
    }

    super.preUpdate(time, delta);
  }

  public receivePass(target: Phaser.Math.Vector2): void {
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  }

  public get isBallWithinKeeperRange(): boolean {
    return this.position.distance(this.scene.ball.position) < KEEPER_RANGE;
  }

  // Is this player ready for another kick.
  public get isAtHome(): boolean {
    return true;
  }

  public get isBallWithinRangeForIntercept(): boolean {
    return (
      this.team.opponents &&
      this.team.opponents.goal.position.distance(this.scene.ball.position) <=
        INTERCEPT_RANGE
    );
  }

  public get isTooFarFromGoalMouth(): boolean {
    return (
      //this.position.distance(this.getRearInterposeTarget) > INTERCEPT_RANGE
      this.position.distance(this.team.opponents.goal.position) > 200
    );
  }
}
