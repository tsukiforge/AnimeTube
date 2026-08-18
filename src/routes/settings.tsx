import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { REGIONS, useRegion } from "@/hooks/use-region";
import { useTheme } from "@/hooks/use-theme";
import { useSeo } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle, Globe, Moon, Palette, Shield, Sun, Tv2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  useSeo({
    title: "Pengaturan",
    description: "Atur preferensi AnimeTube — tema, region konten, dan pengaturan keamanan family-friendly.",
    path: "/settings",
  });
  const { region, setRegion, regions } = useRegion();
  const { theme, toggle } = useTheme();
  const [pending, setPending] = useState<string | null>(null);
  const pendingRegion = regions.find((r) => r.code === pending);

  const handleRegion = (code: string) => {
    const r = regions.find((x) => x.code === code);
    if (!r) return;
    if (r.warning) { setPending(code); return; }
    setRegion(code);
  };

  const confirmRegion = () => {
    if (pending) { setRegion(pending); setPending(null); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-6">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sesuaikan AnimeTube sesuai preferensimu
              </p>
            </div>

            {/* Tampilan */}
            <section className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Palette size={16} className="text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Tampilan</h2>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Tema</p>
                  <p className="text-xs text-muted-foreground">Pilih mode gelap atau terang</p>
                </div>
                <button
                  onClick={toggle}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
                >
                  {theme === "dark" ? (
                    <><Moon size={15} /> Gelap</>
                  ) : (
                    <><Sun size={15} /> Terang</>
                  )}
                </button>
              </div>
            </section>

            {/* Region */}
            <section className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={16} className="text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Region Konten</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pilih region untuk menyesuaikan konten yang ditampilkan. Default: Indonesia 🇮🇩.
                Region selain Indonesia mungkin menampilkan konten yang berbeda — kami tidak bertanggung jawab atas konten dari region lain.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {regions.map((r) => (
                  <button
                    key={r.code}
                    onClick={() => handleRegion(r.code)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm text-left transition-all ${
                      region === r.code
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <span className="text-lg">{r.flag}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.label}</p>
                      <p className="text-[10px] opacity-60">{r.code}</p>
                    </div>
                    {r.warning && (
                      <AlertTriangle size={12} className="shrink-0 text-yellow-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              {region !== "ID" && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                  <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 leading-relaxed">
                    {REGIONS.find((r) => r.code === region)?.warning}
                  </p>
                </div>
              )}
            </section>

            {/* Keamanan Konten */}
            <section className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} className="text-green-500" />
                <h2 className="font-semibold text-sm text-foreground">Keamanan Konten</h2>
                <span className="ml-auto rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-[10px] font-semibold text-green-500">
                  Selalu Aktif
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 grid place-items-center shrink-0 mt-0.5">
                    <CheckCircle size={12} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">SafeSearch Strict</p>
                    <p className="text-[11px] text-muted-foreground">YouTube API memfilter konten dewasa di level server</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 grid place-items-center shrink-0 mt-0.5">
                    <CheckCircle size={12} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Filter Kata Kunci NSFW</p>
                    <p className="text-[11px] text-muted-foreground">Judul, deskripsi, dan tag video dicek otomatis</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 grid place-items-center shrink-0 mt-0.5">
                    <CheckCircle size={12} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Blokir Konten 18+</p>
                    <p className="text-[11px] text-muted-foreground">Hentai, NSFW, konten dewasa eksplisit diblokir</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 grid place-items-center shrink-0 mt-0.5">
                    <CheckCircle size={12} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Bebas Judol & Pinjol</p>
                    <p className="text-[11px] text-muted-foreground">Konten judi online dan pinjaman ilegal diblokir</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border">
                Filter ini tidak dapat dinonaktifkan. AnimeTube berkomitmen menjaga platform tetap aman untuk semua umur.
              </p>
            </section>

            {/* Tentang */}
            <section className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Tv2 size={16} className="text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Tentang AnimeTube</h2>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>AnimeTube adalah platform agregasi video anime berbasis YouTube Data API v3.</p>
                <p>Tidak ada login, tidak ada tracking, tidak ada iklan judol.</p>
                <p className="text-muted-foreground/60">
                  Semua konten © pemilik masing-masing. AnimeTube tidak menghosting video apapun.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <a
                  href="https://sociabuzz.com/zuax"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  ☕ Support kami
                </a>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* Region warning dialog */}
      {pending && pendingRegion?.warning && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 999999, background: "rgba(0,0,0,0.7)" }}
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground mb-1">
                  Pindah ke {pendingRegion.flag} {pendingRegion.label}?
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pendingRegion.warning}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setPending(null)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmRegion}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
