import { AdSlot } from "@/components/AdSlot";
import { InfiniteScroll } from "@/components/InfiniteScroll";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SkeletonCard } from "@/components/SkeletonCard";
import { VideoCard } from "@/components/VideoCard";
import { useWatchHistory } from "@/hooks/use-watch-history";
import { mixedFeed } from "@/lib/youtube.functions";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

// Genre chips — YouTube-style filter bar
const CHIPS = [
  { label: "Semua", q: "anime" },
  { label: "Trending", q: "anime trending 2025" },
  { label: "Action", q: "action anime" },
  { label: "Isekai", q: "isekai anime" },
  { label: "Shonen", q: "shonen anime" },
  { label: "Romance", q: "romance anime" },
  { label: "Comedy", q: "comedy anime" },
  { label: "Music", q: "anime music video" },
  { label: "Live", q: "anime live stream" },
  { label: "Mecha", q: "mecha anime" },
  { label: "Fantasy", q: "fantasy anime" },
  { label: "Sci-Fi", q: "sci-fi anime" },
  { label: "Horror", q: "horror anime" },
  { label: "Sports", q: "sports anime" },
];

export const Route = createFileRoute("/")({ component: HomePage });

function ContinueWatching() {
  const { items, clear } = useWatchHistory();
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Lanjutkan menonton</h2>
        <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Hapus riwayat
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {items.slice(0, 10).map((it) => (
          <Link key={it.id} to="/watch" search={{ v: it.id }} className="group shrink-0 w-48">
            <div className="relative overflow-hidden rounded-xl bg-[#272727]" style={{ aspectRatio: "16/9" }}>
              {it.thumb && (
                <img src={it.thumb} alt="" loading="lazy"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs font-medium text-foreground">{it.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{it.channelTitle}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function VideoFeed({ activeChip }: { activeChip: typeof CHIPS[0] }) {
  const infiniteResult = useInfiniteQuery({
    queryKey: ["home-feed", activeChip.q],
    queryFn: ({ pageParam }) =>
      mixedFeed({ q: activeChip.q, maxResults: 24, pageToken: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: any) => last.nextPageToken ?? undefined,
    staleTime: 10 * 60 * 1000,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = infiniteResult;
  const allItems = data?.pages.flatMap((p: any) => p.items) ?? [];

  return (
    <InfiniteScroll onLoadMore={() => fetchNextPage()} hasMore={!!hasNextPage} loading={isFetchingNextPage}>
      <div className="grid gap-x-4 gap-y-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} index={i} />)
          : allItems.flatMap((v: any, i: number) => {
              const card = <VideoCard key={v.id + i} video={v} />;
              if (i > 0 && i % 12 === 0)
                return [card, <div key={"ad" + i} className="col-span-full"><AdSlot id={`ad-home-${i}`} size="leaderboard" /></div>];
              return [card];
            })}
        {isFetchingNextPage && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={"sk" + i} index={i} />)}
      </div>
    </InfiniteScroll>
  );
}

function HomePage() {
  const [activeChip, setActiveChip] = useState(CHIPS[0]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          {/* Genre chips — sticky below navbar */}
          <div className="sticky top-14 z-40 bg-background border-b border-border">
            <div className="flex gap-2 px-4 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => setActiveChip(chip)}
                  className={`yt-chip shrink-0 ${activeChip.label === chip.label ? "active" : ""}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-4">
            <ContinueWatching />
            <VideoFeed activeChip={activeChip} />
          </div>
        </main>
      </div>
    </div>
  );
}
