import { Angle, Distance, Vector2 } from "phaser/src/math";
import GameScene from "../GameScene";
import Team from "./Team";
import { PlayerProps } from "../types";

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
  private _home: Vector2;
  private _target: Vector2;

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
    switch (value) {
      case States.ChaseBall:
        document.querySelector(
          `#${this.getData("name")}-${this.getData("index") + 1}`
        ).innerHTML = "ChaseBall";
        break;
      case States.ReceiveBall:
        document.querySelector(
          `#${this.getData("name")}-${this.getData("index") + 1}`
        ).innerHTML = "ReceiveBall";
        const PASS_THREAT_RADIUS = 70;

        this.parentContainer.setControllingPlayer(this);
        this.parentContainer.setReceivingPlayer(this);

        if (
          this.inHotRegion ||
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
        document.querySelector(
          `#${this.getData("name")}-${this.getData("index") + 1}`
        ).innerHTML = "Dribble";
        this.parentContainer.setControllingPlayer(this);
        break;
      case States.SupportAttacker:
        document.querySelector(
          `#${this.getData("name")}-${this.getData("index") + 1}`
        ).innerHTML = "SupportAttacker";
        this.setData({ arrive: true });
        this.setTarget(this.parentContainer.getSupportSpot());
        break;
      case States.KickBall:
        document.querySelector(
          `#${this.getData("name")}-${this.getData("index") + 1}`
        ).innerHTML = "KickBall";
        this.parentContainer.setControllingPlayer(this);

        if (!this.isReadyForNextKick) {
          this.setState(States.ChaseBall);
        }
        break;
      case States.ReturnToHomeRegion:
        document.querySelector(
          `#${this.getData("name")}-${this.getData("index") + 1}`
        ).innerHTML = "ReturnToHomeRegion";
        break;
      case States.Wait:
        document.querySelector(
          `#${this.getData("name")}-${this.getData("index") + 1}`
        ).innerHTML = "Wait";
        this.setVelocity(0, 0);
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number): void {
    const POT_SHOT = 0.5;
    const MAX_POWER = 0.5;
    const [speed, pursuit, arrive] = this.getData([
      "speed",
      "pursuit",
      "arrive",
    ]);
    const { ball, goalkeeperHasBall } = this.scene;
    const thisPos = new Vector2().setFromObject(this);
    const goalPos = new Vector2().setFromObject(this.parentContainer.goal);
    const goalAngle = Angle.BetweenPoints(thisPos, goalPos);
    const ballPos = new Vector2().setFromObject(ball);
    const ballAngle = Angle.BetweenPoints(thisPos, ballPos);
    const ballDist = Distance.BetweenPoints(thisPos, ballPos);
    const targetAngle = Angle.BetweenPoints(thisPos, this.home);
    const MIN_PASS_DISTANCE = 10;
    let dot;

    switch (this.state) {
      case States.KickBall:
        const power = 400;
        const ERROR_MARGIN = Math.PI / 16;
        const toBall = ballPos.subtract(thisPos).normalize();
        dot = thisPos.clone().dot(toBall);

        if (
          this.parentContainer.receivingPlayer ||
          goalkeeperHasBall //||
          // dot < 0 / ball behind player
        ) {
          this.setState(States.ChaseBall);
        } else if (
          this.parentContainer.canShoot(ballPos, power)
          //|| Math.random() < POT_SHOT
        ) {
          //const power = MAX_POWER * dot;
          //console.log("dot", dot);

          console.log("Shoooooooooooot!");
          const randomAngle =
            goalAngle - ERROR_MARGIN / 2 + Math.random() * ERROR_MARGIN;

          ball.kick(randomAngle, power);
          this.setState(States.Wait);
          this.parentContainer.requestSupport();
        } else if (
          this.isThreatened &&
          this.parentContainer.findPass(
            this,
            this.parentContainer.receivingPlayer,
            ballPos,
            power,
            MIN_PASS_DISTANCE
          )
        ) {
          console.log("Pass");
          const passAngle =
            ballAngle - ERROR_MARGIN / 2 + Math.random() * ERROR_MARGIN;

          ball.kick(passAngle, power);
          this.parentContainer.sendPass(
            this,
            this.parentContainer.receivingPlayer,
            ballPos
          );
          this.parentContainer.requestSupport();
          this.setState(States.Wait);
        } else {
          //console.log("Dribble");
          this.parentContainer.requestSupport();
          this.setState(States.Dribble);
        }

        break;
      case States.Dribble:
        const { facing } = this.parentContainer.goal;
        const goalDot = facing.dot(this.heading);

        // If back to goal kick ball at angle.
        if (goalDot > 0) {
          const direction = Math.sign(
            this.heading.y * facing.x - this.heading.x * facing.y
          );

          ball.kick(this.rotation + direction * (Math.PI / 5), 150);
        }

        // Otherwise kick ball towards the goal.
        else {
          ball.kick(goalAngle, 200);
        }

        this.setState(States.ChaseBall);
        break;
      case States.SupportAttacker:
        if (!this.parentContainer.isInControl) {
          this.setState(States.ReturnToHomeRegion);
        } else {
          // If the best supporting spot changes, change the steering target.
          const supportSpot = this.parentContainer.getSupportSpot();
          if (supportSpot !== this.target) {
            this.setData({ arrive: true });
            this.setTarget(supportSpot);
          }

          // If shot from current positon possible, request a pass.
          if (this.parentContainer.canShoot(thisPos, MAX_POWER)) {
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

        if (Distance.BetweenPoints(thisPos, ballPos) < 5) {
          this.setState(States.KickBall);
        } else if (this.parentContainer.closestPlayer === this) {
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

  private set target(value) {
    this._target = value;
  }

  private get target(): Vector2 {
    return this._target;
  }

  public setHome(value: Vector2): void {
    this.home = value;
  }

  private set home(value) {
    this._home = value;
  }

  private get home(): Vector2 {
    return this._home;
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

  public get ballWithinKickingRange(): boolean {
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

  public get isClosestPlayerOnPitchToBall(): boolean {
    return false;
  }

  public get isReadyForNextKick(): boolean {
    return true;
  }

  public get isThreatened(): boolean {
    return this.parentContainer.isOpponentWithinRadius(
      new Vector2().setFromObject(this),
      70
    );
  }

  public get isControllingPlayer(): boolean {
    return this === this.parentContainer.controllingPlayer;
  }

  public get inHotRegion(): boolean {
    return (
      Distance.BetweenPoints(
        new Vector2().setFromObject(this),
        new Vector2().setFromObject(this.parentContainer.goal)
      ) < 300
    );
  }

  public get heading(): Vector2 {
    return new Vector2(1, 0).setAngle(this.rotation);
  }

  /*
  public calculateSupportSpot(): void {
    const spots: Spot[] = [];

    let spotBest: Spot = null;
    let spotBestScore: number = 0;

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        spots.push(new Spot(x * 8, y * 8));
      }
    }

    spots.forEach((spot: Spot) => {
      spot.score = 0;

      let canPass = false;

      if (canPass) {
        // this.controllingPlayer;

        spot.score += spot.canPassScore;
      }

      let canShoot = false;

      if (canShoot) {
        spot.score += spot.canShootScore;
      }
      //

      if (true) {
        const OPTIMAL_DISTANCE = 200;
        const distance = distanceBetween(spot, this.controllingPlayer);
        const normal = Math.abs(OPTIMAL_DISTANCE - distance);

        if (normal < OPTIMAL_DISTANCE) {
          // Normalize the distance and add it to the score
          spot.score +=
            (spot.distanceScore * (OPTIMAL_DISTANCE - normal)) /
            OPTIMAL_DISTANCE;
        }
      }

      if (spot.score > spotBestScore) {
        spotBest = spot;
        spotBestScore = spot.score;
      }
    });
  }
  */
}
