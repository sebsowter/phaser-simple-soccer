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
          console.log("target", target);
          this.setTarget(target);
          this.scene._circle.setPosition(this.target.x, this.target.y);
          this.setState(PlayerFieldStates.ReceiveBall);
        }
      },
      this
    );

    this.setState(PlayerFieldStates.ReturnToHome);
  }

  public setState(value: PlayerFieldStates): this {
    switch (this.state) {
      case PlayerFieldStates.ReceiveBall:
        this.team.receivingPlayer = null;
        break;

      case PlayerFieldStates.SupportAttacker:
        this.team.supportingPlayer = null;
        break;
    }

    switch (value) {
      case PlayerFieldStates.ReceiveBall:
        this.team.setControllingPlayer(this);
        this.team.setReceivingPlayer(this);

        console.log("setPosition", this.target);
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

      case PlayerFieldStates.ChaseBall:
        this.setMode(PlayerModes.Pursuit);
        break;

      case PlayerFieldStates.Dribble:
        this.team.setControllingPlayer(this);
        break;

      case PlayerFieldStates.SupportAttacker:
        this.setTarget(this.team.getSupportSpot());
        break;

      case PlayerFieldStates.KickBall:
        this.team.setControllingPlayer(this);

        if (!this.isReadyForNextKick) {
          this.setState(PlayerFieldStates.ChaseBall);
        }
        break;

      case PlayerFieldStates.ReturnToHome:
        this.setTarget(this.home);
        this.setMode(PlayerModes.Seek);
        break;

      case PlayerFieldStates.Wait:
        //this.setVelocity(0, 0);
        if (!this.scene.gameOn) {
          this.setTarget(this.home);
        }
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    switch (this.state) {
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
            this.team.requestSupport();

            this.setState(PlayerFieldStates.Wait);
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

              console.log("----", passTarget);
              this.scene.events.emit("pass", [receiver, passTarget]);

              this.team.requestSupport();

              this.setState(PlayerFieldStates.Wait);
            } else {
              this.setState(PlayerFieldStates.Dribble);

              this.team.requestSupport();
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

      case PlayerFieldStates.SupportAttacker:
        if (!this.team.isInControl) {
          this.setState(PlayerFieldStates.ReturnToHome);
        } else {
          // If the best supporting spot changes, change the steering target.
          const supportSpot = this.team.getSupportSpot();

          if (supportSpot !== this.target) {
            this.setMode(PlayerModes.Seek);
            this.setTarget(supportSpot);
          }

          // If shot from current positon possible, request a pass.
          if (this.team.canShoot(this.position, MAX_SHOT_POWER)[0]) {
            this.team.requestPass(this);
          }

          if (this.isAtTarget) {
            this.setMode(PlayerModes.Track);

            if (!this.isThreatened) {
              this.team.requestPass(this);
            }
          }
        }
        break;

      case PlayerFieldStates.ReceiveBall:
        console.log("this.target.x", this.target);
        this.scene._circle.setPosition(this.target.x, this.target.y);

        if (this.isBallWithinReceivingRange || !this.team.isInControl) {
          this.team.setReceivingPlayer(null);
          this.setState(PlayerFieldStates.ChaseBall);
        } else if (this.isAtTarget) {
          this.setMode(PlayerModes.Track);
        } else {
          this.setMode(PlayerModes.Seek);
        }
        break;

      case PlayerFieldStates.ChaseBall:
        if (this.isBallWithinKickingRange) {
          this.setState(PlayerFieldStates.KickBall);
        } else if (!this.isClosestPlayerToBall) {
          this.setState(PlayerFieldStates.ReturnToHome);
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
        } else if (this.isAtHome) {
          this.setState(PlayerFieldStates.Wait);
        }
        break;

      case PlayerFieldStates.Wait:
        if (!this.isAtTarget) {
          this.setMode(PlayerModes.Seek);
        } else {
          this.setMode(PlayerModes.Track);

          if (this.scene.gameOn) {
            if (
              this.team.isInControl &&
              !this.isControllingPlayer &&
              this.isAheadOfAttacker
            ) {
              this.team.requestPass(this);
            } else if (this.shouldChaseBall) {
              this.setState(PlayerFieldStates.ChaseBall);
            }
          }
        }
        break;
    }
  }

  public returnHome(): this {
    this.setState(PlayerFieldStates.ReturnToHome);

    return this;
  }

  public returnHomeIfWaiting(target: Phaser.Math.Vector2): this {
    if (
      this.state === PlayerFieldStates.Wait ||
      this.state === PlayerFieldStates.ReturnToHome
    ) {
      this.setTarget(this.home);
      this.setState(PlayerFieldStates.ReturnToHome);
    }

    return this;
  }

  public passToRequester(receiver: PlayerBase): this {
    if (this.team.receivingPlayer || !this.isBallWithinKickingRange) {
      return this;
    }

    const targetVector = receiver.position
      .subtract(this.scene.ball.position)
      .normalize();

    this.team.ball.kick(targetVector, MAX_PASS_POWER);

    this.setState(PlayerFieldStates.Wait);

    //console.log('----', passTarget)
    this.scene.events.emit("pass", [receiver, receiver.position]);

    this.team.requestSupport();

    return this;
  }

  public support(): this {
    this.setState(PlayerFieldStates.SupportAttacker);

    return this;
  }
}
