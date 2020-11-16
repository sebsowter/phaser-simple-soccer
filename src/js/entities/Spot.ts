interface SpotProps {
  canPassScore: number;
  canScoreFromPositionScore: number;
  distanceFromControllingPlayerScore: number;
}

export default class Spot extends Phaser.Math.Vector2 {
  private _score: number;

  constructor(x: number, y: number) {
    super(x, y);
  }

  public set score(value: number) {
    this._score = value;
  }

  public get score(): number {
    return this._score;
  }

  public get canPassScore(): number {
    return 2;
  }

  public get canShootScore(): number {
    return 2;
  }

  public get distanceScore(): number {
    return 2;
  }
}
