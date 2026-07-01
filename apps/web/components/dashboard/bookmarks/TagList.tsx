import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";

// mymind tag pills.
//
// Each tag renders as a compact pill (rounded-full) with a small colored dot
// on the left. The dot color is derived from the tag name so each tag has a
// stable, recognizable identity — the whole set feels curated instead of
// randomly styled. Palette pulled from our chart-color / mymind extended
// palette (see design-foundations, plus mymind's own warm orange accent).
const TAG_DOT_PALETTE = [
  "#E85422", // mymind orange — reserved for the accent slot
  "#D19900", // gold
  "#437A22", // green
  "#20808D", // teal
  "#006494", // blue
  "#7A39BB", // purple
  "#A12C7B", // magenta
  "#964219", // rust
  "#848456", // olive
  "#944454", // mauve
];

function tagDotColor(name: string): string {
  // Simple string hash → palette index. Stable across renders and reloads.
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % TAG_DOT_PALETTE.length;
  return TAG_DOT_PALETTE[idx];
}

export default function TagList({
  bookmark,
  loading,
  className,
}: {
  bookmark: ZBookmark;
  loading?: boolean;
  className?: string;
}) {
  const { data: session } = useSession();
  const isOwner = session?.user?.id === bookmark.userId;

  if (loading) {
    return (
      <div className="flex w-full flex-col justify-end space-y-2 p-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const pillClass = cn(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
    "text-[11px] font-medium leading-none",
    "bg-secondary/60 text-foreground/80",
    "hover:bg-secondary transition-colors",
    "text-nowrap",
  );

  return (
    <>
      {bookmark.tags.map((t) => {
        const dot = (
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: tagDotColor(t.name) }}
          />
        );
        return (
          <div key={t.id} className={className}>
            {isOwner ? (
              <Link
                key={t.id}
                className={pillClass}
                href={`/dashboard/tags/${t.id}`}
              >
                {dot}
                {t.name}
              </Link>
            ) : (
              <span key={t.id} className={pillClass}>
                {dot}
                {t.name}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
