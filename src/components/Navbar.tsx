import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { toggleSidebar } from "@/hooks/use-sidebar";
import { useTheme } from "@/hooks/use-theme";
import {
  topKeywords,
  trackSearch,
  useRecentSearches,
  clearSearchHistory,
  removeSearch,
} from "@/hooks/use-watch-history";
import { GENRES } from "@/lib/constants";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Mic, Moon, Search, Settings, Sun, X as XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const POPULAR = [
  "anime opening 2025",
  "best anime fights",
  "demon slayer",
  "jujutsu kaisen",
  "one piece episode",
  "attack on titan",
  "frieren",
  "solo leveling",
  "chainsaw man",
  "naruto",
];

interface WebSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results?: Array<Array<{ transcript?: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function Navbar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [showSearch, setShowSearch] = useState(false); // mobile search toggle
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);
  const recogRef = useRef<{ stop: () => void } | null>(null);
  const recent = useRecentSearches();
  const { theme, toggle } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stop voice recognition saat komponen unmount
  useEffect(
    () => () => {
      listeningRef.current = false;
      try {
        recogRef.current?.stop?.();
      } catch {
        // abaikan — recognition sudah berhenti
      }
    },
    [],
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Keyboard shortcut: "/" focuses search bar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        setShowSearch(true);
        setFocused(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    const personal = topKeywords(6).map((w) => `${w} anime`);
    const pool = [...recent, ...personal, ...POPULAR, ...GENRES.map((g) => `${g.label} anime`)];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of pool) {
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      if (term && !key.includes(term)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= 8) break;
    }
    return out;
  }, [q, recent]);

  const submit = (value: string) => {
    const query = value.trim();
    if (!query) return;
    trackSearch(query);
    setFocused(false);
    setShowSearch(false);
    setQ(query);
    navigate({ to: "/search", search: { q: query } });
  };

  const stopVoice = () => {
    listeningRef.current = false;
    setListening(false);
    try {
      recogRef.current?.stop?.();
    } catch {
      // abaikan — recognition sudah berhenti
    }
    recogRef.current = null;
  };

  // Voice search: native (Capacitor) + fallback Web Speech API di browser
  const startVoice = async () => {
    if (listening) {
      stopVoice();
      return;
    }
    try {
      if (Capacitor.isNativePlatform()) {
        const avail = await SpeechRecognition.available();
        if (!avail.available) {
          toast.error("Voice search tidak didukung di perangkat ini");
          return;
        }
        const perm = await SpeechRecognition.checkPermissions();
        if (!perm.speechRecognition || perm.speechRecognition !== "granted") {
          const req = await SpeechRecognition.requestPermissions();
          if (!req.speechRecognition || req.speechRecognition !== "granted") {
            toast.error("Akses mikrofon ditolak");
            return;
          }
        }
        listeningRef.current = true;
        setListening(true);
        SpeechRecognition.addListener("listeningState", (s: { status: "started" | "stopped" }) => {
          if (s.status === "stopped" && listeningRef.current) stopVoice();
        });
        try {
          const result = await SpeechRecognition.start({
            language: "id-ID",
            partialResults: false,
            popup: false,
          });
          const text = result?.matches?.[0];
          if (text) {
            stopVoice();
            setQ(text);
            submit(text);
          }
        } finally {
          if (listeningRef.current) stopVoice();
        }
      } else {
        const w = window as unknown as {
          SpeechRecognition?: new () => WebSpeechRecognition;
          webkitSpeechRecognition?: new () => WebSpeechRecognition;
        };
        const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!SR) {
          toast.error("Voice search tidak didukung di browser ini");
          return;
        }
        const recog = new SR();
        recog.lang = "id-ID";
        recog.interimResults = false;
        recog.maxAlternatives = 3;
        recog.onresult = (e) => {
          const text = e?.results?.[0]?.[0]?.transcript;
          if (text) {
            stopVoice();
            setQ(text);
            submit(text);
          }
        };
        recog.onend = () => {
          listeningRef.current = false;
          setListening(false);
        };
        recog.onerror = () => {
          listeningRef.current = false;
          setListening(false);
          toast.error("Gagal mendeteksi suara");
        };
        recogRef.current = recog;
        listeningRef.current = true;
        setListening(true);
        recog.start();
      }
    } catch {
      listeningRef.current = false;
      setListening(false);
      toast.error("Gagal memulai voice search");
    }
  };

  return (
    <header className="yt-navbar">
      <div className="flex items-center gap-2 px-4 py-2 h-14">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Menu"
            className="grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-surface transition-colors"
          >
            <Menu size={22} />
          </button>

          <Link to="/" className="flex items-center gap-1 ml-1 shrink-0">
            <div className="h-7 w-7 overflow-hidden rounded-sm shrink-0">
              <img src="/logo.jpg" alt="AnimeTube" className="h-full w-full object-cover" />
            </div>
            <span className="hidden sm:block font-bold text-base tracking-tight">
              <span className="text-[#ff0000]">Anime</span>
              <span className="text-foreground">Tube</span>
            </span>
          </Link>
        </div>

        {/* Center: search bar — hidden on mobile unless toggled */}
        <div
          ref={wrapRef}
          className={`${showSearch ? "flex absolute inset-x-0 top-0 h-14 bg-background px-4 z-10 items-center" : "hidden sm:flex"} flex-1 max-w-[600px] mx-auto relative`}
        >
          {showSearch && (
            <button
              onClick={() => setShowSearch(false)}
              className="mr-3 grid h-10 w-10 place-items-center rounded-full hover:bg-surface"
            >
              <Menu size={20} />
            </button>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(q);
            }}
            className="flex flex-1 items-center"
          >
            <input
              ref={inputRef}
              type="search"
              value={q}
              onFocus={() => setFocused(true)}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari anime... (tekan / untuk fokus)"
              className="yt-search flex-1 min-w-0"
            />
            <button
              type="submit"
              aria-label="Search"
              className="h-10 px-5 rounded-r-full border border-l-0 border-border dark:border-[#303030] bg-surface dark:bg-[#222222] text-foreground hover:bg-muted dark:hover:bg-[#3f3f3f] transition-colors flex items-center justify-center shrink-0"
            >
              <Search size={18} />
            </button>
          </form>
          <button
            type="button"
            aria-label="Search with voice"
            onClick={startVoice}
            className={`ml-2 grid h-10 w-10 place-items-center rounded-full bg-surface text-foreground hover:bg-muted dark:hover:bg-[#3f3f3f] transition-colors shrink-0 ${listening ? "text-primary animate-pulse" : ""}`}
          >
            <Mic size={18} />
          </button>

          {/* Suggestions */}
          {focused && suggestions.length > 0 && (
            <div className="absolute left-0 right-16 top-full mt-1 z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-dropdown)]">
              {/* Header: recent label + clear all */}
              {recent.length > 0 && !q.trim() && (
                <div className="flex items-center justify-between px-4 pt-2 pb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Pencarian terakhir
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearSearchHistory();
                    }}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Hapus semua
                  </button>
                </div>
              )}
              <ul className="py-1">
                {suggestions.map((s, i) => {
                  const isRecent = recent.includes(s);
                  return (
                    <li key={s + i} className="group flex items-center gap-1 px-2">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          submit(s);
                        }}
                        className="flex flex-1 items-center gap-3 py-2.5 px-2 text-left text-sm text-foreground hover:bg-surface transition-colors rounded-lg"
                      >
                        <Search size={14} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{s}</span>
                      </button>
                      {isRecent && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            removeSearch(s);
                          }}
                          className="opacity-0 group-hover:opacity-100 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-surface transition-all shrink-0"
                          title="Hapus"
                        >
                          <XIcon size={13} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setShowSearch(true)}
            className="sm:hidden grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-surface transition-colors"
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          <Link
            to="/settings"
            className="grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-surface transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} />
          </Link>

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-surface transition-colors"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
