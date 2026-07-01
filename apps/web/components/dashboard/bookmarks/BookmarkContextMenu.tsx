"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Brain, Hash, Trash2 } from "lucide-react";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { useUpdateBookmark } from "@karakeep/shared-react/hooks/bookmarks";

import { BookmarkTagsEditor } from "./BookmarkTagsEditor";
import DeleteBookmarkConfirmationDialog from "./DeleteBookmarkConfirmationDialog";

// Krystal card context menu.
//
// Right-click (or long-press on touch) any card in the grid to bring this up.
// Three actions — PARA-style, no folders/spaces:
//   #  Add tags
//   ^  Top of Mind      (persists as `favourited` on the bookmark)
//   🗑  Delete card       (destructive red)
//
// The menu itself is a portal-rendered floating panel positioned at the
// pointer. We don't pull in @radix-ui/react-context-menu — a small custom
// menu is enough and avoids growing the bundle. Long-press support is
// handled by <BookmarkContextMenuTrigger>.
//
// LONG-PRESS BEHAVIOR ON TOUCH DEVICES:
// We register touchstart with { passive: false } so we can preventDefault()
// once the 500ms threshold fires, suppressing the iOS "callout" (image
// magnifier / share sheet). A slight movement threshold (12px) cancels the
// timer, so scrolling still works.

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 12;

interface MenuPosition {
  x: number;
  y: number;
}

interface BookmarkContextMenuState {
  open: boolean;
  position: MenuPosition;
}

// Public trigger wrapper. Renders `children`, catches contextmenu +
// long-press, and hosts the menu portal.
export function BookmarkContextMenuTrigger({
  bookmark,
  children,
  className,
}: {
  bookmark: ZBookmark;
  children: React.ReactNode;
  className?: string;
}) {
  const [menu, setMenu] = useState<BookmarkContextMenuState>({
    open: false,
    position: { x: 0, y: 0 },
  });

  // Dialog open state for each of the menu's actions.
  const [tagsOpen, setTagsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openMenuAt = useCallback((x: number, y: number) => {
    setMenu({ open: true, position: { x, y } });
  }, []);

  // --- Long-press timer state ------------------------------------------------
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const pressFired = useRef(false);

  const clearPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressStart.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      pressStart.current = { x: t.clientX, y: t.clientY };
      pressFired.current = false;
      pressTimer.current = setTimeout(() => {
        pressFired.current = true;
        openMenuAt(t.clientX, t.clientY);
      }, LONG_PRESS_MS);
    },
    [openMenuAt],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pressStart.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - pressStart.current.x);
      const dy = Math.abs(t.clientY - pressStart.current.y);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearPress();
    },
    [clearPress],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // If long-press fired, suppress the subsequent click.
      if (pressFired.current) {
        e.preventDefault();
        e.stopPropagation();
      }
      clearPress();
    },
    [clearPress],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      openMenuAt(e.clientX, e.clientY);
    },
    [openMenuAt],
  );

  return (
    <>
      <div
        className={className}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={clearPress}
        // Suppress the iOS long-press callout menu.
        style={{ WebkitTouchCallout: "none" }}
      >
        {children}
      </div>

      {menu.open && (
        <BookmarkContextMenuPanel
          bookmark={bookmark}
          position={menu.position}
          onClose={() => setMenu((m) => ({ ...m, open: false }))}
          onAddTags={() => setTagsOpen(true)}
          onDelete={() => setDeleteOpen(true)}
        />
      )}

      {/* Action dialogs, mounted lazily via open state. */}
      <AddTagsDialog
        bookmark={bookmark}
        open={tagsOpen}
        setOpen={setTagsOpen}
      />
      <DeleteBookmarkConfirmationDialog
        bookmark={bookmark}
        open={deleteOpen}
        setOpen={setDeleteOpen}
      />
    </>
  );
}

// The floating panel. Positioned at the pointer, dismisses on outside click
// or Escape. Kept out of the design-system Popover because we need pointer-
// derived positioning rather than an anchor element.
function BookmarkContextMenuPanel({
  bookmark,
  position,
  onClose,
  onAddTags,
  onDelete,
}: {
  bookmark: ZBookmark;
  position: MenuPosition;
  onClose: () => void;
  onAddTags: () => void;
  onDelete: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState<MenuPosition>(position);

  // Nudge the panel back inside the viewport if it would overflow.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let { x, y } = position;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (x + rect.width > vw - 8) x = Math.max(8, vw - rect.width - 8);
    if (y + rect.height > vh - 8) y = Math.max(8, vh - rect.height - 8);
    setAdjusted({ x, y });
  }, [position]);

  // Dismiss on outside click / escape.
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Delay one frame so the opening pointer event doesn't immediately close it.
    const raf = requestAnimationFrame(() => {
      window.addEventListener("pointerdown", onPointer, true);
      window.addEventListener("keydown", onKey);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Top of Mind toggle -- reuses the existing `favourited` field.
  const { mutate: updateBookmark } = useUpdateBookmark();
  const isTopOfMind = bookmark.favourited;
  const toggleTopOfMind = () => {
    updateBookmark({
      bookmarkId: bookmark.id,
      favourited: !isTopOfMind,
    });
    onClose();
  };

  const wrap = (fn: () => void) => () => {
    fn();
    onClose();
  };

  // Portal so the menu escapes any overflow:hidden ancestor (like our card
  // shadow wrapper) and can be positioned in viewport coordinates.
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      className={cn(
        "fixed z-[100] min-w-[240px] overflow-hidden rounded-2xl",
        "bg-neutral-900 text-neutral-100 shadow-2xl ring-1 ring-black/40",
        "animate-in fade-in-0 zoom-in-95 duration-100",
      )}
      style={{
        left: adjusted.x,
        top: adjusted.y,
      }}
    >
      <MenuItem
        icon={<Hash size={18} />}
        label="Add tags"
        onClick={wrap(onAddTags)}
      />
      <MenuItem
        icon={<Brain size={18} />}
        label={isTopOfMind ? "Remove from Top of Mind" : "Top of Mind"}
        onClick={toggleTopOfMind}
      />
      <MenuItem
        icon={<Trash2 size={18} />}
        label="Delete card"
        variant="destructive"
        onClick={wrap(onDelete)}
      />
    </div>,
    document.body,
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15px]",
        "transition-colors hover:bg-neutral-800",
        variant === "destructive"
          ? "text-red-500 hover:text-red-400"
          : "text-neutral-100",
      )}
    >
      <span
        className={cn(
          "shrink-0",
          variant === "destructive" ? "text-red-500" : "text-neutral-400",
        )}
      >
        {icon}
      </span>
      <span className="font-serif italic tracking-tight">{label}</span>
    </button>
  );
}

// Simple wrapper dialog that hosts BookmarkTagsEditor for the "Add tags"
// menu action. BookmarkTagsEditor renders inline (chip-style), so we drop
// it inside a small dialog to make it feel like a modal action.
function AddTagsDialog({
  bookmark,
  open,
  setOpen,
}: {
  bookmark: ZBookmark;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl italic">
            Add tags
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <BookmarkTagsEditor bookmark={bookmark} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
