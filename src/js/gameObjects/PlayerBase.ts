import PitchScene from "../scenes/PitchScene";
import { PlayerProps, PlayerRoles } from "../types";
import {
  DELTA,
  PLAYER_COMFORT_DISTANCE,
  RECEIVING_RANGE,
  KICKING_RANGE,
  KEEPER_RANGE,
  INTERCEPT_RANGE,
  MESSAGE_SUPPORT_ATTACKER,
  MESSAGE_GO_HOME,
  PLAYER_RADIUS,
} from "../constants";
import { Info, Team } from "./";

export default class PlayerBase extends Phaser.Physics.Arcade.Sprite {
  public scene: PitchScene;
  public body: Phaser.Physics.Arcade.Body;

  private _team: Team;
  private _homeDefault: Phaser.Math.Vector2;
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
    team: Team
  ) {
    super(scene, x, y, "sprites", frame);

    this._seekOn = false;
    this._persuitOn = false;
    this._interposeOn = false;
    this._team = team;
    this._home = this._homeDefault = this._target = home;

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setData({
      ...props,
      index,
    });
    this.setName(name);
    this.setSize(PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    this.setCircle(PLAYER_RADIUS);
    this.setDepth(3);

    const info = new Info(this.scene, index, team.isLeft);

    this.scene.events.on(
      "postupdate",
      function () {
        info.x = this.x;
        info.y = this.y;
      },
      this
    );
  }

  public preUpdate(time: number, delta: number) {
    const speed = this.getData("speed");

    if (this.seekOn) {
      const targetAngle = Phaser.Math.Angle.BetweenPoints(
        this.position,
        this.target
      );

      this.setRotation(targetAngle);
      this.setVelocity(
        speed * delta * Math.cos(targetAngle),
        speed * delta * Math.sin(targetAngle)
      );
    } else if (this.persuitOn) {
      const ballSpeed = this.scene.ball.body.speed;
      const magnitude = this.scene.ball.position
        .clone()
        .subtract(this.position)
        .length();
      const distance = this.scene.ball.position.clone().distance(this.position);
      const lookAheadTime = ballSpeed !== 0 ? distance / ballSpeed : 0;
      console.log("magnitude", distance);
      console.log("ballSpeed", ballSpeed);
      console.log(" magnitude / ballSpeed", distance / ballSpeed);
      console.log("lookAheadTime", lookAheadTime);
      const fPos = this.scene.ball.futurePosition(lookAheadTime);

      this.scene._circle2.setPosition(fPos.x, fPos.y);

      this.setTarget(fPos);

      const targetAngle2 = Phaser.Math.Angle.BetweenPoints(this.position, fPos);

      this.setRotation(targetAngle2);
      this.setVelocity(
        speed * delta * Math.cos(targetAngle2),
        speed * delta * Math.sin(targetAngle2)
      );
    } else if (this.interposeOn) {
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

      this.trackBall();
      this.setVelocity(
        speed * delta * Math.cos(interposeAngle),
        speed * delta * Math.sin(interposeAngle)
      );
    }
  }

  public findSupport() {
    const supportingPlayer = this.team.calculateSupportingPlayer();

    if (!this.team.supportingPlayer) {
      this.team.setSupportingPlayer(supportingPlayer);

      if (supportingPlayer) {
        this.scene.events.emit(MESSAGE_SUPPORT_ATTACKER, supportingPlayer);
      }
    } else if (
      supportingPlayer &&
      supportingPlayer !== this.team.supportingPlayer
    ) {
      if (this.team.supportingPlayer) {
        this.scene.events.emit(MESSAGE_GO_HOME, supportingPlayer);
      } else {
        this.team.setSupportingPlayer(supportingPlayer);
        this.scene.events.emit(MESSAGE_SUPPORT_ATTACKER, supportingPlayer);
      }
    }
  }

  public setTarget(vector: Phaser.Math.Vector2): this {
    this._target = vector;

    return this;
  }

  public setHome(vector: Phaser.Math.Vector2): this {
    this._home = vector;

    return this;
  }

  public setDefaultHomeRegion(): this {
    this._home = this._homeDefault;

    return this;
  }

  public setSeekOn(value: boolean): this {
    this._seekOn = value;

    return this;
  }

  public setPersuitOn(value: boolean): this {
    this._persuitOn = value;

    return this;
  }

  public setInterposeOn(value: boolean): this {
    this._interposeOn = value;

    return this;
  }

  public sendHomeIfWaiting(): this {
    return this;
  }

  public isCloseToHome(epsilon: number = 10): boolean {
    return this.position.fuzzyEquals(this.home, epsilon);
  }

  public isCloseToTarget(epsilon: number = 10): boolean {
    return this.position.fuzzyEquals(this.target, epsilon);
  }

  public isPositionInFrontOfPlayer(position: Phaser.Math.Vector2): boolean {
    return position.clone().subtract(this.position).dot(this.facing) > 0;
  }

  public trackBall(): this {
    this.rotateToTarget(this.scene.ball.position);

    return this;
  }

  public rotateToTarget(vector: Phaser.Math.Vector2): this {
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

  public get isAtHome(): boolean {
    return this.isCloseToHome();
  }

  public get isAtTarget(): boolean {
    return this.isCloseToTarget();
  }

  public get seekOn(): boolean {
    return this._seekOn;
  }

  public get persuitOn(): boolean {
    return this._persuitOn;
  }

  public get interposeOn(): boolean {
    return this._interposeOn;
  }

  public get target(): Phaser.Math.Vector2 {
    return this._target;
  }

  public get home(): Phaser.Math.Vector2 {
    return this._home;
  }

  public get team(): Team {
    return this._team;
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  public get facing(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(1, 0).setAngle(this.rotation);
  }

  public get speedPerSecond(): number {
    return this.speedPerFrame * DELTA * 1000;
  }

  public get isControllingPlayer(): boolean {
    return this === this.team.controllingPlayer;
  }

  public get isClosestPlayerToBall(): boolean {
    return this === this.team.closestPlayer;
  }

  public get isClosestPlayerOnPitchToBall(): boolean {
    return this === this.team.closestPlayerOnPitchToBall;
  }

  public get isBallWithinReceivingRange(): boolean {
    return this.position.distance(this.scene.ball.position) < RECEIVING_RANGE;
  }

  public get isBallWithinKickingRange(): boolean {
    return this.position.distance(this.scene.ball.position) < KICKING_RANGE;
  }

  public get isBallWithinKeeperRange(): boolean {
    return this.position.distance(this.scene.ball.position) < KEEPER_RANGE;
  }

  public get isBallWithinRangeForIntercept(): boolean {
    return (
      this.team.goalHome.position.distance(this.scene.ball.position) <=
      INTERCEPT_RANGE
    );
  }

  public get isTooFarFromGoalMouth(): boolean {
    return this.position.distance(this.rearInterposeTarget) > INTERCEPT_RANGE;
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
      Math.abs(this.x - this.team.goalOpponents.position.x) <
      Math.abs(
        this.team.controllingPlayer.x - this.team.goalOpponents.position.x
      )
    );
  }

  public get isInHotPosition(): boolean {
    return (
      Math.abs(this.y - this.team.goalOpponents.position.y) <
      this.scene.pitch.width / 3
    );
  }

  public get rearInterposeTarget(): Phaser.Math.Vector2 {
    const x = this.team.goalHome.position.x;
    const y =
      this.scene.pitch.height / 2 +
      this.scene.pitch.y -
      this.team.goalHome.height / 2 +
      this.team.goalHome.height *
        ((this.scene.ball.position.y - this.scene.pitch.y) /
          this.scene.pitch.height);

    return new Phaser.Math.Vector2(x, y);
  }
}
