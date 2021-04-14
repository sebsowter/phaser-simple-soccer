import { PlayerRoles } from "../types";
import { PitchScene } from "../scenes";
import {
  PlayerBase,
  FieldPlayerStates,
  GoalkeeperStates,
  SoccerTeam,
  SoccerTeamStates,
} from "../gameObjects";

export const setText = (selector: string, value: string) => {
  document.querySelector(selector).innerHTML = value;
};

export const updateUi = (scene: PitchScene) => {
  function getTeamState(team: SoccerTeam): string {
    switch (team.state) {
      case SoccerTeamStates.Attacking:
        return "Attacking";
      case SoccerTeamStates.PrepareForKickOff:
        return "PrepareForKickOff";
      case SoccerTeamStates.Defending:
        return "Defending";
    }
  }

  function getPlayerState(player: PlayerBase): string {
    if (player.role === PlayerRoles.Goalkeeper) {
      switch (player.state) {
        case GoalkeeperStates.InterceptBall:
          return "InterceptBall";
        case GoalkeeperStates.PutBallBackInPlay:
          return "PutBallBackInPlay";
        case GoalkeeperStates.ReturnToHome:
          return "ReturnToHome";
        case GoalkeeperStates.TendGoal:
          return "TendGoal";
      }
    }

    switch (player.state) {
      case FieldPlayerStates.ChaseBall:
        return "ChaseBall";
      case FieldPlayerStates.Dribble:
        return "Dribble";
      case FieldPlayerStates.KickBall:
        return "KickBall";
      case FieldPlayerStates.ReceiveBall:
        return "ReceiveBall";
      case FieldPlayerStates.ReturnToHome:
        return "ReturnToHome";
      case FieldPlayerStates.SupportAttacker:
        return "Support";
      case FieldPlayerStates.Wait:
        return "Wait";
    }
  }

  setText(`#pitch-gameon`, `${scene.gameOn}`);
  setText(`#pitch-goalkeeper`, `${scene.goalkeeperHasBall}`);
  setText(`#red-score`, `${scene.goalA.scored}`);
  setText(`#blue-score`, `${scene.goalB.scored}`);

  [scene.teamA, scene.teamB].forEach((team: SoccerTeam) => {
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
