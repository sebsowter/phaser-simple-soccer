import PlayerBase from "./PlayerBase";
import PlayerField from "./PlayerField";
import PlayerKeeper from "./PlayerKeeper";
import { Players, Teams } from "../constants";
import { PlayerProps, TeamProps } from "../types";
import GameScene from "../GameScene";

export default class Team extends Phaser.GameObjects.Group {
  public scene: GameScene;
  private players: PlayerBase[];

  constructor(scene: Phaser.Scene, teamId: number) {
    super(scene);

    //this.setData('')

    const team: TeamProps = Teams.find((team: TeamProps) => team.id === teamId);
    const players: PlayerProps[] = team.players.map((id: number) => {
      return Players.find((player: PlayerProps) => player.id === id);
    });

    this.players = players.map((player: PlayerProps) => {
      const position = new Phaser.Math.Vector2(
        Phaser.Math.Between(64, 1280 - 64),
        Phaser.Math.Between(64, 704 - 64)
      );

      return player.position === "GK"
        ? new PlayerKeeper(this.scene, position.x, position.y, team.frame)
        : new PlayerField(this.scene, position.x, position.y, team.frame);
    });
  }

  public get closestToBall(): PlayerBase {
    const { ball } = this.scene;

    let closest = this.players[0];

    this.players.forEach((player: PlayerBase) => {
      const distance1 = Phaser.Math.Distance.Between(
        closest.x,
        closest.y,
        ball.x,
        ball.y
      );
      const distance2 = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        ball.x,
        ball.y
      );

      if (distance2 < distance1) {
        closest = player;
      }
    });

    return closest;
  }

  public get supportingPlayer(): PlayerBase {
    return this.players[0] || null;
  }

  public get controllingPlayer(): PlayerBase {
    return this.players[0] || null;
  }

  public get receivingPlayer(): PlayerBase {
    return this.players[0] || null;
  }
}
