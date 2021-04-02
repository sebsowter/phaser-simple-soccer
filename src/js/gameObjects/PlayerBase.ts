import GameScene from "../scenes/GameScene";
import { PlayerProps } from "../types";
import {
  DELTA,
  PLAYER_COMFORT_DISTANCE,
  RECEIVING_RANGE,
  KICKING_RANGE,
  KEEPER_RANGE,
  INTERCEPT_RANGE,
} from "../constants";
import { Info, Team } from "./";
import Regulator from "./Regulator";

export enum PlayerModes {
  Track,
  Seek,
  Pursuit,
  Interpose,
}

export default class PlayerBase extends Phaser.Physics.Arcade.Sprite {
  public scene: GameScene;
  public body: Phaser.Physics.Arcade.Body;

  private _team: Team;
  private _home: Phaser.Math.Vector2;
  private _target: Phaser.Math.Vector2;
  private _regulator: Regulator;

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
    const RADIUS = 8;

    super(scene, x, y, "sprites", frame);

    this._home = home;
    this._team = team;
    this._regulator = new Regulator(this.scene);

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setData({
      ...props,
      index,
      mode: PlayerModes.Track,
    });
    this.setName(name);
    this.setSize(RADIUS * 2, RADIUS * 2);
    this.setCircle(RADIUS);
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
    const [speed, mode] = this.getData(["speed", "mode"]);
    const ballAngle = Phaser.Math.Angle.BetweenPoints(
      this.position,
      this.scene.ball.position
    );

    switch (mode) {
      case PlayerModes.Pursuit:
        const ballSpeed = this.scene.ball.body.speed;
        const magnitude = this.scene.ball.position
          .clone()
          .subtract(this.position)
          .length();
        const lookAheadTime = ballSpeed !== 0 ? magnitude / ballSpeed : 0;

        this.setTarget(this.scene.ball.futurePosition(lookAheadTime));

      case PlayerModes.Seek:
        const targetAngle = Phaser.Math.Angle.BetweenPoints(
          this.position,
          this.target
        );

        this.setRotation(targetAngle);
        this.setVelocity(
          speed * delta * Math.cos(targetAngle),
          speed * delta * Math.sin(targetAngle)
        );
        break;

      case PlayerModes.Track:
        const angle = Phaser.Math.Angle.BetweenPoints(
          this.position,
          this.scene.ball.position
        );

        this.setVelocity(0, 0);
        this.setRotation(angle);
        break;

      case PlayerModes.Interpose:
        this.setTarget(this.rearInterposeTarget);

        const targetDistance = this.position.distance(this.target);
        const temp1 = new Phaser.Math.Vector2(
          this.scene.ball.position.x - this.target.x,
          this.scene.ball.position.y - this.target.y
        ).normalize();
        const temp2 = new Phaser.Math.Vector2(
          this.target.x + temp1.x * targetDistance,
          this.target.y + temp1.y * targetDistance
        );
        const interposeAngle = Phaser.Math.Angle.BetweenPoints(
          this.position,
          temp2
        );

        if (interposeAngle !== 0) {
          this.setVelocity(
            speed * delta * Math.cos(interposeAngle),
            speed * delta * Math.sin(interposeAngle)
          );
        } else {
          this.setVelocity(0, 0);
        }

        this.setRotation(ballAngle);
        break;
    }
  }

  public setMode(mode: PlayerModes): this {
    this.setData({ mode });

    return this;
  }

  public setTarget(vector: Phaser.Math.Vector2): this {
    this._target = vector;

    return this;
  }

  public setHome(vector: Phaser.Math.Vector2): this {
    this._home = vector;

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

  public support(): this {
    return this;
  }

  public returnHome(): this {
    return this;
  }

  public returnHomeIfWaiting(target?: Phaser.Math.Vector2): this {
    return this;
  }

  public passToRequester(receiver?: PlayerBase): this {
    return this;
  }

  public get speedPerFrame(): number {
    return this.getData("speed");
  }

  public get mode(): number {
    return this.getData("mode");
  }

  public get index(): number {
    return this.getData("index");
  }

  public get isReadyForNextKick(): boolean {
    return this._regulator.isReady;
  }

  public get role(): string {
    return this.getData("role");
  }

  public get isAtHome(): boolean {
    return this.isCloseToHome();
  }

  public get isAtTarget(): boolean {
    return this.isCloseToTarget();
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
    const goalX = this.team.goalOpp.position.x;

    return (
      Math.abs(this.position.x - goalX) <
      Math.abs(this.team.controllingPlayer.position.x - goalX)
    );
  }

  public get isInHotPosition(): boolean {
    return (
      Math.abs(this.position.y - this.team.goalOpp.position.y) <
      this.scene.pitch.width / 3
    );
  }

  public get shouldChaseBall(): boolean {
    return (
      this.isClosestPlayerToBall &&
      !this.team.receivingPlayer &&
      !this.scene.goalkeeperHasBall
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
