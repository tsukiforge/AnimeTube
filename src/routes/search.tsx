import { AdSlot } from "@/components/AdSlot";
import { InfiniteScroll } from "@/components/InfiniteScroll";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SkeletonCard } from "@/components/SkeletonCard";
import { VideoCard } from "@/components/VideoCard";
import { searchVideos } from "@/lib/youtube.functions";
import { useSeo } from "@/lib/seo";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  order: fallback(z.enum(["relevance", "date", "viewCount", "rating"]), "viewCount").default("viewCount"),
  videoDuration: fallback(z.enum(["any", "short", "medium", "long"]), "any").default("any"),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  component: SearchPage,
});

function SearchPage() {
  const { q, order, videoDuration } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });

  useSeo({
    title: q ? `Hasil Pencarian: ${q}` : "Cari Anime",
    description: q
      ? `Hasil pencarian video anime "${q}" — temukan anime trending, populer, dan terbaru secara gratis.`
      : "Cari anime favoritmu — ribuan video anime dari semua genre, gratis tanpa login.",
    path: `/search?q=${encodeURIComponent(q || "")}`,
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["search", q, order, videoDuration],
    queryFn: ({ pageParam }) => searchVideos({ q: q || "anime", order, videoDuration, maxResults: 24, pageToken: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: any) => last.nextPageToken ?? undefined,
    enabled: !!q,
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
            <h1 className="rainbow-underline inline-block font-display text-2xl sm:text-3xl font-black">
              Results for: <span className="text-gradient">{q || "—"}</span>
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sort:</label>
              <select value={order} onChange={(e) => navigate({ search: (p: any) => ({ ...p, order: e.target.value }) })}
                className="anime-border rounded-full bg-card px-4 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="relevance">Relevance</option>
                <option value="date">Upload Date</option>
                <option value="viewCount">View Count</option>
                <option value="rating">Rating</option>
              </select>
              <label className="ml-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration:</label>
              <select value={videoDuration} onChange={(e) => navigate({ search: (p: any) => ({ ...p, videoDuration: e.target.value }) })}
                className="anime-border rounded-full bg-card px-4 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="any">Any</option>
                <option value="short">Short (&lt; 4 min)</option>
                <option value="medium">Medium (4–20 min)</option>
                <option value="long">Long (&gt; 20 min)</option>
              </select>
            </div>
            <InfiniteScroll onLoadMore={() => fetchNextPage()} hasMore={!!hasNextPage} loading={isFetchingNextPage}>
              <div className="mt-6 grid gap-x-4 gap-y-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} index={i} />)
                  : allItems.map((v: any, i: number) => <VideoCard key={v.id + i} video={v} />)}
                {isFetchingNextPage && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={"sk" + i} index={i} />)}
              </div>
            </InfiniteScroll>
            {!isLoading && allItems.length === 0 && q && (
              <div className="py-16 text-center">
                <div className="text-6xl">🍥</div>
                <p className="mt-4 text-muted-foreground">No results found for "{q}"</p>
              </div>
            )}
            {allItems.length >= 12 && <div className="mt-8"><AdSlot id="ad-search-bottom" size="leaderboard" /></div>}
          </div>
        </main>
      </div>
    </div>
  );
}
