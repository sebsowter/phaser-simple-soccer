import { MAX_PASS_POWER, Players, Teams, TIME_DELTA_MILI } from "../constants";
import { getRegionPos, setText } from "../utils";
import { PlayerProps, TeamProps } from "../types";
import { GameScene } from "../scenes";
import { SupportSpots, Spot, PlayerBase, Goal, Ball } from "./";

enum States {
  PrepareForKickOff = 0,
  Defending = 1,
  Attacking = 2,
}

export default class Team extends Phaser.GameObjects.Group {
  public scene: GameScene;
  public spots: SupportSpots;
  public isLeft: boolean;
  public regions: any;
  public goal: Goal;
  public state: States;
  public opponents: Team;
  public players: PlayerBase[];
  public controllingPlayer: PlayerBase = null;
  public supportingPlayer: PlayerBase = null;
  public receivingPlayer: PlayerBase = null;
  public closestPlayer: PlayerBase = null;

  constructor(
    scene: Phaser.Scene,
    teamId: number,
    isLeft: boolean,
    goal: Goal,
    regions: any
  ) {
    super(scene);

    this.scene.add.existing(this);

    this.isLeft = isLeft;
    this.goal = goal;
    this.regions = regions;

    const team: TeamProps = Teams.find((team: TeamProps) => team.id === teamId);
    const players: PlayerProps[] = team.players.map((id: number) => {
      return Players.find((player: PlayerProps) => player.id === id);
    });

    this.players = players.map((props: PlayerProps, index: number) => {
      const player = new PlayerBase(
        this.scene,
        Phaser.Math.Between(64, 1280 - 64),
        Phaser.Math.Between(64, 704 - 64),
        team.frame,
        props,
        index,
        team.name,
        getRegionPos(this.regions.defending[index]),
        this
      );

      this.add(player);

      return player;
    });

    this.setState(States.PrepareForKickOff);

    this.spots = new SupportSpots(this, isLeft, this.scene);
  }

  public preUpdate(): void {
    this.setClosestPlayer();

    switch (this.state) {
      case States.PrepareForKickOff:
        if (this.isAllPlayersHome && this.opponents.isAllPlayersHome) {
          this.setState(States.Defending);
        }
        break;
      case States.Defending:
        if (this.isInControl) {
          this.setState(States.Attacking);
        }
        break;
      case States.Attacking:
        if (this.isInControl) {
          this.spots.calculateSupportSpot();
        } else {
          this.setState(States.Defending);
        }
        break;
    }

    setText(
      `#${this.isLeft ? "blue" : "red"}-receiving`,
      this.receivingPlayer
        ? `Player ${this.receivingPlayer.getData("index") + 1}`
        : "-"
    );
  }

  public setState(value: number): this {
    const selector = `#${this.isLeft ? "red" : "blue"}-state`;

    this.state = value;

    switch (value) {
      case States.PrepareForKickOff:
        setText(selector, "PrepareForKickOff");
        this.closestPlayer = null;
        this.controllingPlayer = null;
        this.receivingPlayer = null;
        this.supportingPlayer = null;
        this.setHomeRegions(value);
        this.updateTargetsOfWaitingPlayers();
        //this.returnAllToHome();
        break;
      case States.Defending:
        setText(selector, "Defending");
        this.setSupportingPlayer(null);
        this.setHomeRegions(value);
        this.updateTargetsOfWaitingPlayers();
        //this.returnWaitingToHome();
        break;
      case States.Attacking:
        setText(selector, "Attacking");
        this.setHomeRegions(value);
        this.updateTargetsOfWaitingPlayers();
        //this.returnAllToHome();
        this.supportingPlayer = this.calculateSupportingPlayer();
        break;
    }

    return this;
  }

  public canShoot(
    position: Phaser.Math.Vector2,
    power: number,
    attempts: number = 3
  ): any[] {
    const target = this.goal.position.clone();
    const targetHeght = this.goal.height - this.ball.height;

    while (attempts--) {
      target.y =
        this.goal.position.y - targetHeght / 2 + Math.random() * targetHeght;

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
    const position = this.ball.position;
    const distance = position.distance(receiver.position);
    const time = this.ball.timeToCoverDistance(distance, power);

    if (time <= 0) {
      return null;
    }

    const interceptRange = receiver.speedPerSecond * time;
    const receiverAngle = Phaser.Math.Angle.BetweenPoints(
      position,
      receiver.position
    );
    const passAngle = Math.sin(interceptRange / distance);
    const passLeft = new Phaser.Math.Vector2(
      position.x + distance * Math.cos(receiverAngle - passAngle),
      position.y + distance * Math.sin(receiverAngle - passAngle)
    );
    const passRight = new Phaser.Math.Vector2(
      position.x + distance * Math.cos(receiverAngle + passAngle),
      position.y + distance * Math.sin(receiverAngle + passAngle)
    );

    this.scene.spot.x = passLeft.x;
    this.scene.spot.y = passLeft.y;
    this.scene.spot2.x = passRight.x;
    this.scene.spot2.y = passRight.y;

    let closestSoFar = 10000;
    let passTarget = null;

    [passLeft, receiver.position, passRight].forEach(
      (pass: Phaser.Math.Vector2) => {
        const distance = Math.abs(pass.x - this.goal.position.x);

        if (
          distance < closestSoFar &&
          this.scene.pitch.contains(pass.x, pass.y) &&
          this.isPassSafeFromAllOpponents(position, pass, receiver, power)
        ) {
          closestSoFar = distance;
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

    this.players.forEach((player: PlayerBase) => {
      if (
        player !== passer &&
        passer.position.distance(player.position) > minimumPassingDistance
      ) {
        const pass = this.getBestPassToReceiver(player, power);

        if (pass) {
          const distance = Math.abs(pass.x - this.goal.position.x);

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

  public requestPass(player: PlayerBase): void {
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

  public requestSupport(): void {
    // console.log("Request support");
    /*
    const supportingPlayer = this.calculateSupportingPlayer();

    if (
      supportingPlayer &&
      (!this.supportingPlayer || supportingPlayer !== this.supportingPlayer)
    ) {
      if (this.supportingPlayer) {
        this.supportingPlayer.returnHome();
      }

      this.supportingPlayer = supportingPlayer;
      this.supportingPlayer.support();
    }

    setText(
      `#${this.isLeft ? "red" : "blue"}-supporting`,
      `Player ${this.supportingPlayer.getData("index") + 1}`
    );
    */
  }

  public setHomeRegions(state: number): void {
    const { defending, attacking } = this.regions;
    const region = state === States.Attacking ? attacking : defending;

    this.players.forEach((player: PlayerBase, index: number) => {
      player.setHome(getRegionPos(region[index]));
    });
  }

  public updateTargetsOfWaitingPlayers(): void {
    this.players.forEach((player: PlayerBase) => {
      player.returnHomeIfWaiting(player.home);
    });
  }

  public returnAllToHome(): void {
    this.players.forEach((player: PlayerBase) => {
      player.returnHome();
    });
  }

  public calculateSupportingPlayer(): PlayerBase {
    let closestSoFar = 100000;
    let bestPlayer = this.players[0];

    this.players.forEach((player: PlayerBase) => {
      if (player !== this.controllingPlayer) {
        const distance = new Phaser.Math.Vector2()
          .setFromObject(player)
          .distance(this.spots.calculateSupportSpot());

        if (distance < Math.sqrt(closestSoFar)) {
          closestSoFar = distance;
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

  public setClosestPlayer(): void {
    let closestPlayer = this.players[0];

    this.players.forEach((player: PlayerBase) => {
      if (
        new Phaser.Math.Vector2()
          .setFromObject(player)
          .distance(this.ball.position) <
        new Phaser.Math.Vector2()
          .setFromObject(closestPlayer)
          .distance(this.ball.position)
      ) {
        closestPlayer = player;
      }
    });

    setText(
      `#${this.isLeft ? "red" : "blue"}-closest`,
      `Player ${closestPlayer.getData("index") + 1}`
    );

    this.closestPlayer = closestPlayer;
  }

  public setControllingPlayer(player: PlayerBase): void {
    setText(
      `#${this.isLeft ? "red" : "blue"}-controlling`,
      `Player ${player.getData("index") + 1}`
    );
    setText(`#${this.isLeft ? "blue" : "red"}-controlling`, "-");

    this.controllingPlayer = player;
    this.opponents.controllingPlayer = null;
    this.setReceivingPlayer(null);
    this.setSupportingPlayer(null);
  }

  public setReceivingPlayer(player: PlayerBase): void {
    this.receivingPlayer = player;
  }

  public setSupportingPlayer(player: PlayerBase): void {
    setText(
      `#${this.isLeft ? "blue" : "red"}-supporting`,
      player ? `Player ${player.getData("index") + 1}` : "-"
    );

    this.supportingPlayer = player;
  }

  public setOpponents(opponents: Team): void {
    this.opponents = opponents;
  }

  public getSupportSpot(): Spot {
    return this.spots.calculateSupportSpot();
  }

  public get isInControl(): boolean {
    return !!this.controllingPlayer;
  }

  public get isAllPlayersHome(): boolean {
    return this.players.every((player: PlayerBase) => player.isAtHome);
  }

  public get ball(): Ball {
    return this.scene.ball;
  }
}
