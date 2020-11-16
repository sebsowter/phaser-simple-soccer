enum States {
  STANDING = 0,
  FALLING = 1,
  CROUCHING = 2,
  JUMPING = 3,
  WALKING = 4,
}

export class Player {
  private regionHome: any;

  constructor(regionHome: any) {
    this.regionHome = regionHome;
  }
}

export default class Pitch {
  private ball: any;
  private teamA: any;
  private teamB: any;
  private goalA: any;
  private goalB: any;
  private regions: any[];

  constructor() {}
}
