import { useNavigate } from "@tanstack/react-router";
import { Maximize2, X as XIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { YoutubePlayer } from "@/components/YoutubePlayer";

type PlayerVideo = { id: string; title: string };

interface GlobalPlayerContextValue {
  video: PlayerVideo | null;
  showMini: boolean;
  placeholder: HTMLDivElement | null;
  registerPlaceholder: (el: HTMLDivElement | null) => void;
  setVideo: (v: PlayerVideo) => void;
  setShowMini: (v: boolean) => void;
  expand: () => void;
  close: () => void;
  isSuppressed: () => boolean;
  setSuppressed: (v: boolean) => void;
  setVideoEndedHandler: (cb: (() => void) | null) => void;
  notifyVideoEnded: () => void;
}

const Ctx = createContext<GlobalPlayerContextValue | null>(null);

export function useGlobalPlayer(): GlobalPlayerContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGlobalPlayer must be used within GlobalPlayerProvider");
  return ctx;
}

// ── Global Player (satu instance, tidak pernah di-unmount) ─────────────
// Iframe YouTube dirender di sini (level root) supaya video TETAP MUTER
// walau user pindah halaman (beranda/settings/dll). Tampilannya:
//  - di halaman watch (placeholder terdaftar) & showMini=false → overlay
//    absolute tepat di atas placeholder (video tetap di posisi aslinya)
//  - selain itu → mini player fixed di kanan bawah (bisa di-drag)
export function GlobalPlayerProvider({ children }: { children: React.ReactNode }) {
  const [video, setVideoState] = useState<PlayerVideo | null>(null);
  const [showMini, setShowMini] = useState(false);
  const [placeholder, setPlaceholder] = useState<HTMLDivElement | null>(null);
  const suppressAuto = useRef(false);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<PlayerVideo | null>(null);
  videoRef.current = video;
  const onVideoEndedRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();

  const setVideoEndedHandler = useCallback((cb: (() => void) | null) => {
    onVideoEndedRef.current = cb;
  }, []);

  const notifyVideoEnded = useCallback(() => {
    onVideoEndedRef.current?.();
  }, []);

  const registerPlaceholder = useCallback((el: HTMLDivElement | null) => {
    placeholderRef.current = el;
    setPlaceholder(el);
    if (!el) {
      if (suppressAuto.current) {
        // User sudah menutup/minimize-nya → berhenti total, jangan muncul lagi
        setVideoState(null);
        setShowMini(false);
      } else {
        // Keluar dari halaman watch → player otomatis jadi mini & lanjut muter
        setShowMini(true);
      }
    }
  }, []);

  const setVideo = useCallback((v: PlayerVideo) => {
    // Video yang sama (mis. refetch data) → jangan reset status mini/suppress
    if (videoRef.current?.id === v.id) return;
    setVideoState(v);
    suppressAuto.current = false;
    const el = placeholderRef.current;
    if (!el) {
      setShowMini(true);
      return;
    }
    const r = el.getBoundingClientRect();
    const visible = r.top < window.innerHeight && r.bottom > 0;
    setShowMini(!visible);
  }, []);

  const isSuppressed = useCallback(() => suppressAuto.current, []);
  const setSuppressed = useCallback((v: boolean) => {
    suppressAuto.current = v;
  }, []);

  const expand = useCallback(() => {
    suppressAuto.current = true;
    setShowMini(false);
    const el = placeholderRef.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (videoRef.current) {
      navigate({ to: "/watch", search: { v: videoRef.current.id } });
    }
  }, [navigate]);

  const close = useCallback(() => {
    suppressAuto.current = true;
    if (placeholderRef.current) {
      setShowMini(false);
      placeholderRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      // Tidak di halaman watch → tutup player & stop video
      setVideoState(null);
      setShowMini(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      video,
      showMini,
      placeholder,
      registerPlaceholder,
      setVideo,
      setShowMini,
      expand,
      close,
      isSuppressed,
      setSuppressed,
      setVideoEndedHandler,
      notifyVideoEnded,
    }),
    [
      video,
      showMini,
      placeholder,
      registerPlaceholder,
      setVideo,
      setShowMini,
      expand,
      close,
      isSuppressed,
      setSuppressed,
      setVideoEndedHandler,
      notifyVideoEnded,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <GlobalPlayer />
    </Ctx.Provider>
  );
}

function GlobalPlayer() {
  const {
    video,
    showMini,
    placeholder,
    setShowMini,
    expand,
    close,
    isSuppressed,
    setSuppressed,
    notifyVideoEnded,
  } = useGlobalPlayer();
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const showMiniRef = useRef(false);
  showMiniRef.current = showMini;
  const videoRef = useRef<PlayerVideo | null>(null);
  videoRef.current = video;

  // Default posisi mini player: kanan bawah
  useEffect(() => {
    setPos({ x: Math.max(0, window.innerWidth - 340), y: Math.max(0, window.innerHeight - 220) });
  }, []);

  // Clamp posisi saat resize
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: Math.max(0, Math.min(p.x, window.innerWidth - 320)),
        y: Math.max(0, Math.min(p.y, window.innerHeight - 200)),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Ukur rect placeholder (mode normal: overlay absolute di atasnya)
  useEffect(() => {
    if (!placeholder || showMini) {
      setBox({ x: 0, y: 0, w: 0, h: 0 });
      return;
    }
    const measure = () => {
      const r = placeholder.getBoundingClientRect();
      setBox({ x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height });
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [placeholder, showMini]);

  // Observer pada placeholder (elemen statis di halaman watch):
  //  - placeholder keluar viewport → mini player otomatis aktif
  //  - placeholder terlihat lagi (scroll ke atas) → kembali ke player normal
  useEffect(() => {
    if (!placeholder || !video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting || entry.intersectionRatio >= 0.2;
        if (visible) {
          if (showMiniRef.current) {
            setShowMini(false);
          }
        } else if (!showMiniRef.current && !isSuppressed() && window.scrollY >= 100) {
          setShowMini(true);
        }
      },
      { threshold: [0, 0.2] },
    );
    observer.observe(placeholder);
    return () => observer.disconnect();
  }, [placeholder, video, setShowMini, setSuppressed, isSuppressed]);

  // Keyboard: M = toggle mini player, Escape = tutup mini
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key.toLowerCase() === "m") {
        if (showMiniRef.current) {
          expand();
          toast("Mini player dinonaktifkan", { duration: 1500 });
        } else {
          setShowMini(true);
          toast("Mini player aktif", { duration: 1500 });
        }
      } else if (e.key === "Escape" && showMiniRef.current) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expand, close, setShowMini]);

  const onDragStart = (e: React.PointerEvent) => {
    if (!showMini) return;
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

  if (!video) return null;

  const isMini = showMini || !placeholder;

  return (
    <div
      className={
        isMini
          ? "fixed z-[150] overflow-hidden rounded-xl border border-border shadow-2xl bg-black"
          : "absolute z-10 overflow-hidden rounded-xl"
      }
      style={
        isMini
          ? { left: pos.x, top: pos.y, width: 320, cursor: dragging ? "grabbing" : "grab" }
          : { left: box.x, top: box.y, width: box.w, height: box.h }
      }
    >
      {isMini && (
        <div
          className="flex items-center justify-between bg-surface dark:bg-[#1f1f1f] px-2 py-1.5 select-none touch-none"
          onPointerDown={onDragStart}
        >
          <p className="text-[11px] text-muted-foreground truncate flex-1 mr-2">{video.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={expand}
              className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              title="Perbesar"
            >
              <Maximize2 size={12} />
            </button>
            <button
              onClick={close}
              className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              title="Tutup"
            >
              <XIcon size={12} />
            </button>
          </div>
        </div>
      )}
      <YoutubePlayer
        videoId={video.id}
        title={video.title}
        autoPlay
        controls={isMini ? "minimal" : "full"}
        onEnded={notifyVideoEnded}
        className={isMini ? "relative aspect-video w-full" : "absolute inset-0"}
      />
    </div>
  );
}
