import { Angle, Distance, Vector2 } from "phaser/src/math";
import GameScene from "../scenes/GameScene";
import Team from "./Team";
import { PlayerProps } from "../types";
import { setText } from "../utils";
import {
  MAX_SHOT_POWER,
  MAX_PASS_POWER,
  POT_SHOT_CHANCE,
  PASS_THREAT_RADIUS,
} from "../constants";

enum States {
  Wait = 0,
  ReceiveBall = 1,
  KickBall = 2,
  Dribble = 3,
  ChaseBall = 4,
  ReturnToHomeRegion = 5,
  SupportAttacker = 6,
}

enum Modes {
  Track = 0,
  Seek = 1,
  Pursuit = 2,
}

export default class PlayerBase extends Phaser.Physics.Arcade.Sprite {
  public scene: GameScene;
  public body: Phaser.Physics.Arcade.Body;
  public parentContainer: Team;

  private home: Vector2;
  private target: Vector2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    props: PlayerProps,
    index: number,
    name: string,
    region: Vector2
  ) {
    super(scene, x, y, "sprites", frame);

    this.state = States.Wait;

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.home = region;

    this.setData(props);
    this.setData({
      name,
      index,
      pursuit: false,
      arrive: false,
      seek: false,
      separation: false,
      mode: Modes.Track,
    });
    this.setCircle(16);
    this.setState(States.Wait);
    this.setDepth(3);
  }

  public setState(value: number): this {
    const selector = `#${this.getData("name")}-${this.getData("index") + 1}`;

    switch (value) {
      case States.ChaseBall:
        setText(selector, "ChaseBall");
        this.setMode(Modes.Pursuit);
        break;
      case States.ReceiveBall:
        setText(selector, "ReceiveBall");
        this.parentContainer.setReceivingPlayer(this);
        this.parentContainer.setControllingPlayer(this);

        if (
          this.isInHotPosition ||
          (Math.random() < 0.5 &&
            !this.parentContainer.isOpponentWithinRadius(
              new Vector2().setFromObject(this),
              PASS_THREAT_RADIUS
            ))
        ) {
          this.setMode(Modes.Seek);
        } else {
          this.setMode(Modes.Pursuit);
        }
        break;
      case States.Dribble:
        setText(selector, "Dribble");
        this.parentContainer.setControllingPlayer(this);
        break;
      case States.SupportAttacker:
        setText(selector, "SupportAttacker");
        this.setTarget(this.parentContainer.getSupportSpot());
        break;
      case States.KickBall:
        setText(selector, "KickBall");
        this.setVelocity(0, 0);
        this.parentContainer.setControllingPlayer(this);

        if (!this.isReadyForNextKick) {
          this.setState(States.ChaseBall);
        }
        break;
      case States.ReturnToHomeRegion:
        setText(selector, "ReturnToHomeRegion");
        this.setTarget(this.home);
        this.setMode(Modes.Seek);
        break;
      case States.Wait:
        setText(selector, "Wait");
        this.setVelocity(0, 0);

        if (!this.scene.gameOn) {
          console.log("this.home", this.home);
          this.setTarget(this.home);
        }
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number): void {
    const [speed] = this.getData(["speed"]);
    const { ball } = this.scene;
    const MIN_PASS_DISTANCE = 10;
    const ERROR_MARGIN = Math.PI / 16;

    this.movePlayer();

    switch (this.state) {
      case States.KickBall:
        console.log("-----------------------");
        const dot = this.facing.dot(
          ball.position.clone().subtract(this.position).normalize()
        );
        const power = MAX_SHOT_POWER * dot;
        const powerPass = MAX_PASS_POWER * dot;
        console.log("power", power);
        const canShoot = this.parentContainer.canShoot(ball.position, power);
        console.log("canShoot", canShoot);

        const canPass = this.parentContainer.findPass(
          this,
          power,
          MIN_PASS_DISTANCE
        );
        console.log("canPass", canPass);
        this.parentContainer.setControllingPlayer(this);

        if (
          this.parentContainer.receivingPlayer ||
          this.scene.goalkeeperHasBall ||
          dot < 0
        ) {
          this.setState(States.ChaseBall);
        } else if (canShoot[0] || Math.random() < POT_SHOT_CHANCE) {
          console.log("Shoooooooooooot!");
          const shootPos = canShoot[1];
          const shootAngle = Angle.BetweenPoints(this.position, shootPos);
          const randomAngle =
            shootAngle - ERROR_MARGIN / 2 + Math.random() * ERROR_MARGIN;
          ball.kick(randomAngle, power);
          this.parentContainer.requestSupport();
          this.setState(States.Wait);
        } else if (this.isThreatened && canPass[0]) {
          console.log("Pass");
          const receiver = canPass[1];
          const targetPos = canPass[2];
          const targeAngle = Phaser.Math.Angle.BetweenPoints(
            this.position,
            targetPos
          );

          //const passAngle =
          //ballAngle - ERROR_MARGIN / 2 + Math.random() * ERROR_MARGIN;

          ball.kick(targeAngle, powerPass);
          receiver.receivePass(this, targetPos);
          this.parentContainer.requestSupport();
          this.setState(States.Wait);
        } else {
          console.log("Dribble");
          this.setState(States.Dribble);
          this.parentContainer.requestSupport();
        }
        break;
      case States.Dribble:
        const { facing } = this.parentContainer.goal;
        const goalDot = facing.dot(this.facing);

        // If back to goal kick ball at an angle to turn.
        if (goalDot > 0) {
          const direction = Math.sign(
            this.facing.y * facing.x - this.facing.x * facing.y
          );

          ball.kick(this.rotation + direction * (Math.PI / 5), 150);
        }

        // Otherwise kick ball towards the goal.
        else {
          ball.kick(
            Angle.BetweenPoints(
              this.position,
              this.parentContainer.goal.position
            ),
            250
          );
        }

        this.setState(States.ChaseBall);
        break;
      case States.SupportAttacker:
        if (!this.parentContainer.isInControl) {
          this.parentContainer.setSupportingPlayer(null);
          this.setState(States.ReturnToHomeRegion);
        } else {
          // If the best supporting spot changes, change the steering target.
          const supportSpot = this.parentContainer.getSupportSpot();

          if (supportSpot !== this.target) {
            this.setMode(Modes.Seek);
            this.setTarget(supportSpot);
          }

          // If shot from current positon possible, request a pass.
          if (this.parentContainer.canShoot(this.position, MAX_SHOT_POWER)) {
            this.parentContainer.requestPass(this);
          }

          // If this player is located at the support spot and his team still
          // has possession, he should remain still and turn to face the ball.
          if (this.isAtTarget) {
            this.setMode(Modes.Track);

            if (!this.isThreatened) {
              this.parentContainer.requestPass(this);
            }
          }
        }
        break;
      case States.ReceiveBall:
        if (
          this.isBallWithinReceivingRange ||
          !this.parentContainer.isInControl
        ) {
          this.parentContainer.setReceivingPlayer(null);
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
          this.setState(States.ReturnToHomeRegion);
        }
        break;
      case States.ReturnToHomeRegion:
        if (this.scene.gameOn) {
          if (this.shouldChaseBall) {
            this.setState(States.ChaseBall);
          } else if (this.isCloseToTarget(100)) {
            this.setTarget(this.position);
            this.setState(States.Wait);
          }
        } else if (this.isAtTarget) {
          this.setState(States.Wait);
        }
        break;
      case States.Wait:
        // If not at target move towards it.
        if (!this.isAtTarget) {
          this.setMode(Modes.Seek);
        }

        // Otherwise stop and look at the ball.
        else {
          this.setMode(Modes.Track);

          if (this.scene.gameOn) {
            if (!this.parentContainer.isInControl) {
              //console.log(
              //  `${this.getData("index")} - shouldRequestPass ${
              //    this.shouldChaseBall
              //  }`
              //);
            }
            // If team is attacking and there is no controlling player request a pass?
            if (this.shouldRequestPass) {
              this.parentContainer.requestPass(this);
            }

            // Otherwise, if closest player to ball chase it.
            else if (this.shouldChaseBall) {
              this.setState(States.ChaseBall);
            }
          }
        }
        break;
    }

    super.preUpdate(time, delta);
  }

  public movePlayer(): void {
    const [speed, mode] = this.getData(["speed", "mode"]);

    let targetAngle = Angle.BetweenPoints(this.position, this.target);

    switch (mode) {
      case Modes.Pursuit:
        this.setTarget(this.scene.ball.position);
        targetAngle = Angle.BetweenPoints(this.position, this.target);
        this.setRotation(targetAngle);
        this.setVelocity(
          speed * Math.cos(targetAngle),
          speed * Math.sin(targetAngle)
        );
        break;
      case Modes.Seek:
        this.setRotation(targetAngle);
        this.setVelocity(
          speed * Math.cos(targetAngle),
          speed * Math.sin(targetAngle)
        );
        break;
      case Modes.Track:
        targetAngle = Angle.BetweenPoints(
          this.position,
          this.scene.ball.position
        );

        this.setRotation(targetAngle);
        this.setVelocity(0, 0);
        break;
    }
  }

  public setMode(value: number): void {
    this.setData({ mode: value });
  }

  public returnHome(): void {
    this.setState(States.ReturnToHomeRegion);
  }

  public setTarget(value: Vector2): void {
    this.target = value;
  }

  public setHome(value: Vector2): void {
    this.home = value;
  }

  public support(): void {
    this.setState(States.SupportAttacker);
  }

  public receivePass(passer: PlayerBase, target: Vector2): void {
    this.parentContainer.setReceivingPlayer(this);
    this.setTarget(target);
    this.setState(States.ReceiveBall);
  }

  public isCloseToHome(tolerence: number = 10): boolean {
    return new Vector2().setFromObject(this).fuzzyEquals(this.home, tolerence);
  }

  public isCloseToTarget(tolerence: number = 10): boolean {
    return new Vector2()
      .setFromObject(this)
      .fuzzyEquals(this.target, tolerence);
  }

  public get isAtHome(): boolean {
    return this.isCloseToHome();
  }

  public get isAtTarget(): boolean {
    return this.isCloseToTarget();
  }

  public get isAheadOfAttacker(): boolean {
    return false;
  }

  public get canPassForward(): boolean {
    return false;
  }

  public get canPassBackward(): boolean {
    return false;
  }

  public get isClosestPlayerToBall(): boolean {
    return this === this.parentContainer.closestPlayer;
  }

  public get isControllingPlayer(): boolean {
    return this === this.parentContainer.controllingPlayer;
  }

  public get isReadyForNextKick(): boolean {
    return true;
  }

  public get ballWithinPlayerRange(): boolean {
    return false;
  }

  public get ballWithinSupportSpotRange(): boolean {
    return false;
  }

  public get ballWithinTargetRange(): boolean {
    return false;
  }

  public get isBallWithinReceivingRange(): boolean {
    return this.position.distance(this.scene.ball.position) < 100;
  }

  public get isBallWithinKickingRange(): boolean {
    return this.position.distance(this.scene.ball.position) < 10;
  }

  public get isInHotPosition(): boolean {
    return this.position.distance(this.parentContainer.goal.position) < 200;
  }

  public get isThreatened(): boolean {
    return this.parentContainer.isOpponentWithinRadius(this.position, 100);
  }

  public get shouldChaseBall(): boolean {
    return (
      this.isClosestPlayerToBall &&
      !this.parentContainer.receivingPlayer &&
      !this.scene.goalkeeperHasBall
    );
  }

  public get shouldRequestPass(): boolean {
    return (
      this.parentContainer.isInControl &&
      !this.isControllingPlayer &&
      this.isAheadOfAttacker
    );
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2().setFromObject(this);
  }

  public get facing(): Vector2 {
    return new Vector2(1, 0).setAngle(this.rotation);
  }
}
