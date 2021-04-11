export enum PlayerEvent {
  SUPPORT_ATTACKER = "SUPPORT_ATTACKER",
  RECEIVE_BALL = "RECEIVE_BALL",
  PASS_TO_ME = "PASS_TO_ME",
  GO_HOME = "GO_HOME",
  WAIT = "WAIT",
}

export enum PlayerRoles {
  Goalkeeper,
  Attacker,
  Defender,
}

export interface PlayerRegions {
  attacking: number[];
  defending: number[];
}

export interface PlayerProps {
  id: number;
  name: string;
  role: PlayerRoles;
  speed: number;
  passMaxPower?: number;
  shooMaxPower?: number;
  shootAccuracy?: number;
}

export interface TeamProps {
  id: number;
  frame: number;
  name: string;
  players: PlayerProps[];
  regions: PlayerRegions;
}
