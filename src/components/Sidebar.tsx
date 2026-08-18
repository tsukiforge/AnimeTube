import { useSidebar } from "@/hooks/use-sidebar";
import { useWatchHistory } from "@/hooks/use-watch-history";
import { GENRES } from "@/lib/constants";
import { Link } from "@tanstack/react-router";
import {
    Coffee, Compass,
    HelpCircle, Home, Info, Lock,
    Radio, Settings, TrendingUp, Tv2, X,
} from "lucide-react";

const MAIN = [
  { to: "/",                label: "Beranda",  Icon: Home      },
  { to: "/live",            label: "Live",     Icon: Radio     },
  { to: "/search",          label: "Jelajahi", Icon: Compass,  search: { q: "anime" } },
  { to: "/category/$genre", label: "Trending", Icon: TrendingUp, params: { genre: "trending" } },
  { to: "/channels",        label: "Channels", Icon: Tv2       },
] as const;

const META = [
  { to: "/settings", label: "Pengaturan", Icon: Settings,   hash: undefined },
  { to: "/about",    label: "Tentang",    Icon: Info,       hash: undefined },
  { to: "/about",    label: "Bantuan",    Icon: HelpCircle, hash: "help"    },
  { to: "/about",    label: "Privasi",    Icon: Lock,       hash: "privacy" },
] as const;

// ── Support Banner ────────────────────────────────────────────────
function SupportBanner() {
  return (
    <div className="mx-3 my-2 rounded-lg bg-primary/8 border border-primary/15 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Coffee size={12} className="text-primary" />
        <p className="text-[11px] font-semibold text-primary">Support AnimeTube</p>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed mb-2.5">
        Gratis, no login, bebas judol. Bantu kami tetap online.
      </p>
      <a
        href="https://tako.id/c/SiMahiro"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Dukung kami →
      </a>
    </div>
  );
}

// ── Nav List ──────────────────────────────────────────────────────
function NavList({ onItemClick }: { onItemClick?: () => void }) {
  const { items: history } = useWatchHistory();
  const recent = history.slice(0, 4);

  return (
    <div className="flex flex-col gap-0.5 py-2">
      {/* Main nav */}
      <div className="px-2 space-y-0.5">
        {MAIN.map((item: any) => (
          <Link
            key={item.label}
            to={item.to}
            params={item.params}
            search={item.search}
            onClick={onItemClick}
            activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
          >
            <item.Icon size={16} className="shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="my-2 h-px bg-border mx-3" />

      {/* Genres */}
      <p className="section-label px-5 pb-1.5">Genre</p>
      <div className="px-2 space-y-0.5">
        {GENRES.map((g) => (
          <Link
            key={g.slug}
            to="/category/$genre"
            params={{ genre: g.slug }}
            onClick={onItemClick}
            className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
          >
            <g.Icon size={15} className="shrink-0 opacity-70" />
            <span>{g.label}</span>
          </Link>
        ))}
      </div>

      <div className="my-2 h-px bg-border mx-3" />

      {/* Meta */}
      {recent.length > 0 && (
        <>
          <div className="my-2 h-px bg-border mx-3" />
          <p className="section-label px-5 pb-1.5">Terakhir ditonton</p>
          <div className="px-2 space-y-0.5">
            {recent.map((it) => (
              <Link
                key={it.id}
                to="/watch"
                search={{ v: it.id }}
                onClick={onItemClick}
                className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
              >
                {it.thumb ? (
                  <img src={it.thumb} alt="" className="h-8 w-12 rounded object-cover shrink-0 opacity-80" loading="lazy" />
                ) : (
                  <div className="h-8 w-12 rounded bg-surface shrink-0" />
                )}
                <span className="line-clamp-2 leading-tight">{it.title}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="my-2 h-px bg-border mx-3" />

      {/* Meta */}
      <div className="px-2 space-y-0.5">
        {META.map((m: any) => (
          <Link
            key={m.label}
            to={m.to}
            hash={m.hash}
            onClick={onItemClick}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
          >
            <m.Icon size={15} className="shrink-0 opacity-70" />
            <span>{m.label}</span>
          </Link>
        ))}
      </div>

      <SupportBanner />

      <p className="px-5 pt-1 pb-3 text-[10px] text-muted-foreground/40">
        © {new Date().getFullYear()} AnimeTube
      </p>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────
export function Sidebar() {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-border bg-surface/30 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
        <NavList />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <button aria-label="Close menu" onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <aside
          className={`absolute left-0 top-0 h-full w-64 max-w-[80vw] bg-background border-r border-border overflow-y-auto transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-bold text-base text-foreground">AnimeTube</span>
            <button onClick={() => setOpen(false)} aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface transition-colors">
              <X size={16} />
            </button>
          </div>
          <NavList onItemClick={() => setOpen(false)} />
        </aside>
      </div>
    </>
  );
}
