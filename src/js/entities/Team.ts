import PlayerBase from "./PlayerBase";
import PlayerField from "./PlayerField";
import PlayerKeeper from "./PlayerKeeper";
import Spot from "./Spot";
import { Players, Teams, redRegions, blueRegions } from "../constants";
import { PlayerProps, TeamProps } from "../types";
import { distanceBetween } from "../utils";
import GameScene from "../GameScene";

enum States {
  waiting = 0,
  defending = 1,
  attacking = 2,
}

function getRegionPosition(region: number): Phaser.Math.Vector2 {
  const COLS = 6;

  return new Phaser.Math.Vector2(
    64 + 96 + (region % COLS) * 192,
    64 + 96 + Math.floor(region / COLS) * 192
  );
}

export default class Team extends Phaser.GameObjects.Container {
  public scene: GameScene;
  public state: number;
  private spots: Spot[];
  private isLeft: boolean;
  private goalPosition: Phaser.Math.Vector2;
  public oponents: PlayerBase[];
  public players: PlayerBase[];
  private _controllingPlayer: PlayerBase;
  private _supportingPlayer: PlayerBase;
  private _receivingPlayer: PlayerBase;
  private _closestPlayer: PlayerBase;
  private homeRegions: number[];

  constructor(scene: Phaser.Scene, teamId: number, isLeft: boolean) {
    super(scene);

    this.scene.add.existing(this);

    this.isLeft = isLeft;
    this.goalPosition = new Phaser.Math.Vector2().setFromObject(
      this.isLeft ? this.scene.goalA : this.scene.goalB
    );

    const team: TeamProps = Teams.find((team: TeamProps) => team.id === teamId);
    const players: PlayerProps[] = team.players.map((id: number) => {
      return Players.find((player: PlayerProps) => player.id === id);
    });

    this.players = players.map((props: PlayerProps) => {
      const position = new Phaser.Math.Vector2(
        Phaser.Math.Between(64, 1280 - 64),
        Phaser.Math.Between(64, 704 - 64)
      );

      const player =
        props.position === "GKdddd"
          ? new PlayerKeeper(
              this.scene,
              position.x,
              position.y,
              team.frame,
              props
            )
          : new PlayerField(
              this.scene,
              position.x,
              position.y,
              team.frame,
              props
            );

      this.add(player);

      return player;
    });

    this.oponents = this.players;

    this.setState(States.waiting);
    this.setHomeRegions();
    this.setSupportSpots();

    setTimeout(() => {
      if (isLeft) {
        const result = this.isPassSafeFromOpponent(
          new Phaser.Math.Vector2(this.players[0].x, this.players[0].y),
          new Phaser.Math.Vector2(this.players[2].x, this.players[2].y),
          this.players[2],
          this.oponents[3],
          200
        );
      }
    }, 500);
  }

  public preUpdate(): void {
    switch (this.state) {
      case States.waiting:
        if (this.allPlayersHome) {
          this.setState(States.defending);
        }
        break;
      case States.defending:
        if (this.isInControl) {
          this.setState(States.attacking);
        }
        break;
      case States.attacking:
        if (!this.isInControl) {
          this.setState(States.defending);
        }
        break;
    }
  }

  public setState(value: number): this {
    this.state = value;

    switch (value) {
      case States.waiting:
        this.controllingPlayer = null;
        this.supportingPlayer = null;
        this.controllingPlayer = null;
        this.controllingPlayer = null;
        this.returnAllToHome();
        break;
      case States.defending:
        this.setHomeRegions();
        this.returnAllToHome();
        break;
      case States.attacking:
        this.setHomeRegions();
        this.returnAllToHome();
        this.calculateSupportingPlayer();
        break;
    }

    return this;
  }

  public canShoot(
    from?: any,
    to?: any,
    angle?: number,
    power?: number
  ): boolean {
    const NumAttemptsToFindValidStrike = 100;
    const { ball, goalA, goalB } = this.scene;

    let attempts = NumAttemptsToFindValidStrike;

    while (attempts--) {
      const goal = this.isLeft ? goalB : goalA;
      const randomY = goal.y + (Math.random() * goal.height - goal.height / 2);
      const target = new Phaser.Math.Vector2(
        this.isLeft ? goal.x + 16 : goal.x - 16,
        randomY
      );
      const ballPosition = new Phaser.Math.Vector2().setFromObject(ball);
      const time = ball.timeToCoverDistance(ballPosition, target, power);

      if (
        time > 0 &&
        this.isPassSafeFromAllOpponents(ballPosition, target, null, power)
      ) {
        return true;
      }
    }

    return false;
  }

  public getBestPassToReceiver(
    passer: PlayerBase,
    receiver: PlayerBase,
    target: Phaser.Math.Vector2,
    power: number
  ) {
    const ballPosition = new Phaser.Math.Vector2().setFromObject(
      this.scene.ball
    );
    const receiverPosition = new Phaser.Math.Vector2().setFromObject(receiver);
    const time = this.scene.ball.timeToCoverDistance(
      ballPosition,
      receiverPosition,
      power
    );

    if (time <= 0) {
      return false;
    }

    let InterceptRange = time * receiver.getData("speed");
    const ScalingFactor = 0.3;
    InterceptRange *= ScalingFactor;

    const receiverDistance = Phaser.Math.Distance.BetweenPoints(
      ballPosition,
      receiverPosition
    );
    const receiverAngle = Phaser.Math.Angle.BetweenPoints(
      ballPosition,
      receiverPosition
    );
    const passLeft = new Phaser.Math.Vector2(
      receiverPosition.x +
        InterceptRange * Math.cos(receiverAngle - Math.PI / 2),
      receiverPosition.y +
        InterceptRange * Math.sin(receiverAngle - Math.PI / 2)
    );
    const passRight = new Phaser.Math.Vector2(
      receiverPosition.x -
        InterceptRange * Math.cos(receiverAngle - Math.PI / 2),
      receiverPosition.y -
        InterceptRange * Math.sin(receiverAngle - Math.PI / 2)
    );
    const passes: Phaser.Math.Vector2[] = [
      passLeft,
      receiverPosition,
      passRight,
    ];

    let closestSoFar = 1000;
    let result = false;

    for (let i = 0; i < passes.length; i++) {
      const dist = Math.abs(passes[i].x - this.goalPosition.x);

      if (
        dist < closestSoFar &&
        // TODO: and within pitch bounds
        this.isPassSafeFromAllOpponents(
          ballPosition,
          passes[i],
          receiver,
          power
        )
      ) {
        closestSoFar = dist;
        target = passes[i];
        result = true;
      }
    }

    return result;
  }

  public findPass(
    passer: PlayerBase,
    receiver: PlayerBase,
    target: Phaser.Math.Vector2,
    power: number,
    minPassingDistance: number
  ): boolean {
    const passerPosition = new Phaser.Math.Vector2().setFromObject(passer);
    const ballPosition = new Phaser.Math.Vector2().setFromObject(
      this.scene.ball
    );

    let ClosestToGoalSoFar = 1000; // TODO: Set max
    let ballTarget = null;

    this.players.forEach((player: PlayerBase) => {
      const playerPosition = new Phaser.Math.Vector2().setFromObject(player);

      if (
        player !== passer &&
        passerPosition.distance(passerPosition) >
          minPassingDistance * minPassingDistance
      ) {
        if (this.getBestPassToReceiver(passer, player, ballTarget, power)) {
          const Dist2Goal = Math.abs(ballTarget.x - this.goalPosition.x);

          if (Dist2Goal < ClosestToGoalSoFar) {
            ClosestToGoalSoFar = Dist2Goal;
            receiver = player;
            target = ballTarget;
          }
        }
      }
    });

    if (receiver) {
      return true;
    } else {
      return false;
    }
  }

  public requestPass(player: PlayerBase): void {}

  // ------------------------------------------------

  public isOpponentWithinRadius(
    player: PlayerBase,
    threshhold: number
  ): boolean {
    return this.players.some((props: PlayerBase) => {
      return (
        Phaser.Math.Distance.Between(player.x, player.y, props.x, props.y) <
        threshhold
      );
    });
  }

  public returnAllToHome(): this {
    this.players.forEach((player: PlayerBase) => {
      player.returnHome();
    });

    return this;
  }

  public get isInControl(): boolean {
    return !!this.controllingPlayer;
  }

  public get allPlayersHome(): boolean {
    return this.players.every((player: PlayerBase) => player.isHome);
  }

  public setHomeRegions(): this {
    const regions = this.isLeft ? redRegions : blueRegions;

    this.homeRegions =
      this.state === States.defending ? regions.defending : regions.attacking;

    this.players.forEach((player: PlayerBase, index: number) =>
      player.setTarget(getRegionPosition(this.homeRegions[index]))
    );

    return this;
  }

  public sendPass(player: PlayerBase): void {}

  public requestSupport(): void {
    const s = this.calculateSupportingPlayer();

    s.support();
  }

  public get supportingPlayer(): PlayerBase {
    return this._supportingPlayer;
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

  public isPassSafeFromOpponent(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    receiver: PlayerBase,
    opponent: PlayerBase,
    maxForce: number
  ): boolean {
    console.log("from", from);
    console.log("to", to);
    const opponentPosition = new Phaser.Math.Vector2().setFromObject(opponent);
    const passDistance = Phaser.Math.Distance.BetweenPoints(from, to);
    const angleToTarget = Phaser.Math.Angle.BetweenPoints(from, to);
    const angleToOpponent = Phaser.Math.Angle.BetweenPoints(
      from,
      opponentPosition
    );
    const opponentDistance = Phaser.Math.Distance.BetweenPoints(
      from,
      opponentPosition
    );
    console.log("angle", angleToTarget * Phaser.Math.RAD_TO_DEG);
    console.log("opponentDistance", opponentDistance);
    const opponentLocal = new Phaser.Math.Vector2(
      opponentDistance * Math.cos(angleToOpponent - angleToTarget),
      opponentDistance * Math.sin(angleToOpponent - angleToTarget)
    );
    console.log("opponentLocal", opponentLocal);

    receiver.setTint(0xff6600);
    opponent.setTint(0x00ffff);

    if (opponentLocal.x < 0) {
      return true;
    }

    if (passDistance < opponentDistance) {
      if (receiver) {
        const receiverPosition = new Phaser.Math.Vector2().setFromObject(
          receiver
        );

        if (
          Phaser.Math.Angle.BetweenPoints(to, opponentPosition) >
          Phaser.Math.Angle.BetweenPoints(to, receiverPosition)
        ) {
          return true;
        }
      } else {
        return true;
      }
    }

    const TimeForBall = this.scene.ball.timeToCoverDistance(
      new Phaser.Math.Vector2(),
      new Phaser.Math.Vector2(opponentLocal.x, 0),
      maxForce
    );
    const reach = opponent.getData("speed") * TimeForBall;

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
    //from.setTint(0xffff00);

    return this.scene.teamB.players.every((opponent: PlayerBase) => {
      return this.isPassSafeFromOpponent(
        from,
        to,
        receiver,
        opponent,
        maxForce
      );
    });
  }

  public calculateSupportingPosition(): number {
    let spotBest: Spot = null;
    let scoreBest: number = 0;

    this.spots.forEach((spot: Spot) => {
      spot.score = 1;

      let canPass = false;
      const MAX_PASS_FORCE = 300;

      //Test 1. is it possible to make a safe pass from the ball's position
      //to this position?
      //const canPassScore = this.isPassSafeFromAllOpponents(
      //  contoller,
      //  spot,
      //  MAX_PASS_FORCE
      //);

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

      if (spot.score > scoreBest) {
        spotBest = spot;
        scoreBest = spot.score;
      }
    });

    return scoreBest;
  }

  public calculateSupportingPlayer(): PlayerBase {
    let bestPlayer = this.players[0];
    let bestScore: number = 0;

    this.players.forEach((player: PlayerBase) => {
      const score = this.calculateSupportingPosition();

      if (score > bestScore) {
        bestPlayer = player;
        bestScore = score;
      }
    });

    this.supportingPlayer = bestPlayer;

    return bestPlayer;
  }

  public get closestPlayer(): PlayerBase {
    const { ball } = this.scene;

    let closest = this.players[0];

    this.players.forEach((player: PlayerBase) => {
      if (distanceBetween(player, ball) < distanceBetween(closest, ball)) {
        closest = player;
      }
    });

    //this.closestPlayer = closest;

    return closest;
  }

  public get controllingPlayer(): PlayerBase {
    return this.players[0] || null;
  }

  public get receivingPlayer(): PlayerBase {
    return this.players[0] || null;
  }

  public set supportingPlayer(value: PlayerBase) {
    this._supportingPlayer = value;
  }

  public set controllingPlayer(value: PlayerBase) {
    this._controllingPlayer = value;
  }

  public set receivingPlayer(value: PlayerBase) {
    this._receivingPlayer = value;
  }

  public set closestPlayer(value: PlayerBase) {
    this._closestPlayer = value;
  }
}
