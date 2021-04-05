import Team from "./Team";
import { PlayerProps } from "../types";
import {
  MAX_SHOT_POWER,
  MAX_PASS_POWER,
  POT_SHOT_CHANCE,
  PASS_THREAT_RADIUS,
  MIN_PASS_DISTANCE,
  DRIBBLE_POWER,
  DRIBBLE_POWER_GOAL,
  MESSAGE_RECEIVE_BALL,
  MESSAGE_SUPPORT_ATTACKER,
  MESSAGE_GO_HOME,
  MESSAGE_WAIT,
  MESSAGE_PASS_TO_ME,
} from "../constants";
import PlayerBase from "./PlayerBase";

export enum PlayerFieldStates {
  Wait,
  ReceiveBall,
  KickBall,
  Dribble,
  ChaseBall,
  ReturnToHome,
  SupportAttacker,
}

export default class PlayerField extends PlayerBase {
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

    this.scene.events
      .on(
        MESSAGE_RECEIVE_BALL,
        function (player: PlayerBase, target: Phaser.Math.Vector2) {
          if (player === this) {
            this.setTarget(target);
            this.setState(PlayerFieldStates.ReceiveBall);
          }
        },
        this
      )
      .on(
        MESSAGE_SUPPORT_ATTACKER,
        function (player: PlayerBase) {
          if (
            player === this &&
            this.state !== PlayerFieldStates.SupportAttacker
          ) {
            this.setTarget(this.team.getSupportSpot());
            this.setState(PlayerFieldStates.SupportAttacker);
          }
        },
        this
      )
      .on(
        MESSAGE_GO_HOME,
        function (player: PlayerBase) {
          if (player === this) {
            this.setDefaultHomeRegion();
            this.setState(PlayerFieldStates.ReturnToHome);
          }
        },
        this
      )
      .on(
        MESSAGE_WAIT,
        function (player: PlayerBase) {
          if (player === this) {
            this.setState(PlayerFieldStates.Wait);
          }
        },
        this
      )
      .on(
        MESSAGE_PASS_TO_ME,
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
              MESSAGE_RECEIVE_BALL,
              receiver,
              receiver.position
            );
            this.setState(PlayerFieldStates.Wait);
            this.findSupport();
          }
        },
        this
      );

    this.setState(PlayerFieldStates.ReturnToHome);
  }

  public setState(value: PlayerFieldStates): this {
    switch (this.state) {
      case PlayerFieldStates.ChaseBall:
        this.setSeekOn(false);
        break;

      case PlayerFieldStates.SupportAttacker:
        this.team.setSupportingPlayer(null);
        this.setSeekOn(false);
        break;

      case PlayerFieldStates.ReturnToHome:
        this.setSeekOn(false);
        break;

      case PlayerFieldStates.ReceiveBall:
        this.setSeekOn(false);
        this.setPersuitOn(false);
        this.team.setReceivingPlayer(null);
        break;
    }

    super.setState(value);

    switch (value) {
      case PlayerFieldStates.ChaseBall:
        this.setSeekOn(true);
        this.setTarget(this.scene.ball.position);
        break;

      case PlayerFieldStates.SupportAttacker:
        this.setSeekOn(true);
        this.setTarget(this.team.getSupportSpot());
        break;

      case PlayerFieldStates.ReturnToHome:
        this.setSeekOn(true);

        if (this.target.distance(this.home) > 96) {
          this.setTarget(this.home);
        }
        break;

      case PlayerFieldStates.Wait:
        if (!this.scene.gameOn) {
          this.setTarget(this.home);
        }
        break;

      case PlayerFieldStates.Dribble:
      case PlayerFieldStates.KickBall:
        this.team.setControllingPlayer(this);
        break;

      case PlayerFieldStates.ReceiveBall:
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
    super.preUpdate(time, delta);

    switch (this.state) {
      case PlayerFieldStates.ChaseBall:
        if (this.isBallWithinKickingRange) {
          this.setState(PlayerFieldStates.KickBall);
        } else if (this.isClosestPlayerToBall) {
          this.setTarget(this.scene.ball.position);
        } else {
          this.setState(PlayerFieldStates.ReturnToHome);
        }
        break;

      case PlayerFieldStates.SupportAttacker:
        if (!this.team.isInControl) {
          this.setState(PlayerFieldStates.ReturnToHome);
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

      case PlayerFieldStates.ReturnToHome:
        if (this.scene.gameOn) {
          if (
            this.isClosestPlayerToBall &&
            !this.team.receivingPlayer &&
            !this.scene.goalkeeperHasBall
          ) {
            this.setState(PlayerFieldStates.ChaseBall);
          } else if (this.isCloseToTarget(50)) {
            this.setTarget(this.position);
            this.setState(PlayerFieldStates.Wait);
          }
        } else if (this.isAtTarget) {
          this.setState(PlayerFieldStates.Wait);
        }
        break;

      case PlayerFieldStates.Wait:
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
          this.setState(PlayerFieldStates.ChaseBall);
        }
        break;

      case PlayerFieldStates.KickBall:
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
          this.setState(PlayerFieldStates.ChaseBall);
        } else {
          const shootPower = MAX_SHOT_POWER * ballDot;
          const [canShoot, shootTarget] = this.team.canShoot(
            this.scene.ball.position,
            shootPower
          );

          if (canShoot || Math.random() < POT_SHOT_CHANCE) {
            const kickTarget = shootTarget || this.team.goalOpponents.position;

            this.trackBall();
            this.scene.ball.kick(
              kickTarget.clone().subtract(this.scene.ball.position).normalize(),
              shootPower
            );
            this.setState(PlayerFieldStates.Wait);
            this.findSupport();
          } else {
            const passPower = MAX_PASS_POWER * ballDot;
            const [canPass, passReceiver, passTarget] = this.team.findPass(
              this,
              passPower,
              MIN_PASS_DISTANCE
            );

            if (this.isThreatened && canPass) {
              this.trackBall();
              this.scene.ball.kick(
                passTarget
                  .clone()
                  .subtract(this.scene.ball.position)
                  .normalize(),
                passPower
              );
              this.setState(PlayerFieldStates.Wait);
              this.scene.events.emit(
                MESSAGE_RECEIVE_BALL,
                passReceiver,
                passTarget
              );
              this.findSupport();
            } else {
              this.trackBall();
              this.findSupport();
              this.setState(PlayerFieldStates.Dribble);
            }
          }
        }
        break;

      case PlayerFieldStates.Dribble:
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
        this.setState(PlayerFieldStates.ChaseBall);
        break;

      case PlayerFieldStates.ReceiveBall:
        if (this.isBallWithinReceivingRange || !this.team.isInControl) {
          this.setState(PlayerFieldStates.ChaseBall);
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
  }

  public sendHomeIfWaiting(): this {
    if (
      this.state === PlayerFieldStates.Wait ||
      this.state === PlayerFieldStates.ReturnToHome
    ) {
      this.setTarget(this.home);
    }

    return this;
  }
}
