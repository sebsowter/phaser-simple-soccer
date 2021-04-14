import { PlayerProps, PlayerRoles } from "../types";
import { FieldPlayer, Goalkeeper, SoccerTeam } from "./";

export default class PlayerFactory {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    props: PlayerProps,
    index: number,
    name: string,
    home: Phaser.Math.Vector2,
    team: SoccerTeam
  ) {
    switch (props.role) {
      case PlayerRoles.Goalkeeper:
        return new Goalkeeper(
          scene,
          x,
          y,
          frame,
          props,
          index,
          name,
          home,
          team
        );

      case PlayerRoles.Attacker:
      case PlayerRoles.Defender:
        return new FieldPlayer(
          scene,
          x,
          y,
          frame,
          props,
          index,
          name,
          home,
          team
        );
    }
  }
}
