import {
  MAX_SHOT_POWER,
  MAX_PASS_POWER,
  SUPPORT_SPOT_UPDATE_FREQUENCY,
  SUPPORT_SPOT_PASS_SAFE_STRENGTH,
  SUPPORT_SPOT_CAN_SHOOT_STRENGTH,
  SUPPORT_SPOT_CONTROLLLING_DISTANCE_STRENGTH,
  SUPPORT_SPOT_OPTIMAL_PASS_DISTANCE,
} from "../constants";
import { PitchScene } from "../scenes";
import { Spot, SoccerTeam } from "./";

export default class SupportSpots {
  private _team: SoccerTeam;
  private _spots: Spot[];
  private _supportSpot: Spot = null;
  private _circles: Phaser.GameObjects.Arc[];

  constructor(scene: PitchScene, team: SoccerTeam, isLeft: boolean) {
    const CENTER_X = isLeft ? 64 + 96 * 9 : 64 + 96 * 3;
    const CENTER_Y = 352;
    const GAP_X = 72;
    const GAP_Y = 72;
    const COLS = 5;
    const ROWS = 6;
    const LENGTH = (COLS - 1) * GAP_X;
    const HEIGHT = (ROWS - 1) * GAP_Y;

    this._team = team;
    this._spots = [];
    this._circles = [];

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const position = new Phaser.Math.Vector2(
          CENTER_X - LENGTH / 2 + x * GAP_X,
          CENTER_Y - HEIGHT / 2 + y * GAP_Y
        );

        this._spots.push(new Spot(position.x, position.y));
        this._circles.push(
          scene.add
            .circle(position.x, position.y, 8, 0x00ff00)
            .setDepth(1)
            .setVisible(false)
        );
      }
    }

    // Calculate spots every two seconds.
    scene.time.addEvent({
      delay: SUPPORT_SPOT_UPDATE_FREQUENCY,
      loop: true,
      callbackScope: this,
      callback: function () {
        if (this._team.isInControl) {
          this.calculateSupportSpot();
        }

        this._circles.forEach((circle: any) => {
          circle.setVisible(this._team.isInControl);
        });
      },
    });
  }

  public calculateSupportSpot(): Spot {
    let bestScore: number = 0;
    let bestIndex: number = 0;

    this._supportSpot = null;

    this._spots.forEach((spot: Spot, index: number) => {
      spot.score = 1;

      if (
        this._team.isPassSafeFromAllOpponents(
          this._team.controllingPlayer.position,
          spot,
          null,
          MAX_PASS_POWER
        )
      ) {
        spot.score += SUPPORT_SPOT_PASS_SAFE_STRENGTH;
      }

      const [canShoot] = this._team.canShoot(spot, MAX_SHOT_POWER);

      if (canShoot) {
        spot.score += SUPPORT_SPOT_CAN_SHOOT_STRENGTH;
      }

      if (this._team.isInControl) {
        const distance = this._team.controllingPlayer.position.distance(spot);
        const normal = Math.abs(SUPPORT_SPOT_OPTIMAL_PASS_DISTANCE - distance);

        if (normal < SUPPORT_SPOT_OPTIMAL_PASS_DISTANCE) {
          const score =
            (SUPPORT_SPOT_CONTROLLLING_DISTANCE_STRENGTH *
              (SUPPORT_SPOT_OPTIMAL_PASS_DISTANCE - normal)) /
            SUPPORT_SPOT_OPTIMAL_PASS_DISTANCE;

          spot.score += score;
        }
      }

      this._circles[index].setAlpha(0.25).setScale(spot.score / 4);

      if (spot.score > bestScore) {
        bestScore = spot.score;
        bestIndex = index;
      }
    });

    this._supportSpot = this._spots[bestIndex];
    this._circles[bestIndex].setAlpha(1);

    return this._supportSpot;
  }

  public get supportSpot(): Spot {
    return this._supportSpot || this.calculateSupportSpot();
  }
}
