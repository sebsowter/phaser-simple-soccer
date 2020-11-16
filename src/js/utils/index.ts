import PlayerBase from "../entities/PlayerBase";
import Spot from "../entities/Spot";

interface SpotProps {
  canPassScore: number;
  canScoreFromPositionScore: number;
  distanceFromControllingPlayerScore: number;
}

function calculateSupportingPlayer(players: PlayerBase[]): PlayerBase {
  const spots: Spot[] = [];

  let spotBest = null;
  let spotBestScore = 0;

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      spots.push(new Spot(x * 8, y * 8));
    }
  }

  spots.forEach((spot: Spot) => {
    spot.score = 0;

    let possibleToMakePass = false;

    if (possibleToMakePass) {
    }
    //
  });

  return players[0];
}

function distanceBetween(objectA: any, objectB: any): number {
  return Phaser.Math.Distance.Between(
    objectA.x,
    objectA.y,
    objectB.x,
    objectB.y
  );
}

export { calculateSupportingPlayer, distanceBetween };
