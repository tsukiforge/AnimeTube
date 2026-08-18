import { useCallback, useEffect, useState } from "react";
import { APP_VERSION, GITHUB_LATEST_RELEASE_URL } from "@/lib/app-info";

export interface Release {
  version: string;
  name: string;
  url: string;
  downloadUrl?: string;
  publishedAt: string;
  isNewer: boolean;
}

const RELEASE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 jam
const GITHUB_REPO = "tsukiforge/AnimeTube";

/**
 * Hook untuk check update aplikasi dari GitHub Release.
 * Dipakai oleh web dan mobile (Capacitor) untuk notify user tentang versi baru.
 */
export function useReleaseCheck() {
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLatestRelease = useCallback(async () => {
    // Jangan check terlalu sering
    const lastCheck = localStorage.getItem("animetube:last-release-check");
    if (lastCheck && Date.now() - parseInt(lastCheck) < RELEASE_CHECK_INTERVAL) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        { headers: { Accept: "application/vnd.github+json" } }
      );

      if (!res.ok) throw new Error(`GitHub API ${res.status}`);

      const data = await res.json();
      const latestVersion = String(data.tag_name || data.name || "").replace(/^v/, "");

      localStorage.setItem("animetube:last-release-check", Date.now().toString());

      if (!latestVersion || compareVersions(latestVersion, APP_VERSION) <= 0) {
        setRelease(null);
        return;
      }

      const apk = data.assets?.find((a: any) => a.name === "animetube.apk");
      const downloadUrl = apk?.browser_download_url;

      setRelease({
        version: latestVersion,
        name: data.name,
        url: data.html_url,
        downloadUrl,
        publishedAt: data.published_at,
        isNewer: true,
      });
    } catch (err) {
      console.error("[ReleaseCheck] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLatestRelease();
  }, [checkLatestRelease]);

  return { release, loading, error, checkLatestRelease };
}

/**
 * Compare semantic versions.
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) =>
    v
      .split(".")
      .map((n) => parseInt(n, 10) || 0)
      .concat(0, 0, 0)
      .slice(0, 3);

  const [a, b, c] = normalize(v1);
  const [x, y, z] = normalize(v2);

  if (a !== x) return a > x ? 1 : -1;
  if (b !== y) return b > y ? 1 : -1;
  if (c !== z) return c > z ? 1 : -1;
  return 0;
}
