import type { ZBookmark } from "../types/bookmarks";
import { BookmarkTypes } from "../types/bookmarks";

/**
 * Card aspect ratio for the dashboard masonry.
 *
 * Krystal shows a heterogeneous grid where the visual dimensions of each card
 * should hint at the underlying content. A TikTok reel wants a phone-shaped
 * portrait; a YouTube thumbnail wants 16/9; a plain tweet has no image and
 * should size to its text.
 *
 * Detection is done from the bookmark URL first (fast, no extra DB reads),
 * falling back to bookmark type.
 */
export type CardAspect =
  | "9/16" // TikTok, Reels, Shorts, Snap Spotlight — phone portrait
  | "4/5" // Instagram portrait, Pinterest-ish
  | "1/1" // Instagram square, Bandcamp, cover art
  | "3/4" // Softer portrait — books, product shots
  | "4/3" // Editorial default — articles with banner
  | "16/9" // YouTube, Vimeo, blog hero banners, video files
  | "auto"; // Text-only, quotes, tweets w/o media — size to intrinsic content

const HOSTS = {
  tiktok: /(^|\.)tiktok\.com$/i,
  ig: /(^|\.)instagram\.com$/i,
  yt: /(^|\.)(youtube\.com|youtu\.be)$/i,
  vimeo: /(^|\.)vimeo\.com$/i,
  twitter: /(^|\.)(twitter\.com|x\.com|nitter\.[^.]+\..+)$/i,
  reddit: /(^|\.)reddit\.com$/i,
  pinterest: /(^|\.)pinterest\.[a-z.]+$/i,
  bandcamp: /(^|\.)bandcamp\.com$/i,
  spotify: /(^|\.)spotify\.com$/i,
  soundcloud: /(^|\.)soundcloud\.com$/i,
  threads: /(^|\.)threads\.net$/i,
  bluesky: /(^|\.)(bsky\.app|bsky\.social)$/i,
  substack: /(^|\.)substack\.com$/i,
};

function detectByUrl(rawUrl: string): CardAspect | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname;
  const path = u.pathname;

  // Phone-portrait video (9/16)
  if (HOSTS.tiktok.test(host)) return "9/16";
  if (HOSTS.yt.test(host) && /\/shorts\//.test(path)) return "9/16";
  if (HOSTS.ig.test(host) && /\/(reel|reels)\//.test(path)) return "9/16";
  if (/\/(shorts|reels?)\//.test(path)) return "9/16";

  // Wide video (16/9)
  if (HOSTS.yt.test(host)) return "16/9";
  if (HOSTS.vimeo.test(host)) return "16/9";

  // Instagram (photo posts default to square; carousel & portrait already
  // covered by /reel/ above)
  if (HOSTS.ig.test(host)) return "1/1";

  // Threads / Bluesky / Twitter: text-first — let the card size to its content.
  // (The card will show a link preview at "auto" height with title+description
  // stacked; images embed inside if present.)
  if (HOSTS.twitter.test(host)) return "auto";
  if (HOSTS.threads.test(host)) return "auto";
  if (HOSTS.bluesky.test(host)) return "auto";

  // Music / audio — album art is square
  if (HOSTS.bandcamp.test(host)) return "1/1";
  if (HOSTS.spotify.test(host)) return "1/1";
  if (HOSTS.soundcloud.test(host)) return "1/1";

  // Pinterest pins are usually portrait
  if (HOSTS.pinterest.test(host)) return "4/5";

  // Substack / editorial long-form: banner-friendly 16/9 hero
  if (HOSTS.substack.test(host)) return "16/9";

  // Reddit: depends on subreddit content, hard to tell — default article
  if (HOSTS.reddit.test(host)) return "4/3";

  return null;
}

/**
 * Choose the card aspect for a given bookmark.
 *
 * @param bookmark - Full bookmark (URL, content type, asset flags).
 * @param opts.hasImage - Whether the card currently has an image slot to fill.
 *                        Callers already know this from the render pipeline,
 *                        pass it in so we don't re-derive it.
 */
export function getCardAspect(
  bookmark: ZBookmark,
  opts: { hasImage: boolean },
): CardAspect {
  const { content } = bookmark;

  // Text bookmarks (user quotes, snippets) always size to their content —
  // don't force a picture-frame around a short quote.
  if (content.type === BookmarkTypes.TEXT) return "auto";

  // Uploaded asset (image / pdf): we don't know intrinsic dimensions from the
  // schema, but users upload photos far more often than square renders. Use
  // 3/4 for images (softer portrait, feels like a photo library) and 4/3 for
  // PDFs (document silhouette). If asset has no image slot, size to caption.
  if (content.type === BookmarkTypes.ASSET) {
    if (!opts.hasImage) return "auto";
    if (content.assetType === "pdf") return "4/3";
    return "3/4";
  }

  // Link
  if (content.type === BookmarkTypes.LINK) {
    const byUrl = detectByUrl(content.url);
    if (byUrl != null) {
      // If the URL clearly maps to a shape but we don't have an image, still
      // let it size to intrinsic content — otherwise the card is an empty
      // rectangle in the shape of a phone.
      if (!opts.hasImage && byUrl !== "auto") return "auto";
      return byUrl;
    }
    // Unknown link: keep editorial 4/3 for image cards, auto for image-less
    return opts.hasImage ? "4/3" : "auto";
  }

  return "auto";
}
