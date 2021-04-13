import { PlayerRoles } from "../types";
import { PitchScene } from "../scenes";
import {
  PlayerBase,
  PlayerFieldStates,
  PlayerKeeperStates,
  Team,
  TeamStates,
} from "../gameObjects";

export const setText = (selector: string, value: string) => {
  document.querySelector(selector).innerHTML = value;
};

export const updateUi = (scene: PitchScene) => {
  function getTeamState(team: Team): string {
    switch (team.state) {
      case TeamStates.Attacking:
        return "Attacking";
      case TeamStates.PrepareForKickOff:
        return "PrepareForKickOff";
      case TeamStates.Defending:
        return "Defending";
    }
  }

  function getPlayerState(player: PlayerBase): string {
    if (player.role === PlayerRoles.Goalkeeper) {
      switch (player.state) {
        case PlayerKeeperStates.InterceptBall:
          return "InterceptBall";
        case PlayerKeeperStates.PutBallBackInPlay:
          return "PutBallBackInPlay";
        case PlayerKeeperStates.ReturnToHome:
          return "ReturnToHome";
        case PlayerKeeperStates.TendGoal:
          return "TendGoal";
      }
    }

    switch (player.state) {
      case PlayerFieldStates.ChaseBall:
        return "ChaseBall";
      case PlayerFieldStates.Dribble:
        return "Dribble";
      case PlayerFieldStates.KickBall:
        return "KickBall";
      case PlayerFieldStates.ReceiveBall:
        return "ReceiveBall";
      case PlayerFieldStates.ReturnToHome:
        return "ReturnToHome";
      case PlayerFieldStates.SupportAttacker:
        return "Support";
      case PlayerFieldStates.Wait:
        return "Wait";
    }
  }

  setText(`#pitch-gameon`, `${scene.gameOn}`);
  setText(`#pitch-goalkeeper`, `${scene.goalkeeperHasBall}`);
  setText(`#red-score`, `${scene.goalA.scored}`);
  setText(`#blue-score`, `${scene.goalB.scored}`);

  [scene.teamA, scene.teamB].forEach((team: Team) => {
    setText(`#${team.name}-state`, getTeamState(team));
    setText(
      `#${team.name}-closest`,
      `${team.closestPlayer ? team.closestPlayer.index + 1 : "-"}`
    );
    setText(
      `#${team.name}-controlling`,
      `${team.controllingPlayer ? team.controllingPlayer.index + 1 : "-"}`
    );
    setText(
      `#${team.name}-supporting`,
      `${team.supportingPlayer ? team.supportingPlayer.index + 1 : "-"}`
    );
    setText(
      `#${team.name}-receiving`,
      `${team.receivingPlayer ? team.receivingPlayer.index + 1 : "-"}`
    );

    team.players.forEach((player: PlayerBase, index: number) => {
      setText(`#${team.name}-state-${index + 1}`, getPlayerState(player));
      setText(`#${team.name}-persuit-${index + 1}`, `${player.persuitOn}`);
      setText(`#${team.name}-seek-${index + 1}`, `${player.seekOn}`);
      setText(`#${team.name}-interpose-${index + 1}`, `${player.interposeOn}`);
      setText(`#${team.name}-home-${index + 1}`, `${player.isAtHome}`);
      setText(`#${team.name}-target-${index + 1}`, `${player.isAtTarget}`);
    });
  });
};
