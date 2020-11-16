import PlayerBase from "./PlayerBase";

enum States {
  Wait = 0,
  ReceiveBall = 0,
  KickBall = 1,
  Dribble = 2,
  ChaseBall = 3,
  ReturnToHomeRegion = 4,
  SupportAttacker = 5,
}

export default class PlayerField extends PlayerBase {
  constructor(scene: Phaser.Scene, x: number, y: number, frame: number) {
    super(scene, x, y, frame);
  }

  public setState(value: number): this {
    switch (value) {
      case States.Wait:
        break;
    }

    return super.setState(value);
  }

  public preUpdate(time: number, delta: number): void {
    switch (this.state) {
      case States.Wait:
        break;
    }

    super.preUpdate(time, delta);
  }
}
