import { memo, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import KeyboardShortcutsDialog from "@/components/dashboard/KeyboardShortcutsDialog";
import NoBookmarksBanner from "@/components/dashboard/bookmarks/NoBookmarksBanner";
import { ActionButton } from "@/components/ui/action-button";
import ActionConfirmingDialog from "@/components/ui/action-confirming-dialog";
import useBulkActionsStore from "@/lib/bulkActions";
import { useBookmarkKeyboardNavigation } from "@/lib/hooks/useBookmarkKeyboardNavigation";
import { useTranslation } from "@/lib/i18n/client";
import { useInBookmarkGridStore } from "@/lib/store/useInBookmarkGridStore";
import { useKeyboardNavigationStore } from "@/lib/store/useKeyboardNavigationStore";
import {
  bookmarkLayoutSwitch,
  useBookmarkLayout,
  useGridColumns,
} from "@/lib/userLocalSettings/bookmarksLayout";
import { cn } from "@/lib/utils";
import tailwindConfig from "@/tailwind.config";
import { Slot } from "@radix-ui/react-slot";
import { ErrorBoundary } from "react-error-boundary";
import { useInView } from "react-intersection-observer";
import Masonry from "react-masonry-css";
import resolveConfig from "tailwindcss/resolveConfig";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { useBookmarkListContext } from "@karakeep/shared-react/hooks/bookmark-list-context";
import { useTRPC } from "@karakeep/shared-react/trpc";

import BookmarkCard from "./BookmarkCard";
import { BookmarkContextMenuTrigger } from "./BookmarkContextMenu";
import BookmarkFormattedCreatedAt from "./BookmarkFormattedCreatedAt";
import EditorCard from "./EditorCard";
import KrystalSavingCard from "./KrystalSavingCard";
import UnknownCard from "./UnknownCard";

import {
  getBookmarkRefreshInterval,
  getBookmarkTitle,
  isBookmarkStillLoading,
} from "@karakeep/shared/utils/bookmarkUtils";

// mymind card wrapper.
//
// Cards float on the background instead of using strokes. Separation comes
// from a soft layered shadow (see `.mymind-card-shadow` in globals.css) that
// deepens gently on hover. rounded-xl (12px) matches the mymind radius; the
// grid gets generous vertical rhythm (mb-6) so each card feels curated rather
// than packed. transform-gpu keeps the lift cheap on long grids.
function StyledBookmarkCard({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Slot
      className={cn(
        "mb-6 overflow-hidden rounded-xl bg-card",
        "mymind-card-shadow",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "hover:-translate-y-0.5",
        "hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_18px_36px_-12px_rgba(0,0,0,0.14)]",
        "dark:hover:shadow-[0_2px_4px_rgba(0,0,0,0.5),0_18px_36px_-12px_rgba(0,0,0,0.6)]",
        "transform-gpu will-change-transform",
        className,
      )}
      {...props}
    >
      {children}
    </Slot>
  );
}

// mymind renders card metadata (title / date) as a small grey caption BELOW
// the card silhouette, not inside it. The card itself stays chrome-free so
// image, quote, or video content can dominate.
function BelowCardCaption({ bookmark }: { bookmark: ZBookmark }) {
  const layout = useBookmarkLayout();
  if (layout === "list" || layout === "compact") return null;

  const title = getBookmarkTitle(bookmark);
  return (
    <div className="mb-6 -mt-4 flex items-baseline gap-2 px-1 text-[11px] text-muted-foreground">
      {title && (
        <span className="line-clamp-1 flex-1 truncate" title={title}>
          {title}
        </span>
      )}
      <span suppressHydrationWarning className="shrink-0 tabular-nums opacity-70">
        <BookmarkFormattedCreatedAt createdAt={bookmark.createdAt} />
      </span>
    </div>
  );
}

const BookmarkGridItem = memo(function BookmarkGridItem({
  bookmark: initialData,
  index,
}: {
  bookmark: ZBookmark;
  index: number;
}) {
  const isFocused = useKeyboardNavigationStore(
    (state) => state.isNavigating && state.focusedIndex === index,
  );

  // Poll the row while the pipeline is still working so the placeholder
  // → real-card swap happens automatically. This mirrors the polling
  // BookmarkCard already does internally, but hoisting it here lets us
  // switch the entire card (not just its inner image) once loading ends.
  // `getBookmarkRefreshInterval` returns 1s for the first 30s, then 10s
  // for 10min, then 60s for 6h, then stops.
  const api = useTRPC();
  const { data: bookmark } = useQuery(
    api.bookmarks.getBookmark.queryOptions(
      { bookmarkId: initialData.id },
      {
        initialData,
        refetchInterval: (query) => {
          const data = query.state.data;
          if (!data) return false;
          return getBookmarkRefreshInterval(data);
        },
      },
    ),
  );

  const isLoading = isBookmarkStillLoading(bookmark);

  return (
    <ErrorBoundary fallback={<UnknownCard bookmark={bookmark} />}>
      <BookmarkContextMenuTrigger bookmark={bookmark}>
        <StyledBookmarkCard
          className={cn(
            "mb-2", // shorter than default; caption below adds spacing
            isFocused &&
              "ring-2 ring-primary ring-offset-2 ring-offset-background",
            // Subtle amber halo when a card is pinned Top of Mind.
            bookmark.favourited &&
              "ring-1 ring-primary/40 ring-offset-1 ring-offset-background",
          )}
        >
          {isLoading ? (
            <KrystalSavingCard bookmark={bookmark} />
          ) : (
            <BookmarkCard bookmark={bookmark} bookmarkIndex={index} />
          )}
        </StyledBookmarkCard>
        {!isLoading && <BelowCardCaption bookmark={bookmark} />}
      </BookmarkContextMenuTrigger>
    </ErrorBoundary>
  );
});

function getBreakpointConfig(userColumns: number) {
  const fullConfig = resolveConfig(tailwindConfig);

  const breakpointColumnsObj: { [key: number]: number; default: number } = {
    default: userColumns,
  };

  // Responsive behavior: reduce columns on smaller screens
  const lgColumns = Math.max(1, Math.min(userColumns, userColumns - 1));
  const mdColumns = Math.max(1, Math.min(userColumns, 2));
  const smColumns = 1;

  breakpointColumnsObj[parseInt(fullConfig.theme.screens.lg)] = lgColumns;
  breakpointColumnsObj[parseInt(fullConfig.theme.screens.md)] = mdColumns;
  breakpointColumnsObj[parseInt(fullConfig.theme.screens.sm)] = smColumns;
  return breakpointColumnsObj;
}

function getColumnsForViewport(userColumns: number, viewportWidth: number) {
  const fullConfig = resolveConfig(tailwindConfig);
  const screens = fullConfig.theme.screens;
  const lg = parseInt(screens.lg);
  const md = parseInt(screens.md);
  const sm = parseInt(screens.sm);

  if (viewportWidth <= sm) {
    return 1;
  }
  if (viewportWidth <= md) {
    return Math.max(1, Math.min(userColumns, 2));
  }
  if (viewportWidth <= lg) {
    return Math.max(1, userColumns - 1);
  }
  return userColumns;
}

function useActiveGridColumns(userColumns: number) {
  const [activeColumns, setActiveColumns] = useState(userColumns);

  useEffect(() => {
    let animationFrame: number | null = null;
    const updateActiveColumns = () => {
      if (animationFrame !== null) {
        return;
      }
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        setActiveColumns(getColumnsForViewport(userColumns, window.innerWidth));
      });
    };

    const updateActiveColumnsImmediately = () => {
      setActiveColumns(getColumnsForViewport(userColumns, window.innerWidth));
    };

    updateActiveColumnsImmediately();
    window.addEventListener("resize", updateActiveColumns);
    return () => {
      window.removeEventListener("resize", updateActiveColumns);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [userColumns]);

  return activeColumns;
}

export default function BookmarksGrid({
  bookmarks,
  hasNextPage = false,
  fetchNextPage = () => ({}),
  isFetchingNextPage = false,
  showEditorCard = false,
}: {
  bookmarks: ZBookmark[];
  showEditorCard?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
}) {
  const { t } = useTranslation();
  const layout = useBookmarkLayout();
  const gridColumns = useGridColumns();
  const activeGridColumns = useActiveGridColumns(gridColumns);
  const setVisibleBookmarks = useBulkActionsStore(
    (state) => state.setVisibleBookmarks,
  );
  const setListContext = useBulkActionsStore((state) => state.setListContext);
  const setInBookmarkGrid = useInBookmarkGridStore(
    (state) => state.setInBookmarkGrid,
  );
  const withinListContext = useBookmarkListContext();
  const breakpointConfig = useMemo(
    () => getBreakpointConfig(gridColumns),
    [gridColumns],
  );
  const { ref: loadMoreRef, inView: loadMoreButtonInView } = useInView();

  // For list/compact layouts, navigation is single-column
  const isListLayout = layout === "list" || layout === "compact";
  const navColumns = isListLayout ? 1 : activeGridColumns;

  const {
    helpDialogOpen,
    setHelpDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    isBulkDelete,
    deleteCount,
    confirmDelete,
    isDeletePending,
  } = useBookmarkKeyboardNavigation({
    bookmarks,
    columns: navColumns,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  useEffect(() => {
    setVisibleBookmarks(bookmarks);
    setListContext(withinListContext);

    return () => {
      setVisibleBookmarks([]);
      setListContext(undefined);
    };
  }, [bookmarks, setListContext, setVisibleBookmarks, withinListContext]);

  useEffect(() => {
    setInBookmarkGrid(true);
    return () => {
      setInBookmarkGrid(false);
    };
  }, [setInBookmarkGrid]);

  useEffect(() => {
    if (loadMoreButtonInView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, loadMoreButtonInView]);

  if (bookmarks.length == 0 && !showEditorCard) {
    return (
      <>
        <NoBookmarksBanner />
        <KeyboardShortcutsDialog
          open={helpDialogOpen}
          setOpen={setHelpDialogOpen}
        />
      </>
    );
  }

  const children = [
    showEditorCard && (
      <StyledBookmarkCard key={"editor"}>
        <EditorCard />
      </StyledBookmarkCard>
    ),
    ...bookmarks.map((bookmark, index) => (
      <BookmarkGridItem key={bookmark.id} bookmark={bookmark} index={index} />
    )),
  ];
  return (
    <>
      {bookmarkLayoutSwitch(layout, {
        masonry: (
          <Masonry
            className="-ml-3 flex w-auto"
            columnClassName="pl-3"
            breakpointCols={breakpointConfig}
          >
            {children}
          </Masonry>
        ),
        grid: (
          <Masonry
            className="-ml-3 flex w-auto"
            columnClassName="pl-3"
            breakpointCols={breakpointConfig}
          >
            {children}
          </Masonry>
        ),
        list: <div className="grid grid-cols-1">{children}</div>,
        compact: <div className="grid grid-cols-1">{children}</div>,
      })}
      {hasNextPage && (
        <div className="flex justify-center">
          <ActionButton
            ref={loadMoreRef}
            ignoreDemoMode={true}
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            variant="ghost"
          >
            Load More
          </ActionButton>
        </div>
      )}

      <KeyboardShortcutsDialog
        open={helpDialogOpen}
        setOpen={setHelpDialogOpen}
      />

      <ActionConfirmingDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title={t("dialogs.bookmarks.delete_confirmation_title")}
        description={
          isBulkDelete
            ? t("dialogs.bookmarks.bulk_delete_confirmation_description", {
                count: deleteCount,
              })
            : t("dialogs.bookmarks.delete_confirmation_description")
        }
        actionButton={() => (
          <ActionButton
            type="button"
            variant="destructive"
            loading={isDeletePending}
            onClick={confirmDelete}
          >
            {t("actions.delete")}
          </ActionButton>
        )}
      />
    </>
  );
}
