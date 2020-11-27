import { Players, Teams } from "../constants";
import { getRegionPos, setText } from "../utils";
import { PlayerProps, TeamProps } from "../types";
import { GameScene } from "../scenes";
import { SupportSpots, Spot, PlayerBase, Goal } from "./";

enum States {
  PrepareForKickOff = 0,
  Defending = 1,
  Attacking = 2,
}

export default class Team extends Phaser.GameObjects.Container {
  public scene: GameScene;
  public spots: SupportSpots;
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
        team.name,
        getRegionPos(this.regions.defending[index])
      );
    });

    this.add(this.players);
    this.setState(States.PrepareForKickOff);

    this.spots = new SupportSpots(this, isLeft, this.scene);
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
        //this.returnAllToHome();
        break;
      case States.Defending:
        setText(selector, "Defending");
        this.setSupportingPlayer(null);
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
    const shootPos = this.goal.position.clone();

    let attempts = 8;

    while (attempts--) {
      shootPos.y =
        this.goal.position.y -
        this.goal.height / 2 +
        Math.random() * this.goal.height;

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
      const dist = Math.abs(pass.x - this.goal.goal.x);

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
          const goalDistance = Math.abs(passPoss.x - this.goal.goal.x);

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

  public requestPass(player: PlayerBase): void {
    console.log("Request pass");
  }

  public requestSupport(): void {
    console.log("Request support");
    this.players.forEach((player: PlayerBase) => {
      player.setTint(0xffffff);
    });

    const supportingPlayer = this.calculateSupportingPlayer();

    if (
      supportingPlayer &&
      (!this.supportingPlayer || supportingPlayer !== this.supportingPlayer)
    ) {
      if (this.supportingPlayer) {
        this.supportingPlayer.returnHome();
      }

      this.supportingPlayer = supportingPlayer;
      this.supportingPlayer.setTint(0xffff00);
      this.supportingPlayer.support();
    }

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
      (opponent: PlayerBase) =>
        new Phaser.Math.Vector2().setFromObject(opponent).distance(position) <
        radius
    );
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

  public isPassSafeFromOpponent(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    receiver: PlayerBase,
    opponent: PlayerBase,
    maxForce: number
  ): boolean {
    const passDist = from.distance(to);
    const passAngle = Phaser.Math.Angle.BetweenPoints(from, to);
    const opponentPos = new Phaser.Math.Vector2().setFromObject(opponent);
    const opponentAngle = Phaser.Math.Angle.BetweenPoints(from, opponentPos);
    const opponentDist = from.distance(opponentPos);
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

        if (opponentPos.distance(to) > receiverPos.distance(to)) {
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

  public get allPlayersHome(): boolean {
    return this.players.every((player: PlayerBase) => player.isAtHome);
  }
}
