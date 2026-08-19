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
import { useSeo } from "@/lib/seo";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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
interface EBState {
  hasError: boolean;
  message: string;
}
class SectionErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  EBState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error?.message || "Something went wrong" };
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
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
        )
      );
    }
    return this.props.children;
  }
}

// ── Mini Player (PiP) ─────────────────────────────────────────────
// TIDAK pakai portal/duplikat: container player utama sendiri yang berubah
// jadi fixed bottom-right via CSS saat showMini. Iframe TIDAK pernah
// di-unmount/dipindah → posisi waktu & state player 100% sinkron tanpa reload.
// (VideoFrame & player main) — lihat VideoMain.

// Single iframe YouTube player — SATU instance untuk player utama & miniplayer.
// Dirender di main slot, lalu di-portal ke MiniPlayer tanpa remount.
function VideoFrame({
  videoId,
  title,
  playerError,
  onRetry,
}: {
  videoId: string;
  title: string;
  playerError: boolean;
  onRetry: () => void;
}) {
  // origin param hanya untuk http(s) — di WebView (capacitor://localhost) di-omit
  const isHttpOrigin = /^https?:\/\//.test(window.location.origin);
  const jsapiParam = isHttpOrigin
    ? `&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : "&enablejsapi=1";
  const ytWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&playsinline=1${jsapiParam}`}
        title={title}
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
                onClick={onRetry}
                className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Coba lagi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  href,
  variant = "default",
}: {
  label: string;
  icon: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "primary" | "danger";
}) {
  const cls =
    "inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold hover:border-primary hover:text-primary transition-colors " +
    (variant === "primary"
      ? "bg-[var(--gradient-primary)] text-white border-transparent hover:text-white "
      : "") +
    (variant === "danger" ? "hover:text-destructive hover:border-destructive " : "");
  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        <span>{icon}</span> <span>{label}</span>
      </a>
    );
  return (
    <button onClick={onClick} className={cls}>
      <span>{icon}</span> <span>{label}</span>
    </button>
  );
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

  useSeo({
    title: video?.snippet.title,
    description: video?.snippet.description?.replace(/\s+/g, " ").slice(0, 160),
    path: `/watch?v=${v}`,
    image: video?.snippet.thumbnails?.maxres?.url || video?.snippet.thumbnails?.high?.url,
    type: "video.other",
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showMini, setShowMini] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  // Mini player CSS-fixed: posisi & drag (iframe tidak pernah dipindah DOM)
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const showMiniRef = useRef(false);
  showMiniRef.current = showMini;
  // Setelah manual close/expand, jangan auto-reopen sampai player terlihat lagi
  const suppressAuto = useRef(false);

  // Default posisi mini player: bottom-right
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPos({ x: w - 340, y: h - 220 });
  }, []);

  const closeMini = () => {
    suppressAuto.current = true;
    setShowMini(false);
  };

  const expandMini = () => {
    suppressAuto.current = true;
    setShowMini(false);
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onDragStart = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 320, dragStart.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 200, dragStart.current.py + dy)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

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
          if (showMini) {
            closeMini();
            toast("Mini player dinonaktifkan", { duration: 1500 });
          } else {
            setShowMini(true);
            toast("Mini player aktif", { duration: 1500 });
          }
          break;
        case "escape":
          if (showMini) {
            closeMini();
          }
          if (countdown !== null) {
            cancelCountdown();
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMini, countdown]);

  // Listen for YouTube iframe postMessage — detect video ended or player error
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://www.youtube.com" && e.origin !== "https://www.youtube-nocookie.com")
        return;
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
  useEffect(
    () => () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    },
    [],
  );

  // Scroll detection — show mini player when video scrolls out of view.
  // Guard: jangan auto-muncul saat first-load (belum scroll), jangan override
  // saat mini aktif, dan hormati suppressAuto setelah user manual close.
  useEffect(() => {
    if (!playerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (showMiniRef.current) return;
        if (entry.isIntersecting || entry.intersectionRatio >= 0.2) {
          suppressAuto.current = false;
          setShowMini(false);
        } else if (!suppressAuto.current && window.scrollY >= 100) {
          setShowMini(true);
        }
      },
      { threshold: [0, 0.2] },
    );
    observer.observe(playerRef.current);
    return () => observer.disconnect();
  }, [video]);

  if (isLoading) return <div className="aspect-video skeleton rounded-xl" />;

  if (!video) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="mt-4 text-muted-foreground">Video not found.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Go home
        </Link>
      </div>
    );
  }

  const ytWatchUrl = `https://www.youtube.com/watch?v=${v}`;
  const downloadUrl = `https://yt1s.com/youtube/${v}`;

  // SATU instance player — dirender di main slot, di-portal ke MiniPlayer saat scroll.
  // Iframe yang sama → posisi & state player identik (bukan duplikat seperti sebelumnya).
  const playerFrame = (
    <VideoFrame
      key={`${v}-${playerAttempt}`}
      videoId={v}
      title={video.snippet.title}
      playerError={playerError}
      onRetry={() => {
        setPlayerError(false);
        setPlayerAttempt((n) => n + 1);
      }}
    />
  );

  return (
    <div>
      {/* SATU container player — iframe TIDAK pernah unmount/pindah DOM.
          Saat showMini, container ini yang berubah jadi fixed bottom-right (CSS),
          jadi video lanjut muter tanpa reload/error. */}
      <div
        ref={playerRef}
        className={
          showMini
            ? "fixed z-[150] overflow-hidden rounded-xl border border-border shadow-2xl bg-black"
            : "overflow-hidden rounded-xl"
        }
        style={
          showMini
            ? { left: pos.x, top: pos.y, width: 320, cursor: dragging ? "grabbing" : "grab" }
            : undefined
        }
      >
        {showMini && (
          <div
            className="flex items-center justify-between bg-[#1f1f1f] px-2 py-1.5 select-none touch-none"
            onPointerDown={onDragStart}
          >
            <p className="text-[11px] text-muted-foreground truncate flex-1 mr-2">
              {video.snippet.title}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={expandMini}
                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                title="Perbesar"
              >
                <Maximize2 size={12} />
              </button>
              <button
                onClick={closeMini}
                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                title="Tutup"
              >
                <XIcon size={12} />
              </button>
            </div>
          </div>
        )}
        <div className="relative aspect-video bg-black">{playerFrame}</div>
        {!showMini && (
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
        )}
      </div>

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
              onClick={() => {
                cancelCountdown();
                navigate({ to: "/watch", search: { v: autoNextId } });
              }}
              className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Putar sekarang
            </button>
          </div>
        </div>
      )}

      <h1 className="mt-4 font-display text-2xl font-bold leading-tight md:text-3xl">
        {video.snippet.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{formatViews(video.statistics?.viewCount)} views</span>
        <span>·</span>
        <span>{timeAgo(video.snippet.publishedAt)}</span>
        <Equalizer />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton
          label={`Like  ${formatViews(video.statistics?.likeCount)}`}
          icon="👍"
          href={ytWatchUrl}
        />
        <ActionButton label="Dislike" icon="👎" href={ytWatchUrl} />
        <ActionButton
          label="Share"
          icon="↗"
          onClick={() => {
            if (navigator.share) {
              navigator
                .share({ title: video.snippet.title, url: window.location.href })
                .catch(() => {});
            } else {
              navigator.clipboard
                ?.writeText(window.location.href)
                .then(() => {
                  toast.success("Link disalin ke clipboard!");
                })
                .catch(() => {
                  toast.error("Gagal menyalin link");
                });
            }
          }}
        />
        <ActionButton label="Download" icon="⬇️" href={downloadUrl} variant="primary" />
        <ActionButton label="Watch on YouTube" icon="▶️" href={ytWatchUrl} />
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground/70">
        Like / Dislike redirect to YouTube — AnimeTube has no login.
      </p>

      <div className="anime-border mt-4 flex items-center gap-3 rounded-xl bg-card p-4">
        {video._channelAvatar && (
          <img
            src={video._channelAvatar}
            alt={video.snippet.channelTitle}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-border shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <Link
          to="/channel/$channelId"
          params={{ channelId: video.snippet.channelId }}
          className="grid h-12 w-12 place-items-center rounded-full bg-primary/20 font-bold text-primary text-lg shrink-0"
          style={{ display: video._channelAvatar ? "none" : "grid" }}
        >
          {video.snippet.channelTitle?.[0] || "?"}
        </Link>
        <div className="flex-1">
          <Link
            to="/channel/$channelId"
            params={{ channelId: video.snippet.channelId }}
            className="font-bold text-foreground hover:text-primary"
          >
            {video.snippet.channelTitle}
          </Link>
        </div>
      </div>

      <div className="anime-border mt-4 rounded-xl bg-card p-4">
        <p
          className={`whitespace-pre-wrap text-sm text-muted-foreground ${showFull ? "" : "line-clamp-3"}`}
        >
          {video.snippet.description}
        </p>
        <button
          onClick={() => setShowFull((s) => !s)}
          className="mt-2 text-xs font-bold text-primary hover:underline"
        >
          {showFull ? "Show Less" : "Show More"}
        </button>
        {video.snippet.tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {video.snippet.tags.slice(0, 12).map((t: string) => (
              <Link
                key={t}
                to="/search"
                search={{ q: t }}
                className="anime-pill rounded-full px-3 py-1 text-xs"
              >
                #{t}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <AdSlot id="ad-watch-below" size="leaderboard" />
      </div>
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
      {data?.disabled && (
        <p className="mt-3 text-sm text-muted-foreground">Comments are disabled for this video.</p>
      )}
      <div className="mt-4 space-y-4">
        {data?.items?.map((c: any) => {
          const s = c.snippet?.topLevelComment?.snippet;
          if (!s) return null;
          return (
            <div key={c.id} className="anime-border flex gap-3 rounded-xl bg-card p-4">
              <img
                src={s.authorProfileImageUrl}
                alt={s.authorDisplayName}
                className="h-10 w-10 rounded-full shrink-0"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-foreground">{s.authorDisplayName}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(s.publishedAt)}</span>
                </div>
                <p
                  className="mt-1 text-sm text-foreground"
                  dangerouslySetInnerHTML={{ __html: s.textDisplay }}
                />
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>👍 {formatViews(s.likeCount)}</span>
                  <a
                    href={`https://www.youtube.com/watch?v=${videoId}&lc=${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                  >
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
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["related", v, q],
    queryFn: ({ pageParam }) => getRelated(q, v, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: any) => last.nextPageToken ?? undefined,
    enabled: !!videoData,
  });

  // Dedupe antar halaman, tapi jaga halaman pertama tetap tampil duluan
  const seen = new Set<string>();
  const items = (data?.pages ?? [])
    .flatMap((p: any) => p.items)
    .filter((it: any) => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });

  // Pass first related video id up for auto-next
  useEffect(() => {
    const firstId = items[0]?.id;
    if (firstId && onFirstVideo) onFirstVideo(firstId);
  }, [items, onFirstVideo]);

  return (
    <aside>
      <h2 className="mb-4 font-semibold text-base flex items-center gap-2 text-foreground">
        Up Next
      </h2>
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} compact />)
          : items.map((v: any) => <VideoCard key={v.id} video={v} variant="compact" />)}
      </div>
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
              Memuat...
            </>
          ) : (
            <>Show more</>
          )}
        </button>
      )}
      <div className="mt-4">
        <AdSlot id="ad-watch-side" sticky />
      </div>
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
              <Link to="/" className="mt-3 text-primary underline">
                Browse trending
              </Link>
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
          <SectionErrorBoundary
            fallback={
              <aside className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                <p className="text-2xl mb-2">📭</p>
                <p>Gagal memuat video terkait</p>
              </aside>
            }
          >
            <Related onFirstVideo={(id) => setNextVideoId(id)} />
          </SectionErrorBoundary>
        </main>
      </div>
    </div>
  );
}
