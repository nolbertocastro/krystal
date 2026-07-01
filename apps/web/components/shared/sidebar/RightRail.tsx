"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useToggleTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import {
  Archive,
  Download,
  Highlighter,
  Moon,
  Settings,
  Sun,
  Tag,
} from "lucide-react";
import { useTheme } from "next-themes";

// Krystal right-side rail — Phase 3.
//
// A thin vertical strip of utility icons on the right edge, mymind-style.
// Tags, Highlights, Archive, Import, Settings, Theme toggle. Icons only
// with tooltips — the rail takes almost no visual weight, and the masonry
// grid still owns the canvas.
//
// Hidden on mobile — the mobile drawer already carries these routes.
//
// We deliberately do NOT include a "Spaces" or "Lists" link. Phase 3
// killed folders; the rail must not lead the user back into that model.

interface RailItem {
  href?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

function RailButton({
  item,
  active,
}: {
  item: RailItem;
  active?: boolean;
}) {
  const classes = cn(
    "group relative flex h-10 w-10 items-center justify-center rounded-full",
    "text-muted-foreground transition-colors",
    "hover:bg-muted hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    active && "bg-muted text-foreground",
  );

  const content = (
    <>
      {item.icon}
      {/* Tooltip on hover — pure CSS to stay lightweight. */}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md",
          "bg-neutral-900 px-2 py-1 text-xs text-neutral-100 shadow-lg",
          "opacity-0 transition-opacity group-hover:opacity-100",
        )}
      >
        {item.label}
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} aria-label={item.label} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-label={item.label}
      className={classes}
    >
      {content}
    </button>
  );
}

function ThemeIcon() {
  const { theme } = useTheme();
  return theme === "dark" ? <Sun size={16} /> : <Moon size={16} />;
}

export default function RightRail() {
  const pathname = usePathname();
  const toggleTheme = useToggleTheme();

  const items: RailItem[] = [
    { href: "/dashboard/tags", label: "Tags", icon: <Tag size={16} /> },
    {
      href: "/dashboard/highlights",
      label: "Highlights",
      icon: <Highlighter size={16} />,
    },
    {
      href: "/dashboard/archive",
      label: "Archive",
      icon: <Archive size={16} />,
    },
    {
      href: "/settings/import",
      label: "Import",
      icon: <Download size={16} />,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: <Settings size={16} />,
    },
    {
      label: "Toggle theme",
      icon: <ThemeIcon />,
      onClick: toggleTheme,
    },
  ];

  return (
    <aside
      className={cn(
        // Fixed to the right edge, vertically centered on the viewport.
        "fixed right-2 top-1/2 z-30 -translate-y-1/2",
        // Vertical stack, thin.
        "flex flex-col items-center gap-1 p-1.5",
        "rounded-full border border-border/60 bg-background/80 shadow-lg backdrop-blur-md",
        // Hidden on mobile — the mobile drawer covers this.
        "hidden md:flex",
      )}
    >
      {items.map((item, i) => (
        <RailButton
          key={item.label + i}
          item={item}
          active={
            !!item.href &&
            (pathname === item.href ||
              (item.href !== "/settings" && pathname.startsWith(item.href)))
          }
        />
      ))}
    </aside>
  );
}
