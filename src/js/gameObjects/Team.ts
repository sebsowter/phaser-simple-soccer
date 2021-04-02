import { MAX_PASS_POWER, players, teams } from "../constants";
import { getRegionPos } from "../utils";
import { PlayerProps, Regions, TeamProps } from "../types";
import { GameScene } from "../scenes";
import {
  SupportSpots,
  Spot,
  PlayerBase,
  PlayerField,
  PlayerKeeper,
  Goal,
  Ball,
} from ".";

export enum TeamStates {
  PrepareForKickOff = 0,
  Defending = 1,
  Attacking = 2,
}

export default class Team extends Phaser.GameObjects.Group {
  public scene: GameScene;
  public state: TeamStates;

  private _spots: SupportSpots;
  private _isLeft: boolean;
  private _pitch: GameScene;
  private _regions: Regions;
  private _players: PlayerBase[];
  private _opponents: Team;
  private _goalHome: Goal;
  private _goalOpp: Goal;
  private _supportingPlayer: PlayerBase = null;
  private _controllingPlayer: PlayerBase = null;
  private _receivingPlayer: PlayerBase = null;
  private _closestPlayer: PlayerBase = null;

  constructor(
    scene: Phaser.Scene,
    teamId: number,
    isLeft: boolean,
    goalOpp: Goal,
    goalHome: Goal
  ) {
    super(scene);

    this.scene.add.existing(this);

    const team: TeamProps = teams.find((team: TeamProps) => team.id === teamId);

    this._pitch = this.scene;
    this._goalOpp = goalOpp;
    this._goalHome = goalHome;
    this._isLeft = isLeft;
    this._regions = team.regions;
    this._spots = new SupportSpots(this.scene, this, isLeft);
    this._players = team.players
      .map((id: number) => {
        return players.find((player: PlayerProps) => player.id === id);
      })
      .map((props: PlayerProps, index: number) => {
        const PlayerEntity = props.role === "GK" ? PlayerKeeper : PlayerField;
        const position = getRegionPos(this._regions.defending[index]);

        return new PlayerEntity(
          this.scene,
          position.x + (-16 + Math.random() * 32),
          position.y + (-16 + Math.random() * 32),
          team.frame,
          props,
          index,
          team.name,
          position,
          this
        );
      });

    this._players.forEach((player: PlayerBase) => {
      this.add(player);
    });

    this.setName(team.name);
    this.setState(TeamStates.PrepareForKickOff);
  }

  public preUpdate(): void {
    this.setClosestPlayer();

    switch (this.state) {
      case TeamStates.PrepareForKickOff:
        if (this.isAllPlayersHome && this.opponents.isAllPlayersHome) {
          this.setState(TeamStates.Defending);
        }
        break;

      case TeamStates.Defending:
        if (this.isInControl) {
          this.setState(TeamStates.Attacking);
        }
        break;

      case TeamStates.Attacking:
        if (!this.isInControl) {
          this.setState(TeamStates.Defending);
        }
        break;
    }
  }

  public setState(value: number): this {
    switch (this.state) {
      case TeamStates.Attacking:
        this.setSupportingPlayer(null);
        break;
    }

    this.state = value;

    switch (value) {
      case TeamStates.PrepareForKickOff:
        this._closestPlayer = null;
        this._controllingPlayer = null;
        this._receivingPlayer = null;
        this.setSupportingPlayer(null);
        this.updateTargets(value);
        this.returnAllToHome();
        break;

      case TeamStates.Defending:
        this.updateTargets(value);
        break;

      case TeamStates.Attacking:
        this.updateTargets(value);
        this.setSupportingPlayer(this.calculateSupportingPlayer());
        break;
    }

    return this;
  }

  public kickOff() {
    this.setState(TeamStates.PrepareForKickOff);
  }

  public returnAllToHome() {
    this.players.forEach((player: PlayerBase) => {
      player.returnHome();
    });
  }

  public sendFieldPlayersToHome() {
    this.players.forEach((player: PlayerBase) => {
      if (player.role !== "GK") {
        player.returnHome();
      }
    });
  }

  public updateTargets(state: number) {
    const { defending, attacking } = this._regions;
    const region = state === TeamStates.Attacking ? attacking : defending;

    this.players.forEach((player: PlayerBase, index: number) => {
      player.setHome(getRegionPos(region[index]));
      //.returnHomeIfWaiting(player.home);
    });
  }

  public canShoot(
    position: Phaser.Math.Vector2,
    power: number,
    attempts: number = 3
  ): any[] {
    const target = this.goalOpp.position.clone();
    const targetHeght = this.goalOpp.height - this.ball.height;

    while (attempts--) {
      target.y =
        this.goalOpp.position.y - targetHeght / 2 + Math.random() * targetHeght;

      if (
        this.ball.timeToCoverDistance(position.distance(target), power) >= 0 &&
        this.isPassSafeFromAllOpponents(position, target, null, power)
      ) {
        return [true, target];
      }
    }

    return [false, target];
  }

  public getBestPassToReceiver(
    receiver: PlayerBase,
    power: number
  ): Phaser.Math.Vector2 {
    const distance = this.ball.position.distance(receiver.position);
    const time = this.ball.timeToCoverDistance(distance, power);

    if (time <= 0) {
      return null;
    }

    const interceptRange = receiver.speedPerSecond * time;
    const passAngle = Phaser.Math.Angle.BetweenPoints(
      this.ball.position,
      receiver.position
    );
    const passRotation = Math.sin(interceptRange / distance);
    const passLocal = new Phaser.Math.Vector2(distance, 0).rotate(passAngle);
    const passLeft = passLocal
      .clone()
      .rotate(-passRotation)
      .add(this.ball.position);
    const passRight = passLocal
      .clone()
      .rotate(passRotation)
      .add(this.ball.position);

    let closest = 10000;
    let passTarget = null;

    [passLeft, receiver.position, passRight].forEach(
      (pass: Phaser.Math.Vector2) => {
        const distance = Math.abs(pass.x - this.goalOpp.position.x);

        if (
          distance < closest &&
          this.scene.pitch.contains(pass.x, pass.y) &&
          this.isPassSafeFromAllOpponents(
            this.ball.position,
            pass,
            receiver,
            power
          )
        ) {
          closest = distance;
          passTarget = pass;
        }
      }
    );

    return passTarget;
  }

  public findPass(
    passer: PlayerBase,
    power: number,
    minimumPassingDistance: number
  ): any[] {
    let closestToGoalSoFar = 1000;
    let target = null;
    let receiver = null;

    this.players
      .filter((player: PlayerBase) => player !== passer)
      .forEach((player: PlayerBase) => {
        const distance = passer.position.distance(player.position);

        if (distance > minimumPassingDistance) {
          const pass = this.getBestPassToReceiver(player, power);

          if (pass) {
            const distance = Math.abs(pass.x - this.goalOpp.position.x);

            if (distance < closestToGoalSoFar) {
              closestToGoalSoFar = distance;
              receiver = player;
              target = pass;
            }
          }
        }
      });

    if (receiver) return [true, receiver, target];
    else return [false, null, null];
  }

  public requestPass(player: PlayerBase) {
    if (
      this.isPassSafeFromAllOpponents(
        this.controllingPlayer.position,
        player.position,
        player,
        MAX_PASS_POWER
      )
    ) {
      this.controllingPlayer.passToRequester(player);
    }
  }

  public requestSupport() {
    const supportingPlayer = this.calculateSupportingPlayer();

    if (supportingPlayer) {
      if (
        !this.supportingPlayer ||
        supportingPlayer !== this.supportingPlayer
      ) {
        this.setSupportingPlayer(supportingPlayer);
      }
    }
  }

  public calculateSupportingPlayer(): PlayerBase {
    let closest = 100000;
    let bestPlayer = null;

    this.players.forEach((player: PlayerBase) => {
      if (player.role === "AT" && !player.isControllingPlayer) {
        const distance = player.position.distance(this._spots.supportSpot);

        if (distance < closest) {
          closest = distance;
          bestPlayer = player;
        }
      }
    });

    return bestPlayer;
  }

  public isOpponentWithinRadius(
    position: Phaser.Math.Vector2,
    radius: number
  ): boolean {
    return this.opponents.players.some(
      (opponent: PlayerBase) => opponent.position.distance(position) < radius
    );
  }

  public isPassSafeFromAllOpponents(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    receiver: PlayerBase,
    power: number
  ): boolean {
    return this.opponents.players.every((opponent: PlayerBase) =>
      this.isPassSafeFromOpponent(from, to, receiver, opponent, power)
    );
  }

  public isPassSafeFromOpponent(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    receiver: PlayerBase,
    opponent: PlayerBase,
    power: number
  ): boolean {
    const passAngle = Phaser.Math.Angle.BetweenPoints(from, to);
    const opponentAngle = Phaser.Math.Angle.BetweenPoints(
      from,
      opponent.position
    );
    const opponentDist = from.distance(opponent.position);
    const opponentLocal = new Phaser.Math.Vector2(
      opponentDist * Math.cos(opponentAngle - passAngle),
      opponentDist * Math.sin(opponentAngle - passAngle)
    );

    if (opponentLocal.x < 0) {
      return true;
    }

    if (from.distance(to) < opponentDist) {
      if (receiver) {
        if (opponent.position.distance(to) > receiver.position.distance(to)) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    }

    if (
      Math.abs(opponentLocal.y) <
      opponent.speedPerSecond *
        this.ball.timeToCoverDistance(opponentLocal.x, power)
    ) {
      return false;
    }

    return true;
  }

  public setClosestPlayer() {
    let closestPlayer = this.players[0];

    this.players.forEach((player: PlayerBase) => {
      if (
        player.position.distance(this.ball.position) <
        closestPlayer.position.distance(this.ball.position)
      ) {
        closestPlayer = player;
      }
    });

    this._closestPlayer = closestPlayer;
  }

  public setControllingPlayer(player: PlayerBase) {
    this._controllingPlayer = player;
    this.opponents.controllingPlayer = null;
    this.setReceivingPlayer(null);
    this.setSupportingPlayer(null);
  }

  public setReceivingPlayer(player: PlayerBase) {
    this._receivingPlayer = player;
  }

  public setSupportingPlayer(player: PlayerBase) {
    if (this.supportingPlayer) {
      this.supportingPlayer.returnHome();
    }

    this._supportingPlayer = player;

    if (this.supportingPlayer) {
      this.supportingPlayer.support();
    }
  }

  public setOpponents(team: Team) {
    this._opponents = team;
  }

  public getSupportSpot(): Spot {
    return this._spots.supportSpot;
  }

  public set receivingPlayer(player: PlayerBase) {
    this._receivingPlayer = player;
  }

  public set controllingPlayer(player: PlayerBase) {
    this._controllingPlayer = player;
  }

  public set supportingPlayer(player: PlayerBase) {
    this._supportingPlayer = player;
  }

  public get isInControl(): boolean {
    return !!this.controllingPlayer;
  }

  public get isAllPlayersHome(): boolean {
    return this.players.every((player: PlayerBase) => player.isAtHome);
  }

  public get pitch(): GameScene {
    return this._pitch;
  }

  public get ball(): Ball {
    return this.scene.ball;
  }

  public get players(): PlayerBase[] {
    return this._players;
  }

  public get opponents(): Team {
    return this._opponents;
  }

  public get isLeft(): boolean {
    return this._isLeft;
  }

  public get goalOpp(): Goal {
    return this._goalOpp;
  }

  public get goalHome(): Goal {
    return this._goalHome;
  }

  public get closestPlayer(): PlayerBase {
    return this._closestPlayer;
  }

  public get receivingPlayer(): PlayerBase {
    return this._receivingPlayer;
  }

  public get supportingPlayer(): PlayerBase {
    return this._supportingPlayer;
  }

  public get controllingPlayer(): PlayerBase {
    return this._controllingPlayer;
  }

  public get closestPlayerOnPitchToBall(): PlayerBase {
    return this.closestPlayer.position.distance(this.ball.position) <
      this.opponents.closestPlayer.position.distance(this.ball.position)
      ? this.closestPlayer
      : this.opponents.closestPlayer;
  }
}
