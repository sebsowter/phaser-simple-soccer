import {
  PlayerProps,
  PlayerRegions,
  PlayerRoles,
  PlayerEvent,
  TeamProps,
} from "../types";
import { MAX_PASS_POWER, SHOOT_ATTEMPTS } from "../constants";
import { getRegionPos } from "../utils";
import { PitchScene } from "../scenes";
import {
  SupportSpots,
  Spot,
  PlayerBase,
  PlayerField,
  PlayerKeeper,
  Goal,
  Ball,
} from "./";

export enum TeamStates {
  PrepareForKickOff,
  Defending,
  Attacking,
}

export default class Team extends Phaser.GameObjects.Group {
  public scene: PitchScene;
  public state: TeamStates;

  private _spots: SupportSpots;
  private _isLeft: boolean;
  private _regions: PlayerRegions;
  private _players: PlayerBase[];
  private _opponents: Team;
  private _goalHome: Goal;
  private _goalOpponents: Goal;
  private _supportingPlayer: PlayerBase = null;
  private _controllingPlayer: PlayerBase = null;
  private _receivingPlayer: PlayerBase = null;
  private _closestPlayer: PlayerBase = null;

  constructor(
    scene: Phaser.Scene,
    team: TeamProps,
    isLeft: boolean,
    goalOpponents: Goal,
    goalHome: Goal
  ) {
    super(scene);

    this.scene.add.existing(this);

    this._goalOpponents = goalOpponents;
    this._goalHome = goalHome;
    this._isLeft = isLeft;
    this._regions = team.regions;
    this._spots = new SupportSpots(this.scene, this, isLeft);
    this._players = team.players.map((props: PlayerProps, index: number) => {
      const PlayerClass =
        props.role === PlayerRoles.Goalkeeper ? PlayerKeeper : PlayerField;
      const position = getRegionPos(this._regions.defending[index]);
      const player = new PlayerClass(
        this.scene,
        position.x,
        position.y,
        team.frame,
        props,
        index,
        team.name,
        position,
        this
      );

      this.add(player);

      return player;
    });

    this.setName(team.name);
    this.setState(TeamStates.PrepareForKickOff);
  }

  public setState(state: TeamStates): this {
    switch (this.state) {
      case TeamStates.PrepareForKickOff:
        this.scene.setGameOn(true);
        break;

      case TeamStates.Attacking:
        this.setSupportingPlayer(null);
        break;
    }

    this.state = state;

    switch (state) {
      case TeamStates.PrepareForKickOff:
        this.setControllingPlayer(null);
        this.setClosestPlayer(null);
        this.setSupportingPlayer(null);
        this.setReceivingPlayer(null);
        this.sendFieldPlayersToHome();
        break;

      case TeamStates.Defending:
        this.updateHomeTargets(this._regions.defending);
        this.updateTargetsOfWaitingPlayers();
        break;

      case TeamStates.Attacking:
        this.updateHomeTargets(this._regions.attacking);
        this.updateTargetsOfWaitingPlayers();
        break;
    }

    return this;
  }

  public preUpdate() {
    this.setClosestPlayer(this.findClosestPlayer());

    switch (this.state) {
      case TeamStates.PrepareForKickOff:
        if (this.allPlayersAtHome && this.opponents.allPlayersAtHome) {
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

  public kickOff() {
    this.setState(TeamStates.PrepareForKickOff);
  }

  public sendFieldPlayersToHome() {
    this.players
      .filter((player: PlayerBase) => player.role !== PlayerRoles.Goalkeeper)
      .forEach((player: PlayerBase) => {
        this.scene.events.emit(PlayerEvent.GO_HOME, player);
      });
  }

  public updateHomeTargets(regions: number[]) {
    this.players
      //.filter((player: PlayerBase) => player.role !== PlayerRoles.Goalkeeper)
      .forEach((player: PlayerBase, index: number) => {
        player.setHome(getRegionPos(regions[index]));
      });
  }

  public updateTargetsOfWaitingPlayers() {
    this.players
      .filter((player: PlayerBase) => player.role !== PlayerRoles.Goalkeeper)
      .forEach((player: PlayerBase) => {
        player.sendHomeIfWaiting();
      });
  }

  public canShoot(
    position: Phaser.Math.Vector2,
    power: number,
    attempts: number = SHOOT_ATTEMPTS
  ): any[] {
    const target = this.goalOpponents.position.clone();
    const targetHeght = this.goalOpponents.bounds.height - this.ball.height;

    while (attempts--) {
      target.y =
        this.goalOpponents.position.y -
        targetHeght * 0.5 +
        Math.random() * targetHeght;

      if (
        this.ball.timeToCoverDistance(position.distance(target), power) >= 0 &&
        this.isPassSafeFromAllOpponents(position, target, null, power)
      ) {
        return [true, target];
      }
    }

    return [false, null];
  }

  public getBestPassToReceiver(receiver: PlayerBase, power: number): any[] {
    const distanceToReceiver = this.ball.position.distance(receiver.position);
    const timeToReceiver = this.ball.timeToCoverDistance(
      distanceToReceiver,
      power
    );

    if (timeToReceiver <= 0) {
      return [false, null];
    }

    const passAngle = Math.sin(
      (receiver.speedPerSecond * timeToReceiver) / distanceToReceiver
    );
    const passLocal = new Phaser.Math.Vector2(distanceToReceiver, 0).rotate(
      Phaser.Math.Angle.BetweenPoints(this.ball.position, receiver.position)
    );
    const passCenter = passLocal.clone().add(this.ball.position);
    const passLeft = passLocal
      .clone()
      .rotate(-passAngle)
      .add(this.ball.position);
    const passRight = passLocal
      .clone()
      .rotate(passAngle)
      .add(this.ball.position);

    let shortestDistanceToGoal = 10000;
    let passTarget = null;

    [passLeft, passCenter, passRight].forEach((target: Phaser.Math.Vector2) => {
      const distanceToGoal = Math.abs(target.x - this.goalOpponents.position.x);

      if (
        distanceToGoal < shortestDistanceToGoal &&
        this.scene.pitch.bounds.contains(target.x, target.y) &&
        this.isPassSafeFromAllOpponents(
          this.ball.position,
          target,
          receiver,
          power
        )
      ) {
        shortestDistanceToGoal = distanceToGoal;
        passTarget = target;
      }
    });

    if (passTarget) {
      return [true, passTarget];
    }

    return [false, null];
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
          const [canPass, passTarget] = this.getBestPassToReceiver(
            player,
            power
          );

          if (canPass) {
            const distance = Math.abs(
              passTarget.x - this.goalOpponents.position.x
            );

            if (distance < closestToGoalSoFar) {
              closestToGoalSoFar = distance;
              receiver = player;
              target = passTarget;
            }
          }
        }
      });

    if (receiver) {
      return [true, receiver, target];
    }

    return [false, null, null];
  }

  public requestPass(requester: PlayerBase) {
    if (
      Math.random() < 0.1 &&
      this.isPassSafeFromAllOpponents(
        this.controllingPlayer.position,
        requester.position,
        requester,
        MAX_PASS_POWER
      )
    ) {
      this.scene.events.emit(
        PlayerEvent.PASS_TO_ME,
        this.controllingPlayer,
        requester
      );
    }
  }

  public calculateSupportingPlayer(): PlayerBase {
    let closest = 100000;
    let bestPlayer = null;

    this.players
      .filter((player: PlayerBase) => {
        return (
          player.role === PlayerRoles.Attacker && !player.isControllingPlayer
        );
      })
      .forEach((player: PlayerBase) => {
        const distance = player.position.distance(this._spots.supportSpot);

        if (distance < closest) {
          closest = distance;
          bestPlayer = player;
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

  public findClosestPlayer(): PlayerBase {
    let closestPlayer = this.players[0];

    this.players.forEach((player: PlayerBase) => {
      if (
        player.position.distance(this.ball.position) <
        closestPlayer.position.distance(this.ball.position)
      ) {
        closestPlayer = player;
      }
    });

    return closestPlayer;
  }

  public setClosestPlayer(closestPlayer: PlayerBase) {
    this._closestPlayer = closestPlayer;
  }

  public setControllingPlayer(player: PlayerBase) {
    this._controllingPlayer = player;

    if (this.opponents) {
      this.opponents.controllingPlayer = null;
    }
  }

  public setReceivingPlayer(player: PlayerBase) {
    this._receivingPlayer = player;
  }

  public setSupportingPlayer(player: PlayerBase) {
    this._supportingPlayer = player;
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

  public get allPlayersAtHome(): boolean {
    return this.players.every((player: PlayerBase) => player.isAtHome);
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

  public get goalOpponents(): Goal {
    return this._goalOpponents;
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
