export interface PlayerProps {
  id: number;
  name: string;
  position: string;
  speed: number;
  strength: number;
  power: number;
  toughness: number;
  accuracy: number;
}

export interface TeamProps {
  id: number;
  frame: number;
  name: string;
  players: number[];
}
