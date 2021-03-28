import GameScene from "../scenes/GameScene";
import Team from "./Team";
import { PlayerProps } from "../types";
import { TIME_DELTA_MILI } from "../constants";
import Info from "./Info";

export enum PlayerModes {
  Track,
  Seek,
  Pursuit,
  Interpose,
}

export default class PlayerBase extends Phaser.Physics.Arcade.Sprite {
  public scene: GameScene;
  public body: Phaser.Physics.Arcade.Body;

  private _home: Phaser.Math.Vector2;
  private _target: Phaser.Math.Vector2;
  private _team: Team;

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

    this._home = home;
    this._team = team;

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setData(props);
    this.setData({
      name,
      index,
      isReadyForNextKick: true,
      mode: PlayerModes.Track,
    });
    this.setSize(16, 16);
    this.setCircle(8);
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

    switch (mode) {
      case PlayerModes.Pursuit:
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

      case PlayerModes.Seek:
        const targetAngle = Phaser.Math.Angle.BetweenPoints(
          this.position,
          this._target
        );

        this.setRotation(targetAngle);
        this.setVelocity(
          speed * delta * Math.cos(targetAngle),
          speed * delta * Math.sin(targetAngle)
        );
        break;

      case PlayerModes.Track:
        this.setVelocity(0, 0);
        this.setRotation(
          Phaser.Math.Angle.BetweenPoints(
            this.position,
            this.scene.ball.position
          )
        );
        break;

      case PlayerModes.Interpose:
        const targetAn = Phaser.Math.Angle.BetweenPoints(
          this.position,
          this.scene.ball.position
        );

        this.setTarget(this.rearInterposeTarget);

        const distance = this.position.distance(this._target);

        var temp1 = new Phaser.Math.Vector2(
          this.scene.ball.position.x - this._target.x,
          this.scene.ball.position.y - this._target.y
        ).normalize();
        var temp2 = new Phaser.Math.Vector2(
          this._target.x + temp1.x * distance,
          this._target.y + temp1.y * distance
        );

        const targetAngle2 = Phaser.Math.Angle.BetweenPoints(
          this.position,
          temp2
        );

        this.setRotation(targetAn);
        this.setVelocity(
          speed * delta * Math.cos(targetAngle2),
          speed * delta * Math.sin(targetAngle2)
        );
        break;
    }
  }

  public setMode(value: PlayerModes): this {
    this.setData({ mode: value });

    return this;
  }

  public support(): this {
    return this;
  }

  public returnHome(): this {
    return this;
  }

  public returnHomeIfWaiting(target: Phaser.Math.Vector2): this {
    return this;
  }

  public passToRequester(receiver: PlayerBase): this {
    return this;
  }

  public isCloseToHome(epsilon: number = 10): boolean {
    return this.position.fuzzyEquals(this._home, epsilon);
  }

  public isCloseToTarget(epsilon: number = 10): boolean {
    return this.position.fuzzyEquals(this._target, epsilon);
  }

  public inHomeRegion(): boolean {
    return this.isCloseToHome(96);
  }

  public get isAtHome(): boolean {
    return this.isCloseToHome();
  }

  public get isAtTarget(): boolean {
    return this.isCloseToTarget();
  }

  public setTarget(value: Phaser.Math.Vector2): this {
    this._target = value;

    return this;
  }

  public get target(): Phaser.Math.Vector2 {
    return this._target;
  }

  public setHome(value: Phaser.Math.Vector2): this {
    this._home = value;

    return this;
  }

  public get home(): Phaser.Math.Vector2 {
    return this._home;
  }

  public get team(): Team {
    return this._team;
  }

  public get isControllingPlayer(): boolean {
    return false;
  }

  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  public get facing(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(1, 0).setAngle(this.rotation);
  }

  public get speedPerSecond(): number {
    return this.speedPerFrame * TIME_DELTA_MILI;
  }

  public get speedPerFrame(): number {
    return this.getData("speed");
  }

  public get index(): number {
    return this.getData("index");
  }

  public get isReadyForNextKick(): boolean {
    return this.getData("isReadyForNextKick");
  }

  public get role(): string {
    return this.getData("role");
  }

  public get isClosestPlayerOnPitchToBall(): boolean {
    return this === this.team.closestPlayerOnPitchToBall;
  }

  public get isClosestPlayerToBall(): boolean {
    return this === this.team.closestPlayer;
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
