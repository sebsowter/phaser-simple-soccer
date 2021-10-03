import PitchScene from "../scenes/PitchScene";
import { PlayerProps, PlayerRoles, PlayerEvent } from "../types";
import {
  DELTA,
  PLAYER_COMFORT_DISTANCE,
  RECEIVING_RANGE,
  KICKING_RANGE,
  KEEPER_RANGE,
  INTERCEPT_RANGE,
  PLAYER_RADIUS,
} from "../constants";
import { Info, SoccerTeam } from "./";

export default class PlayerBase extends Phaser.Physics.Arcade.Sprite {
  public scene: PitchScene;
  public body: Phaser.Physics.Arcade.Body;

  private _team: SoccerTeam;
  private _home: Phaser.Math.Vector2;
  private _target: Phaser.Math.Vector2;
  private _seekOn: boolean;
  private _persuitOn: boolean;
  private _interposeOn: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    props: PlayerProps,
    index: number,
    name: string,
    home: Phaser.Math.Vector2,
    team: SoccerTeam
  ) {
    super(scene, x, y, "sprites", frame);

    const info = new Info(this, index, team.isLeft);

    this._seekOn = false;
    this._persuitOn = false;
    this._interposeOn = false;
    this._team = team;
    this._home = this._target = home;

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);
    this.scene.add.existing(info);

    this.setData({
      ...props,
      index,
    });
    this.setName(name);
    this.setSize(PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    this.setCircle(PLAYER_RADIUS);
    this.setDepth(3);
  }

  public preUpdate(_, delta: number) {
    const force = new Phaser.Math.Vector2();
    const speed = new Phaser.Math.Vector2(this.speedPerFrame * delta, 0);

    if (this.seekOn) {
      this.trackTarget();

      force.add(
        speed
          .clone()
          .rotate(Phaser.Math.Angle.BetweenPoints(this.position, this.target))
      );
    }

    if (this.persuitOn) {
      const ballSpeed = this.scene.ball.body.speed;
      const magnitude = this.scene.ball.position
        .clone()
        .subtract(this.position)
        .length();
      const lookAheadTime = ballSpeed !== 0 ? magnitude / ballSpeed : 0;
      const futurePosition = this.scene.ball.futurePosition(lookAheadTime);

      this.setTarget(futurePosition);
      this.trackTarget();

      force.add(
        speed
          .clone()
          .rotate(Phaser.Math.Angle.BetweenPoints(this.position, this.target))
      );
    }

    if (this.interposeOn) {
      this.trackBall();
      this.setTarget(this.rearInterposeTarget);

      const distance = this.position.distance(this.target);
      const temp1 = this.scene.ball.position
        .clone()
        .subtract(this.target)
        .normalize();
      const temp2 = this.target
        .clone()
        .add(new Phaser.Math.Vector2(temp1.x * distance, temp1.y * distance));
      const interposeAngle = Phaser.Math.Angle.BetweenPoints(
        this.position,
        temp2
      );

      force.add(speed.clone().rotate(interposeAngle));
    }

    const velocity = speed.clone().rotate(force.angle());

    this.setVelocity(
      Math.min(force.x, velocity.x),
      Math.min(force.y, velocity.y)
    );
  }

  public findSupport() {
    const supportingPlayer = this.team.calculateSupportingPlayer();

    if (!this.team.supportingPlayer) {
      this.team.setSupportingPlayer(supportingPlayer);

      if (supportingPlayer) {
        this.scene.events.emit(PlayerEvent.SUPPORT_ATTACKER, supportingPlayer);
      }
    } else if (
      supportingPlayer &&
      supportingPlayer !== this.team.supportingPlayer
    ) {
      if (this.team.supportingPlayer) {
        this.scene.events.emit(PlayerEvent.GO_HOME, supportingPlayer);
      } else {
        this.team.setSupportingPlayer(supportingPlayer);
        this.scene.events.emit(PlayerEvent.SUPPORT_ATTACKER, supportingPlayer);
      }
    }
  }

  public setTarget(vector: Phaser.Math.Vector2) {
    this._target = vector;

    return this;
  }

  public setHome(vector: Phaser.Math.Vector2) {
    this._home = vector;

    return this;
  }

  public setSeekOn(value: boolean) {
    this._seekOn = value;

    return this;
  }

  public setPersuitOn(value: boolean) {
    this._persuitOn = value;

    return this;
  }

  public setInterposeOn(value: boolean) {
    this._interposeOn = value;

    return this;
  }

  public sendHomeIfWaiting() {
    return this;
  }

  public isCloseToHome(epsilon: number = 10) {
    return this.position.fuzzyEquals(this.home, epsilon);
  }

  public isCloseToTarget(epsilon: number = 10) {
    return this.position.fuzzyEquals(this.target, epsilon);
  }

  public isPositionInFrontOfPlayer(position: Phaser.Math.Vector2) {
    return position.clone().subtract(this.position).dot(this.facing) > 0;
  }

  public trackTarget() {
    this.rotateToTarget(this.target);

    return this;
  }

  public trackBall() {
    this.rotateToTarget(this.scene.ball.position);

    return this;
  }

  public rotateToTarget(vector: Phaser.Math.Vector2) {
    this.setRotation(Phaser.Math.Angle.BetweenPoints(this.position, vector));

    return this;
  }

  public get index(): number {
    return this.getData("index");
  }

  public get role(): PlayerRoles {
    return this.getData("role");
  }

  public get speedPerFrame(): number {
    return this.getData("speed");
  }

  public get isAtHome() {
    return this.isCloseToHome();
  }

  public get isAtTarget() {
    return this.isCloseToTarget();
  }

  public get seekOn() {
    return this._seekOn;
  }

  public get persuitOn() {
    return this._persuitOn;
  }

  public get interposeOn() {
    return this._interposeOn;
  }

  public get target() {
    return this._target;
  }

  public get home() {
    return this._home;
  }

  public get team(): SoccerTeam {
    return this._team;
  }

  public get position() {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  public get facing() {
    return new Phaser.Math.Vector2(1, 0).setAngle(this.rotation);
  }

  public get speedPerSecond(): number {
    return this.speedPerFrame * DELTA * 1000;
  }

  public get isControllingPlayer() {
    return this === this.team.controllingPlayer;
  }

  public get isClosestPlayerToBall() {
    return this === this.team.closestPlayer;
  }

  public get isClosestPlayerOnPitchToBall() {
    return this === this.team.closestPlayerOnPitchToBall;
  }

  public get isBallWithinReceivingRange() {
    return this.position.distance(this.scene.ball.position) < RECEIVING_RANGE;
  }

  public get isBallWithinKickingRange() {
    return this.position.distance(this.scene.ball.position) < KICKING_RANGE;
  }

  public get isBallWithinKeeperRange() {
    return this.position.distance(this.scene.ball.position) < KEEPER_RANGE;
  }

  public get isBallWithinRangeForIntercept() {
    return (
      this.team.goalHome.position.distance(this.scene.ball.position) <
      INTERCEPT_RANGE
    );
  }

  public get isTooFarFromGoalMouth() {
    return this.position.distance(this.rearInterposeTarget) > INTERCEPT_RANGE;
  }

  public get isThreatened() {
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

  public get isAheadOfAttacker() {
    return (
      Math.abs(this.x - this.team.goalOpponents.position.x) <
      Math.abs(
        this.team.controllingPlayer.x - this.team.goalOpponents.position.x
      )
    );
  }

  public get isInHotPosition() {
    return (
      Math.abs(this.y - this.team.goalOpponents.position.y) <
      this.scene.pitch.width / 3
    );
  }

  public get rearInterposeTarget() {
    const x = this.team.goalHome.position.x;
    const y =
      this.team.goalHome.position.y -
      this.team.goalHome.height / 2 +
      this.team.goalHome.height *
        ((this.scene.ball.position.y - this.scene.pitch.y) /
          this.scene.pitch.height);

    return new Phaser.Math.Vector2(x, y);
  }
}
