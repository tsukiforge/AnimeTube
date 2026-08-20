import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { formatViews, timeAgo } from "@/lib/format";
import { getVideo, searchVideos } from "@/lib/youtube.functions";
import { useSeo } from "@/lib/seo";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  MessageCircle,
  Music2,
  Play,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

const shortsSchema = z.object({
  v: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/shorts")({
  validateSearch: zodValidator(shortsSchema),
  component: ShortsPage,
});

// Deteksi attribution musik dari tags/title (YouTube API v3 tidak expose
// field lagu; kita pakai sinyal teks yang umum di judul/tag video anime).
const MUSIC_KEYWORDS =
  /(amv|music|song|cover|ost|remix|viral|audio|mv|full\s?version|instrumental)/i;
function getMusicAttribution(video: any): string | null {
  const tags: string[] = video.snippet?.tags || [];
  for (const t of tags) {
    if (MUSIC_KEYWORDS.test(t)) return t.replace(/^#/, "").replace(/_/g, " ").trim();
  }
  const title: string = video.snippet?.title || "";
  if (MUSIC_KEYWORDS.test(title))
    return (
      title
        .replace(/[|【】]/g, "")
        .split(/\s{2,}/)[0]
        ?.trim()
        .slice(0, 60) || "Musik anime"
    );
  return null;
}

function ShortCard({
  video,
  active,
  autoPlay,
  onNext,
}: {
  video: any;
  active: boolean;
  autoPlay?: boolean;
  onNext: () => void;
}) {
  const navigate = useNavigate();
  const id = typeof video.id === "string" ? video.id : video.id?.videoId;
  const thumb = video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url;
  const [playing, setPlaying] = useState(!!autoPlay);
  const apiRef = useRef<YT.Player | null>(null);
  const ytUrl = `https://www.youtube.com/watch?v=${id}`;
  const music = getMusicAttribution(video);

  // Auto-play saat kartu aktif (scroll), pause/berhenti saat tidak aktif
  useEffect(() => {
    if (active) {
      setPlaying(true);
    } else {
      setPlaying(false);
      apiRef.current?.pauseVideo();
    }
  }, [active]);

  const handleShare = () => {
    const url = `${window.location.origin}/watch?v=${id}`;
    if (navigator.share) navigator.share({ title: video.snippet.title, url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black select-none">
      {/* Main content — 9:16 container */}
      <div className="relative h-full w-full max-w-[360px] mx-auto overflow-hidden">
        {/* Thumbnail / Player */}
        {!playing ? (
          /* Thumbnail view */
          <div className="absolute inset-0 cursor-pointer" onClick={() => setPlaying(true)}>
            {thumb && (
              <img src={thumb} alt={video.snippet.title} className="h-full w-full object-cover" />
            )}
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30" />
            {/* Play button center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Play size={28} className="text-white ml-1" fill="white" />
              </div>
            </div>
          </div>
        ) : (
          /* Custom player — autoplay mute (diizinkan di HP), ketuk untuk suara */
          <YoutubePlayer
            videoId={id}
            autoPlay
            startMuted
            controls="none"
            onReady={(p) => {
              apiRef.current = p;
              if (active) p.playVideo();
            }}
            className="absolute inset-0"
          />
        )}

        {/* Music attribution — logo musik jika ada */}
        {music && (
          <div className="absolute bottom-4 left-3 z-10 flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1.5 text-white">
            <Music2 size={14} className="text-white/80 shrink-0" />
            <span className="text-[11px] font-medium truncate max-w-[200px]">{music}</span>
          </div>
        )}

        {/* Bottom gradient — only show when not playing */}
        {!playing && (
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
        )}

        {/* Info — bottom left, only when not playing */}
        {!playing && (
          <div className="absolute bottom-4 left-3 right-14 text-white z-10">
            <Link
              to="/channel/$channelId"
              params={{ channelId: video.snippet.channelId }}
              className="flex items-center gap-2 mb-2"
            >
              <div className="h-7 w-7 rounded-full bg-white/20 backdrop-blur grid place-items-center text-[11px] font-bold ring-1 ring-white/30 shrink-0">
                {video.snippet.channelTitle?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs font-semibold truncate">{video.snippet.channelTitle}</span>
            </Link>
            <p className="text-sm font-medium line-clamp-2 leading-snug">{video.snippet.title}</p>
            <p className="text-[11px] text-white/50 mt-1">{timeAgo(video.snippet.publishedAt)}</p>
          </div>
        )}

        {/* Action buttons — right side, only when not playing */}
        {!playing && (
          <div className="absolute bottom-4 right-2 flex flex-col items-center gap-5 z-10">
            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm grid place-items-center">
                <Heart size={20} />
              </div>
              <span className="text-[10px]">{formatViews(video.statistics?.viewCount)}</span>
            </a>

            <button
              onClick={() => navigate({ to: "/shorts", search: { v: id } })}
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm grid place-items-center">
                <MessageCircle size={20} />
              </div>
              <span className="text-[10px]">Shorts</span>
            </button>

            <button onClick={handleShare} className="flex flex-col items-center gap-1 text-white">
              <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm grid place-items-center">
                <Share2 size={20} />
              </div>
              <span className="text-[10px]">Share</span>
            </button>

            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm grid place-items-center">
                <ExternalLink size={18} />
              </div>
              <span className="text-[10px]">YT</span>
            </a>
          </div>
        )}

        {/* Close player button */}
        {playing && (
          <button
            onClick={() => setPlaying(false)}
            className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white text-sm"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function ShortsPage() {
  const { v } = Route.useSearch();
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useSeo({
    title: "Anime Shorts — Video Pendek Anime Terbaik",
    description:
      "Tonton anime shorts, AMV, dan edit video anime terbaik dalam format vertical seperti YouTube Shorts.",
    path: "/shorts",
  });

  // Video awal dari ?v= — diputar langsung (player ringan, tanpa komentar)
  const { data: initialVideo } = useQuery({
    queryKey: ["shorts-initial", v],
    queryFn: () => getVideo(v || ""),
    enabled: !!v,
    staleTime: 5 * 60 * 1000,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["shorts-yt-style"],
    queryFn: ({ pageParam }) =>
      searchVideos({
        q: "anime shorts amv edit",
        videoDuration: "short",
        order: "viewCount",
        maxResults: 10,
        pageToken: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: any) => last.nextPageToken ?? undefined,
    staleTime: 5 * 60 * 1000,
  });

  // Feed shorts + video ?v= di posisi pertama (dedupe)
  const feedItems = data?.pages.flatMap((p: any) => p.items) ?? [];
  const allItems = initialVideo?.item
    ? [initialVideo.item, ...feedItems.filter((x: any) => x.id !== v)]
    : feedItems;

  useEffect(() => {
    if (activeIndex >= allItems.length - 3 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [activeIndex, allItems.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= allItems.length) return;
      setActiveIndex(idx);
      const el = containerRef.current?.children[idx] as HTMLElement;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [allItems.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goTo(activeIndex + 1);
      if (e.key === "ArrowUp") goTo(activeIndex - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, goTo]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const h = container.clientHeight;
      const idx = Math.round(container.scrollTop / h);
      setActiveIndex(idx);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 relative bg-black">
          <div
            ref={containerRef}
            className="h-[calc(100vh-57px)] overflow-y-scroll snap-y snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {allItems.map((video: any, i: number) => (
              <div key={video.id + i} className="h-[calc(100vh-57px)] snap-start snap-always">
                <ShortCard
                  video={video}
                  active={i === activeIndex}
                  autoPlay={i === 0 && !!v}
                  onNext={() => goTo(i + 1)}
                />
              </div>
            ))}

            {isFetchingNextPage && (
              <div className="h-[calc(100vh-57px)] snap-start flex items-center justify-center bg-black">
                <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
              </div>
            )}
          </div>

          {/* Nav arrows desktop */}
          <div className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-20">
            <button
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="h-9 w-9 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20 disabled:opacity-20 transition-all"
            >
              <ChevronUp size={18} />
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex >= allItems.length - 1}
              className="h-9 w-9 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20 disabled:opacity-20 transition-all"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
