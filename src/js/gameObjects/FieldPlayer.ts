import SoccerTeam from "./SoccerTeam";
import { PlayerProps, PlayerEvent } from "../types";
import {
  MAX_SHOT_POWER,
  MAX_PASS_POWER,
  POT_SHOT_CHANCE,
  PASS_THREAT_RADIUS,
  MIN_PASS_DISTANCE,
  DRIBBLE_POWER,
  DRIBBLE_POWER_GOAL,
} from "../constants";
import PlayerBase from "./PlayerBase";

export enum FieldPlayerStates {
  Wait,
  ReceiveBall,
  KickBall,
  Dribble,
  ChaseBall,
  ReturnToHome,
  SupportAttacker,
}

export default class FieldPlayer extends PlayerBase {
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
        function (player: PlayerBase, target: Phaser.Math.Vector2) {
          if (player === this) {
            this.setTarget(target);
            this.setState(FieldPlayerStates.ReceiveBall);
          }
        },
        this
      )
      .on(
        PlayerEvent.SUPPORT_ATTACKER,
        function (player: PlayerBase) {
          if (
            player === this &&
            this.state !== FieldPlayerStates.SupportAttacker
          ) {
            this.setState(FieldPlayerStates.SupportAttacker);
          }
        },
        this
      )
      .on(
        PlayerEvent.GO_HOME,
        function (player: PlayerBase) {
          if (player === this) {
            this.setState(FieldPlayerStates.ReturnToHome);
          }
        },
        this
      )
      .on(
        PlayerEvent.WAIT,
        function (player: PlayerBase) {
          if (player === this) {
            this.setState(FieldPlayerStates.Wait);
          }
        },
        this
      )
      .on(
        PlayerEvent.PASS_TO_ME,
        function (player: PlayerBase, receiver: PlayerBase) {
          if (player === this && this.isBallWithinKickingRange) {
            this.team.ball.kick(
              receiver.position
                .clone()
                .subtract(this.scene.ball.position)
                .normalize(),
              MAX_PASS_POWER
            );
            this.scene.events.emit(
              PlayerEvent.RECEIVE_BALL,
              receiver,
              receiver.position
            );
            this.setState(FieldPlayerStates.Wait);
            this.findSupport();
          }
        },
        this
      );

    this.setState(FieldPlayerStates.ReturnToHome);
  }

  public setState(value: FieldPlayerStates) {
    switch (this.state) {
      case FieldPlayerStates.ChaseBall:
        this.setSeekOn(false);
        break;

      case FieldPlayerStates.SupportAttacker:
        this.team.setSupportingPlayer(null);
        this.setSeekOn(false);
        break;

      case FieldPlayerStates.ReturnToHome:
        this.setSeekOn(false);
        break;

      case FieldPlayerStates.ReceiveBall:
        this.setSeekOn(false);
        this.setPersuitOn(false);
        this.team.setReceivingPlayer(null);
        break;
    }

    super.setState(value);

    switch (value) {
      case FieldPlayerStates.ChaseBall:
        this.setSeekOn(true);
        this.setTarget(this.scene.ball.position);
        break;

      case FieldPlayerStates.SupportAttacker:
        this.setSeekOn(true);
        this.setTarget(this.team.getSupportSpot());
        break;

      case FieldPlayerStates.ReturnToHome:
        this.setSeekOn(true);

        if (!this.isCloseToHome(96)) {
          this.setTarget(this.home);
        }
        break;

      case FieldPlayerStates.Wait:
        if (!this.scene.gameOn) {
          this.setTarget(this.home);
        }
        break;

      case FieldPlayerStates.Dribble:
      case FieldPlayerStates.KickBall:
        this.team.setControllingPlayer(this);
        break;

      case FieldPlayerStates.ReceiveBall:
        this.team.setReceivingPlayer(this);
        this.team.setControllingPlayer(this);

        if (
          this.isInHotPosition ||
          (Math.random() < 0.5 &&
            !this.team.isOpponentWithinRadius(
              this.position,
              PASS_THREAT_RADIUS
            ))
        ) {
          this.setPersuitOn(false);
          this.setSeekOn(true);
        } else {
          this.setSeekOn(false);
          this.setPersuitOn(true);
        }
        break;
    }

    return this;
  }

  public preUpdate(time: number, delta: number) {
    switch (this.state) {
      case FieldPlayerStates.ChaseBall:
        if (this.isBallWithinKickingRange) {
          this.setState(FieldPlayerStates.KickBall);
        } else if (this.isClosestPlayerToBall) {
          this.setTarget(this.scene.ball.position);
        } else {
          this.setState(FieldPlayerStates.ReturnToHome);
        }
        break;

      case FieldPlayerStates.SupportAttacker:
        if (!this.team.isInControl) {
          this.setState(FieldPlayerStates.ReturnToHome);
        } else {
          // If the best supporting spot changes, change the steering target.
          const supportSpot = this.team.getSupportSpot();

          if (supportSpot !== this.target) {
            this.setTarget(supportSpot);
            this.setSeekOn(true);
          }

          // If shot from current positon possible, request a pass.
          const [canShoot] = this.team.canShoot(this.position, MAX_SHOT_POWER);

          if (canShoot) {
            this.team.requestPass(this);
          }

          if (this.isAtTarget) {
            this.setSeekOn(false);
            this.trackBall();
            this.setVelocity(0, 0);

            if (!this.isThreatened) {
              this.team.requestPass(this);
            }
          }
        }
        break;

      case FieldPlayerStates.ReturnToHome:
        if (this.scene.gameOn) {
          if (
            this.isClosestPlayerToBall &&
            this.team.receivingPlayer === null &&
            !this.scene.goalkeeperHasBall
          ) {
            this.setState(FieldPlayerStates.ChaseBall);
          } else if (this.isCloseToHome(64)) {
            this.setTarget(this.position);
            this.setState(FieldPlayerStates.Wait);
          }
        } else if (this.isAtTarget) {
          this.setState(FieldPlayerStates.Wait);
        }
        break;

      case FieldPlayerStates.Wait:
        if (this.isAtTarget) {
          this.setSeekOn(false);
          this.setVelocity(0, 0);
          this.trackBall();
        } else {
          this.setSeekOn(true);
        }

        if (
          this.team.isInControl &&
          !this.isControllingPlayer &&
          this.isAheadOfAttacker
        ) {
          this.team.requestPass(this);
        } else if (
          this.scene.gameOn &&
          this.isClosestPlayerToBall &&
          !this.team.receivingPlayer &&
          !this.scene.goalkeeperHasBall
        ) {
          this.setState(FieldPlayerStates.ChaseBall);
        }
        break;

      case FieldPlayerStates.KickBall:
        const ballDot = this.facing
          .clone()
          .dot(
            this.scene.ball.position.clone().subtract(this.position).normalize()
          );

        if (
          this.team.receivingPlayer ||
          this.scene.goalkeeperHasBall ||
          ballDot < 0
        ) {
          this.trackBall();
          this.setState(FieldPlayerStates.ChaseBall);
        } else {
          const shootPower = MAX_SHOT_POWER * ballDot;
          const [canShoot, shootTarget] = this.team.canShoot(
            this.scene.ball.position,
            shootPower
          );

          if (canShoot || Math.random() < POT_SHOT_CHANCE) {
            const kickTarget = this.scene.ball.addNoiseToKick(
              this.scene.ball.position,
              shootTarget || this.team.goalOpponents.position
            );

            this.trackBall();
            this.scene.ball.kick(
              kickTarget.clone().subtract(this.scene.ball.position),
              shootPower
            );
            this.setState(FieldPlayerStates.Wait);
            this.findSupport();
          } else {
            const passPower = MAX_PASS_POWER * ballDot;
            const [canPass, passReceiver, passTarget] = this.team.findPass(
              this,
              passPower,
              MIN_PASS_DISTANCE
            );

            if (this.isThreatened && canPass) {
              const kickTarget = this.scene.ball.addNoiseToKick(
                this.scene.ball.position,
                passTarget
              );

              this.trackBall();
              this.scene.ball.kick(
                kickTarget.clone().subtract(this.scene.ball.position),
                passPower
              );
              this.setState(FieldPlayerStates.Wait);
              this.scene.events.emit(
                PlayerEvent.RECEIVE_BALL,
                passReceiver,
                passTarget
              );
              this.findSupport();
            } else {
              this.trackBall();
              this.findSupport();
              this.setState(FieldPlayerStates.Dribble);
            }
          }
        }
        break;

      case FieldPlayerStates.Dribble:
        const { facing } = this.team.goalOpponents;
        const goalDot = this.team.goalOpponents.facing.clone().dot(this.facing);

        // If back to goal kick ball at an angle to turn.
        if (goalDot > 0) {
          const v = new Phaser.Math.Vector2(1, 0);
          const direction = Math.sign(
            this.facing.y * facing.x - this.facing.x * facing.y
          );
          const d = this.rotation + direction * (Math.PI / 5);

          this.scene.ball.kick(v.rotate(d), DRIBBLE_POWER);
        } else {
          this.scene.ball.kick(this.team.goalHome.facing, DRIBBLE_POWER_GOAL);
        }

        this.trackBall();
        this.setState(FieldPlayerStates.ChaseBall);
        break;

      case FieldPlayerStates.ReceiveBall:
        if (this.isBallWithinReceivingRange || !this.team.isInControl) {
          this.setState(FieldPlayerStates.ChaseBall);
        } else {
          if (this.persuitOn) {
            this.setTarget(this.scene.ball.position);
          }

          if (this.isAtTarget) {
            this.setSeekOn(false);
            this.setPersuitOn(false);
            this.trackBall();
            this.setVelocity(0, 0);
          }
        }
        break;
    }

    super.preUpdate(time, delta);
  }

  public sendHomeIfWaiting() {
    if (
      this.state === FieldPlayerStates.Wait ||
      this.state === FieldPlayerStates.ReturnToHome
    ) {
      this.setTarget(this.home);
      this.setState(FieldPlayerStates.ReturnToHome);
    }

    return this;
  }
}
