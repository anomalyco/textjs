const enabled = (): boolean => {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") return false;
  if (process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== "0") return true;
  return Boolean(process.stdout?.isTTY);
};

const wrap =
  (open: number, close: number) =>
  (s: string): string =>
    enabled() ? `\x1b[${open}m${s}\x1b[${close}m` : s;

export const color = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  gray: wrap(90, 39),
};
