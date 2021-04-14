import { PlayerProps, PlayerEvent } from "../types";
import { MAX_PASS_POWER, MIN_PASS_DISTANCE } from "../constants";
import { SoccerTeam, PlayerBase } from ".";

export enum GoalkeeperStates {
  TendGoal,
  ReturnToHome,
  PutBallBackInPlay,
  InterceptBall,
}

export default class Goalkeeper extends PlayerBase {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    props: PlayerProps,
    index: number,
    name: string,
    home: Phaser.Math.Vector2,
    team: SoccerTeam
  ) {
    super(scene, x, y, frame, props, index, name, home, team);

    this.scene.events
      .on(
        PlayerEvent.RECEIVE_BALL,
        function (player: PlayerBase) {
          if (player === this) {
            this.setState(GoalkeeperStates.InterceptBall);
          }
        },
        this
      )
      .on(
        PlayerEvent.GO_HOME,
        function (player: PlayerBase) {
          if (player === this) {
            this.setState(GoalkeeperStates.ReturnToHome);
          }
        },
        this
      );

    this.setState(GoalkeeperStates.ReturnToHome);
  }

  public setState(state: GoalkeeperStates): this {
    switch (this.state) {
      case GoalkeeperStates.TendGoal:
        this.setInterposeOn(false);
        break;

      case GoalkeeperStates.ReturnToHome:
        this.setSeekOn(false);
        break;

      case GoalkeeperStates.InterceptBall:
        this.setPersuitOn(false);
        break;
    }

    super.setState(state);

    switch (state) {
      case GoalkeeperStates.TendGoal:
        this.setInterposeOn(true);
        this.setTarget(this.rearInterposeTarget);
        break;

      case GoalkeeperStates.ReturnToHome:
        this.setTarget(this.home);
        this.setSeekOn(true);
        break;

      case GoalkeeperStates.InterceptBall:
        this.setPersuitOn(true);
        break;

      case GoalkeeperStates.PutBallBackInPlay:
        this.team.setControllingPlayer(this);
        this.team.sendFieldPlayersToHome();
        this.team.opponents.sendFieldPlayersToHome();
        break;
    }

    return this;
  }

  public preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    switch (this.state) {
      case GoalkeeperStates.TendGoal:
        this.setTarget(this.rearInterposeTarget);

        if (this.isBallWithinKeeperRange) {
          this.scene.ball.trap();
          this.scene.setGoalkeeperHasBall(true);
          this.setState(GoalkeeperStates.PutBallBackInPlay);
        } else if (
          this.isBallWithinRangeForIntercept &&
          !this.team.isInControl
        ) {
          this.setState(GoalkeeperStates.InterceptBall);
        } else if (this.isTooFarFromGoalMouth && this.team.isInControl) {
          this.setState(GoalkeeperStates.ReturnToHome);
        }
        break;

      case GoalkeeperStates.ReturnToHome:
        if (this.isAtHome || this.team.opponents.isInControl) {
          this.setState(GoalkeeperStates.TendGoal);
        }
        break;

      case GoalkeeperStates.InterceptBall:
        if (this.isTooFarFromGoalMouth && !this.isClosestPlayerOnPitchToBall) {
          this.setState(GoalkeeperStates.ReturnToHome);
        } else if (this.isBallWithinKeeperRange) {
          this.scene.ball.trap();
          this.scene.setGoalkeeperHasBall(true);
          this.setState(GoalkeeperStates.PutBallBackInPlay);
        }
        break;

      case GoalkeeperStates.PutBallBackInPlay:
        const [canPass, passReceiver, passTarget] = this.team.findPass(
          this,
          MAX_PASS_POWER,
          MIN_PASS_DISTANCE
        );

        if (canPass) {
          this.scene.ball.kick(
            passTarget.clone().subtract(this.scene.ball.position),
            MAX_PASS_POWER
          );
          this.scene.setGoalkeeperHasBall(false);
          this.scene.events.emit(
            PlayerEvent.RECEIVE_BALL,
            passReceiver,
            passTarget
          );
          this.setState(GoalkeeperStates.TendGoal);
        } else {
          this.setVelocity(0, 0);
        }
        break;
    }
  }

  public get isAtHome(): boolean {
    return this.isCloseToHome(128);
  }
}
