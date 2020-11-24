import PlayerBase from "./PlayerBase";
import Spot from "./Spot";
import { Players, Teams } from "../constants";
import { PlayerProps, TeamProps } from "../types";
import GameScene from "../GameScene";
import Goal from "./Goal";

enum States {
  PrepareForKickOff = 0,
  Defending = 1,
  Attacking = 2,
}

function getRegionPos(region: number): Phaser.Math.Vector2 {
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
  public isLeft: boolean;
  public regions: any;
  public goal: Goal;
  public homeGoal: Goal;
  public opponents: Team;
  public players: PlayerBase[];

  private _controllingPlayer: PlayerBase = null;
  private _supportingPlayer: PlayerBase = null;
  private _receivingPlayer: PlayerBase = null;
  private _closestPlayer: PlayerBase = null;

  constructor(
    scene: Phaser.Scene,
    teamId: number,
    isLeft: boolean,
    goal: Goal,
    homeGoal: Goal,
    regions: any
  ) {
    super(scene);

    this.scene.add.existing(this);

    this.isLeft = isLeft;
    this.goal = goal;
    this.homeGoal = homeGoal;
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

  public setOpponents(opponents: Team): void {
    this.opponents = opponents;
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
    this.state = value;

    switch (value) {
      case States.PrepareForKickOff:
        document.querySelector(
          `#${this.isLeft ? "red" : "blue"}-state`
        ).innerHTML = "PrepareForKickOff";
        this.closestPlayer = null;
        this.controllingPlayer = null;
        this.receivingPlayer = null;
        this.supportingPlayer = null;
        this.setHomeRegions(value);
        //this.returnAllToHome();
        break;
      case States.Defending:
        document.querySelector(
          `#${this.isLeft ? "red" : "blue"}-state`
        ).innerHTML = "Defending";
        this.setHomeRegions(value);
        //this.returnWaitingToHome();
        break;
      case States.Attacking:
        document.querySelector(
          `#${this.isLeft ? "red" : "blue"}-state`
        ).innerHTML = "Attacking";
        this.setHomeRegions(value);
        //this.returnAllToHome();
        this.supportingPlayer = this.calculateSupportingPlayer();
        break;
    }

    return this;
  }

  public canShoot(ballPos: Phaser.Math.Vector2, power: number): boolean {
    const MAX_ATTEMPTS = 5;
    const { ball } = this.scene;
    const MAX_DISTANCE = 400;

    let attempts = MAX_ATTEMPTS;

    const randomY =
      this.goal.y - this.goal.height / 2 + Math.random() * this.goal.height;

    //while (attempts--) {
    const goalPos = new Phaser.Math.Vector2().setFromObject(this.goal);
    const goalDistance = Phaser.Math.Distance.BetweenPoints(ballPos, goalPos);
    //const time = ball.timeToCoverDistance(ballPos, goalPos, power);

    //console.log(
    //  "isPassSafeFromAllOpponents",
    //  this.isPassSafeFromAllOpponents(ballPos, goalPos, null, power)
    //);

    if (
      // time > 0 &&
      goalDistance < MAX_DISTANCE &&
      this.isPassSafeFromAllOpponents(ballPos, goalPos, null, power)
    ) {
      return true;
    }
    //}

    return false;
  }

  public getBestPassToReceiver(
    passer: PlayerBase,
    receiver: PlayerBase,
    target: Phaser.Math.Vector2,
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

    let InterceptRange = time * receiver.getData("speed");
    const ScalingFactor = 0.3;
    InterceptRange *= ScalingFactor;

    const receiverDist = Phaser.Math.Distance.BetweenPoints(
      ballPos,
      receiverPos
    );
    const receiverAngle = Phaser.Math.Angle.BetweenPoints(ballPos, receiverPos);
    const passLeft = new Phaser.Math.Vector2(
      receiverPos.x + InterceptRange * Math.cos(receiverAngle - Math.PI / 2),
      receiverPos.y + InterceptRange * Math.sin(receiverAngle - Math.PI / 2)
    );
    const passRight = new Phaser.Math.Vector2(
      receiverPos.x - InterceptRange * Math.cos(receiverAngle - Math.PI / 2),
      receiverPos.y - InterceptRange * Math.sin(receiverAngle - Math.PI / 2)
    );
    const passes: Phaser.Math.Vector2[] = [passLeft, receiverPos, passRight];

    let closestSoFar = 1000;
    let result = false;

    for (let i = 0; i < passes.length; i++) {
      const dist = Math.abs(passes[i].x - this.goal.x);

      if (
        dist < closestSoFar &&
        // TODO: and within pitch bounds
        this.isPassSafeFromAllOpponents(ballPos, passes[i], receiver, power)
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
    minPassingDist: number
  ): boolean {
    const passerPos = new Phaser.Math.Vector2().setFromObject(passer);
    const ballPos = new Phaser.Math.Vector2().setFromObject(this.scene.ball);

    let ClosestToGoalSoFar = 1000; // TODO: Set max
    let ballTarget = target;

    this.players.forEach((player: PlayerBase) => {
      const playerPos = new Phaser.Math.Vector2().setFromObject(player);

      if (
        player !== passer &&
        passerPos.distance(playerPos) > minPassingDist * minPassingDist
      ) {
        if (this.getBestPassToReceiver(passer, player, ballTarget, power)) {
          const Dist2Goal = Math.abs(ballTarget.x - this.goal.x);

          if (Dist2Goal < ClosestToGoalSoFar) {
            ClosestToGoalSoFar = Dist2Goal;
            receiver = player;
            target = ballTarget;
          }
        }
      }
    });

    if (receiver) return true;
    else return false;
  }

  // ------------------------------------------------

  public requestPass(player: PlayerBase): void {}

  public isOpponentWithinRadius(
    player: Phaser.Math.Vector2,
    radius: number
  ): boolean {
    return this.opponents.players.some(
      (opponent: PlayerBase) =>
        Phaser.Math.Distance.Between(
          player.x,
          player.y,
          opponent.x,
          opponent.y
        ) < radius
    );
  }

  public requestSupport(): void {
    this.supportingPlayer = this.calculateSupportingPlayer();
    this.supportingPlayer.support();
  }

  /*
   * --------------------------------------------------------
   */

  public get isInControl(): boolean {
    return !!this.controllingPlayer;
  }

  /*
   * --------------------------------------------------------
   */

  public get allPlayersHome(): boolean {
    return this.players.every((player: PlayerBase) => player.isAtHome);
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

  /*
   * --------------------------------------------------------
   */

  public sendPass(
    player: PlayerBase,
    receiver: PlayerBase,
    ballPos: Phaser.Math.Vector2
  ): void {
    receiver.receivePass(player, ballPos);
  }

  /*
  public canPass(
    player: PlayerBase,
    receiver: PlayerBase,
    ballPos: Phaser.Math.Vector2,
    power: number,
    minDistance: number
  ): boolean {
    const playerPos = new Phaser.Math.Vector2().setFromObject(player);

    return this.isPassSafeFromAllOpponents(playerPos, ballPos, receiver, power);
  }
  */

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
    const { ball } = this.scene;
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

    const timeToCoverDistance = ball.timeToCoverDistance(
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
  //---------------------------------------------------------

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

    this.closestPlayer = closestPlayer;
  }

  public set closestPlayer(value: PlayerBase) {
    this._closestPlayer = value;
  }

  public get closestPlayer(): PlayerBase {
    return this._closestPlayer;
  }

  //---------------------------------------------------------

  public setControllingPlayer(player: PlayerBase): void {
    this.controllingPlayer = player;
    this.opponents.controllingPlayer = null;
  }

  public set controllingPlayer(value: PlayerBase) {
    this._controllingPlayer = value;
  }

  public get controllingPlayer(): PlayerBase {
    return this._controllingPlayer;
  }

  //---------------------------------------------------------

  public setReceivingPlayer(player: PlayerBase): void {
    this.receivingPlayer = player;
  }

  public set receivingPlayer(value: PlayerBase) {
    this._receivingPlayer = value;
  }

  public get receivingPlayer(): PlayerBase {
    return this._receivingPlayer;
  }

  //---------------------------------------------------------

  public setSupportingPlayer(player: PlayerBase): void {
    this.supportingPlayer = player;
  }

  public set supportingPlayer(value: PlayerBase) {
    this._supportingPlayer = value;
  }

  public getSupportSpot(): number {
    return this.calculateSupportingPos();
  }

  public calculateSupportingPos(): number {
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

      if (this.controllingPlayer) {
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
      const score = this.calculateSupportingPos();

      if (score > bestScore) {
        bestPlayer = player;
        bestScore = score;
      }
    });

    return bestPlayer;
  }
}
