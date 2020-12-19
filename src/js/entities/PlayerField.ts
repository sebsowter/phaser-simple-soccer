import GameScene from "../scenes/GameScene";
import Team from "./Team";
import { PlayerProps } from "../types";
import { setText } from "../utils";
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
import Info from "./Info";
import PlayerBase, { Modes } from "./PlayerBase";

enum States {
  Wait,
  ReceiveBall,
  KickBall,
  Dribble,
  ChaseBall,
  ReturnToHome,
  SupportAttacker,
}

export default class PlayerField extends PlayerBase {
  public scene: GameScene;
  public body: Phaser.Physics.Arcade.Body;
  public team: Team;
  public info: Info;
  public home: Phaser.Math.Vector2;
  public target: Phaser.Math.Vector2;

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
      case States.ReceiveBall:
        this.team.receivingPlayer = null;
        break;
      case States.SupportAttacker:
        this.team.supportingPlayer = null;
        break;
    }

    switch (value) {
      case States.ChaseBall:
        setText(selector, "ChaseBall");
        this.setMode(Modes.Pursuit);
        break;
      case States.ReceiveBall:
        setText(selector, "ReceiveBall");
        break;
      case States.Dribble:
        setText(selector, "Dribble");
        this.team.setControllingPlayer(this);
        break;
      case States.SupportAttacker:
        setText(selector, "SupportAttacker");
        this.setTarget(this.team.getSupportSpot());
        break;
      case States.KickBall:
        setText(selector, "KickBall");
        this.team.setControllingPlayer(this);
        this.setVelocity(0, 0);
        if (!this.isReadyForNextKick) {
          this.setState(States.ChaseBall);
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
      case States.ReturnToHome:
        setText(selector, "ReturnToHome");
        this.setTarget(this.home);
        this.setMode(Modes.Seek);
        break;
      case States.Wait:
        setText(selector, "Wait");
        this.setVelocity(0, 0);
        if (!this.scene.gameOn) {
          this.setTarget(this.home);
        }
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number): void {
    this.movePlayer(delta);

    switch (this.state) {
      case States.KickBall:
        const dot = this.facing.dot(
          this.scene.ball.position.clone().subtract(this.position).normalize()
        );

        if (
          this.team.receivingPlayer ||
          this.scene.goalkeeperHasBall ||
          dot < 0
        ) {
          this.setState(States.ChaseBall);
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
            this.setState(States.Wait);
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
              this.setState(States.Wait);
              this.team.requestSupport();
            } else {
              this.setState(States.Dribble);
              this.team.requestSupport();
            }
          }
        }
        break;
      case States.Dribble:
        const { facing } = this.team.goal;
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
              this.team.goal.position
            ),
            DRIBBLE_POWER_GOAL
          );
        }

        this.setState(States.ChaseBall);
        break;
      case States.SupportAttacker:
        if (!this.team.isInControl) {
          this.setState(States.ReturnToHome);
        } else {
          // If the best supporting spot changes, change the steering target.
          const supportSpot = this.team.getSupportSpot();

          if (supportSpot !== this.target) {
            this.setMode(Modes.Seek);
            this.setTarget(supportSpot);
          }

          // If shot from current positon possible, request a pass.
          if (this.team.canShoot(this.position, MAX_SHOT_POWER)[0]) {
            this.team.requestPass(this);
          }

          if (this.isAtTarget) {
            this.setMode(Modes.Track);

            if (!this.isThreatened) {
              this.team.requestPass(this);
            }
          }
        }
        break;
      case States.ReceiveBall:
        if (this.isBallWithinReceivingRange || !this.team.isInControl) {
          this.team.setReceivingPlayer(null);
          this.setState(States.ChaseBall);
        } else if (this.isAtTarget) {
          this.setMode(Modes.Track);
        } else {
          this.setMode(Modes.Seek);
        }
        break;
      case States.ChaseBall:
        if (this.isBallWithinKickingRange) {
          this.setState(States.KickBall);
        } else if (!this.isClosestPlayerToBall) {
          this.setState(States.ReturnToHome);
        }
        break;
      case States.ReturnToHome:
        if (this.scene.gameOn) {
          if (this.shouldChaseBall) {
            this.setState(States.ChaseBall);
          } else if (this.isCloseToTarget(50)) {
            this.setTarget(this.position);
            this.setState(States.Wait);
          }
        } else if (this.isAtTarget) {
          this.setState(States.Wait);
        }
        break;
      case States.Wait:
        if (!this.isAtTarget) {
          this.setMode(Modes.Seek);
        } else {
          this.setMode(Modes.Track);

          if (this.scene.gameOn) {
            if (
              this.team.isInControl &&
              !this.isControllingPlayer &&
              this.isAheadOfAttacker
            ) {
              this.team.requestPass(this);
            } else if (this.shouldChaseBall) {
              this.setState(States.ChaseBall);
            }
          }
        }
        break;
    }

    super.preUpdate(time, delta);
  }

  public returnHomeIfWaiting(target: Phaser.Math.Vector2): this {
    if (this.state === States.Wait || this.state === States.ReturnToHome) {
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
    this.setState(States.Wait);
    receiver.receivePass(receiver.position);
    this.team.requestSupport();

    return this;
  }

  public returnHome(): this {
    this.setState(States.ReturnToHome);

    return this;
  }

  public support(): this {
    this.setState(States.SupportAttacker);

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
      this.setMode(Modes.Seek);
    } else {
      this.setMode(Modes.Pursuit);
    }

    this.setState(States.ReceiveBall);

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
    return (
      Math.abs(this.position.x - this.team.goal.position.x) <
      Math.abs(
        this.team.controllingPlayer.position.x - this.team.goal.position.x
      )
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
      Math.abs(this.position.y - this.team.goal.position.y) <
      this.scene.pitch.width / 3
    );
  }

  public get isControllingPlayer(): boolean {
    return this === this.team.controllingPlayer;
  }
}
