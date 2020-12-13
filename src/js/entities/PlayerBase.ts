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

export enum Modes {
  Track,
  Seek,
  Pursuit,
  Interpose,
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

    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);

    this.setData(props);
    this.setData({
      name,
      index,
      isReadyForNextKick: true,
      mode: Modes.Track,
    });
    this.setSize(16, 16);
    this.setCircle(8);
    this.setDepth(3);

    this.info = new Info(this.scene, index, team.isLeft);

    this.scene.events.on(
      "postupdate",
      function () {
        //console.log(index, this.target);
        this.info.x = this.x;
        this.info.y = this.y;
      },
      this
    );
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
      case Modes.Interpose:
        const targetAn = Angle.BetweenPoints(
          this.position,
          this.scene.ball.position
        );
        //const distance = this.position.distance(this.scene.ball.position);
        //const targetAngle2 = Angle.BetweenPoints(this.position, this.target);
        this.setTarget(this.rearInterposeTarget);
        const distance2 = this.position.distance(this.target);

        //this.setRotation(targetAngle2);
        //this.setVelocity(
        //  speed * delta * Math.cos(targetAngle2),
        //  speed * delta * Math.sin(targetAngle2)
        //);

        var temp1 = new Phaser.Math.Vector2(
          this.scene.ball.position.x - this.target.x,
          this.scene.ball.position.y - this.target.y
        ).normalize();
        var temp2 = new Phaser.Math.Vector2(
          this.target.x + temp1.x * distance2,
          this.target.y + temp1.y * distance2
        );

        const targetAngle2 = Angle.BetweenPoints(this.position, temp2);

        this.setRotation(targetAn);
        this.setVelocity(
          speed * delta * Math.cos(targetAngle2),
          speed * delta * Math.sin(targetAngle2)
        );

        /*
        var ToBall = new Phaser.Point(
          ball.Pos().x - this.m_pPlayer.Pos().x,
          ball.Pos().y - this.m_pPlayer.Pos().y
        );

        //the lookahead time is proportional to the distance between the ball
        //and the pursuer;
        var LookAheadTime = 0;

        if (this.scene.ball.body.speed != 0) {
          LookAheadTime = distance / this.scene.ball.body.speed;
        }

        //calculate where the ball will be at this time in the future
        this.m_vTarget = this.scene.ball.futurePosition(LookAheadTime);

        //now seek to the predicted future position of the ball
        return this.Arrive(this.m_vTarget, Deceleration.fast);
        */
        break;
    }
  }

  // Is this player ready for another kick.
  public setMode(value: Modes): void {
    this.setData({ mode: value });
  }

  // Is this player ready for another kick.
  public setTarget(value: Vector2): void {
    //console.log("this.value", value);
    this.target = value;
  }

  // Is this player ready for another kick.
  public setHome(value: Vector2): void {
    this.home = value;
  }

  public passToRequester(receiver: PlayerBase): void {}

  public returnHome(): void {}

  public support(): void {}

  public returnHomeIfWaiting(target: Vector2): void {}

  // Is this player ready for another kick.
  public isCloseToHome(epsilon: number = 10): boolean {
    return this.position.fuzzyEquals(this.home, epsilon);
  }

  // Is this player ready for another kick.
  public isCloseToTarget(epsilon: number = 10): boolean {
    return this.position.fuzzyEquals(this.target, epsilon);
  }

  // Is this player ready for another kick.
  public inHomeRegion(): boolean {
    return this.isCloseToHome(96);
  }

  // Is this player ready for another kick.
  public get isAtHome(): boolean {
    return this.isCloseToHome();
  }

  // Is this player ready for another kick.
  public get isAtTarget(): boolean {
    return this.isCloseToTarget();
  }

  // The position of the player.
  public get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  // The direction the player is facing, as a vector.
  public get facing(): Vector2 {
    return new Vector2(1, 0).setAngle(this.rotation);
  }

  // Is this player ready for another kick.
  public get speedPerSecond(): number {
    return this.getData("speed") * TIME_DELTA_MILI;
  }

  // Is this player ready for another kick.
  public get speedPerFrame(): number {
    return this.getData("speed");
  }

  // Is this player ready for another kick.
  public get isReadyForNextKick(): boolean {
    return this.getData("isReadyForNextKick");
  }

  // Is this player ready for another kick.
  public get role(): string {
    return this.getData("role");
  }

  // Is this player the controlling player.
  public get isControllingPlayer(): boolean {
    return this === this.team.controllingPlayer;
  }

  // Is this player the closest player to the ball.
  public get isClosestPlayerOnPitchToBall(): boolean {
    return this === this.team.closestPlayerOnPitchToBall;
  }

  // Is this player the closest player to the ball.
  public get isClosestPlayerToBall(): boolean {
    return this === this.team.closestPlayer;
  }

  // Is this player the closest player to the ball.
  public get rearInterposeTarget(): Phaser.Math.Vector2 {
    if (this.team.opponents) {
      var x = this.team.opponents.goal.position.x;
      var y =
        this.scene.pitch.height / 2 +
        64 -
        this.team.opponents.goal.height / 2 +
        this.team.opponents.goal.height *
          ((this.scene.ball.position.y - 64) / this.scene.pitch.height);

      return new Phaser.Math.Vector2(x, y);
    }

    return new Phaser.Math.Vector2();
  }
}
