import { Ball, Goal, Team } from "./entities";
import MarioSprite from "./MarioSprite";

export default class GameScene extends Phaser.Scene {
  public ball: Ball;
  private teamA: Team;
  private teamB: any;
  private goalA: Goal;
  private goalB: Goal;
  private regions: any[];

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
      },
      false
    );
  }

  public create(): void {
    const WALLS = 64;
    const pitch = this.add.image(0, 0, "pitch").setOrigin(0, 0);

    this.goalA = new Goal(this, pitch.width - 32, 352);
    this.goalB = new Goal(this, 32, 352);
    this.ball = new Ball(this, pitch.width / 2, pitch.height / 2).setDepth(2);
    this.teamA = new Team(this, 1).setDepth(2);
    this.teamB = new Team(this, 2).setDepth(2);

    this.physics.world.setBounds(
      WALLS,
      WALLS,
      pitch.width - WALLS * 2,
      pitch.height - WALLS * 2
    );

    this.cameras.main.setBounds(0, 0, pitch.width, pitch.height);

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
}
