export function formatViews(n: number | string | undefined): string {
  const num = Number(n || 0);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return String(num);
}

export function formatDuration(iso: string | undefined): string {
  if (!iso) return "";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] || "0", 10);
  const mn = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(mn)}:${pad(s)}` : `${mn}:${pad(s)}`;
}

/** Parse ISO 8601 duration to total seconds */
export function durationSeconds(iso: string | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return parseInt(m[1] || "0", 10) * 3600 + parseInt(m[2] || "0", 10) * 60 + parseInt(m[3] || "0", 10);
}

export function timeAgo(iso: string | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export type YTVideo = {
  id: string;
  _channelAvatar?: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    liveBroadcastContent?: "none" | "live" | "upcoming";
    thumbnails: { medium?: { url: string }; high?: { url: string }; maxres?: { url: string } };
    description?: string;
    tags?: string[];
  };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails?: { duration?: string };
};
