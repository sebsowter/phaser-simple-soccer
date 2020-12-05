import { Angle, Vector2 } from "phaser/src/math";
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
  TIME_DELTA_MILI,
} from "../constants";
import Info from "./Info";

enum States {
  Wait,
  ReceiveBall,
  KickBall,
  Dribble,
  ChaseBall,
  ReturnToHome,
  SupportAttacker,
}

enum Modes {
  Track,
  Seek,
  Pursuit,
}

export default class PlayerBase extends Phaser.Physics.Arcade.Sprite {
  public scene: GameScene;
  public body: Phaser.Physics.Arcade.Body;
  public team: Team;
  public info: Info;
  public home: Vector2;
  public target: Vector2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    props: PlayerProps,
    index: number,
    name: string,
    home: Vector2,
    team: Team
  ) {
    super(scene, x, y, "sprites", frame);

    this.home = home;
    this.team = team;
    this.state = States.Wait;

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setData(props);
    this.setData({
      name,
      index,
      pursuit: false,
      arrive: false,
      seek: false,
      separation: false,
      isReadyForNextKick: true,
      mode: Modes.Track,
    });
    this.setSize(16, 16);
    this.setCircle(8);
    this.setState(States.Wait);
    this.setDepth(3);

    this.info = new Info(this.scene, index, team.isLeft);

    this.scene.events.on(
      "postupdate",
      function () {
        this.info.x = this.x;
        this.info.y = this.y;
      },
      this
    );
  }

  public setState(value: States): this {
    const selector = `#${this.getData("name")}-${this.getData("index") + 1}`;

    this.exitState();

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
          //console.log("this.home", this.home);
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
            // console.log("Shoooooooooooot!");
            this.scene.ball.kick(
              Angle.BetweenPoints(this.position, canShoot[1]),
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

              //this.scene.spot3.x = targetPos.x;
              //this.scene.spot3.x = targetPos.y;

              this.scene.ball.kick(targeAngle, powerPass);
              receiver.receivePass(targetPos);
              this.setState(States.Wait);
              this.team.requestSupport();
            } else {
              this.team.requestSupport();
              this.setState(States.Dribble);
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
            Angle.BetweenPoints(this.position, this.team.goal.position),
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

          // If this player is located at the support spot and his team still
          // has possession, he should remain still and turn to face the ball.
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
        console.log("States.ReturnToHome");
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

  public exitState(): void {
    switch (this.state) {
      case States.ReceiveBall:
        this.team.receivingPlayer = null;
        break;
      case States.SupportAttacker:
        this.team.supportingPlayer = null;
        break;
    }
  }

  public movePlayer(delta: number): void {
    const [speed, mode] = this.getData(["speed", "mode"]);

    switch (mode) {
      case Modes.Pursuit:
        const ballSpeed = this.scene.ball.body.speed;
        const magnitude = this.scene.ball.position
          .clone()
          .subtract(this.position)
          .length();

        let lookAheadTime = 0;

        if (ballSpeed !== 0) {
          lookAheadTime = magnitude / ballSpeed;
        }

        this.setTarget(this.scene.ball.futurePosition(lookAheadTime));
      case Modes.Seek:
        const targetAngle = Angle.BetweenPoints(this.position, this.target);

        this.setRotation(targetAngle);
        this.setVelocity(
          speed * delta * Math.cos(targetAngle),
          speed * delta * Math.sin(targetAngle)
        );
        break;
      case Modes.Track:
        this.setVelocity(0, 0);
        this.setRotation(
          Angle.BetweenPoints(this.position, this.scene.ball.position)
        );
        break;
    }
  }

  public setMode(value: Modes): void {
    this.setData({ mode: value });
  }

  public returnHome(): void {
    this.setState(States.ReturnToHome);
  }

  public returnHomeIfWaiting(target: Vector2): void {
    if (this.state === States.Wait || this.state === States.ReturnToHome) {
      this.setTarget(target);
    }
  }

  public passToRequester(receiver: PlayerBase): void {
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
  }

  public setTarget(value: Vector2): void {
    this.target = value;
  }

  public setHome(value: Vector2): void {
    this.home = value;
  }

  public support(): void {
    console.log("Support");
    this.setState(States.SupportAttacker);
  }

  public receivePass(target: Vector2): void {
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
  }

  public isPositionInFrontOfPlayer(position: Phaser.Math.Vector2): boolean {
    return position.subtract(this.position).dot(this.facing) > 0;
  }

  public isCloseToHome(epsilon: number = 10): boolean {
    return this.position.fuzzyEquals(this.home, epsilon);
  }

  public isCloseToTarget(epsilon: number = 10): boolean {
    return this.position.fuzzyEquals(this.target, epsilon);
  }

  public get shouldChaseBall(): boolean {
    return (
      this.isClosestPlayerToBall &&
      !this.team.receivingPlayer &&
      !this.scene.goalkeeperHasBall
    );
  }

  public get isAtHome(): boolean {
    return this.isCloseToHome();
  }

  public get isAtTarget(): boolean {
    return this.isCloseToTarget();
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

  // Is this player closer to the opposing goal than he controlling player
  public get isAheadOfAttacker(): boolean {
    return (
      Math.abs(this.position.x - this.team.goal.position.x) <
      Math.abs(
        this.team.controllingPlayer.position.x - this.team.goal.position.x
      )
    );
  }

  // Is this player the closest player to the ball.
  public get isClosestPlayerToBall(): boolean {
    return this === this.team.closestPlayer;
  }

  // Is this player the controlling player.
  public get isControllingPlayer(): boolean {
    return this === this.team.controllingPlayer;
  }

  public get speedPerSecond(): number {
    return this.getData("speed") * TIME_DELTA_MILI;
  }

  public get speedPerFrame(): number {
    return this.getData("speed");
  }

  // Is this player ready for another kick.
  public get isReadyForNextKick(): boolean {
    return this.getData("isReadyForNextKick");
  }

  public get role(): string {
    return this.getData("role");
  }

  public get isBallWithinPlayerRange(): boolean {
    return false;
  }

  public get isBallWithinSupportSpotRange(): boolean {
    return false;
  }

  public get isBallWithinTargetRange(): boolean {
    return false;
  }

  // The position of the player.
  public get isBallWithinReceivingRange(): boolean {
    return this.position.distance(this.scene.ball.position) < RECEIVING_RANGE;
  }

  // The position of the player.
  public get isBallWithinKickingRange(): boolean {
    return this.position.distance(this.scene.ball.position) < KICKING_RANGE;
  }

  // Is the player in the attacking third of the pich.
  public get isInHotPosition(): boolean {
    return (
      Math.abs(this.position.y - this.team.goal.position.y) < (192 * 6) / 3
    );
  }

  // The position of the player.
  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2().setFromObject(this);
  }

  // The direction the player is facing, as a vector.
  public get facing(): Vector2 {
    return new Vector2(1, 0).setAngle(this.rotation);
  }
}
