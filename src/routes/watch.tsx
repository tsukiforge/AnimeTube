import { AdSlot } from "@/components/AdSlot";
import { Equalizer } from "@/components/Equalizer";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SkeletonCard } from "@/components/SkeletonCard";
import { VideoCard } from "@/components/VideoCard";
import { trackWatch } from "@/hooks/use-watch-history";
import { formatWatchTime, useWatchTimer } from "@/hooks/use-watch-timer";
import { formatViews, timeAgo } from "@/lib/format";
import { getComments, getRelated, getVideo } from "@/lib/youtube.functions";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Maximize2, Minimize2, X as XIcon } from "lucide-react";
import { Component, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  v: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/watch")({
  validateSearch: zodValidator(searchSchema),
  component: WatchPage,
});

// ── Section-level Error Boundary ─────────────────────────────────
interface EBState { hasError: boolean; message: string }
class SectionErrorBoundary extends Component<{ children: React.ReactNode; fallback?: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error?.message || "Something went wrong" };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          <p className="text-2xl mb-2">😵</p>
          <p>{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Coba lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Mini Player (PiP) ─────────────────────────────────────────────
function MiniPlayer({
  videoId, title, onClose, onExpand,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
  onExpand: () => void;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const ref = useRef<HTMLDivElement>(null);

  // Default position: bottom-right
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPos({ x: w - 340, y: h - 220 });
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 320, dragStart.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 200, dragStart.current.py + dy)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  return (
    <div
      ref={ref}
      className="fixed z-[150] rounded-xl overflow-hidden shadow-2xl border border-border"
      style={{ left: pos.x, top: pos.y, width: 320, cursor: dragging ? "grabbing" : "grab" }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-between bg-[#1f1f1f] px-2 py-1.5 select-none"
        onMouseDown={onMouseDown}
      >
        <p className="text-[11px] text-muted-foreground truncate flex-1 mr-2">{title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onExpand}
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            title="Perbesar"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            title="Tutup"
          >
            <XIcon size={12} />
          </button>
        </div>
      </div>
      {/* Video */}
      <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}

function ActionButton({
  label, icon, onClick, href, variant = "default",
}: {
  label: string; icon: string; onClick?: () => void; href?: string;
  variant?: "default" | "primary" | "danger";
}) {
  const cls =
    "inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold hover:border-primary hover:text-primary transition-colors " +
    (variant === "primary" ? "bg-[var(--gradient-primary)] text-white border-transparent hover:text-white " : "") +
    (variant === "danger" ? "hover:text-destructive hover:border-destructive " : "");
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}><span>{icon}</span> <span>{label}</span></a>;
  return <button onClick={onClick} className={cls}><span>{icon}</span> <span>{label}</span></button>;
}

function VideoMain({ autoNextId }: { autoNextId: string | null }) {
  const { v } = Route.useSearch();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["video", v],
    queryFn: () => getVideo(v),
    enabled: !!v,
  });
  const video = data?.item;
  const [showFull, setShowFull] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showMini, setShowMini] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);

  // ── Watch timer — health reminder after 5h ────────────────────
  const handleHealthToast = useCallback(
    (msg: { title: string; body: string; totalSecs: number }) => {
      toast(msg.title, {
        description: `${msg.body} (Total hari ini: ${formatWatchTime(msg.totalSecs)})`,
        duration: 10000,
        icon: "😴",
        action: {
          label: "Istirahat",
          onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
        },
      });
    },
    [],
  );
  // active = true whenever this component is mounted (video is open)
  useWatchTimer(true, handleHealthToast);

  useEffect(() => {
    if (!video) return;
    trackWatch({
      id: v,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      thumb: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.high?.url,
      tags: video.snippet.tags,
    });
  }, [v, video]);

  // Reset state player saat pindah video
  useEffect(() => {
    setPlayerError(false);
    setPlayerAttempt(0);
  }, [v]);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key.toLowerCase()) {
        case "m":
          // Toggle mini player
          setShowMini((s) => !s);
          toast(showMini ? "Mini player dinonaktifkan" : "Mini player aktif", { duration: 1500 });
          break;
        case "escape":
          if (showMini) { setShowMini(false); }
          if (countdown !== null) { cancelCountdown(); }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMini, countdown]);

  // Listen for YouTube iframe postMessage — detect video ended or player error
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://www.youtube.com" && e.origin !== "https://www.youtube-nocookie.com") return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YT iframe API: info.playerState === 0 means ended
        if (data?.event === "infoDelivery" && data?.info?.playerState === 0) {
          if (autoNextId) startCountdown(autoNextId);
        }
        // Player gagal dimuat (video tidak boleh di-embed, Error 153, dll)
        if (data?.event === "onError") {
          setPlayerError(true);
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [autoNextId]);

  const startCountdown = (nextId: string) => {
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          clearInterval(countdownRef.current!);
          navigate({ to: "/watch", search: { v: nextId } });
          return null;
        }
        return c - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);
  };

  // Cleanup on unmount
  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  // Scroll detection — show mini player when video scrolls out of view
  useEffect(() => {
    if (!playerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show mini player when less than 20% of player is visible
        if (!entry.isIntersecting && entry.intersectionRatio < 0.2) {
          setShowMini(true);
        } else {
          setShowMini(false);
        }
      },
      { threshold: [0, 0.2] }
    );
    observer.observe(playerRef.current);
    return () => observer.disconnect();
  }, [video]);

  if (isLoading) return <div className="aspect-video skeleton rounded-xl" />;

  if (!video) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="mt-4 text-muted-foreground">Video not found.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Go home</Link>
      </div>
    );
  }

  const ytWatchUrl = `https://www.youtube.com/watch?v=${v}`;
  const downloadUrl = `https://yt1s.com/youtube/${v}`;

  // origin param hanya untuk http(s) — di WebView (capacitor://localhost) di-omit
  const isHttpOrigin = /^https?:\/\//.test(window.location.origin);
  const jsapiParam = isHttpOrigin
    ? `&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : "&enablejsapi=1";

  return (
    <div>
      <div ref={playerRef} className="overflow-hidden rounded-xl">
        <div className="relative aspect-video bg-black">
          <iframe
            key={`${v}-${playerAttempt}`}
            src={`https://www.youtube-nocookie.com/embed/${v}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&playsinline=1${jsapiParam}`}
            title={video.snippet.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
          {playerError && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-black">
              <div className="px-4 text-center">
                <p className="mb-1 text-sm font-semibold text-white">Video tidak dapat diputar</p>
                <p className="mb-4 text-xs text-white/60">
                  Video ini tidak mengizinkan diputar di situs lain (embedding dinonaktifkan).
                </p>
                <div className="flex justify-center gap-2">
                  <a
                    href={ytWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Tonton di YouTube
                  </a>
                  <button
                    onClick={() => {
                      setPlayerError(false);
                      setPlayerAttempt((n) => n + 1);
                    }}
                    className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Coba lagi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* PiP button overlay */}
        <div className="flex items-center justify-between bg-[#1f1f1f] px-3 py-1.5">
          <span className="text-[11px] text-muted-foreground">
            Mini player — klik untuk aktifkan atau scroll ke bawah
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMini(true);
              // Scroll ke bawah agar player keluar viewport
              window.scrollBy({ top: 400, behavior: "smooth" });
            }}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            title="Aktifkan Mini Player"
          >
            <Minimize2 size={13} />
            <span>Mini Player</span>
          </button>
        </div>
      </div>

      {/* Mini Player */}
      {showMini && video && (
        <MiniPlayer
          videoId={v}
          title={video.snippet.title}
          onClose={() => setShowMini(false)}
          onExpand={() => {
            setShowMini(false);
            playerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      )}

      {/* Auto-next countdown banner */}
      {countdown !== null && autoNextId && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-surface border border-border px-4 py-3">
          <span className="text-sm text-foreground">
            Video berikutnya dalam <strong className="text-primary">{countdown}s</strong>...
          </span>
          <div className="flex gap-2">
            <button
              onClick={cancelCountdown}
              className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => { cancelCountdown(); navigate({ to: "/watch", search: { v: autoNextId } }); }}
              className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Putar sekarang
            </button>
          </div>
        </div>
      )}

      <h1 className="mt-4 font-display text-2xl font-bold leading-tight md:text-3xl">{video.snippet.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{formatViews(video.statistics?.viewCount)} views</span>
        <span>·</span>
        <span>{timeAgo(video.snippet.publishedAt)}</span>
        <Equalizer />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton label={`Like  ${formatViews(video.statistics?.likeCount)}`} icon="👍" href={ytWatchUrl} />
        <ActionButton label="Dislike" icon="👎" href={ytWatchUrl} />
        <ActionButton label="Share" icon="↗" onClick={() => {
          if (navigator.share) {
            navigator.share({ title: video.snippet.title, url: window.location.href }).catch(() => {});
          } else {
            navigator.clipboard?.writeText(window.location.href).then(() => {
              toast.success("Link disalin ke clipboard!");
            }).catch(() => {
              toast.error("Gagal menyalin link");
            });
          }
        }} />
        <ActionButton label="Download" icon="⬇️" href={downloadUrl} variant="primary" />
        <ActionButton label="Watch on YouTube" icon="▶️" href={ytWatchUrl} />
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground/70">
        Like / Dislike redirect to YouTube — AnimeTube has no login.
      </p>

      <div className="anime-border mt-4 flex items-center gap-3 rounded-xl bg-card p-4">
        <Link to="/channel/$channelId" params={{ channelId: video.snippet.channelId }}
          className="grid h-12 w-12 place-items-center rounded-full bg-primary/20 font-bold text-primary text-lg shrink-0">
          {video.snippet.channelTitle?.[0] || "?"}
        </Link>
        <div className="flex-1">
          <Link to="/channel/$channelId" params={{ channelId: video.snippet.channelId }}
            className="font-bold text-foreground hover:text-primary">
            {video.snippet.channelTitle}
          </Link>
        </div>
      </div>

      <div className="anime-border mt-4 rounded-xl bg-card p-4">
        <p className={`whitespace-pre-wrap text-sm text-muted-foreground ${showFull ? "" : "line-clamp-3"}`}>
          {video.snippet.description}
        </p>
        <button onClick={() => setShowFull((s) => !s)} className="mt-2 text-xs font-bold text-primary hover:underline">
          {showFull ? "Show Less" : "Show More"}
        </button>
        {video.snippet.tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {video.snippet.tags.slice(0, 12).map((t: string) => (
              <Link key={t} to="/search" search={{ q: t }} className="anime-pill rounded-full px-3 py-1 text-xs">#{t}</Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4"><AdSlot id="ad-watch-below" size="leaderboard" /></div>
      <SectionErrorBoundary>
        <Comments videoId={v} />
      </SectionErrorBoundary>
    </div>
  );
}

function Comments({ videoId }: { videoId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["comments", videoId],
    queryFn: () => getComments(videoId),
    staleTime: 5 * 60 * 1000,
  });
  return (
    <section className="mt-6">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <span>💬</span> <span className="text-gradient">Comments</span>
      </h2>
      {isLoading && (
        <div className="mt-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="skeleton h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="skeleton h-3 w-1/4 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
      {data?.disabled && <p className="mt-3 text-sm text-muted-foreground">Comments are disabled for this video.</p>}
      <div className="mt-4 space-y-4">
        {data?.items?.map((c: any) => {
          const s = c.snippet?.topLevelComment?.snippet;
          if (!s) return null;
          return (
            <div key={c.id} className="anime-border flex gap-3 rounded-xl bg-card p-4">
              <img src={s.authorProfileImageUrl} alt={s.authorDisplayName} className="h-10 w-10 rounded-full" loading="lazy" />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-foreground">{s.authorDisplayName}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(s.publishedAt)}</span>
                </div>
                <p className="mt-1 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: s.textDisplay }} />
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>👍 {formatViews(s.likeCount)}</span>
                  <a href={`https://www.youtube.com/watch?v=${videoId}&lc=${c.id}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    Reply on YouTube
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Related({ onFirstVideo }: { onFirstVideo?: (id: string) => void }) {
  const { v } = Route.useSearch();
  const { data: videoData } = useQuery({
    queryKey: ["video", v],
    queryFn: () => getVideo(v),
    enabled: !!v,
  });
  const q = videoData?.item?.snippet?.title?.split(" ").slice(0, 4).join(" ") || "anime";
  const { data, isLoading } = useQuery({
    queryKey: ["related", v, q],
    queryFn: () => getRelated(q, v),
    enabled: !!videoData,
  });

  // Pass first related video id up for auto-next
  useEffect(() => {
    const firstId = data?.items?.[0]?.id;
    if (firstId && onFirstVideo) onFirstVideo(firstId);
  }, [data, onFirstVideo]);

  return (
    <aside>
      <h2 className="mb-4 font-semibold text-base flex items-center gap-2 text-foreground">
        Up Next
      </h2>
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} compact />)
          : data?.items?.map((v: any) => <VideoCard key={v.id} video={v} variant="compact" />)}
      </div>
      <div className="mt-4"><AdSlot id="ad-watch-side" sticky /></div>
    </aside>
  );
}

function WatchPage() {
  const { v } = Route.useSearch();
  const [nextVideoId, setNextVideoId] = useState<string | null>(null);

  if (!v) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 grid place-items-center py-32 text-center">
            <div>
              <p className="mt-4 text-muted-foreground">No video selected.</p>
              <Link to="/" className="mt-3 text-primary underline">Browse trending</Link>
            </div>
          </main>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-3 py-4 sm:px-4 sm:py-6 lg:grid lg:grid-cols-[1fr_380px] lg:gap-6">
          <SectionErrorBoundary>
            <Suspense fallback={<div className="aspect-video skeleton rounded-xl" />}>
              <VideoMain autoNextId={nextVideoId} />
            </Suspense>
          </SectionErrorBoundary>
          <SectionErrorBoundary fallback={
            <aside className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              <p className="text-2xl mb-2">📭</p>
              <p>Gagal memuat video terkait</p>
            </aside>
          }>
            <Related onFirstVideo={(id) => setNextVideoId(id)} />
          </SectionErrorBoundary>
        </main>
      </div>
    </div>
  );
}
