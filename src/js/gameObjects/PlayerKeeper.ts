import { PlayerProps } from "../types";
import { MAX_PASS_POWER, MIN_PASS_DISTANCE } from "../constants";
import { Team, PlayerBase } from "./";

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

    this.scene.events.on(
      "pass",
      function (props: any[]) {
        const [receiver, target] = props;

        if (receiver === this) {
          this.setState(PlayerKeeperStates.InterceptBall);
        }
      },
      this
    );

    this.scene.events.on(
      "goHome",
      function (player: PlayerBase) {
        if (player === this) {
          this.setDefaultHomeRegion();
          this.setState(PlayerKeeperStates.ReturnToHome);
        }
      },
      this
    );

    this.setState(PlayerKeeperStates.ReturnToHome);
  }

  public setState(state: PlayerKeeperStates): this {
    // Exit state.
    switch (this.state) {
      case PlayerKeeperStates.TendGoal:
        //this.setMode(PlayerModes.Track);
        this.setInterposeOn(false);
        break;

      case PlayerKeeperStates.ReturnToHome:
        //this.setMode(PlayerModes.Track);
        this.setSeekOn(false);
        break;

      case PlayerKeeperStates.InterceptBall:
        //this.setMode(PlayerModes.Track);
        this.setPersuitOn(false);
        break;
    }

    // Enter state.
    switch (state) {
      case PlayerKeeperStates.TendGoal:
        //this.setMode(PlayerModes.Interpose);
        this.setInterposeOn(true);
        this.setTarget(this.rearInterposeTarget);
        break;

      case PlayerKeeperStates.ReturnToHome:
        this.setTarget(this.home);
        this.setSeekOn(true);
        //this.setMode(PlayerModes.Seek);
        break;

      case PlayerKeeperStates.InterceptBall:
        //this.setMode(PlayerModes.Pursuit);
        this.setPersuitOn(true);
        break;

      case PlayerKeeperStates.PutBallBackInPlay:
        this.team.setControllingPlayer(this);
        this.team.sendFieldPlayersToHome();
        this.team.opponents.sendFieldPlayersToHome();
        break;
    }

    return super.setState(state);
  }

  public preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    // Execute state.
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

      case PlayerKeeperStates.InterceptBall:
        if (this.isTooFarFromGoalMouth && !this.isClosestPlayerOnPitchToBall) {
          this.setState(PlayerKeeperStates.ReturnToHome);
        } else if (this.isBallWithinKeeperRange) {
          this.scene.ball.trap();
          this.scene.setGoalkeeperHasBall(true);
          this.setState(PlayerKeeperStates.PutBallBackInPlay);
        }
        break;

      case PlayerKeeperStates.PutBallBackInPlay:
        const [canPass, receiver, targetPos] = this.team.findPass(
          this,
          MAX_PASS_POWER,
          MIN_PASS_DISTANCE
        );

        if (canPass) {
          this.scene.ball.kick(
            targetPos.clone().subtract(this.scene.ball.position),
            MAX_PASS_POWER
          );
          this.scene.setGoalkeeperHasBall(false);
          this.scene.events.emit("pass", [receiver, targetPos]);
          this.setState(PlayerKeeperStates.TendGoal);
        } else {
          this.setVelocity(0, 0);
        }
        break;
    }
  }

  public get isAtHome(): boolean {
    return this.isCloseToHome(64);
  }
}
