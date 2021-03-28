import { PlayerProps } from "../types";
import {
  MAX_PASS_POWER,
  MIN_PASS_DISTANCE,
  INTERCEPT_RANGE,
  KEEPER_RANGE,
} from "../constants";
import Team from "./Team";
import PlayerBase, { PlayerModes } from "./PlayerBase";

export enum PlayerKeeperStates {
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

    this.setState(PlayerKeeperStates.ReturnToHome);
  }

  public setState(value: PlayerKeeperStates): this {
    switch (this.state) {
      case PlayerKeeperStates.TendGoal:
      case PlayerKeeperStates.ReturnToHome:
      case PlayerKeeperStates.InterceptBall:
        this.setMode(PlayerModes.Track);
        break;
    }

    switch (value) {
      case PlayerKeeperStates.TendGoal:
        this.setMode(PlayerModes.Interpose);
        this.setTarget(this.rearInterposeTarget);
        break;

      case PlayerKeeperStates.ReturnToHome:
        this.setTarget(this.home);
        this.setMode(PlayerModes.Seek);
        break;

      case PlayerKeeperStates.PutBallBackInPlay:
        this.team.setControllingPlayer(this);
        this.team.sendFieldPlayersToHome();
        this.team.opponents.sendFieldPlayersToHome();
        break;

      case PlayerKeeperStates.InterceptBall:
        this.setMode(PlayerModes.Pursuit);
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    switch (this.state) {
      case PlayerKeeperStates.TendGoal:
        this.setTarget(this.rearInterposeTarget);

        if (this.isBallWithinKeeperRange) {
          this.scene.ball.trap();
          this.scene.setGoalkeeperHasBall(true);
          this.setState(PlayerKeeperStates.PutBallBackInPlay);
        } else if (
          this.isBallWithinRangeForIntercept &&
          !this.team.isInControl
        ) {
          this.setState(PlayerKeeperStates.InterceptBall);
        } else if (this.isTooFarFromGoalMouth && this.team.isInControl) {
          this.setState(PlayerKeeperStates.ReturnToHome);
        }
        break;

      case PlayerKeeperStates.ReturnToHome:
        if (this.isAtHome || !this.team.isInControl) {
          this.setState(PlayerKeeperStates.TendGoal);
        }
        break;

      case PlayerKeeperStates.PutBallBackInPlay:
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

          this.setMode(PlayerModes.Track);
          this.setState(PlayerKeeperStates.TendGoal);

          receiver.receivePass(targetPos);
        }
        break;

      case PlayerKeeperStates.InterceptBall:
        if (this.isTooFarFromGoalMouth && !this.isClosestPlayerOnPitchToBall) {
          this.setState(PlayerKeeperStates.ReturnToHome);
        } else if (this.isBallWithinKeeperRange) {
          this.scene.ball.trap();
          this.scene.setGoalkeeperHasBall(true);
          this.setState(PlayerKeeperStates.PutBallBackInPlay);
        }
        break;
    }
  }

  public returnHome(): this {
    this.setState(PlayerKeeperStates.ReturnToHome);

    return this;
  }

  public receivePass(): this {
    this.setState(PlayerKeeperStates.InterceptBall);

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
