import { AdSlot } from "@/components/AdSlot";
import { InfiniteScroll } from "@/components/InfiniteScroll";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SkeletonCard } from "@/components/SkeletonCard";
import { VideoCard } from "@/components/VideoCard";
import { GENRES } from "@/lib/constants";
import { searchVideos } from "@/lib/youtube.functions";
import { useSeo } from "@/lib/seo";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/category/$genre")({ component: CategoryPage });

function CategoryPage() {
  const { genre } = Route.useParams();
  const meta = GENRES.find((g) => g.slug === genre) || { slug: genre, label: genre, icon: "🎴" };
  const q = `${meta.label} anime`;

  useSeo({
    title: `Anime ${meta.label} — Koleksi Video Terbaik`,
    description: `Nonton koleksi video anime genre ${meta.label.toLowerCase()} terbaik dan terlengkap. Trending, populer, dan terbaru — gratis tanpa login.`,
    path: `/category/${meta.slug}`,
  });

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ["category-infinite", q],
    queryFn: ({ pageParam }) => searchVideos({ q, order: "viewCount", maxResults: 24, pageToken: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: any) => last.nextPageToken ?? undefined,
    staleTime: 5 * 60 * 1000,
  });
  const allItems = data?.pages.flatMap((p: any) => p.items) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-3 py-4 sm:px-4 sm:py-6">
          <div className="mx-auto max-w-[1600px]">
            <header className="anime-border relative overflow-hidden rounded-2xl bg-[var(--gradient-card)] p-6 md:p-8">
              <div className="kanji-watermark absolute -right-4 -top-4 text-[160px] leading-none">{meta.icon}</div>
              <div className="relative">
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Category</span>
                <h1 className="mt-2 font-display text-4xl font-black md:text-5xl">
                  <span className="mr-2">{meta.icon}</span><span className="text-gradient">{meta.label}</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">The very best of <strong>{meta.label}</strong> anime.</p>
              </div>
            </header>
            <div className="mt-4"><AdSlot id={`ad-cat-top-${genre}`} size="leaderboard" /></div>
            <InfiniteScroll onLoadMore={() => fetchNextPage()} hasMore={!!hasNextPage} loading={isFetchingNextPage}>
              <div className="mt-6 grid gap-x-4 gap-y-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} index={i} />)
                  : isError ? (
                    <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                      <p className="text-2xl mb-2">📭</p>
                      <p>Gagal memuat video. Periksa koneksi internet Anda.</p>
                      <button
                        onClick={() => refetch()}
                        className="mt-3 text-xs text-primary hover:underline"
                      >
                        Coba lagi
                      </button>
                    </div>
                  ) : allItems.flatMap((v: any, i: number) => {
                      const card = <VideoCard key={v.id + i} video={v} />;
                      if (i > 0 && i % 8 === 0) return [card, <div key={"ad" + i} className="col-span-1"><AdSlot id={`ad-cat-${genre}-${i}`} /></div>];
                      return [card];
                    })}
                {isFetchingNextPage && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={"sk" + i} index={i} />)}
              </div>
            </InfiniteScroll>
          </div>
        </main>
      </div>
    </div>
  );
}
