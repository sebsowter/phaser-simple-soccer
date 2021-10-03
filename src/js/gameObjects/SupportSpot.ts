export default class SupportSpot extends Phaser.Math.Vector2 {
  private _score: number;

  public set score(value: number) {
    this._score = value;
  }

  public get score() {
    return this._score;
  }
}
