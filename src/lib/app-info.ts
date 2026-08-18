import pkg from "../../package.json";

export const APP_VERSION =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ||
  pkg.version ||
  "1.0.0";

export const GITHUB_LATEST_RELEASE_URL =
  "https://api.github.com/repos/tsukiforge/AnimeTube/releases/latest";

export function compareVersions(current: string, target: string): number {
  const normalize = (value: string) => value.replace(/^v/i, "").split("-")[0].split("+")[0];
  const toParts = (value: string) => {
    const clean = normalize(value);
    const [major = "0", minor = "0", patch = "0"] = clean.split(".");
    return [Number(major), Number(minor), Number(patch)];
  };

  const a = toParts(current);
  const b = toParts(target);

  for (let i = 0; i < a.length; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }

  return 0;
}
