import PlayerBase from "./PlayerBase";
import PlayerField from "./PlayerField";
import PlayerKeeper from "./PlayerKeeper";
import Spot from "./Spot";
import { Players, Teams, redRegions, blueRegions } from "../constants";
import { PlayerProps, TeamProps } from "../types";
import { calculateSupportingPlayer, distanceBetween } from "../utils";
import GameScene from "../GameScene";

enum States {
  waiting = 0,
  defending = 1,
  attacking = 2,
}

export default class Team extends Phaser.GameObjects.Group {
  public scene: GameScene;
  public state: number;
  private isLeft: boolean;
  private players: PlayerBase[];
  private _controllingPlayer: PlayerBase;
  private _supportingPlayer: PlayerBase;
  private _receivingPlayer: PlayerBase;
  private _closestPlayer: PlayerBase;
  private homeRegions: number[];

  constructor(scene: Phaser.Scene, teamId: number, isLeft: boolean) {
    super(scene);

    this.scene.add.existing(this);

    this.isLeft = isLeft;

    const team: TeamProps = Teams.find((team: TeamProps) => team.id === teamId);
    const players: PlayerProps[] = team.players.map((id: number) => {
      return Players.find((player: PlayerProps) => player.id === id);
    });

    this.players = players.map((props: PlayerProps) => {
      const position = new Phaser.Math.Vector2(
        Phaser.Math.Between(64, 1280 - 64),
        Phaser.Math.Between(64, 704 - 64)
      );

      return props.position === "GK"
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
    });

    this.setState(States.waiting);
    this.setHomeRegions();
  }

  public preUpdate(time: number, delta: number): void {
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

    super.preUpdate(time, delta);
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

    return this;
  }

  public get supportingPlayer(): PlayerBase {
    return this._supportingPlayer;
  }

  public calculateSupportingPlayer(): void {
    let bestPlayer = this.players[0];
    let bestScore: number = 0;

    this.players.forEach((player: PlayerBase) => {
      const spots: Spot[] = [];

      let spotBest: Spot = null;
      let spotBestScore: number = 0;

      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          spots.push(new Spot(x * 8, y * 8));
        }
      }

      spots.forEach((spot: Spot) => {
        spot.score = 0;

        let canPass = false;

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

        if (spot.score > spotBestScore) {
          spotBest = spot;
          spotBestScore = spot.score;
        }
      });

      if (spotBestScore > bestScore) {
        bestPlayer = player;
        bestScore = spotBestScore;
      }
    });

    this.supportingPlayer = bestPlayer;
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
