import { AdSlot } from "@/components/AdSlot";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SkeletonCard } from "@/components/SkeletonCard";
import { VideoCard } from "@/components/VideoCard";
import { searchVideos } from "@/lib/youtube.functions";
import { useSeo } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/live")({ component: LivePage });

function LivePage() {
  useSeo({
    title: "Anime Live Stream & Premier",
    description: "Nonton live stream anime 24/7 dan jadwal premier terbaru. Siaran langsung anime gratis tanpa login.",
    path: "/live",
  });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["live"],
    queryFn: () => searchVideos({ q: "anime live", eventType: "live", order: "viewCount", maxResults: 24 }),
    staleTime: 60 * 1000,
  });
  const { data: upcoming } = useQuery({
    queryKey: ["upcoming"],
    queryFn: () => searchVideos({ q: "anime premiere", eventType: "upcoming", order: "date", maxResults: 12 }),
    staleTime: 60 * 1000,
  });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 py-6">
          <div className="mx-auto max-w-[1600px] space-y-10">
            <header className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-black flex items-center gap-2">
                <span className="relative inline-flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                </span>
                <span className="text-gradient">Live now</span>
              </h1>
              <span className="text-xs text-muted-foreground">Anime broadcasts streaming right now</span>
            </header>
            <section className="grid gap-x-4 gap-y-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {isError && (
                <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-2xl mb-2">📡</p>
                  <p className="text-sm text-muted-foreground">Gagal memuat live stream. Coba lagi.</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-4 text-xs font-bold text-primary hover:underline"
                  >
                    Muat ulang
                  </button>
                </div>
              )}
              {isLoading || (!isError && !data)
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} index={i} />)
                : !isError && data && data.items.length === 0
                ? <p className="col-span-full text-muted-foreground">No live anime streams right now. Check back soon.</p>
                : data?.items.map((v: any) => <VideoCard key={v.id} video={v} />)}
            </section>
            <AdSlot id="ad-live-mid" size="leaderboard" />
            {upcoming?.items?.length ? (
              <section>
                <h2 className="font-display text-2xl font-bold mb-4">⏰ <span className="text-gradient">Upcoming premieres</span></h2>
                <div className="grid gap-x-4 gap-y-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {upcoming.items.map((v: any) => <VideoCard key={v.id} video={v} />)}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
