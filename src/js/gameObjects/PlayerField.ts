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
} from "../constants";
import PlayerBase, { PlayerModes } from "./PlayerBase";

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

    this.scene.events.on(
      "pass",
      function (props: any[]) {
        const [receiver, target] = props;

        if (receiver === this) {
          this.setTarget(target);
          this.scene._circle.setPosition(this.target.x, this.target.y);
          this.setState(PlayerFieldStates.ReceiveBall);
        }
      },
      this
    );

    this.scene.events.on(
      "support",
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
    );

    this.scene.events.on(
      "goHome",
      function (player: PlayerBase) {
        if (player === this) {
          this.setDefaultHomeRegion();
          this.setState(PlayerFieldStates.ReturnToHome);
        }
      },
      this
    );

    this.scene.events.on(
      "wait",
      function (player: PlayerBase) {
        if (player === this) {
          this.setState(PlayerFieldStates.Wait);
        }
      },
      this
    );

    this.scene.events.on(
      "passMe",
      function (receiver: PlayerBase) {
        if (receiver === this && this.isBallWithinKickingRange) {
          const targetVector = receiver.position
            .subtract(this.scene.ball.position)
            .normalize();

          this.team.ball.kick(targetVector, MAX_PASS_POWER);
          this.scene.events.emit("pass", [receiver, receiver.position]);
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
        this.setMode(PlayerModes.Track);
        break;

      case PlayerFieldStates.SupportAttacker:
        this.team.setSupportingPlayer(null);
        this.setMode(PlayerModes.Track);
        break;

      case PlayerFieldStates.ReturnToHome:
        this.setMode(PlayerModes.Track);
        break;

      case PlayerFieldStates.ReceiveBall:
        this.setMode(PlayerModes.Track);
        this.team.setReceivingPlayer(null);
        break;
    }

    switch (value) {
      case PlayerFieldStates.ChaseBall:
        this.setMode(PlayerModes.Seek);
        break;

      case PlayerFieldStates.SupportAttacker:
        this.setMode(PlayerModes.Seek);
        this.setTarget(this.team.getSupportSpot());
        break;

      case PlayerFieldStates.ReturnToHome:
        this.setMode(PlayerModes.Seek);

        if (this.isCloseToHome(96)) {
          this.setTarget(this.home);
        }
        break;

      case PlayerFieldStates.Wait:
        if (!this.scene.gameOn) {
          this.setTarget(this.home);
        }
        break;

      case PlayerFieldStates.KickBall:
        this.team.setControllingPlayer(this);

        if (!this.isReadyForNextKick) {
          this.setState(PlayerFieldStates.ChaseBall);
        }
        break;

      case PlayerFieldStates.Dribble:
        this.team.setControllingPlayer(this);
        break;

      case PlayerFieldStates.ReceiveBall:
        this.team.setReceivingPlayer(this);
        this.team.setControllingPlayer(this);

        this.scene._circle.setPosition(this.target.x, this.target.y);

        if (
          this.isInHotPosition ||
          (Math.random() < 0.5 &&
            !this.team.isOpponentWithinRadius(
              this.position,
              PASS_THREAT_RADIUS
            ))
        ) {
          this.setMode(PlayerModes.Seek);
        } else {
          this.setMode(PlayerModes.Pursuit);
        }
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    /*
    ['sss'].forEach((state: any) => {
      if (this.state === state.state) {
        state.execute(this)
      }
    })
    */

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
            this.setMode(PlayerModes.Seek);
          }

          // If shot from current positon possible, request a pass.
          const [canShoot] = this.team.canShoot(this.position, MAX_SHOT_POWER);

          if (canShoot) {
            this.team.requestPass(this);
          }

          if (this.isAtTarget) {
            this.setMode(PlayerModes.Track);
            this.setVelocity(0, 0);

            if (!this.isThreatened) {
              this.team.requestPass(this);
            }
          }
        }
        break;

      case PlayerFieldStates.ReturnToHome:
        if (this.scene.gameOn) {
          if (this.shouldChaseBall) {
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
        if (!this.isAtTarget) {
          this.setMode(PlayerModes.Seek);
        } else {
          this.setVelocity(0, 0);
          this.setMode(PlayerModes.Track);

          if (
            this.team.isInControl &&
            !this.isControllingPlayer &&
            this.isAheadOfAttacker
          ) {
            this.team.requestPass(this);
          } else if (this.scene.gameOn && this.shouldChaseBall) {
            this.setState(PlayerFieldStates.ChaseBall);
          }
        }
        break;

      case PlayerFieldStates.KickBall:
        const dot = this.facing.dot(
          this.scene.ball.position.clone().subtract(this.position).normalize()
        );

        if (
          this.team.receivingPlayer ||
          this.scene.goalkeeperHasBall ||
          dot < 0
        ) {
          this.setState(PlayerFieldStates.ChaseBall);
        } else {
          const powerShot = MAX_SHOT_POWER * dot;
          const [canShoot, shotTarget] = this.team.canShoot(
            this.scene.ball.position,
            powerShot
          );

          if (canShoot || Math.random() < POT_SHOT_CHANCE) {
            this.scene.ball.kick(
              shotTarget.clone().subtract(this.scene.ball.position),
              powerShot
            );

            this.setState(PlayerFieldStates.Wait);
            this.findSupport();
          } else {
            const passPower = MAX_PASS_POWER * dot;
            const [canPass, receiver, passTarget] = this.team.findPass(
              this,
              passPower,
              MIN_PASS_DISTANCE
            );

            if (this.isThreatened && canPass) {
              this.scene.ball.kick(
                passTarget.clone().subtract(this.scene.ball.position),
                passPower
              );

              this.setState(PlayerFieldStates.Wait);
              this.scene.events.emit("pass", [receiver, passTarget]);
              this.findSupport();
            } else {
              this.findSupport();
              this.setState(PlayerFieldStates.Dribble);
            }
          }
        }
        break;

      case PlayerFieldStates.Dribble:
        const { facing } = this.team.goalOpp;
        const goalDot = this.team.goalOpp.facing.dot(this.facing);

        // If back to goal kick ball at an angle to turn.
        if (goalDot > 0) {
          const v = new Phaser.Math.Vector2(1, 0);
          const direction = Math.sign(
            this.facing.y * facing.x - this.facing.x * facing.y
          );
          const d = this.rotation + direction * (Math.PI / 5);

          this.scene.ball.kick(v.rotate(d), DRIBBLE_POWER);
        }

        // Otherwise kick ball towards the goal.
        else {
          this.scene.ball.kick(this.team.goalHome.facing, DRIBBLE_POWER_GOAL);
        }

        this.setState(PlayerFieldStates.ChaseBall);
        break;

      case PlayerFieldStates.ReceiveBall:
        this.scene._circle.setPosition(this.target.x, this.target.y);

        if (this.isBallWithinReceivingRange || !this.team.isInControl) {
          this.setState(PlayerFieldStates.ChaseBall);
        } else {
          if (this.mode === PlayerModes.Pursuit) {
            this.setTarget(this.scene.ball.position);
          }

          if (this.isAtTarget) {
            this.setMode(PlayerModes.Track);
            this.setVelocity(0, 0);
          }
        }
        break;
    }
  }

  public updateHomeIfWaiting(): this {
    if (
      this.state === PlayerFieldStates.Wait ||
      this.state === PlayerFieldStates.ReturnToHome
    ) {
      this.setTarget(this.home);
    }

    return this;
  }
}
