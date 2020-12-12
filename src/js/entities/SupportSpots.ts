import { Spot, Team } from "./";
import { MAX_SHOT_POWER, MAX_PASS_POWER } from "../constants";
import { GameScene } from "../scenes";

export default class SupportSpots {
  public scene: GameScene;
  public team: Team;
  public spots: Spot[];
  public bestSpot: Spot = null;
  public circles: Phaser.GameObjects.Arc[];

  constructor(team: Team, isLeft: boolean, scene: GameScene) {
    const CENTER_X = 640;
    const CENTER_Y = 352;
    const CENTER_A = 128;
    const GAP = 80;
    const GAPY = 80;
    const N = 5;
    const N2 = 6;
    const LENGTH = (N - 1) * GAP;
    const HEIGHT = (N2 - 1) * GAPY;

    this.scene = scene;
    this.team = team;
    this.spots = [];
    this.circles = [];

    for (let y = 0; y < N2; y++) {
      for (let x = 0; x < N; x++) {
        const anchor = new Phaser.Math.Vector2(
          isLeft ? CENTER_X + CENTER_A : CENTER_X - LENGTH - CENTER_A,
          CENTER_Y - HEIGHT / 2
        );
        const position = new Phaser.Math.Vector2(
          anchor.x + x * GAP,
          anchor.y + y * GAPY
        );

        this.spots.push(new Spot(position.x, position.y));

        this.circles.push(
          scene.add
            .circle(position.x, position.y, 8, 0x999999)
            .setDepth(1)
            .setVisible(true)
        );
      }
    }

    this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callbackScope: this,
      callback: function () {
        if (this.team.isInControl) {
          this.calculateSupportSpot();
        }
      },
    });
  }

  public calculateSupportSpot(): Spot {
    const PASS_SAFE_STRENGTH = 2;
    const CAN_SHOOT_STRENGTH = 1;
    const DISTANCE_FROM_CONTROLLLING_STRENGTH = 2;

    let bestScore: number = 0;

    this.bestSpot = null;

    this.spots.forEach((spot: Spot, index: number) => {
      spot.score = 1;

      if (
        this.team.isPassSafeFromAllOpponents(
          this.team.controllingPlayer.position,
          spot,
          null,
          MAX_PASS_POWER
        )
      ) {
        spot.score += PASS_SAFE_STRENGTH;
      }

      if (this.team.canShoot(spot, MAX_SHOT_POWER)[0]) {
        spot.score += CAN_SHOOT_STRENGTH;
      }

      if (this.team.isInControl) {
        const OPTIMAL_DISTANCE = 200;
        const distance = this.team.controllingPlayer.position.distance(spot);
        const normal = Math.abs(OPTIMAL_DISTANCE - distance);

        if (normal < OPTIMAL_DISTANCE) {
          const score =
            (DISTANCE_FROM_CONTROLLLING_STRENGTH *
              (OPTIMAL_DISTANCE - normal)) /
            OPTIMAL_DISTANCE;
          //console.log("score", score);
          spot.score += score;
        }
      }

      this.circles[index].setScale(spot.score / 4);

      if (spot.score > bestScore) {
        bestScore = spot.score;

        this.bestSpot = spot;
      }
    });

    return this.bestSpot;
  }

  public getSupportSpot(): Spot {
    return this.bestSpot ? this.bestSpot : this.calculateSupportSpot();
  }
}
