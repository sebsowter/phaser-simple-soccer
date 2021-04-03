export enum PlayerRoles {
  "Goalkeeper",
  "Attack",
  "Defence",
}

export interface PlayerProps {
  id: number;
  name: string;
  role: PlayerRoles;
  speed: number;
  strength: number;
  power: number;
  toughness: number;
  accuracy: number;
}

export interface Regions {
  attacking: number[];
  defending: number[];
}

export interface TeamProps {
  id: number;
  frame: number;
  name: string;
  players: number[];
  regions: Regions;
}
