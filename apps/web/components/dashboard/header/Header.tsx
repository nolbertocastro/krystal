import Link from "next/link";
import { redirect } from "next/navigation";
import GlobalActions from "@/components/dashboard/GlobalActions";
import ProfileOptions from "@/components/dashboard/header/ProfileOptions";
import { SearchInput } from "@/components/dashboard/search/SearchInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getServerAuthSession } from "@/server/auth";
import {
  Archive,
  Highlighter,
  Home,
  MoreHorizontal,
  Tag,
} from "lucide-react";

// mymind-style top navigation.
//
// The header carries the identity now that the sidebar is gone:
//   - Left:    "my mind" serif italic wordmark (the brand mark)
//   - Center:  editorial serif search hero ("Search my mind…")
//   - Right:   tab strip (Everything · Spaces) + overflow menu with the
//              utility routes (Home, Tags, Highlights, Archive) that used
//              to live in the sidebar.
//
// Serendipity has been removed per user preference.

const TABS: { label: string; href: string }[] = [
  { label: "Everything", href: "/dashboard/bookmarks" },
  { label: "Spaces", href: "/dashboard/lists" },
];

const OVERFLOW_ITEMS: { label: string; href: string; icon: React.ReactNode }[] =
  [
    { label: "Home", href: "/dashboard/bookmarks", icon: <Home size={16} /> },
    { label: "Tags", href: "/dashboard/tags", icon: <Tag size={16} /> },
    {
      label: "Highlights",
      href: "/dashboard/highlights",
      icon: <Highlighter size={16} />,
    },
    {
      label: "Archive",
      href: "/dashboard/archive",
      icon: <Archive size={16} />,
    },
  ];

export default async function Header() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/");
  }

  return (
    <header
      className={cn(
        "sticky left-0 right-0 top-0 z-50",
        "flex h-20 items-center gap-6",
        "bg-background/85 px-6 py-4 backdrop-blur-md md:px-10",
      )}
    >
      {/* "my mind" wordmark — sits on the left where the sidebar used to be. */}
      <Link
        href="/dashboard/bookmarks"
        className={cn(
          "hidden shrink-0 select-none md:block",
          "font-serif text-2xl italic tracking-tight",
          "text-foreground/70 transition-colors hover:text-foreground",
        )}
      >
        my mind
      </Link>

      {/* Serif hero-styled search — placeholder becomes the visible headline. */}
      <div className="flex flex-1 items-center gap-3">
        <SearchInput
          className={cn(
            "!h-auto flex-1 bg-transparent",
            // Target the underlying <CommandInput> so the placeholder renders
            // as the editorial serif "Search my mind…" line.
            "[&_input]:!h-auto [&_input]:!border-0 [&_input]:!bg-transparent",
            "[&_input]:!px-0 [&_input]:!py-1",
            "[&_input]:!font-serif [&_input]:!text-3xl [&_input]:!leading-tight",
            "[&_input]:!italic [&_input]:!tracking-tight",
            "[&_input]:!text-foreground",
            "[&_input]:placeholder:!text-muted-foreground/70",
            "[&_input]:placeholder:!italic",
            "[&_[cmdk-input-wrapper]]:!border-0 [&_[cmdk-input-wrapper]]:!p-0",
            "[&_svg]:hidden", // hide the leading magnifier icon
          )}
        />
        <GlobalActions />
      </div>

      {/* Right-side tab strip. Uppercase tracked labels, tiny — mymind style. */}
      <nav className="hidden items-center gap-6 md:flex">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.16em]",
              "text-muted-foreground transition-colors hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}

        {/* Overflow menu holds the routes that used to sit in the sidebar. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="More"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <MoreHorizontal size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {OVERFLOW_ITEMS.map((item, idx) => (
              <div key={item.href + idx}>
                {idx === OVERFLOW_ITEMS.length - 1 && <DropdownMenuSeparator />}
                <DropdownMenuItem asChild>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <div className="flex items-center">
        <ProfileOptions />
      </div>
    </header>
  );
}
