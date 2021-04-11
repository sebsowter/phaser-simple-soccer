import { TeamProps } from "../types";
import { players } from "./players";

export const teams: TeamProps[] = [
  {
    id: 1,
    frame: 1,
    name: "red",
    players,
    regions: {
      defending: [6, 1, 13, 2, 14],
      attacking: [6, 2, 14, 10, 9],
    },
  },
  {
    id: 2,
    frame: 2,
    name: "blue",
    players,
    regions: {
      defending: [11, 16, 4, 15, 3],
      attacking: [11, 14, 3, 7, 8],
    },
  },
];
