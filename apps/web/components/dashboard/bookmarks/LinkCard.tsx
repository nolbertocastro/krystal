"use client";

import Image from "next/image";
import Link from "next/link";
import { useUserSettings } from "@/lib/userSettings";
import { cn } from "@/lib/utils";

import type { ZBookmarkTypeLink } from "@karakeep/shared/types/bookmarks";
import {
  getBookmarkLinkImageUrl,
  getBookmarkTitle,
  getSourceUrl,
  isBookmarkStillCrawling,
} from "@karakeep/shared/utils/bookmarkUtils";

import { BookmarkLayoutAdaptingCard } from "./BookmarkLayoutAdaptingCard";
import FooterLinkURL from "./FooterLinkURL";

const useOnClickUrl = (bookmark: ZBookmarkTypeLink) => {
  const userSettings = useUserSettings();
  return {
    urlTarget:
      userSettings.bookmarkClickAction === "open_original_link"
        ? ("_blank" as const)
        : ("_self" as const),
    onClickUrl:
      userSettings.bookmarkClickAction === "expand_bookmark_preview"
        ? `/dashboard/preview/${bookmark.id}`
        : bookmark.content.url,
  };
};

// mymind price detection.
//
// Backend crawler doesn't yet expose og:price / schema.org Product data, so
// we approximate: look for a `$1,234.56` or `€99` style token in the title
// or description. Also match a hostname on a small e-commerce allowlist so
// non-priced product pages still show as "shop"-flavored. When we find a
// price, we render a compact pill in the top-right corner of the image,
// matching mymind's product card pattern.
const PRICE_REGEX =
  /(?<![\w.])(?:USD\s*|CAD\s*|CA\$|EUR\s*|GBP\s*|[$€£¥])\s?\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{1,2})?(?![\w.])/;

const SHOP_HOSTS = [
  "amazon.",
  "ebay.",
  "etsy.",
  "shopify.",
  "shop.",
  "store.",
  "aliexpress.",
  "walmart.com",
  "target.com",
  "bestbuy.",
  "newegg.",
  "bhphotovideo.",
  "adorama.",
];

function extractPrice(bookmark: ZBookmarkTypeLink): string | null {
  const link = bookmark.content;
  const candidates = [
    bookmark.title,
    link.title,
    link.description,
    // og:site_name sometimes carries prices in link previews
    link.publisher,
  ].filter((s): s is string => typeof s === "string" && s.length > 0);
  for (const candidate of candidates) {
    const match = candidate.match(PRICE_REGEX);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

function isShopUrl(url: string): boolean {
  try {
    const host = new URL(url).host.toLowerCase();
    return SHOP_HOSTS.some((h) => host.includes(h));
  } catch {
    return false;
  }
}

function PricePill({ price }: { price: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute right-3 top-3 z-10",
        "rounded-full bg-black/70 px-2.5 py-1",
        "text-[11px] font-medium tabular-nums text-white",
        "backdrop-blur-sm",
      )}
    >
      {price}
    </div>
  );
}

function LinkTitle({ bookmark }: { bookmark: ZBookmarkTypeLink }) {
  const { onClickUrl, urlTarget } = useOnClickUrl(bookmark);
  const parsedUrl = new URL(bookmark.content.url);
  return (
    <Link href={onClickUrl} target={urlTarget} rel="noreferrer">
      {getBookmarkTitle(bookmark) ?? parsedUrl.host}
    </Link>
  );
}

function LinkImage({
  bookmark,
  className,
}: {
  bookmark: ZBookmarkTypeLink;
  className?: string;
}) {
  const { onClickUrl, urlTarget } = useOnClickUrl(bookmark);
  const link = bookmark.content;

  const imgComponent = (url: string, unoptimized: boolean) => (
    <Image
      unoptimized={unoptimized}
      className={className}
      alt="card banner"
      fill={true}
      src={url}
    />
  );

  const imageDetails = getBookmarkLinkImageUrl(link);

  let img: React.ReactNode;
  if (isBookmarkStillCrawling(bookmark)) {
    img = imgComponent("/blur.avif", false);
  } else if (imageDetails) {
    img = imgComponent(imageDetails.url, true);
  } else {
    // No image found
    // A dummy white pixel for when there's no image.
    img = imgComponent(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=",
      true,
    );
  }

  // mymind fork:
  //   • Ken-Burns-style zoom on hover (scoped via group/card in the layout).
  //   • Price pill overlay when we can detect a price on the source page —
  //     matches mymind's product card treatment.
  const price = extractPrice(bookmark);
  const isShop = isShopUrl(link.url);
  const showPill = price !== null;

  return (
    <Link
      href={onClickUrl}
      target={urlTarget}
      rel="noreferrer"
      className={className}
    >
      <div className="relative size-full flex-1 overflow-hidden">
        {showPill && <PricePill price={price!} />}
        {!showPill && isShop && (
          <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
            Shop
          </div>
        )}
        <div className="relative size-full transform-gpu transition-transform duration-500 ease-out group-hover/card:scale-[1.03]">
          {img}
        </div>
      </div>
    </Link>
  );
}

export default function LinkCard({
  bookmark: bookmarkLink,
  className,
  bookmarkIndex,
}: {
  bookmark: ZBookmarkTypeLink;
  className?: string;
  bookmarkIndex?: number;
}) {
  return (
    <BookmarkLayoutAdaptingCard
      title={<LinkTitle bookmark={bookmarkLink} />}
      footer={<FooterLinkURL url={getSourceUrl(bookmarkLink)} />}
      bookmark={bookmarkLink}
      wrapTags={false}
      image={(_layout, className) => (
        <LinkImage className={className} bookmark={bookmarkLink} />
      )}
      className={className}
      bookmarkIndex={bookmarkIndex}
    />
  );
}
