const setText = (selector: string, value: string) => {
  document.querySelector(selector).innerHTML = value;
};

const getRegionPos = (region: number): Phaser.Math.Vector2 => {
  const COLS = 6;
  const WIDTH = 192;
  const BORDER = 64;

  return new Phaser.Math.Vector2(
    BORDER + WIDTH / 2 + (region % COLS) * WIDTH,
    BORDER + WIDTH / 2 + Math.floor(region / COLS) * WIDTH
  );
};

export { setText, getRegionPos };
