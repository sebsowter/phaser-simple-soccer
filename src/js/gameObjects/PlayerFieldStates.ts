import { PASS_THREAT_RADIUS } from "../constants";
import { PlayerBase } from "./";

export enum PlayerFieldStates {
  Wait,
  ReceiveBall,
  KickBall,
  Dribble,
  ChaseBall,
  ReturnToHome,
  SupportAttacker,
}

export class State {
  private _state: PlayerFieldStates;

  constructor(state: PlayerFieldStates) {
    this._state = state;
  }

  public get state(): PlayerFieldStates {
    return this._state;
  }

  public enter(player: PlayerBase) {}
  public execute(player: PlayerBase) {}
  public exit(player: PlayerBase) {}
}

export class ReceiveBall extends State {
  constructor() {
    super(PlayerFieldStates.ReceiveBall);
  }

  enter(player: PlayerBase) {
    player.team.setControllingPlayer(player);
    player.team.setReceivingPlayer(player);

    if (
      player.isInHotPosition ||
      (Math.random() < 0.5 &&
        !player.team.isOpponentWithinRadius(
          player.position,
          PASS_THREAT_RADIUS
        ))
    ) {
      // player.setMode(PlayerModes.Seek);
    } else {
      // player.setMode(PlayerModes.Pursuit);
    }
  }

  execute(player: PlayerBase) {
    if (player.isBallWithinReceivingRange || !player.team.isInControl) {
      player.team.setReceivingPlayer(null);
      player.setState(PlayerFieldStates.ChaseBall);
    } else if (player.isAtTarget) {
      // player.setMode(PlayerModes.Track);
    } else {
      // player.setMode(PlayerModes.Seek);
    }
  }

  exit() {}
}

export const FieldStates = [ReceiveBall];
