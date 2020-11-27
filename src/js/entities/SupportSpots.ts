import Spot from "./Spot";
import Team from "./Team";
import { MAX_SHOT_POWER, MAX_PASS_POWER } from "../constants";

export default class SupportSpots {
  public team: Team;
  public spots: Spot[];
  public bestSpot: Spot;
  public circles: Phaser.GameObjects.Arc[];

  constructor(team: Team, isLeft: boolean, scene?: Phaser.Scene) {
    const CENTER_X = 640;
    const CENTER_Y = 352;
    const CENTER_A = 96;
    const GAP = 128;
    const N = 4;
    const LENGTH = (N - 1) * GAP;

    this.team = team;
    this.spots = [];
    this.circles = [];

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const anchor = new Phaser.Math.Vector2(
          isLeft ? CENTER_X + CENTER_A : CENTER_X - LENGTH - CENTER_A,
          CENTER_Y - LENGTH / 2
        );
        const position = new Phaser.Math.Vector2(
          anchor.x + x * GAP,
          anchor.y + y * GAP
        );

        this.spots.push(new Spot(position.x, position.y));

        this.circles.push(
          scene.add.circle(position.x, position.y, 8, 0x999999).setDepth(1)
        );
      }
    }
  }

  public calculateSupportSpot(): Spot {
    const PASS_SAFE_STRENGTH = 2;
    const CAN_SHOOT_STRENGTH = 1;
    const DISTANCE_FROM_CONTROLLLING_STRENGTH = 2;
    const controllingPos = new Phaser.Math.Vector2().setFromObject(
      this.team.controllingPlayer
    );

    let bestSpot: Spot = null;
    let bestScore: number = 0;

    this.spots.forEach((spot: Spot, index: number) => {
      spot.score = 1;

      if (
        this.team.isPassSafeFromAllOpponents(
          controllingPos,
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

      if (this.team.supportingPlayer) {
        const OPTIMAL_DISTANCE = 200;
        const distance = controllingPos.distance(spot);
        const normal = Math.abs(OPTIMAL_DISTANCE - distance);

        if (normal < OPTIMAL_DISTANCE) {
          spot.score +=
            (DISTANCE_FROM_CONTROLLLING_STRENGTH *
              (OPTIMAL_DISTANCE - normal)) /
            OPTIMAL_DISTANCE;
        }
      }

      this.circles[index].setScale(1);

      if (spot.score > bestScore) {
        bestSpot = spot;
        bestScore = spot.score;

        this.circles[index].setScale(2);
      }
    });

    this.bestSpot = bestSpot;

    return bestSpot;
  }

  public getSupportSpot(): Spot {
    return this.bestSpot ? this.bestSpot : this.calculateSupportSpot();
  }
}
