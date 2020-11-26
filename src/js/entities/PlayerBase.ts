import { Angle, Distance, Vector2 } from "phaser/src/math";
import GameScene from "../scenes/GameScene";
import Team from "./Team";
import { PlayerProps } from "../types";
import { setText } from "../utils";

enum States {
  Wait = 0,
  ReceiveBall = 1,
  KickBall = 2,
  Dribble = 3,
  ChaseBall = 4,
  ReturnToHomeRegion = 5,
  SupportAttacker = 6,
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
    name: string
  ) {
    super(scene, x, y, "sprites", frame);

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
    });
    this.setDepth(3);
  }

  public setState(value: number): this {
    const selector = `#${this.getData("name")}-${this.getData("index") + 1}`;

    switch (value) {
      case States.ChaseBall:
        setText(selector, "ChaseBall");
        break;
      case States.ReceiveBall:
        setText(selector, "ReceiveBall");
        const PASS_THREAT_RADIUS = 70;

        this.parentContainer.setControllingPlayer(this);
        this.parentContainer.setReceivingPlayer(this);

        if (
          this.isWithinShootingRange ||
          (Math.random() < 0.5 &&
            !this.parentContainer.isOpponentWithinRadius(
              new Vector2().setFromObject(this),
              PASS_THREAT_RADIUS
            ))
        ) {
          this.setData({
            arrive: true,
          });
        } else {
          this.setData({
            pursuit: true,
          });
        }
        break;
      case States.Dribble:
        setText(selector, "Dribble");
        this.parentContainer.setControllingPlayer(this);
        break;
      case States.SupportAttacker:
        setText(selector, "SupportAttacker");
        this.setData({ arrive: true });
        this.setTarget(this.parentContainer.getSupportSpot());
        break;
      case States.KickBall:
        setText(selector, "KickBall");
        this.parentContainer.setControllingPlayer(this);

        if (!this.isReadyForNextKick) {
          this.setState(States.ChaseBall);
        }
        break;
      case States.ReturnToHomeRegion:
        setText(selector, "ReturnToHomeRegion");
        break;
      case States.Wait:
        setText(selector, "Wait");
        this.setVelocity(0, 0);
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number): void {
    const POT_SHOT = 0.05;
    const MAX_SHOT_POWER = 500;
    const MAX_PASS_POWER = 350;
    const [speed, pursuit, arrive] = this.getData([
      "speed",
      "pursuit",
      "arrive",
    ]);
    const { ball } = this.scene;
    const thisPos = new Vector2().setFromObject(this);
    const goalPos = new Vector2().setFromObject(this.parentContainer.goal);
    const goalAngle = Angle.BetweenPoints(thisPos, goalPos);
    const ballPos = new Vector2().setFromObject(ball);
    const ballAngle = Angle.BetweenPoints(thisPos, ballPos);
    const ballDist = Distance.BetweenPoints(thisPos, ballPos);
    const targetAngle = Angle.BetweenPoints(thisPos, this.home);
    const MIN_PASS_DISTANCE = 10;
    const ERROR_MARGIN = Math.PI / 16;

    switch (this.state) {
      case States.KickBall:
        console.log("-----------------------");
        const dot = this.facing.dot(
          ballPos.clone().subtract(thisPos).normalize()
        );
        const power = MAX_SHOT_POWER * dot;
        const powerPass = MAX_PASS_POWER * dot;
        console.log("power", power);
        const canShoot = this.parentContainer.canShoot(ballPos, power);
        console.log("canShoot", canShoot);

        const canPass = this.parentContainer.findPass(
          this,
          power,
          MIN_PASS_DISTANCE
        );
        console.log("canPass", canPass);

        if (
          this.parentContainer.receivingPlayer ||
          this.scene.goalkeeperHasBall ||
          dot < 0
        ) {
          this.setState(States.ChaseBall);
        } else if (canShoot[0] || Math.random() < POT_SHOT) {
          console.log("Shoooooooooooot!");
          const shootPos = canShoot[1];
          const shootAngle = Angle.BetweenPoints(thisPos, shootPos);
          const randomAngle =
            shootAngle - ERROR_MARGIN / 2 + Math.random() * ERROR_MARGIN;
          ball.kick(randomAngle, power);
          this.setState(States.Wait);
          this.parentContainer.requestSupport();
        } else if (this.isThreatened && canPass[0]) {
          console.log("Pass");
          const receiver = canPass[1];
          const targetPos = canPass[2];
          const targeAngle = Phaser.Math.Angle.BetweenPoints(
            thisPos,
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
          this.parentContainer.requestSupport();
          this.setState(States.Dribble);
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
          ball.kick(goalAngle, 250);
        }

        this.setState(States.ChaseBall);
        break;
      case States.SupportAttacker:
        if (!this.parentContainer.isInControl) {
          this.parentContainer.setSupportingPlayer(null);
          this.setData({ arrive: false });
          this.setState(States.ReturnToHomeRegion);
        } else {
          // If the best supporting spot changes, change the steering target.
          const supportSpot = this.parentContainer.getSupportSpot();
          if (supportSpot !== this.target) {
            this.setData({ arrive: true });
            this.setTarget(supportSpot);
          }

          // If shot from current positon possible, request a pass.
          if (this.parentContainer.canShoot(thisPos, MAX_SHOT_POWER)) {
            this.parentContainer.requestPass(this);
          }

          // If this player is located at the support spot and his team still
          // has possession, he should remain still and turn to face the ball.
          if (this.isAtTarget) {
            this.setData({ arrive: false });
            this.setVelocity(0, 0);
            this.setRotation(ballAngle);

            if (!this.isThreatened) {
              this.parentContainer.requestPass(this);
            }
          }
        }
        break;
      case States.ReceiveBall:
        if (ballDist < 150 || !this.parentContainer.isInControl) {
          this.parentContainer.setReceivingPlayer(null);
          this.setData({
            pursuit: false,
            arrive: false,
          });
          this.setState(States.ChaseBall);
        } else {
          if (pursuit) {
            this.setTarget(new Vector2().setFromObject(this.scene.ball));
          }

          if (this.isAtTarget) {
            this.setData({
              pursuit: false,
              arrive: false,
            });
            this.setRotation(ballAngle);
            this.setVelocity(0, 0);
          }
        }
        break;
      case States.ChaseBall:
        this.setRotation(ballAngle);

        if (this.isBallWithinKickingRange) {
          this.setState(States.KickBall);
        } else if (this.isClosestPlayerToBall) {
          this.setVelocity(
            speed * Math.cos(ballAngle),
            speed * Math.sin(ballAngle)
          );
        } else {
          this.setState(States.ReturnToHomeRegion);
        }
        break;
      case States.ReturnToHomeRegion:
        this.setRotation(targetAngle);

        if (this.isAtHome) {
          this.setState(States.Wait);
        } else {
          this.setVelocity(
            speed * Math.cos(targetAngle),
            speed * Math.sin(targetAngle)
          );
        }
        break;
      case States.Wait:
        this.setRotation(ballAngle);

        if (!this.isAtHome) {
          this.setState(States.ReturnToHomeRegion);
        } else if (this.scene.gameOn) {
          if (
            this.parentContainer.isInControl &&
            !this.isControllingPlayer &&
            this.isAheadOfAttacker
          ) {
            this.parentContainer.requestPass(this);
          } else if (
            this.parentContainer.closestPlayer === this &&
            !this.parentContainer.receivingPlayer &&
            !this.scene.goalkeeperHasBall
          ) {
            this.setState(States.ChaseBall);
          }
        }
        break;
    }

    super.preUpdate(time, delta);
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

  public get isAtHome(): boolean {
    return new Vector2().setFromObject(this).fuzzyEquals(this.home, 10);
  }

  public get isAtTarget(): boolean {
    return new Vector2().setFromObject(this).fuzzyEquals(this.target, 10);
  }

  public support(): void {
    this.setState(States.SupportAttacker);
  }

  public receivePass(passer: PlayerBase, target: Vector2): void {
    this.setTarget(target);
    this.setState(States.ReceiveBall);
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

  public get ballWithinPlayerRange(): boolean {
    return false;
  }

  public get ballWithinSupportSpotRange(): boolean {
    return false;
  }

  public get ballWithinTargetRange(): boolean {
    return false;
  }

  public get ballWithinReceivingRange(): boolean {
    return false;
  }

  public get isReadyForNextKick(): boolean {
    return true;
  }

  public get isClosestPlayerToBall(): boolean {
    return this === this.parentContainer.closestPlayer;
  }

  public get isControllingPlayer(): boolean {
    return this === this.parentContainer.controllingPlayer;
  }

  public get isBallWithinKickingRange(): boolean {
    return (
      new Vector2()
        .setFromObject(this)
        .distance(new Vector2().setFromObject(this.scene.ball)) < 5
    );
  }

  public get isWithinShootingRange(): boolean {
    return (
      Distance.BetweenPoints(
        new Vector2().setFromObject(this),
        new Vector2().setFromObject(this.parentContainer.goal)
      ) < 300
    );
  }

  public get isThreatened(): boolean {
    return this.parentContainer.isOpponentWithinRadius(
      new Vector2().setFromObject(this),
      150
    );
  }

  public get facing(): Vector2 {
    return new Vector2(1, 0).setAngle(this.rotation);
  }
}
