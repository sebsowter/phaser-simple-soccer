import { TeamProps } from "../types";

export const teams: TeamProps[] = [
  {
    id: 1,
    frame: 1,
    name: "red",
    players: [1, 2, 3, 4, 5],
    regions: {
      defending: [6, 1, 13, 2, 14],
      attacking: [6, 2, 14, 10, 9],
    },
  },
  {
    id: 2,
    frame: 2,
    name: "blue",
    players: [1, 2, 3, 4, 5],
    regions: {
      defending: [11, 16, 4, 15, 3],
      attacking: [11, 14, 3, 7, 8],
    },
  },
];
