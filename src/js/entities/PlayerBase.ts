import GameScene from "../GameScene";
import { PlayerProps } from "../types";
import Spot from "./Spot";
import Team from "./Team";

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

  protected target: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    props: PlayerProps
  ) {
    super(scene, x, y, "sprites", frame);

    this.setData(props);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setState(States.Wait);
    this.setDepth(3);
    //this.body.setSize(16, 16).setCollideWorldBounds(true);
    //console.log("this", this);
  }

  public setState(value: number): this {
    switch (value) {
      case States.ReceiveBall:
        this.parentContainer.controllingPlayer = this;
        this.parentContainer.receivingPlayer = this;

        const PassThreatRadius = 70.0;

        if (
          this.inHotRegion ||
          (Math.random() < 0.1 &&
            this.parentContainer.isOpponentWithinRadius(this, PassThreatRadius))
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
        this.parentContainer.controllingPlayer = this;
        break;
      case States.SupportAttacker:
        //       player->Steering()->ArriveOn();
        //player->Steering()->SetTarget(player->Team()->GetSupportSpot());
        break;
      case States.KickBall:
        this.parentContainer.controllingPlayer = this;
        if (this.isReadyForNextKick) {
          this.setState(States.ChaseBall);
        }
        break;
      case States.ReturnToHomeRegion:
        //this.setHome()
        break;
      case States.Wait:
        this.setVelocity(0, 0);
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number): void {
    const MaxShootingForce = 400;
    const [speed, persuitOn, arriveOn] = this.getData([
      "speed",
      "persuitOn",
      "arriveOn",
    ]);
    const angleToBall = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.scene.ball.x,
      this.scene.ball.y
    );
    const distanceToBall = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.scene.ball.x,
      this.scene.ball.y
    );
    const angleToTarget = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y
    );
    const angleToGoal = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.scene.goalA.x,
      this.scene.goalA.y
    );

    //console.log("state", this.state);

    switch (this.state) {
      case States.KickBall:
        //calculate the dot product of the vector pointing to the ball
        //and the player's heading

        //Vector2D ToBall = player->Ball()->Pos() - player->Pos();
        //double dot = player->Heading().Dot(Vec2DNormalize(ToBall));

        //cannot kick the ball if the goalkeeper is in possession or if it’s
        //behind the player or if there is already an assigned receiver. So just
        //continue chasing the ball

        const dot = 2;
        if (
          this.parentContainer.receivingPlayer ||
          this.scene.goalkeeeperHasBall ||
          dot < 0
        ) {
          this.setState(States.ChaseBall);
          return;
        }

        const power = MaxShootingForce * dot;
        let ballTarget = new Phaser.Math.Vector2(
          this.scene.ball.x,
          this.scene.ball.y
        );

        //Vector2D BallTarget;
        //if it’s determined that the player could score a goal from this position
        //OR if he should just kick the ball anyway, the player will attempt
        //to make the shot
        const cancePlayerAttemptsPotShot = 0.5;
        if (
          this.parentContainer.canShoot(this.scene.ball, power, 3) ||
          Math.random() < cancePlayerAttemptsPotShot
        ) {
          //Prm.PlayerKickingAccuracy
          //BallTarget = AddNoiseToKick(player->Ball()->Pos(), BallTarget);

          //this is the direction the ball will be kicked
          const KickDirection = Phaser.Math.Angle.Between(
            ballTarget.x,
            ballTarget.y,
            this.x,
            this.y
          );
          //player->Ball()->Kick(KickDirection, power);

          this.scene.ball.kick(KickDirection, power);

          //change state
          this.setState(States.Wait);
          this.parentContainer.requestSupport();
          return;
        }

        //PlayerBase* receiver = NULL;
        //power = Prm.MaxPassingForce * dot;
        //test if there are any potential candidates available to receive a pass
        if (
          this.isThreatened &&
          true
          //   this.parentContainer.canPass(this,
          // receiver,
          // BallTarget,
          // power,
          // Prm.MinPassDist)
        ) {
          //add some noise to the kick
          //   ballTarget = AddNoiseToKick(player->Ball()->Pos(), BallTarget);

          // Vector2D KickDirection = BallTarget - player->Ball()->Pos();
          // player->Ball()->Kick(KickDirection, power);
          this.scene.ball.kick(angleToBall, power);
          //let the receiver know a pass is coming
          // Dispatch->DispatchMsg(SEND_MSG_IMMEDIATELY,
          //player->ID(),
          //receiver->ID(),
          //Msg_ReceiveBall,
          //NO_SCOPE,
          //&BallTarget);//the player should wait at his current position unless instructed
          //otherwise
          this.parentContainer.sendPass(this);
          this.setState(States.Wait);
          this.parentContainer.requestSupport();
          return;
        } else {
          this.parentContainer.requestSupport();
          this.setState(States.Dribble);
        }

        break;
      case States.ChaseBall:
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
          this.scene.ball.kick(this.rotation, KickingForce);
        } //kick the ball down the field
        else {
          const MaxDribbleForce = 0.2;

          this.scene.ball.kick(angleToGoal, MaxDribbleForce);
        }
        //the player has kicked the ball so he must now change state to follow it
        this.setState(States.ChaseBall);
        break;
      case States.ReceiveBall:
        if (distanceToBall < 20 || this.parentContainer.isInControl) {
          this.setState(States.ChaseBall);
        }

        if (persuitOn) {
          this.target.x = this.scene.ball.x;
          this.target.y = this.scene.ball.y;
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
          //player->Team()->GetSupportSpot() != this.target)
          true
        ) {
          //player->Steering()->SetTarget(player->Team()->GetSupportSpot());
          //player->Steering()->ArriveOn();
          this.setData("arriveOn", true);
        }

        //if this player has a shot at the goal AND the attacker can pass
        //the ball to him the attacker should pass the ball to this player
        if (
          this.parentContainer.canShoot()
          // player->Team()->CanShoot(player->Pos(),
          //MaxShootingForce)
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
      case States.ReturnToHomeRegion:
        if (this.isHome) {
          this.setState(States.Wait);
        } else {
          this.setVelocity(
            speed * Math.cos(angleToTarget),
            speed * Math.sin(angleToTarget)
          );
          this.setRotation(angleToTarget);
        }
        break;
      case States.Wait:
        this.setRotation(angleToBall);

        if (!this.isHome) {
          this.setVelocity(
            speed * Math.cos(angleToTarget),
            speed * Math.sin(angleToTarget)
          );
          this.setVelocity(0, 0);
        } else {
          this.setVelocity(0, 0);
        }

        if (
          this.parentContainer.isInControl &&
          this !== this.parentContainer.controllingPlayer &&
          this.isAheadOfAttacker
        ) {
          this.parentContainer.requestPass(this);
        }

        if (
          this.parentContainer.closestPlayer === this &&
          !this.parentContainer.receivingPlayer &&
          !this.scene.goalkeeeperHasBall
        ) {
          this.setState(States.ChaseBall);
        }
        break;
    }

    super.preUpdate(time, delta);
  }

  public setArriveOn(): void {}

  public setPersuitOn(): void {}
  public returnHome(): void {}

  public get inHotRegion(): boolean {
    return false;
  }

  public setReceiveBall(target: Phaser.Math.Vector2): void {
    this.target = target;
    this.setState(States.ReceiveBall);
  }

  public support(): void {
    this.setState(States.SupportAttacker);
  }

  public setTarget(target: Phaser.Math.Vector2): void {
    this.target = target;
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
  public get isHome(): boolean {
    const TOLERANCE = 10;

    return (
      Math.abs(this.x - this.target.x) < TOLERANCE &&
      Math.abs(this.y - this.target.y) < TOLERANCE
    );
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
