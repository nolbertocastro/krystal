"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkTagsEditor } from "@/components/dashboard/bookmarks/BookmarkTagsEditor";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth/client";
import useRelativeTime from "@/lib/hooks/relative-time";
import { useTranslation } from "@/lib/i18n/client";
import { useQuery } from "@tanstack/react-query";
import {
  Building,
  CalendarDays,
  ExternalLink,
  Globe,
  PanelRightClose,
  PanelRightOpen,
  User,
} from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";
import {
  getBookmarkRefreshInterval,
  getBookmarkTitle,
  getSourceUrl,
  isBookmarkStillCrawling,
} from "@karakeep/shared/utils/bookmarkUtils";

import SummarizeBookmarkArea from "../bookmarks/SummarizeBookmarkArea";
import ActionBar from "./ActionBar";
import { AssetContentSection } from "./AssetContentSection";
import AttachmentBox from "./AttachmentBox";
import HighlightsBox from "./HighlightsBox";
import LinkContentSection from "./LinkContentSection";
import { NoteEditor } from "./NoteEditor";
import { TextContentSection } from "./TextContentSection";

function ContentLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <Globe className="h-12 w-12 animate-bounce text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {t("preview.crawling_in_progress")}
      </p>
    </div>
  );
}

function CreationTime({ createdAt }: { createdAt: Date }) {
  const { i18n } = useTranslation();
  const { fromNow, localCreatedAt } = useRelativeTime(createdAt, i18n.language);
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays size={16} /> {fromNow}
        </span>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>{localCreatedAt}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}

function BookmarkMetadata({ bookmark }: { bookmark: ZBookmark }) {
  let { author, publisher, datePublished } =
    bookmark.content.type !== BookmarkTypes.LINK
      ? {
          author: null,
          publisher: null,
          datePublished: null,
        }
      : bookmark.content;

  return (
    <div className="flex flex-col gap-2">
      <CreationTime createdAt={bookmark.createdAt} />
      {author && (
        <div className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <User size={16} />
          <span>By {author}</span>
        </div>
      )}
      {publisher && (
        <div className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <Building size={16} />
          <span>{publisher}</span>
        </div>
      )}
      {datePublished && <PublishedDate datePublished={datePublished} />}
    </div>
  );
}

function PublishedDate({ datePublished }: { datePublished: Date }) {
  const { i18n } = useTranslation();
  const { fromNow, localCreatedAt } = useRelativeTime(
    datePublished,
    i18n.language,
  );
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays size={16} />
          <span>Published {fromNow}</span>
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>{localCreatedAt}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}

export default function BookmarkPreview({
  bookmarkId,
  initialData,
}: {
  bookmarkId: string;
  initialData?: ZBookmark;
  onClose?: () => void;
}) {
  const api = useTRPC();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("content");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: session } = useSession();

  const { data: bookmark } = useQuery(
    api.bookmarks.getBookmark.queryOptions(
      {
        bookmarkId,
      },
      {
        initialData,
        refetchInterval: (query) => {
          const data = query.state.data;
          if (!data) {
            return false;
          }
          return getBookmarkRefreshInterval(data);
        },
      },
    ),
  );

  if (!bookmark) {
    return <FullPageSpinner />;
  }

  // Check if the current user owns this bookmark
  const isOwner = session?.user?.id === bookmark.userId;

  let content;
  switch (bookmark.content.type) {
    case BookmarkTypes.LINK: {
      content = <LinkContentSection bookmark={bookmark} />;
      break;
    }
    case BookmarkTypes.TEXT: {
      content = <TextContentSection bookmark={bookmark} />;
      break;
    }
    case BookmarkTypes.ASSET: {
      content = <AssetContentSection bookmark={bookmark} />;
      break;
    }
  }

  const sourceUrl = getSourceUrl(bookmark);
  const title = getBookmarkTitle(bookmark);

  // Common content for both layouts
  const contentSection = isBookmarkStillCrawling(bookmark) ? (
    <ContentLoading />
  ) : (
    content
  );

  // mymind detail-modal right rail.
  //
  // Editorial section labels — TLDR / MIND TAGS / MIND NOTES — in the tiny
  // uppercase tracked style seen in the user's screenshots. The title uses
  // the serif face; separators are removed in favor of open whitespace so the
  // rail reads like a curator's notecard rather than a settings panel.
  const detailsSection = (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="line-clamp-3 text-ellipsis break-words font-serif text-3xl italic leading-tight text-foreground">
          {!title ? "Untitled" : title}
        </h1>
        {sourceUrl && (
          <Link
            href={sourceUrl}
            target="_blank"
            className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3" />
            <span>{t("preview.view_original")}</span>
          </Link>
        )}
      </div>
      <BookmarkMetadata bookmark={bookmark} />

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          TLDR
        </p>
        <SummarizeBookmarkArea bookmark={bookmark} readOnly={!isOwner} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Mind Tags
        </p>
        <BookmarkTagsEditor bookmark={bookmark} disabled={!isOwner} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Mind Notes
        </p>
        <NoteEditor bookmark={bookmark} disabled={!isOwner} />
      </div>

      <AttachmentBox bookmark={bookmark} readOnly={!isOwner} />
      <HighlightsBox bookmarkId={bookmark.id} readOnly={!isOwner} />
      {isOwner && (
        <div className="border-t border-border/40 pt-4">
          <ActionBar bookmark={bookmark} />
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Render original layout for wide screens */}
      <div className="hidden h-full flex-col overflow-hidden bg-background lg:flex">
        <div className="flex min-h-0 flex-1">
          <div className="relative h-full flex-1 overflow-auto px-4 py-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {sidebarCollapsed ? (
                <PanelRightOpen size={20} />
              ) : (
                <PanelRightClose size={20} />
              )}
            </button>
            {contentSection}
          </div>
          {!sidebarCollapsed && (
            <div className="flex w-1/3 flex-col gap-3 overflow-auto bg-background p-8">
              {detailsSection}
            </div>
          )}
        </div>
      </div>
      {/* Render tabbed layout for narrow/vertical screens */}
      <div className="flex h-full w-full flex-col overflow-hidden lg:hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="z-10 mx-4 mt-2 grid w-auto grid-cols-2">
            <TabsTrigger value="content">
              {t("preview.tabs.content")}
            </TabsTrigger>
            <TabsTrigger value="details">
              {t("preview.tabs.details")}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="content"
            className="h-full flex-1 overflow-hidden overflow-y-auto bg-background px-4 py-3 data-[state=inactive]:hidden"
          >
            {contentSection}
          </TabsContent>
          <TabsContent
            value="details"
            className="h-full overflow-y-auto bg-background px-4 py-3 data-[state=inactive]:hidden"
          >
            {detailsSection}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
