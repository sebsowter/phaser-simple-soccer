import { PlayerProps } from "../types";
import { MAX_PASS_POWER, MIN_PASS_DISTANCE } from "../constants";
import { Team, PlayerBase, PlayerModes } from "./";

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

    super.setState(value);

    return this;
  }

  public returnHomeIfWaiting(target: Phaser.Math.Vector2): this {
    this.setTarget(this.home);
    this.setState(PlayerKeeperStates.ReturnToHome);

    return this;
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
        if (this.isAtHome || this.team.opponents.isInControl) {
          this.setState(PlayerKeeperStates.TendGoal);
        }
        break;

      case PlayerKeeperStates.PutBallBackInPlay:
        const [canPass, receiver, targetPos] = this.team.findPass(
          this,
          MAX_PASS_POWER,
          MIN_PASS_DISTANCE
        );

        if (canPass) {
          console.log("targetPos1", targetPos);
          this.scene.ball.kick(
            targetPos.clone().subtract(this.scene.ball.position),
            MAX_PASS_POWER
          );
          this.scene.setGoalkeeperHasBall(false);
          console.log("targetPos2", targetPos);
          this.scene.events.emit("pass", [receiver, targetPos]);

          this.setState(PlayerKeeperStates.TendGoal);
        } else {
          this.setVelocity(0, 0);
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
    return this.isCloseToHome(64);
  }
}
