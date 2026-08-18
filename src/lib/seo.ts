import { useEffect } from "react";

// Domain produksi — sama dengan canonical di index.html
export const SITE_URL = "https://animtubev1.vercel.app";
export const SITE_NAME = "AnimeTube";
export const DEFAULT_IMAGE = `${SITE_URL}/logo.jpg`;

const DEFAULT_TITLE = "AnimeTube — Nonton Anime Gratis Tanpa Login, Trending, Shorts & Live";
const DEFAULT_DESC =
  "Nonton anime gratis tanpa login. Kumpulan video anime trending, shorts, live stream, dan ratusan genre — Action, Isekai, Shonen, Romance, Mecha, dan lainnya. Diperbarui setiap hari, powered by YouTube.";
const KEYWORDS =
  "nonton anime gratis, anime streaming, anime indonesia, anime sub indo, anime trending 2026, anime action, anime isekai, anime shonen, anime romance, anime mecha, anime music, anime live, anime shorts, video anime, anime movie, download anime, anime online, anime terbaru, animetube";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * SEO dinamis per halaman (SPA): update title, description, keywords,
 * canonical, dan Open Graph / Twitter Card saat route berubah.
 */
export function useSeo({
  title,
  description,
  path,
  image,
  type = "website",
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
}) {
  useEffect(() => {
    const pageTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const pageDesc = (description || DEFAULT_DESC).slice(0, 200);
    const url = `${SITE_URL}${path ?? "/"}`;
    const img = image || DEFAULT_IMAGE;

    document.title = pageTitle;
    setMeta("name", "description", pageDesc);
    setMeta("name", "keywords", KEYWORDS);
    setMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", pageDesc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("property", "og:image:alt", pageTitle);
    setMeta("property", "og:type", type);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", pageDesc);
    setMeta("name", "twitter:image", img);
    setCanonical(url);
  }, [title, description, path, image, type]);
}