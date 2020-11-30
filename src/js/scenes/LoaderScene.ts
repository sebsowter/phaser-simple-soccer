export default class LoaderScene extends Phaser.Scene {
  public preload(): void {
    this.load.image("font3x5", "./assets/images/font3x5.png");
    this.load.image("goal", "./assets/images/goal.png");
    this.load.image("pitch", "./assets/images/pitch.png");
    this.load.spritesheet("sprites", "./assets/images/sprites.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  public create(): void {
    this.game.events.on(
      Phaser.Core.Events.BLUR,
      function () {
        this.scene.get("game").scene.pause();
      },
      this
    );
    this.game.events.on(
      Phaser.Core.Events.FOCUS,
      function () {
        this.scene.get("game").scene.resume();
      },
      this
    );

    this.cache.bitmapFont.add(
      "font3x5",
      Phaser.GameObjects.RetroFont.Parse(this, {
        image: "font3x5",
        width: 4,
        height: 6,
        chars: Phaser.GameObjects.RetroFont.TEXT_SET5,
        charsPerRow: 16,
        lineSpacing: 1,
        "spacing.x": 0,
        "spacing.y": 0,
        "offset.x": 0,
        "offset.y": 0,
      })
    );

    this.scene.start("game");
  }
}
