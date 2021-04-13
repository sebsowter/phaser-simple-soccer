import { TeamProps } from "../types";
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

export const teams: TeamProps[] = [
  {
    id: 1,
    frame: 1,
    name: "red",
    players,
    regions: {
      defending: [
        getRegionPos(6),
        getRegionPos(1),
        getRegionPos(13),
        getRegionPos(2),
        getRegionPos(14),
      ],
      attacking: [
        getRegionPos(6),
        getRegionPos(2),
        getRegionPos(14),
        getRegionPos(10),
        getRegionPos(9),
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
        getRegionPos(16),
        getRegionPos(4),
        getRegionPos(15),
        getRegionPos(3),
      ],
      attacking: [
        getRegionPos(11),
        getRegionPos(14),
        getRegionPos(3),
        getRegionPos(7),
        getRegionPos(8),
      ],
    },
  },
];
