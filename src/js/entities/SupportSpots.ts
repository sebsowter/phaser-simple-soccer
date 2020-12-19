import { MAX_SHOT_POWER, MAX_PASS_POWER } from "../constants";
import { GameScene } from "../scenes";
import { Spot, Team } from "./";

export default class SupportSpots {
  public team: Team;
  public spots: Spot[];
  public circles: Phaser.GameObjects.Arc[];
  public _supportSpot: Spot = null;

  constructor(scene: GameScene, team: Team, isLeft: boolean) {
    const CENTER_X = 640;
    const CENTER_Y = 352;
    const CENTER_A = 128;
    const GAP_X = 80;
    const GAP_Y = 80;
    const N_X = 5;
    const N_Y = 6;
    const LENGTH = (N_X - 1) * GAP_X;
    const HEIGHT = (N_Y - 1) * GAP_Y;

    this.team = team;
    this.spots = [];
    this.circles = [];

    for (let y = 0; y < N_Y; y++) {
      for (let x = 0; x < N_X; x++) {
        const anchor = new Phaser.Math.Vector2(
          isLeft ? CENTER_X + CENTER_A : CENTER_X - LENGTH - CENTER_A,
          CENTER_Y - HEIGHT / 2
        );
        const position = new Phaser.Math.Vector2(
          anchor.x + x * GAP_X,
          anchor.y + y * GAP_Y
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

    scene.time.addEvent({
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
    const CONTROLLLING_DISTANCE_STRENGTH = 2;

    this._supportSpot = null;

    let bestScore: number = 0;

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
            (CONTROLLLING_DISTANCE_STRENGTH * (OPTIMAL_DISTANCE - normal)) /
            OPTIMAL_DISTANCE;

          spot.score += score;
        }
      }

      this.circles[index].setScale(spot.score / 4);

      if (spot.score > bestScore) {
        bestScore = spot.score;

        this._supportSpot = spot;
      }
    });

    return this._supportSpot;
  }

  public get supportSpot(): Spot {
    return this._supportSpot ? this._supportSpot : this.calculateSupportSpot();
  }
}
