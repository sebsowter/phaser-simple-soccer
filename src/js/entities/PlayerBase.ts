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
    this.setData({ name, index });
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
          (Math.random() < 0.1 &&
            this.parentContainer.isOpponentWithinRadius(
              this,
              PASS_THREAT_RADIUS
            ))
        ) {
          this.setData({
            arriveOn: true,
          });
        } else {
          this.setData({
            persuitOn: true,
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
        //console.log(color + " ChaseBall");
        //       player->Steering()->ArriveOn();
        //player->Steering()->SetTarget(player->Team()->GetSupportSpot());
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
    const [speed, persuitOn, arriveOn] = this.getData([
      "speed",
      "persuitOn",
      "arriveOn",
    ]);
    const { ball, goalkeeeperHasBall } = this.scene;
    const thisPos = new Vector2().setFromObject(this);
    const goalPos = new Vector2().setFromObject(this.parentContainer.goal);
    const goalAngle = Angle.BetweenPoints(thisPos, goalPos);
    const ballPos = new Vector2().setFromObject(ball);
    const ballAngle = Angle.BetweenPoints(thisPos, ballPos);
    const ballDist = Distance.BetweenPoints(thisPos, ballPos);
    const targetAngle = Angle.BetweenPoints(thisPos, this.home);
    const MIN_PASS_DISTANCE = 10;

    switch (this.state) {
      case States.KickBall:
        const toBall = ballPos.subtract(thisPos).normalize();
        const dot = thisPos.dot(toBall);

        if (
          this.parentContainer.receivingPlayer ||
          goalkeeeperHasBall //||
          // dot < 0
        ) {
          this.setState(States.ChaseBall);
          return;
        }

        //const power = MAX_POWER * dot;
        const power = 400;
        //console.log("dot", dot);

        if (
          this.parentContainer.canShoot(ballPos, power, goalPos)
          //|| Math.random() < POT_SHOT
        ) {
          //BallTarget = AddNoiseToKick(player->Ball()->Pos(), BallTarget);
          //console.log("Shoooooooooooot!");
          ball.kick(goalAngle, power);

          this.setState(States.Wait);

          this.parentContainer.requestSupport();
        } else if (
          this.isThreatened &&
          this.parentContainer.canPass(
            this,
            this.parentContainer.receivingPlayer,
            ballPos,
            power,
            MIN_PASS_DISTANCE
          )
        ) {
          console.log("Pass");

          //console.log("Pass");
          // add some noise to the kick
          // ballTarget = AddNoiseToKick(player->Ball()->Pos(), BallTarget);
          // Vector2D KickDirection = BallTarget - player->Ball()->Pos();
          // player->Ball()->Kick(KickDirection, power);
          ball.kick(ballAngle, power);
          // let the receiver know a pass is coming
          // Dispatch->DispatchMsg(SEND_MSG_IMMEDIATELY,
          // player->ID(),
          // receiver->ID(),
          // Msg_ReceiveBall,
          // NO_SCOPE,
          // &BallTarget);//the player should wait at his current position unless instructed
          // otherwise
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
        //    double dot = player->Team()->HomeGoal()->Facing().Dot(player->Heading());

        //if the ball is between the player and the home goal, it needs to swivel
        //the ball around by doing multiple small kicks and turns until the player
        //is facing in the correct direction
        if (dot < 0) {
          //the player's heading is going to be rotated by a small amount (Pi/4)
          //and then the ball will be kicked in that direction

          //Vector2D direction = player->Heading();

          //calculate the sign (+/–) of the angle between the player heading and the
          //facing direction of the goal so that the player rotates around in the
          //correct direction

          //double angle = QuarterPi * -1 *
          //player->Team()->HomeGoal()->Facing().Sign(player->Heading());
          //Vec2DRotateAroundOrigin(direction, angle);

          //this value works well when the player is attempting to control the
          //ball and turn at the same time
          const KickingForce = 0.8;
          //ball.kick(this.rotation, KickingForce);
        } //kick the ball down the field
        else {
          const MaxDribbleForce = 0.2;

          //ball.kick(goalAngle, MaxDribbleForce);
        }
        //the player has kicked the ball so he must now change state to follow it
        this.setState(States.ChaseBall);
        break;
      case States.ReceiveBall:
        if (ballDist < 20 || this.parentContainer.isInControl) {
          this.setState(States.ChaseBall);
        }

        if (persuitOn) {
          this.home.x = this.scene.ball.x;
          this.home.y = this.scene.ball.y;
        }

        if (this.isHome) {
          this.setData({
            persuitOn: false,
            arriveOn: false,
          });
          //player->TrackBall();
          this.setVelocity(0, 0);
        }
        break;
      case States.SupportAttacker:
        if (this.parentContainer.isInControl) {
          this.setState(States.ReturnToHomeRegion);
          return;
        }

        //if the best supporting spot changes, change the steering target
        if (
          //player->Team()->GetSupportSpot() != this.home)
          true
        ) {
          //player->Steering()->SetTarget(player->Team()->GetSupportSpot());
          //player->Steering()->ArriveOn();
          this.setData("arriveOn", true);
        }

        //if this player has a shot at the goal AND the attacker can pass
        //the ball to him the attacker should pass the ball to this player
        if (
          this.parentContainer.canShoot(thisPos, MAX_POWER)
          // player->Team()->CanShoot(player->Pos(),
          //MAX_POWER)
        ) {
          this.parentContainer.requestPass(this);
          //player->Team()->RequestPass(player);
        }

        //if this player is located at the support spot and his team still has
        //possession, he should remain still and turn to face the ball
        if (this.isHome) {
          //player->Steering()->ArriveOff();
          //the player should keep his eyes on the ball!
          //player->TrackBall();
          this.setVelocity(0, 0);
          //if not threatened by another player request a pass
          if (!this.isThreatened) {
            this.parentContainer.requestPass(this);
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

        if (this.isHome) {
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

        if (!this.isHome) {
          this.setState(States.ReturnToHomeRegion);
        } else if (this.scene.gameOn) {
          if (
            this.parentContainer.isInControl &&
            this !== this.parentContainer.controllingPlayer &&
            this.isAheadOfAttacker
          ) {
            this.parentContainer.requestPass(this);
          } else if (
            this.parentContainer.closestPlayer === this &&
            !this.parentContainer.receivingPlayer &&
            !this.scene.goalkeeeperHasBall
          ) {
            this.setState(States.ChaseBall);
          }
        }
        break;
    }

    super.preUpdate(time, delta);
  }

  public setArriveOn(): void {}

  public setPersuitOn(): void {}

  public returnHome(): void {
    this.setState(States.ReturnToHomeRegion);
  }

  public returnWaitingToHome(): void {
    switch (this.state) {
      case States.ReturnToHomeRegion:
      case States.Wait:
        this.setState(States.ReturnToHomeRegion);
        break;
      case States.ChaseBall:
      case States.ReceiveBall:
      case States.Dribble:
      case States.SupportAttacker:
      case States.KickBall:
      default:
        break;
    }
  }

  public setHome(target: Vector2): void {
    this._home = target;
  }

  private get home(): Vector2 {
    return this._home;
  }

  public get isHome(): boolean {
    return new Vector2().setFromObject(this).fuzzyEquals(this.home, 10);
  }

  public setReceiveBall(target: Vector2): void {
    this.setHome(target);
    this.setState(States.ReceiveBall);
  }

  public support(): void {
    this.setState(States.SupportAttacker);
  }

  public receivePass(passer: PlayerBase, target: Vector2): void {
    this.setHome(target);
    this.setState(States.ReceiveBall);
  }

  public get isAheadOfAttacker(): boolean {
    return false;
  }

  public get isReadyForNextKick(): boolean {
    return true;
  }

  public get isThreatened(): boolean {
    return false;
  }

  public get inHotRegion(): boolean {
    return false;
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
