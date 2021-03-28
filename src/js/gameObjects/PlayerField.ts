import Team from "./Team";
import { PlayerProps } from "../types";
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
      case PlayerFieldStates.ChaseBall:
        this.setMode(PlayerModes.Pursuit);
        break;
      case PlayerFieldStates.ReceiveBall:
        break;
      case PlayerFieldStates.Dribble:
        this.team.setControllingPlayer(this);
        break;
      case PlayerFieldStates.SupportAttacker:
        this.setTarget(this.team.getSupportSpot());
        break;
      case PlayerFieldStates.KickBall:
        this.team.setControllingPlayer(this);
        this.setVelocity(0, 0);
        if (!this.isReadyForNextKick) {
          this.setState(PlayerFieldStates.ChaseBall);
        } else {
          this.setData({ isReadyForNextKick: false });
          this.scene.time.delayedCall(
            250,
            function () {
              this.setData({ isReadyForNextKick: true });
            },
            [],
            this
          );
        }
        break;

      case PlayerFieldStates.ReturnToHome:
        this.setTarget(this.home);
        this.setMode(PlayerModes.Seek);
        break;

      case PlayerFieldStates.Wait:
        this.setVelocity(0, 0);
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
          const canShoot = this.team.canShoot(
            this.scene.ball.position,
            powerShot
          );

          if (canShoot[0] || Math.random() < POT_SHOT_CHANCE) {
            this.scene.ball.kick(
              Phaser.Math.Angle.BetweenPoints(this.position, canShoot[1]),
              powerShot
            );
            this.team.requestSupport();
            this.setState(PlayerFieldStates.Wait);
          } else {
            const powerPass = MAX_PASS_POWER * dot;
            const canPass = this.team.findPass(
              this,
              powerPass,
              MIN_PASS_DISTANCE
            );

            if (this.isThreatened && canPass[0]) {
              const receiver = canPass[1];
              const targetPos = canPass[2];
              const targeAngle = Phaser.Math.Angle.BetweenPoints(
                this.position,
                targetPos
              );

              this.scene.ball.kick(targeAngle, powerPass);
              receiver.receivePass(targetPos);
              this.setState(PlayerFieldStates.Wait);
              this.team.requestSupport();
            } else {
              this.setState(PlayerFieldStates.Dribble);
              this.team.requestSupport();
            }
          }
        }
        break;

      case PlayerFieldStates.Dribble:
        const { facing } = this.team.goalTarget;
        const goalDot = facing.dot(this.facing);

        // If back to goal kick ball at an angle to turn.
        if (goalDot > 0) {
          const direction = Math.sign(
            this.facing.y * facing.x - this.facing.x * facing.y
          );

          this.scene.ball.kick(
            this.rotation + direction * (Math.PI / 5),
            DRIBBLE_POWER
          );
        }

        // Otherwise kick ball towards the goal.
        else {
          this.scene.ball.kick(
            Phaser.Math.Angle.BetweenPoints(
              this.position,
              this.team.goalTarget.position
            ),
            DRIBBLE_POWER_GOAL
          );
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
        } else if (this.isAtTarget) {
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
      this.setTarget(target);
    }

    return this;
  }

  public passToRequester(receiver: PlayerField): this {
    if (this.team.receivingPlayer || !this.isBallWithinKickingRange) {
      return;
    }

    this.team.ball.kick(
      Phaser.Math.Angle.BetweenPoints(
        this.team.ball.position,
        receiver.position
      ),
      MAX_PASS_POWER
    );
    this.setState(PlayerFieldStates.Wait);
    receiver.receivePass(receiver.position);
    this.team.requestSupport();

    return this;
  }

  public support(): this {
    this.setState(PlayerFieldStates.SupportAttacker);

    return this;
  }

  public receivePass(target: Phaser.Math.Vector2): this {
    this.team.setControllingPlayer(this);
    this.team.setReceivingPlayer(this);

    this.setTarget(target);

    if (
      this.isInHotPosition ||
      (Math.random() < 0.5 &&
        !this.team.isOpponentWithinRadius(this.position, PASS_THREAT_RADIUS))
    ) {
      this.setMode(PlayerModes.Seek);
    } else {
      this.setMode(PlayerModes.Pursuit);
    }

    this.setState(PlayerFieldStates.ReceiveBall);

    return this;
  }

  public isPositionInFrontOfPlayer(position: Phaser.Math.Vector2): boolean {
    return position.subtract(this.position).dot(this.facing) > 0;
  }

  public get shouldChaseBall(): boolean {
    return (
      this.isClosestPlayerToBall &&
      !this.team.receivingPlayer &&
      !this.scene.goalkeeperHasBall
    );
  }

  public get isThreatened(): boolean {
    const opponents = this.team.opponents.players;

    for (let i = 0; i < opponents.length; i++) {
      const opponent = opponents[i];

      if (
        this.isPositionInFrontOfPlayer(opponent.position) &&
        this.position.distance(opponent.position) < PLAYER_COMFORT_DISTANCE
      ) {
        return true;
      }
    }

    return false;
  }

  public get isAheadOfAttacker(): boolean {
    const goalX = this.team.goalTarget.position.x;

    return (
      Math.abs(this.position.x - goalX) <
      Math.abs(this.team.controllingPlayer.position.x - goalX)
    );
  }

  public get isReadyForNextKick(): boolean {
    return this.getData("isReadyForNextKick");
  }

  public get isBallWithinReceivingRange(): boolean {
    return this.position.distance(this.scene.ball.position) < RECEIVING_RANGE;
  }

  public get isBallWithinKickingRange(): boolean {
    return this.position.distance(this.scene.ball.position) < KICKING_RANGE;
  }

  public get isInHotPosition(): boolean {
    return (
      Math.abs(this.position.y - this.team.goalTarget.position.y) <
      this.scene.pitch.width / 3
    );
  }

  public get isControllingPlayer(): boolean {
    return this === this.team.controllingPlayer;
  }
}
