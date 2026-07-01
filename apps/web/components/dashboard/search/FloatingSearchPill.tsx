"use client";

import { cn } from "@/lib/utils";

import { SearchInput } from "./SearchInput";

// Krystal floating search pill — Phase 3.
//
// Search is the main navigation in Krystal now: no folders, no spaces,
// one huge inbox. So the search bar can't live buried in the header — it
// lives at the bottom-center of the viewport, hovering over the masonry
// grid, always one tap away.
//
// Behavior:
//   - Fixed to the bottom of the viewport, centered horizontally.
//   - Small footprint at rest; expands its popover upward on focus.
//   - Cmd/Ctrl-K still focuses it (SearchInput registers its own listener).
//   - Backdrop-blur so cards showing through stay legible.
//   - Bottom-safe on mobile via `pb-safe` fallback padding.
//
// We don't animate the pill in/out — it's always available. Keeps things
// predictable, no surprise UI shifts while the user is thinking.

export default function FloatingSearchPill() {
  return (
    <div
      className={cn(
        // Position: bottom-center, above any content.
        "pointer-events-none fixed inset-x-0 bottom-0 z-40",
        "flex justify-center",
        // Padding: leaves 16px above the safe-area inset. Extra room on
        // desktop so the pill floats clearly above the last row.
        "px-4 pb-6 md:pb-10",
      )}
      style={{
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className={cn(
          // Re-enable pointer events on the pill itself only.
          "pointer-events-auto",
          // Full width up to a comfortable reading measure.
          "w-full max-w-xl",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            "rounded-full border border-border/60",
            "bg-background/90 shadow-2xl shadow-black/20 backdrop-blur-xl",
            "px-4 py-2",
            // Subtle hover/focus lift.
            "transition-shadow focus-within:shadow-black/40",
            "focus-within:border-border",
          )}
        >
          <SearchInput
            className={cn(
              "!h-auto flex-1 bg-transparent",
              // Strip the default border/background from the underlying
              // <CommandInput> so the pill is the visual container.
              "[&_input]:!h-auto [&_input]:!border-0 [&_input]:!bg-transparent",
              "[&_input]:!px-0 [&_input]:!py-1",
              "[&_input]:!text-base [&_input]:!font-normal",
              "[&_input]:!text-foreground",
              "[&_input]:placeholder:!text-muted-foreground/70",
              "[&_[cmdk-input-wrapper]]:!border-0 [&_[cmdk-input-wrapper]]:!p-0",
            )}
          />
        </div>
        {/* Keyboard hint. Sits under the pill in a muted caption. */}
        <p
          className={cn(
            "mt-2 text-center text-[11px] tracking-wide",
            "text-muted-foreground/50",
            "hidden md:block",
          )}
        >
          <kbd className="rounded border border-border/60 px-1 py-0.5 text-[10px]">
            ⌘ K
          </kbd>{" "}
          to focus
        </p>
      </div>
    </div>
  );
}
