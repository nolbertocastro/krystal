import { cn } from "@/lib/utils";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

/**
 * Krystal in-progress placeholder.
 *
 * Rendered inside the masonry when a bookmark is still being crawled,
 * tagged, or summarized. The real card takes over — with a smooth fade
 * — the moment `isBookmarkStillLoading(bookmark)` flips false.
 *
 * Design intent (Krystal, NOT mymind):
 *   • Uses the same `bg-card` surface + `mymind-card-shadow` treatment
 *     as real bookmark cards, so the swap-in is seamless.
 *   • Center-stage is the italic serif "K" wordmark — Krystal's identity
 *     — pulsing gently. Same font-serif/italic tokens as the header.
 *   • A shimmer sweep travels across the surface behind the wordmark to
 *     signal "we're actively working on this".
 *   • Small "Saving…" caption anchors the meaning in words for anyone
 *     who missed the motion cues.
 *   • Accent color: the Nexus dark-mode primary teal `#4F98A3`, applied
 *     via `text-primary` so the K glows subtly against `bg-card`.
 */
export default function KrystalSavingCard({
  bookmark,
  className,
}: {
  bookmark: ZBookmark;
  className?: string;
}) {
  const url =
    bookmark.content.type === BookmarkTypes.LINK
      ? bookmark.content.url
      : null;

  let hostname: string | null = null;
  if (url) {
    try {
      hostname = new URL(url).host.replace(/^www\./, "");
    } catch {
      hostname = null;
    }
  }

  return (
    <div
      className={cn(
        "krystal-saving-card relative flex flex-col items-center justify-center overflow-hidden",
        "aspect-[4/3] w-full",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Saving bookmark to Krystal"
    >
      {/* Shimmer sweep — a soft diagonal band that traverses the surface. */}
      <div className="krystal-saving-shimmer" aria-hidden />

      {/* Pulsing italic serif K — the Krystal identity, made central. */}
      <div className="relative z-[1] flex flex-col items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "krystal-saving-mark",
            "font-serif italic",
            "text-[92px] leading-none tracking-tight",
            "text-primary",
          )}
        >
          K
        </span>

        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium tracking-wide text-foreground/85">
            Saving to Krystal
          </span>
          {hostname && (
            <span className="max-w-[220px] truncate text-xs text-muted-foreground">
              {hostname}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
