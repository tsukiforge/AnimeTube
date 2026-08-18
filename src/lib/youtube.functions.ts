import { getRegion, REGIONS } from "@/hooks/use-region";
import { processYouTubeResponse } from "./content-filter";
import { durationSeconds } from "./format";

// Proxy endpoint — API key disimpan di server Vercel, tidak exposed ke browser
// Di app native (Capacitor) pakai VITE_API_BASE (URL deploy Vercel), karena
// relative path "/api/youtube" tidak tersedia di WebView.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, "");
const PROXY = API_BASE ? `${API_BASE}/api/youtube` : "/api/youtube";
// Di development (vite dev server) proxy serverless tidak ada, jadi call YouTube langsung
const DEV_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;

// YouTube relevanceLanguage hanya support subset BCP-47
// https://developers.google.com/youtube/v3/docs/search/list#relevanceLanguage
const YT_SUPPORTED_LANGS = new Set([
  "ar","zh-Hans","zh-Hant","cs","da","nl","en","fi","fr","de",
  "el","hu","id","it","ja","ko","ms","no","pl","pt","ro","ru",
  "es","sv","tr","uk","vi",
]);

function getRegionParams() {
  const code = getRegion();
  const r = REGIONS.find((x) => x.code === code) ?? REGIONS[0];
  const lang = YT_SUPPORTED_LANGS.has(r.lang) ? r.lang : "en";
  return { regionCode: r.code, relevanceLanguage: lang };
}

async function yt(path: string, params: Record<string, string | number | undefined>) {
  if (import.meta.env.DEV && DEV_KEY) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    });
    url.searchParams.set("safeSearch", "strict");
    url.searchParams.set("key", DEV_KEY);
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`YouTube API ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    }
    return res.json();
  }

  const url = new URL(PROXY, window.location.origin);
  url.searchParams.set("path", path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    let message = `YouTube API ${res.status}`;
    if (res.status === 403) {
      message = "quota|403: Quota habis atau API key bermasalah";
    } else if (res.status === 429) {
      message = "quota|429: Quota harian habis (10.000 units/hari)";
    }
    throw new Error(message + ": " + JSON.stringify(data).slice(0, 200));
  }
  return res.json();
}

/** Parse ISO 8601 duration to total seconds */
function parseDurationSec(iso: string | undefined): number {
  return durationSeconds(iso);
}

function smartRank(items: any[]): any[] {
  const now = Date.now();
  return items
    .map((v) => {
      const views = parseInt(v.statistics?.viewCount || "0");
      const likes = parseInt(v.statistics?.likeCount || "0");
      const comments = parseInt(v.statistics?.commentCount || "0");
      const durSec = parseDurationSec(v.contentDetails?.duration);
      const ageDays = (now - new Date(v.snippet?.publishedAt || 0).getTime()) / 86400000;
      const engagementRate = views > 0 ? (likes / views) * 1000 : 0;
      // YouTube-like: medium & long videos di-boost, shorts tetap ada tapi tidak mendominasi
      let durScore = 1;
      if (durSec < 60) durScore = 0.35;
      else if (durSec < 240) durScore = 0.8;
      else if (durSec < 600) durScore = 1.4;
      else if (durSec <= 2400) durScore = 1.7;
      else if (durSec <= 5400) durScore = 1.5;
      else if (durSec > 9000) durScore = 0.9;
      const recencyScore = ageDays <= 7 ? 1.5 : ageDays <= 30 ? 1.2 : 1;
      const commentBoost = comments > 100 ? 1.2 : comments > 10 ? 1.1 : 1;
      const score = Math.log10(views + 1) * durScore * recencyScore * commentBoost * (1 + engagementRate * 0.1);
      return { ...v, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .map(({ _score: _, ...v }) => v);
}

/**
 * Weighted round-robin — gabungkan beberapa group video jadi satu feed
 * ala YouTube (short / medium / long / live tercampur natural).
 */
function interleaveFeed(groups: { items: any[]; weight: number }[]): any[] {
  const out: any[] = [];
  const seen = new Set<string>();
  const idxs = groups.map(() => 0);
  const maxIters = groups.reduce((s, g) => s + g.items.length, 0) * 3 + 10;
  for (let i = 0; i < maxIters; i++) {
    let best = -1;
    let bestScore = -Infinity;
    groups.forEach((g, gi) => {
      if (idxs[gi] >= g.items.length) return;
      const rel = (g.items.length - idxs[gi]) / g.weight;
      if (rel > bestScore) { bestScore = rel; best = gi; }
    });
    if (best < 0) break;
    const item = groups[best].items[idxs[best]++];
    const id = item?.id;
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(item);
    }
  }
  return out;
}

/**
 * Home feed ala YouTube — campuran video pendek, panjang, dan live.
 * Halaman pertama diambil dari 4 bucket (short/medium/long/live) lalu
 * digabung; halaman berikutnya pakai pencarian normal (hemat quota).
 */
export async function mixedFeed(params: { q?: string; maxResults?: number; pageToken?: string } = {}) {
  const { q = "anime", maxResults = 24, pageToken } = params;
  if (!pageToken) {
    const [short, medium, long, live] = await Promise.all([
      searchVideos({ q, videoDuration: "short", maxResults: 8, order: "viewCount" }),
      searchVideos({ q, videoDuration: "medium", maxResults: 10, order: "viewCount" }),
      searchVideos({ q, videoDuration: "long", maxResults: 8, order: "viewCount" }),
      searchVideos({ q, eventType: "live", maxResults: 4, order: "viewCount" }),
    ]);
    return {
      items: interleaveFeed([
        { items: short.items, weight: 1.2 },
        { items: medium.items, weight: 2 },
        { items: long.items, weight: 1.5 },
        { items: live.items, weight: 1 },
      ]),
      nextPageToken: medium.nextPageToken || long.nextPageToken || short.nextPageToken,
    };
  }
  return searchVideos({ q, order: "viewCount", maxResults, pageToken });
}

export type SearchParams = {
  q?: string;
  maxResults?: number;
  order?: "relevance" | "date" | "viewCount" | "rating";
  videoDuration?: "any" | "short" | "medium" | "long";
  pageToken?: string;
  channelId?: string;
  eventType?: "completed" | "live" | "upcoming";
};

export async function searchVideos(params: SearchParams = {}) {
  const {
    q = "anime", maxResults = 24, order = "relevance",
    videoDuration = "any", pageToken, channelId, eventType,
  } = params;
  const { regionCode, relevanceLanguage } = getRegionParams();
  const json = await yt("search", {
    part: "snippet", type: "video", q, maxResults, order,
    videoDuration, pageToken, channelId, eventType,
    regionCode, relevanceLanguage, safeSearch: "strict",
  });
  const ids = (json.items || []).map((i: any) => i.id?.videoId).filter(Boolean).join(",");
  let details: any = { items: [] };
  if (ids) {
    details = await yt("videos", { part: "snippet,statistics,contentDetails", id: ids });
  }
  const ranked = smartRank(processYouTubeResponse(details.items || []));
  return { items: ranked, nextPageToken: json.nextPageToken as string | undefined };
}

export async function trendingAnime(params: { maxResults?: number; q?: string; pageToken?: string } = {}) {
  const { maxResults = 20, q = "anime", pageToken } = params;
  const { regionCode, relevanceLanguage } = getRegionParams();
  const publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const json = await yt("search", {
    part: "snippet", type: "video", q, maxResults, order: "viewCount",
    publishedAfter, pageToken, regionCode, relevanceLanguage, safeSearch: "strict",
  });
  const ids = (json.items || []).map((i: any) => i.id?.videoId).filter(Boolean).join(",");
  if (!ids) return { items: [], nextPageToken: undefined };
  const details = await yt("videos", { part: "snippet,statistics,contentDetails", id: ids });
  const ranked = smartRank(processYouTubeResponse(details.items || []));
  return { items: ranked, nextPageToken: json.nextPageToken as string | undefined };
}

export async function getVideo(id: string) {
  const json = await yt("videos", { part: "snippet,statistics,contentDetails", id });
  const filtered = processYouTubeResponse(json.items || []);
  return { item: filtered[0] || null };
}

export async function getComments(videoId: string) {
  try {
    const json = await yt("commentThreads", {
      part: "snippet", videoId, maxResults: 20, order: "relevance",
    });
    return { items: json.items || [], disabled: false };
  } catch {
    return { items: [], disabled: true };
  }
}

export async function getRelated(q: string, excludeId?: string) {
  const json = await yt("search", {
    part: "snippet", type: "video", q, maxResults: 16, order: "relevance", safeSearch: "strict",
  });
  const ids = (json.items || [])
    .map((i: any) => i.id?.videoId)
    .filter((id: string) => id && id !== excludeId)
    .slice(0, 15)
    .join(",");
  if (!ids) return { items: [] };
  const details = await yt("videos", { part: "snippet,statistics,contentDetails", id: ids });
  return { items: processYouTubeResponse(details.items || []) };
}

export async function getChannel(id: string) {
  const json = await yt("channels", { part: "snippet,statistics,brandingSettings", id });
  return { channel: json.items?.[0] || null };
}

// Real popular anime channels — refreshed weekly
const REAL_ANIME_CHANNELS = [
  "UCVTyTA7-g9nopHeHbeuvpRA", // Crunchyroll
  "UCoqWQehkMEBqBFkFGa-IQKA", // Muse Asia
  "UCFvLHPAMHBkJbBMBqohFMXg", // Ani-One Asia
  "UC0wNSTMWIL3qaorLx0jie6A", // Netflix Anime
  "UCszoNXOCKFfFHHFMFBMBqhA", // Bilibili Anime
  "UCkejXKmFMFkFMFkFMFkFMFk", // Funimation
  "UCgnfPPb9JI3e9A4cXHnWbyg", // AniDex
  "UCqm3BQLlJfvkTsX_hvm0UmA", // Toei Animation
  "UCxx7cbiqZZ_xP9H4IUk3B0g", // Bandai Namco
  "UCBcRF18a7Qf58cCRy5xuWwQ", // Madman Anime
];

/** Get 10 random anime channels, refreshed weekly via localStorage */
export async function getAnimeChannels() {
  const CACHE_KEY = "animetube:channels:v1";
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // Check cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < WEEK_MS && data?.length) return { channels: data };
    }
  } catch {}

  // Pick 10 random from list
  const shuffled = [...REAL_ANIME_CHANNELS].sort(() => Math.random() - 0.5).slice(0, 10);
  const ids = shuffled.join(",");

  try {
    const json = await yt("channels", {
      part: "snippet,statistics",
      id: ids,
      maxResults: 10,
    });
    const channels = json.items || [];
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: channels, ts: Date.now() }));
    return { channels };
  } catch {
    return { channels: [] };
  }
}
