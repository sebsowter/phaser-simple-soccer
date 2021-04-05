export enum PlayerRoles {
  "Goalkeeper",
  "Attacker",
  "Defender",
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
  players: number[];
  regions: PlayerRegions;
}
