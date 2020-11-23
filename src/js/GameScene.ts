import { Ball, Goal, Team } from "./entities";
import { redRegions, blueRegions } from "./constants";

export default class GameScene extends Phaser.Scene {
  public ball: Ball;
  public teamA: Team;
  public teamB: Team;
  public goalA: Goal;
  public goalB: Goal;

  constructor() {
    super({
      key: "game",
      active: false,
      visible: false,
    });
  }

  public init(): void {
    this.data.set(
      {
        keeperHasBall: false,
        gameOn: false,
      },
      false
    );
  }

  public create(): void {
    const WALLS = 64;
    const pitch = this.add.image(0, 0, "pitch").setOrigin(0, 0);
    const { width, height } = pitch;

    this.goalA = new Goal(this, WALLS, height / 2, true);
    this.goalB = new Goal(this, width - WALLS, height / 2, false);
    this.ball = new Ball(this, width / 2, height / 2).setDepth(2);
    this.teamA = new Team(this, 1, true, this.goalB, redRegions).setDepth(2);
    this.teamB = new Team(this, 2, false, this.goalA, blueRegions).setDepth(2);
    this.teamA.setOpponents(this.teamB);
    this.teamB.setOpponents(this.teamA);

    this.physics.world.setBounds(
      WALLS,
      WALLS,
      width - WALLS * 2,
      height - WALLS * 2
    );

    this.cameras.main.setBounds(0, 0, width, height);

    /*
    const tilemap = this.make.tilemap({
      key: "tilemap",
    });
    const tileset = tilemap.addTilesetImage("tiles");
    const layer = tilemap.createDynamicLayer(0, tileset, 0, 0);
    const mario = new MarioSprite(this, 32, 192);
    const { widthInPixels, heightInPixels } = tilemap;

    layer.forEachTile(function (tile: Phaser.Tilemaps.Tile) {
      switch (tile.index) {
        case 2:
        case 6:
          tile.setCollision(true);
          break;
        case 9:
        case 10:
          tile.setCollision(false, false, true, false, false);
          break;
      }
    }, this);

    this.physics.world.setBounds(0, 0, widthInPixels, heightInPixels);
    this.physics.world.TILE_BIAS = 8;
    this.physics.add.collider(mario, layer);

    this.cameras.main.setBounds(0, 0, widthInPixels, heightInPixels);
    this.cameras.main.startFollow(mario, true);
    */
  }

  public update(): void {
    switch (this.gameOn) {
      case false:
        if (this.teamA.allPlayersHome && this.teamB.allPlayersHome) {
          this.gameOn = true;
        }
        break;
    }
  }

  public set goalkeeeperHasBall(value: boolean) {
    this.data.set("keeperHasBall", value);
  }

  public get goalkeeeperHasBall(): boolean {
    return this.data.get("keeperHasBall");
  }

  public set gameOn(value: boolean) {
    this.data.set("gameOn", value);
  }

  public get gameOn(): boolean {
    return this.data.get("gameOn");
  }
}
