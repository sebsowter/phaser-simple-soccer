import PlayerBase from "./PlayerBase";
import Spot from "./Spot";
import { Players, Teams } from "../constants";
import { getRegionPos, setText } from "../utils";
import { PlayerProps, TeamProps } from "../types";
import GameScene from "../scenes/GameScene";
import Goal from "./Goal";

enum States {
  PrepareForKickOff = 0,
  Defending = 1,
  Attacking = 2,
}

export default class Team extends Phaser.GameObjects.Container {
  public scene: GameScene;
  public spots: Spot[];
  public isLeft: boolean;
  public regions: any;
  public goal: Goal;
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
      return new PlayerBase(
        this.scene,
        Phaser.Math.Between(64, 1280 - 64),
        Phaser.Math.Between(64, 704 - 64),
        team.frame,
        props,
        index,
        team.name
      );
    });

    this.add(this.players);
    this.setState(States.PrepareForKickOff);
    this.setSupportSpots();
  }

  public preUpdate(): void {
    this.setClosestPlayer();

    switch (this.state) {
      case States.PrepareForKickOff:
        if (this.allPlayersHome && this.opponents.allPlayersHome) {
          this.setState(States.Defending);
        }
        break;
      case States.Defending:
        if (this.isInControl) {
          this.setState(States.Attacking);
        }
        break;
      case States.Attacking:
        if (!this.isInControl) {
          this.setState(States.Defending);
        }

        this.calculateSupportingPos();
        break;
    }
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
        //this.returnAllToHome();
        break;
      case States.Defending:
        setText(selector, "Defending");
        this.setHomeRegions(value);
        //this.returnWaitingToHome();
        break;
      case States.Attacking:
        setText(selector, "Attacking");
        this.setHomeRegions(value);
        //this.returnAllToHome();
        this.supportingPlayer = this.calculateSupportingPlayer();
        break;
    }

    return this;
  }

  public canShoot(ballPos: Phaser.Math.Vector2, power: number): any[] {
    const goalPos = new Phaser.Math.Vector2().setFromObject(this.goal);
    const goalHeight = this.goal.height;
    const shootPos = goalPos.clone();

    let attempts = 8;

    while (attempts--) {
      shootPos.y = goalPos.y - goalHeight / 2 + Math.random() * goalHeight;

      if (
        this.scene.ball.timeToCoverDistance(ballPos, shootPos, power) >= 0 &&
        this.isPassSafeFromAllOpponents(ballPos, shootPos, null, power)
      ) {
        return [true, shootPos];
      }
    }

    return [false, shootPos];
  }

  public getBestPassToReceiver(
    passer: PlayerBase,
    receiver: PlayerBase,
    power: number
  ) {
    const ballPos = new Phaser.Math.Vector2().setFromObject(this.scene.ball);
    const receiverPos = new Phaser.Math.Vector2().setFromObject(receiver);
    const time = this.scene.ball.timeToCoverDistance(
      ballPos,
      receiverPos,
      power
    );

    if (time <= 0) {
      return false;
    }

    const scalingFactor = 0.3;
    const interceptRange = time * receiver.getData("speed") * scalingFactor;
    const receiverAngle = Phaser.Math.Angle.BetweenPoints(ballPos, receiverPos);
    const passLeft = new Phaser.Math.Vector2(
      receiverPos.x + interceptRange * Math.cos(receiverAngle - Math.PI / 2),
      receiverPos.y + interceptRange * Math.sin(receiverAngle - Math.PI / 2)
    );
    const passRight = new Phaser.Math.Vector2(
      receiverPos.x - interceptRange * Math.cos(receiverAngle - Math.PI / 2),
      receiverPos.y - interceptRange * Math.sin(receiverAngle - Math.PI / 2)
    );
    const passes: Phaser.Math.Vector2[] = [passLeft, receiverPos, passRight];

    let closestSoFar = 1000;
    let result = false;
    let passTarget = null;

    passes.forEach((pass: Phaser.Math.Vector2) => {
      const dist = Math.abs(pass.x - this.goal.x);

      if (
        dist < closestSoFar &&
        // TODO: and within pitch bounds
        this.isPassSafeFromAllOpponents(ballPos, pass, receiver, power)
      ) {
        closestSoFar = dist;
        passTarget = pass;
        result = true;
      }
    });

    return [result, passTarget];
  }

  public findPass(
    passer: PlayerBase,
    power: number,
    minPassingDist: number
  ): any[] {
    const passerPos = new Phaser.Math.Vector2().setFromObject(passer);

    let closestToGoalSoFar = 1000;
    let targetPos = null;
    let receiver = null;

    this.players.forEach((player: PlayerBase) => {
      const playerPos = new Phaser.Math.Vector2().setFromObject(player);

      if (player !== passer && passerPos.distance(playerPos) > minPassingDist) {
        const bestPass = this.getBestPassToReceiver(passer, player, power);

        if (bestPass[0]) {
          const passPoss = bestPass[1];
          const goalDistance = Math.abs(passPoss.x - this.goal.x);

          if (goalDistance < closestToGoalSoFar) {
            closestToGoalSoFar = goalDistance;
            receiver = player;
            targetPos = passPoss;
          }
        }
      }
    });

    if (receiver) return [true, receiver, targetPos];
    else return [false, null, null];
  }

  public requestPass(player: PlayerBase): void {}

  public isOpponentWithinRadius(
    position: Phaser.Math.Vector2,
    radius: number
  ): boolean {
    return this.opponents.players.some((opponent: PlayerBase) => {
      return (
        Phaser.Math.Distance.BetweenPoints(
          position,
          new Phaser.Math.Vector2().setFromObject(opponent)
        ) < radius
      );
    });
  }

  public requestSupport(): void {
    this.supportingPlayer = this.calculateSupportingPlayer();
    this.supportingPlayer.setTint(0x66ff66);
    this.supportingPlayer.support();
    setText(
      `#${this.isLeft ? "red" : "blue"}-supporting`,
      `Player ${this.supportingPlayer.getData("index") + 1}`
    );
  }

  public setHomeRegions(state: number): void {
    const { defending, attacking } = this.regions;
    const region = state === States.Attacking ? attacking : defending;

    this.players.forEach((player: PlayerBase, index: number) => {
      player.setHome(getRegionPos(region[index]));
    });
  }

  public returnAllToHome(): void {
    this.players.forEach((player: PlayerBase) => {
      player.returnHome();
    });
  }

  public setSupportSpots(): void {
    const CENTER_X = 640;
    const CENTER_Y = 352;
    const CENTER_A = 96;
    const GAP = 128;
    const N = 4;
    const LENGTH = (N - 1) * GAP;

    this.spots = [];

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const anchor = new Phaser.Math.Vector2(
          this.isLeft ? CENTER_X + CENTER_A : CENTER_X - LENGTH - CENTER_A,
          CENTER_Y - LENGTH / 2
        );
        const position = new Phaser.Math.Vector2(
          anchor.x + x * GAP,
          anchor.y + y * GAP
        );

        this.spots.push(new Spot(position.x, position.y));
        this.scene.add.circle(position.x, position.y, 8, 0x999999).setDepth(1);
      }
    }
  }

  public calculateSupportingPos(): number {
    const MAX_SHOT_FORCE = 400;
    const MAX_PASS_FORCE = 300;
    const PASS_SAFE_STRENGTH = 2;
    const CAN_SHOOT_STRENGTH = 1;
    const DISTANCE_FROM_CONTROLLLING_STRENGTH = 2;

    let spotBest: Spot = null;
    let scoreBest: number = 0;

    this.spots.forEach((spot: Spot) => {
      spot.score = 1;

      if (
        this.isPassSafeFromAllOpponents(
          new Phaser.Math.Vector2().setFromObject(this.controllingPlayer),
          spot,
          null,
          MAX_PASS_FORCE
        )
      ) {
        spot.score += PASS_SAFE_STRENGTH;
      }

      const canShoot = this.canShoot(spot, MAX_SHOT_FORCE);

      if (canShoot[0]) {
        spot.score += CAN_SHOOT_STRENGTH;
      }

      if (this.supportingPlayer) {
        const controllingPlayerPos = new Phaser.Math.Vector2().setFromObject(
          this.controllingPlayer
        );
        const OPTIMAL_DISTANCE = 200;
        const distance = Phaser.Math.Distance.BetweenPoints(
          spot,
          controllingPlayerPos
        );
        const normal = Math.abs(OPTIMAL_DISTANCE - distance);

        if (normal < OPTIMAL_DISTANCE) {
          spot.score +=
            (DISTANCE_FROM_CONTROLLLING_STRENGTH *
              (OPTIMAL_DISTANCE - normal)) /
            OPTIMAL_DISTANCE;
        }
      }

      if (spot.score > scoreBest) {
        spotBest = spot;
        scoreBest = spot.score;
      }
    });

    return scoreBest;
  }

  public calculateSupportingPlayer(): PlayerBase {
    let bestPlayer = this.players[0];
    let bestScore = 0;

    this.players.forEach((player: PlayerBase) => {
      const score = this.calculateSupportingPos();

      if (score > bestScore) {
        bestPlayer = player;
        bestScore = score;
      }
    });

    return bestPlayer;
  }

  public isPassSafeFromOpponent(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    receiver: PlayerBase,
    opponent: PlayerBase,
    maxForce: number
  ): boolean {
    const passDist = Phaser.Math.Distance.BetweenPoints(from, to);
    const passAngle = Phaser.Math.Angle.BetweenPoints(from, to);
    const opponentPos = new Phaser.Math.Vector2().setFromObject(opponent);
    const opponentAngle = Phaser.Math.Angle.BetweenPoints(from, opponentPos);
    const opponentDist = Phaser.Math.Distance.BetweenPoints(from, opponentPos);
    const opponentLocal = new Phaser.Math.Vector2(
      opponentDist * Math.cos(opponentAngle - passAngle),
      opponentDist * Math.sin(opponentAngle - passAngle)
    );

    //receiver.setTint(0xff6600);
    //opponent.setTint(0x00ffff);

    if (opponentLocal.x < 0) {
      return true;
    }

    if (passDist < opponentDist) {
      if (receiver) {
        const receiverPos = new Phaser.Math.Vector2().setFromObject(receiver);

        if (
          Phaser.Math.Distance.BetweenPoints(opponentPos, to) >
          Phaser.Math.Distance.BetweenPoints(receiverPos, to)
        ) {
          return true;
        }
      } else {
        return true;
      }
    }

    const timeToCoverDistance = this.scene.ball.timeToCoverDistance(
      new Phaser.Math.Vector2(),
      new Phaser.Math.Vector2(opponentLocal.x, 0),
      maxForce
    );
    const reach = opponent.getData("speed") * timeToCoverDistance;

    if (Math.abs(opponentLocal.y) < reach) {
      return false;
    }

    return true;
  }

  public isPassSafeFromAllOpponents(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    receiver: PlayerBase,
    maxForce: number
  ): boolean {
    return this.opponents.players.every((opponent: PlayerBase) => {
      return this.isPassSafeFromOpponent(
        from,
        to,
        receiver,
        opponent,
        maxForce
      );
    });
  }

  public setClosestPlayer(): void {
    const ballPos = new Phaser.Math.Vector2().setFromObject(this.scene.ball);

    let closestPlayer = this.players[0];

    this.players.forEach((player: PlayerBase) => {
      const closestPos = new Phaser.Math.Vector2().setFromObject(closestPlayer);
      const playerPos = new Phaser.Math.Vector2().setFromObject(player);

      if (
        Phaser.Math.Distance.BetweenPoints(playerPos, ballPos) <
        Phaser.Math.Distance.BetweenPoints(closestPos, ballPos)
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
    setText(
      `#${this.isLeft ? "blue" : "red"}-receiving`,
      player ? `Player ${player.getData("index") + 1}` : "-"
    );
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

  public getSupportSpot(): number {
    return this.calculateSupportingPos();
  }

  public get isInControl(): boolean {
    return !!this.controllingPlayer;
  }

  public get allPlayersHome(): boolean {
    return this.players.every((player: PlayerBase) => player.isAtHome);
  }
}
