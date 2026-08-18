import type { VercelRequest, VercelResponse } from "@vercel/node";

const YT_API = "https://www.googleapis.com/youtube/v3";

// In-memory cache
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

// Support multiple API keys — fallback if one is 403/quota
function getKeys(): string[] {
  const keys: string[] = [];
  // Primary key
  if (process.env.YOUTUBE_API_KEY) keys.push(process.env.YOUTUBE_API_KEY);
  // Fallback keys (add YOUTUBE_API_KEY_2, _3 in Vercel env vars if needed)
  if (process.env.YOUTUBE_API_KEY_2) keys.push(process.env.YOUTUBE_API_KEY_2);
  if (process.env.YOUTUBE_API_KEY_3) keys.push(process.env.YOUTUBE_API_KEY_3);
  return keys;
}

async function fetchYT(path: string, params: Record<string, string>, key: string) {
  const url = new URL(`${YT_API}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  });
  // ALWAYS enforce safeSearch=strict — cannot be overridden by client.
  // EXCEPT: eventType=live|upcoming + safeSearch=strict = bug kombinasi YouTube
  // API yang selalu mengembalikan 0 items (totalResults > 0 tapi items []).
  if (path === "search" && !params.eventType) url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("key", key);
  return fetch(url.toString());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const keys = getKeys();
  if (!keys.length) {
    return res.status(500).json({
      error: "YOUTUBE_API_KEY not configured",
      hint: "Vercel Dashboard → Settings → Environment Variables → add YOUTUBE_API_KEY → Redeploy",
    });
  }

  const { path, ...params } = req.query as Record<string, string>;
  if (!path) return res.status(400).json({ error: "Missing path param" });

  const allowed = ["search", "videos", "commentThreads", "channels"];
  if (!allowed.includes(path)) return res.status(400).json({ error: "Invalid path: " + path });

  // Check cache
  const cacheKey = path + "?" + new URLSearchParams(params).toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");
    return res.status(200).json(cached.data);
  }

  // Try each key until one works
  let lastStatus = 500;
  let lastData: unknown = {};

  for (const key of keys) {
    try {
      const ytRes = await fetchYT(path, params, key);
      const data = await ytRes.json();

      if (ytRes.ok) {
        // Cache success
        cache.set(cacheKey, { data, ts: Date.now() });
        if (cache.size > 200) {
          const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
          cache.delete(oldest[0]);
        }
        res.setHeader("X-Cache", "MISS");
        res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");
        return res.status(200).json(data);
      }

      lastStatus = ytRes.status;
      lastData = data;
      console.warn(`[api/youtube] Key ending ...${key.slice(-6)} got ${ytRes.status} for ${path}`);

      // Only retry on 403 — other errors are not key-related
      if (ytRes.status !== 403) break;

    } catch (err: any) {
      console.error("[api/youtube] Fetch error:", err.message);
      lastData = { error: err.message };
    }
  }

  // All keys failed — return stale cache if available
  if (cached) {
    console.warn("[api/youtube] All keys failed, returning stale cache");
    res.setHeader("X-Cache", "STALE");
    return res.status(200).json(cached.data);
  }

  return res.status(lastStatus).json({
    ...(lastData as object),
    _hint: lastStatus === 403
      ? "Semua API key 403. Cek Google Cloud Console: Application restrictions harus 'None' untuk server-side usage."
      : undefined,
  });
}
