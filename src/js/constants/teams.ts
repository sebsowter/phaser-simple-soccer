import { SoccerTeamProps } from "../types";
import { players } from "./players";

const getRegionPos = (region: number): Phaser.Math.Vector2 => {
  const COLS = 6;
  const WIDTH = 192;
  const BORDER = 64;

  return new Phaser.Math.Vector2(
    BORDER + WIDTH / 2 + (region % COLS) * WIDTH,
    BORDER + WIDTH / 2 + Math.floor(region / COLS) * WIDTH
  );
};

export const teams: SoccerTeamProps[] = [
  {
    id: 1,
    frame: 1,
    name: "red",
    players,
    regions: {
      defending: [
        getRegionPos(6),
        getRegionPos(7),
        getRegionPos(13),
        getRegionPos(2),
        getRegionPos(8),
      ],
      attacking: [
        getRegionPos(6),
        getRegionPos(2),
        getRegionPos(8),
        getRegionPos(9),
        getRegionPos(10),
      ],
    },
  },
  {
    id: 2,
    frame: 2,
    name: "blue",
    players,
    regions: {
      defending: [
        getRegionPos(11),
        getRegionPos(10),
        getRegionPos(4),
        getRegionPos(15),
        getRegionPos(9),
      ],
      attacking: [
        getRegionPos(11),
        getRegionPos(15),
        getRegionPos(9),
        getRegionPos(8),
        getRegionPos(7),
      ],
    },
  },
];
