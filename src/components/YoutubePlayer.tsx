import { ensureYouTubeApi } from "@/lib/youtube-iframe-api";
import { ExternalLink, Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ControlsMode = "full" | "minimal" | "none";

interface YoutubePlayerProps {
  videoId: string;
  title?: string;
  autoPlay?: boolean;
  startMuted?: boolean;
  controls?: ControlsMode;
  onEnded?: () => void;
  onReady?: (player: YT.Player) => void;
  className?: string;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Pemutar YouTube dengan kontrol buatan sendiri (bukan kontrol asli YouTube).
// Video tetap diputar dari YouTube (IFrame Player API), tapi tampilannya
// seragam dengan tema AnimeTube: play/pause, seekbar, volume, kecepatan,
// fullscreen — tanpa logo & setting bawaan YouTube.
export function YoutubePlayer({
  videoId,
  title,
  autoPlay = true,
  startMuted = false,
  controls = "full",
  onEnded,
  onReady,
  className,
}: YoutubePlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeRef = useRef(100);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);

  // Buat player baru setiap ganti video (atau retry)
  useEffect(() => {
    let disposed = false;
    setReady(false);
    setError(false);
    setPlaying(false);
    setBuffering(false);
    setCurrent(0);
    setDuration(0);
    ensureYouTubeApi().then(() => {
      if (disposed || !containerRef.current) return;
      const player = new YT.Player(containerRef.current, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          disablekb: 1,
          fs: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (disposed) return;
            playerRef.current = player;
            try {
              if (startMuted) {
                player.mute();
                setMuted(true);
              }
              player.setVolume(volumeRef.current);
              player.setPlaybackRate(1);
            } catch {
              // abaikan — player baru belum sepenuhnya siap
            }
            if (autoPlay) {
              player.playVideo();
              setPlaying(true);
            }
            setReady(true);
            onReadyRef.current?.(player);
            sizePlayer();
          },
          onStateChange: (e) => {
            setPlaying(e.data === YT.PlayerState.PLAYING);
            setBuffering(e.data === YT.PlayerState.BUFFERING);
            if (e.data === YT.PlayerState.ENDED) onEndedRef.current?.();
          },
          onError: () => setError(true),
        },
      });
    });
    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // Re-create hanya saat videoId/retryKey berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, retryKey]);

  // Update posisi & durasi secara berkala
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const d = p.getDuration();
        if (d && Number.isFinite(d)) setDuration(d);
        setCurrent(p.getCurrentTime());
      } catch {
        // abaikan — player sedang sibuk
      }
    }, 500);
    return () => clearInterval(t);
  }, [ready]);

  // Atur ulang ukuran iframe YouTube saat wadahnya berubah ukuran
  // (mis. overlay besar → mini player). Tanpa ini video bisa tampil
  // hitam padahal suaranya jalan.
  const sizePlayer = useCallback(() => {
    const p = playerRef.current;
    const el = wrapRef.current;
    if (!p || !el) return;
    try {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        p.setSize(w, h);
        // Paksa repaint agar permukaan video ikut ter-remake setelah resize
        const iframe = p.getIframe();
        iframe.style.transform = "translateZ(0)";
        void iframe.offsetWidth;
        iframe.style.transform = "";
      }
    } catch {
      // abaikan — player belum siap
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const ro = new ResizeObserver(() => sizePlayer());
    if (wrapRef.current) ro.observe(wrapRef.current);
    sizePlayer();
    return () => ro.disconnect();
  }, [ready, sizePlayer]);

  // Auto-hide kontrol saat diputar (muncul lagi saat gerakan mouse/sentuh)
  useEffect(() => {
    if (controls !== "full") return;
    const show = () => {
      setUiVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setUiVisible(false), 3000);
    };
    const root = wrapRef.current;
    root?.addEventListener("pointermove", show);
    root?.addEventListener("pointerdown", show);
    show();
    return () => {
      root?.removeEventListener("pointermove", show);
      root?.removeEventListener("pointerdown", show);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [controls, ready, playing]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    // Menekan play secara eksplisit = mau dengar suara → matikan mode bisu
    if (muted) {
      p.unMute();
      setMuted(false);
    }
    if (playing) p.pauseVideo();
    else p.playVideo();
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute();
      p.setVolume(volumeRef.current);
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  };

  const changeVolume = (v: number) => {
    volumeRef.current = v;
    setVolume(v);
    setMuted(v === 0);
    playerRef.current?.setVolume(v);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    p.seekTo(ratio * duration, true);
    setCurrent(ratio * duration);
  };

  const cycleRate = () => {
    const p = playerRef.current;
    if (!p) return;
    const idx = RATES.indexOf(rate);
    const next = RATES[(idx + 1) % RATES.length];
    p.setPlaybackRate(next);
    setRate(next);
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div ref={wrapRef} data-yt-player className={`overflow-hidden bg-black ${className ?? ""}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Chip judul kiri-atas — sekaligus menutup logo YouTube */}
      {title && controls !== "none" && !error && (
        <div className="pointer-events-none absolute left-2 top-2 z-20 max-w-[70%] truncate rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
          {title}
        </div>
      )}

      {/* Bisu — tampilkan tombol "nyalakan suara" (hanya di mode kontrol penuh) */}
      {muted && controls !== "none" && !error && (
        <button
          onClick={toggleMute}
          aria-label="Nyalakan suara"
          className="absolute bottom-2 right-2 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <VolumeX size={16} />
        </button>
      )}

      {/* Error — video tidak bisa di-embed */}
      {error && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black">
          <div className="px-4 text-center">
            <p className="mb-1 text-sm font-semibold text-white">Video tidak dapat diputar</p>
            <p className="mb-4 text-xs text-white/60">
              Video ini tidak mengizinkan diputar di situs lain (embedding dinonaktifkan).
            </p>
            <div className="flex justify-center gap-2">
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Tonton di YouTube
              </a>
              <button
                onClick={() => setRetryKey((n) => n + 1)}
                className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Coba lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {controls !== "none" && !error && (
        <>
          {/* Tombol play besar di tengah (muncul saat jeda/buffer) */}
          {(buffering || !playing) && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 z-10 grid place-items-center"
              aria-label={playing ? "Jeda" : "Putar"}
            >
              {buffering ? (
                <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-black/50 backdrop-blur-sm grid place-items-center border border-white/20 transition-transform hover:scale-105">
                  <Play size={28} className="ml-1 text-white" fill="white" />
                </div>
              )}
            </button>
          )}

          {/* Bar kontrol bawah (mode full) */}
          {controls === "full" && ready && (
            <div
              className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
                uiVisible || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2 pb-1.5 pt-10">
                <div className="flex items-center gap-1">
                  <button
                    onClick={togglePlay}
                    aria-label={playing ? "Jeda" : "Putar"}
                    className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/15 transition-colors"
                  >
                    {playing ? (
                      <Pause size={17} />
                    ) : (
                      <Play size={17} className="ml-0.5" fill="white" />
                    )}
                  </button>
                  <button
                    onClick={toggleMute}
                    aria-label={muted ? "Nyalakan suara" : "Bisukan"}
                    className="hidden sm:grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/15 transition-colors"
                  >
                    {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={muted ? 0 : volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="hidden sm:block h-1 w-20 accent-white cursor-pointer"
                    aria-label="Volume"
                  />
                  <div
                    onClick={seek}
                    className="group/seek mx-1 flex h-8 flex-1 cursor-pointer items-center"
                  >
                    <div className="relative h-1 w-full rounded-full bg-white/30 group-hover/seek:h-1.5 transition-all">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-white"
                        style={{ width: `${progress}%` }}
                      />
                      <div
                        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-md"
                        style={{ left: `calc(${progress}% - 6px)` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 px-2 text-[11px] font-medium tabular-nums text-white/90">
                    {formatTime(current)} / {formatTime(duration)}
                  </span>
                  <button
                    onClick={cycleRate}
                    title="Kecepatan putar"
                    className="grid h-9 min-w-9 place-items-center rounded-full px-1 text-[11px] font-bold text-white hover:bg-white/15 transition-colors"
                  >
                    {rate}x
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    aria-label={fullscreen ? "Keluar fullscreen" : "Fullscreen"}
                    className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/15 transition-colors"
                  >
                    {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Pintasan "buka di YouTube" kecil (hover, mode full) */}
      {controls === "full" && ready && !error && (
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-2 top-2 z-20 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/80 opacity-0 backdrop-blur-sm hover:bg-black/70 hover:text-white transition-opacity group-hover:opacity-100"
        >
          <ExternalLink size={11} className="mr-1 inline" />
          YouTube
        </a>
      )}
    </div>
  );
}
