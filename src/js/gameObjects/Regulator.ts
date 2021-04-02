function getRandomArbitrary(range: number): number {
  return Math.random() * (range * 2) - range;
}

export default class Regulator {
  private _timer: Phaser.Time.TimerEvent;
  private _updatePeriod: number;
  private _nextUpdateTime: number;

  constructor(scene: Phaser.Scene, updatesPerSecond: number = 8) {
    this._updatePeriod = 1000 / updatesPerSecond;
    this._nextUpdateTime = Math.random() * this._updatePeriod;
    this._timer = scene.time.addEvent({
      //startAt: this._nextUpdateTime,
      //delay: this._updatePeriod,
    });
  }

  public get isReady(): boolean {
    const elapsed = this._timer.getElapsed();

    if (elapsed > this._nextUpdateTime) {
      this._nextUpdateTime =
        elapsed + this._updatePeriod + getRandomArbitrary(10);

      return true;
    }

    return false;
  }
}
