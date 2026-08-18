import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { formatViews } from "@/lib/format";
import { getAnimeChannels } from "@/lib/youtube.functions";
import { useSeo } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, RefreshCw, Tv2 } from "lucide-react";

export const Route = createFileRoute("/channels")({ component: ChannelsPage });

function ChannelCard({ ch }: { ch: any }) {
  const avatar =
    ch.snippet?.thumbnails?.high?.url ||
    ch.snippet?.thumbnails?.medium?.url ||
    ch.snippet?.thumbnails?.default?.url;
  const name = ch.snippet?.title || "Channel";
  const subs = ch.statistics?.subscriberCount;
  const videos = ch.statistics?.videoCount;
  const desc = ch.snippet?.description;

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-3">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-border shrink-0"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              el.nextElementSibling?.removeAttribute("style");
            }}
          />
        ) : null}
        <div
          className="h-14 w-14 rounded-full bg-primary/20 grid place-items-center text-xl font-bold text-primary shrink-0"
          style={{ display: avatar ? "none" : "grid" }}
        >
          {name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to="/channel/$channelId"
            params={{ channelId: ch.id }}
            className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
          >
            {name}
          </Link>
          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
            {subs && <span>{formatViews(subs)} subs</span>}
            {videos && <span>{formatViews(videos)} videos</span>}
          </div>
        </div>
      </div>

      {desc && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{desc}</p>
      )}

      <div className="flex gap-2 mt-auto">
        <Link
          to="/channel/$channelId"
          params={{ channelId: ch.id }}
          className="flex-1 text-center rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          Lihat Video
        </Link>
        <a
          href={`https://www.youtube.com/channel/${ch.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

function ChannelsPage() {
  useSeo({
    title: "Channel Anime Populer",
    description: "Daftar channel anime populer — Crunchyroll, Muse Asia, Ani-One, dan lainnya. Nonton anime gratis tanpa login.",
    path: "/channels",
  });
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["anime-channels-page"],
    queryFn: getAnimeChannels,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });

  const channels = data?.channels ?? [];

  const handleRefresh = () => {
    // Clear localStorage cache to force refresh
    try { localStorage.removeItem("animetube:channels:v1"); } catch {}
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 py-6">
          <div className="mx-auto max-w-[1400px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center">
                  <Tv2 size={20} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Anime Channels</h1>
                  <p className="text-xs text-muted-foreground">
                    10 channel anime populer · diperbarui setiap minggu
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
                Acak ulang
              </button>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="skeleton h-14 w-14 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-3.5 w-3/4 rounded" />
                        <div className="skeleton h-3 w-1/2 rounded" />
                      </div>
                    </div>
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-3 w-2/3 rounded" />
                  </div>
                ))}
              </div>
            ) : channels.length === 0 ? (
              <div className="py-20 text-center">
                <Tv2 size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Gagal memuat channel. Coba lagi nanti.</p>
                <button onClick={handleRefresh} className="mt-4 text-primary text-sm hover:underline">
                  Coba lagi
                </button>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {channels.map((ch: any) => (
                  <ChannelCard key={ch.id} ch={ch} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
