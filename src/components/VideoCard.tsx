import { durationSeconds, formatDuration, formatViews, timeAgo, type YTVideo } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

function Thumb({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <div className="skeleton absolute inset-0" style={{ borderRadius: 0 }} />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

// Channel avatar — letter fallback
function ChannelAvatar({ name, src }: { name: string; src?: string }) {
  const [err, setErr] = useState(false);
  const letter = name?.[0]?.toUpperCase() || "A";
  // Generate consistent color from name
  const colors = ["#ff0000","#ff6b35","#f7c59f","#efefd0","#004e89","#1a936f","#88d498","#c6dabf"];
  const color = colors[name.charCodeAt(0) % colors.length];

  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        className="h-9 w-9 rounded-full object-cover shrink-0"
        loading="lazy"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      className="h-9 w-9 rounded-full grid place-items-center text-sm font-bold text-white shrink-0"
      style={{ background: color }}
    >
      {letter}
    </div>
  );
}

function DurationBadge({ video }: { video: YTVideo }) {
  const isLive = video.snippet?.liveBroadcastContent === "live";
  const durSec = durationSeconds(video.contentDetails?.duration);
  if (isLive) {
    return (
      <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        Live
      </span>
    );
  }
  if (durSec > 0 && durSec < 60) {
    return (
      <span className="absolute bottom-2 right-2 rounded bg-black/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
        #Shorts
      </span>
    );
  }
  const duration = formatDuration(video.contentDetails?.duration);
  if (!duration) return null;
  return (
    <span className="absolute bottom-2 right-2 rounded bg-black/90 px-1.5 py-0.5 text-xs font-medium text-white">
      {duration}
    </span>
  );
}

export function VideoCard({ video, variant = "grid" }: { video: YTVideo; variant?: "grid" | "compact" }) {
  const id = typeof video.id === "string" ? video.id : (video as any).id?.videoId;
  const thumb =
    video.snippet.thumbnails?.maxres?.url ||
    video.snippet.thumbnails?.high?.url ||
    video.snippet.thumbnails?.medium?.url;
  const channelName = video.snippet.channelTitle || "";

  if (variant === "compact") {
    return (
      <Link
        to="/watch"
        search={{ v: id }}
        className="group flex gap-2 rounded-lg p-2 hover:bg-surface transition-colors"
      >
        <div className="relative w-[168px] shrink-0 overflow-hidden rounded-lg bg-[#272727]" style={{ aspectRatio: "16/9" }}>
          {thumb && <Thumb src={thumb} alt={video.snippet.title} />}
          <DurationBadge video={video} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-xs font-medium text-foreground leading-snug">
            {video.snippet.title}
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">{channelName}</p>
          <p className="text-[11px] text-muted-foreground">
            {formatViews(video.statistics?.viewCount)} views · {timeAgo(video.snippet.publishedAt)}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/watch" search={{ v: id }} className="group block">
      {/* Thumbnail */}
      <div
        className="relative w-full overflow-hidden rounded-xl bg-[#272727]"
        style={{ aspectRatio: "16/9" }}
      >
        {thumb && <Thumb src={thumb} alt={video.snippet.title} />}
        <DurationBadge video={video} />
      </div>

      {/* Info row — YouTube style */}
      <div className="mt-3 flex gap-3">
        <ChannelAvatar name={channelName} src={video._channelAvatar} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium text-foreground leading-snug">
            {video.snippet.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            {channelName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatViews(video.statistics?.viewCount)} views · {timeAgo(video.snippet.publishedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
