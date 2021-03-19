import Team from "./Team";
import { PlayerProps } from "../types";
import { setText } from "../utils";
import {
  MAX_PASS_POWER,
  MIN_PASS_DISTANCE,
  INTERCEPT_RANGE,
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

  public setState(value: States): this {
    const selector = `#${this.getData("name")}-${this.getData("index") + 1}`;

    switch (this.state) {
      case States.TendGoal:
      case States.ReturnToHome:
      case States.InterceptBall:
        this.setMode(Modes.Track);
        break;
    }

    switch (value) {
      case States.TendGoal:
        setText(selector, "TendGoal");
        this.setMode(Modes.Interpose);
        this.setTarget(this.rearInterposeTarget);
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
    super.preUpdate(time, delta);

    switch (this.state) {
      case States.TendGoal:
        this.setTarget(this.rearInterposeTarget);

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

          this.setMode(Modes.Track);
          this.setState(States.TendGoal);

          receiver.receivePass(targetPos);
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
  }

  public returnHome(): this {
    this.setState(States.ReturnToHome);

    return this;
  }

  public receivePass(): this {
    this.setState(States.InterceptBall);

    return this;
  }

  public get isAtHome(): boolean {
    return !this.isTooFarFromGoalMouth;
  }

  public get isBallWithinKeeperRange(): boolean {
    return this.position.distance(this.scene.ball.position) < KEEPER_RANGE;
  }

  public get isBallWithinRangeForIntercept(): boolean {
    return (
      this.team.goalHome.position.distance(this.scene.ball.position) <=
      INTERCEPT_RANGE
    );
  }

  public get isTooFarFromGoalMouth(): boolean {
    return this.position.distance(this.rearInterposeTarget) > INTERCEPT_RANGE;
  }
}
