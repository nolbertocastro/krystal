import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  BookmarkTypes,
  ZNewBookmarkRequest,
  zNewBookmarkRequestSchema,
} from "@karakeep/shared/types/bookmarks";

import { NEW_BOOKMARK_REQUEST_KEY_NAME } from "./background/protocol";
import SavedToast from "./SavedToast";
import Spinner from "./Spinner";
import { hasHostPermission } from "./utils/permissions";
import usePluginSettings from "./utils/settings";
import {
  capturePageWithSingleFile,
  uploadSingleFileAsset,
} from "./utils/singlefile";
import { useTRPC } from "./utils/trpc";
import { MessageType } from "./utils/type";
import { isHttpUrl } from "./utils/url";

/**
 * Krystal save flow — mymind-style.
 *
 * The popup opens, fires createBookmark against the pending bookmark
 * request, and on success renders <SavedToast /> which auto-closes the
 * popup after 1.5s. No tag/note/list prompts, no confirmation forms —
 * DeepSeek handles enrichment server-side.
 *
 * On error we keep the popup open and surface the message so the user
 * can retry or reconfigure.
 */
export default function SavePage() {
  const api = useTRPC();
  const { settings, isPending: isSettingsLoaded } = usePluginSettings();
  const [error, setError] = useState<string | undefined>(undefined);
  const [isCapturing, setIsCapturing] = useState(false);
  const [pendingBookmark, setPendingBookmark] =
    useState<ZNewBookmarkRequest | null>(null);
  const [hasCheckedRequest, setHasCheckedRequest] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<number | undefined>(
    undefined,
  );
  const [currentTabUrl, setCurrentTabUrl] = useState<string | undefined>(
    undefined,
  );

  const { mutate: createBookmark, status } = useMutation(
    api.bookmarks.createBookmark.mutationOptions({
      onError: (e) => {
        setError("Something went wrong: " + e.message);
      },
      onSuccess: async () => {
        // After successful creation, update badge cache and notify background.
        try {
          const [currentTab] = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
          });
          await chrome.runtime.sendMessage({
            type: MessageType.BOOKMARK_REFRESH_BADGE,
            currentTab: currentTab,
          });
        } catch {
          // Badge refresh is best-effort — on Firefox Android the background
          // script may not be reachable from the popup context.
        }
      },
    }),
  );

  useEffect(() => {
    async function getNewBookmarkRequestFromBackgroundScriptIfAny(): Promise<ZNewBookmarkRequest | null> {
      const { [NEW_BOOKMARK_REQUEST_KEY_NAME]: req } =
        await chrome.storage.session.get(NEW_BOOKMARK_REQUEST_KEY_NAME);
      if (!req) {
        return null;
      }
      // Delete the request immediately to avoid issues with lingering values
      await chrome.storage.session.remove(NEW_BOOKMARK_REQUEST_KEY_NAME);
      return zNewBookmarkRequestSchema.parse(req);
    }

    async function loadBookmarkRequest() {
      const [currentTab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      setCurrentTabId(currentTab?.id);
      setCurrentTabUrl(currentTab?.url);

      let newBookmarkRequest =
        await getNewBookmarkRequestFromBackgroundScriptIfAny();
      if (!newBookmarkRequest) {
        if (!currentTab?.url) {
          setError("Current tab has no URL to bookmark.");
          setHasCheckedRequest(true);
          return;
        }

        if (!isHttpUrl(currentTab.url)) {
          setError(
            "Cannot bookmark this type of URL. Only HTTP/HTTPS URLs are supported.",
          );
          setHasCheckedRequest(true);
          return;
        }

        newBookmarkRequest = {
          type: BookmarkTypes.LINK,
          title: currentTab.title,
          url: currentTab.url,
          source: "extension",
        };
      }

      setPendingBookmark(newBookmarkRequest);
      setHasCheckedRequest(true);
    }

    if (!isSettingsLoaded) return;
    loadBookmarkRequest();
  }, [isSettingsLoaded]);

  const saveBookmark = async (bookmark: ZNewBookmarkRequest) => {
    let finalBookmark = bookmark;
    // Only crawl when the bookmark target matches the active tab — context-menu
    // saves (link/src URL) may create a bookmark for a different URL, in which
    // case capturing the current page would attach the wrong archive.
    if (
      settings.useSingleFile &&
      currentTabId !== undefined &&
      bookmark.type === BookmarkTypes.LINK &&
      !bookmark.precrawledArchiveId &&
      currentTabUrl !== undefined &&
      bookmark.url === currentTabUrl &&
      // The `<all_urls>` host permission is optional and only granted when the
      // user opts in to client-side crawling; it may have been revoked since.
      (await hasHostPermission())
    ) {
      try {
        setIsCapturing(true);
        const html = await capturePageWithSingleFile(currentTabId, {
          includeImages: settings.singleFileIncludeImages,
        });
        const precrawledArchiveId = await uploadSingleFileAsset(
          html,
          bookmark.title ?? undefined,
        );
        finalBookmark = { ...bookmark, precrawledArchiveId };
      } catch (e) {
        // Client-side crawling is best-effort — fall back to a plain bookmark
        // so users can still save links on pages where capture is blocked.
        console.warn("Client-side crawl failed, saving without archive:", e);
      } finally {
        setIsCapturing(false);
      }
    }
    createBookmark({
      ...finalBookmark,
      source: finalBookmark.source || "extension",
    });
  };

  // Always auto-save — the manual-confirmation flow was removed with the
  // mymind-style pivot. `settings.autoSave` is retained in storage for
  // back-compat but no longer gates the save.
  useEffect(() => {
    if (
      hasCheckedRequest &&
      pendingBookmark &&
      status === "idle" &&
      !isCapturing &&
      !error
    ) {
      saveBookmark(pendingBookmark);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCheckedRequest, pendingBookmark, status, isCapturing, error]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (isCapturing) {
    return (
      <div className="flex justify-between text-lg">
        <span>Capturing Page </span>
        <Spinner />
      </div>
    );
  }

  switch (status) {
    case "error": {
      return <div className="text-red-500">{error}</div>;
    }
    case "success": {
      return <SavedToast />;
    }
    case "pending":
    case "idle": {
      return (
        <div className="flex justify-between text-lg">
          <span>Saving </span>
          <Spinner />
        </div>
      );
    }
  }
}
