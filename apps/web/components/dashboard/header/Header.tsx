import Link from "next/link";
import { redirect } from "next/navigation";
import GlobalActions from "@/components/dashboard/GlobalActions";
import ProfileOptions from "@/components/dashboard/header/ProfileOptions";
import { SearchInput } from "@/components/dashboard/search/SearchInput";
import { getServerAuthSession } from "@/server/auth";
import { cn } from "@/lib/utils";

// mymind-style top navigation.
//
// The design leads with an editorial serif search hero ("Search my mind…"),
// then a right-side tab strip (Everything · Spaces · Serendipity). The bar is
// intentionally airy: no visible input chrome, no drop-shadow, no logo. The
// SearchInput below is styled to blend into the background so the placeholder
// reads as a headline instead of a form field.

const TABS: { label: string; href: string }[] = [
  { label: "Everything", href: "/dashboard/bookmarks" },
  { label: "Spaces", href: "/dashboard/lists" },
  { label: "Serendipity", href: "/dashboard/bookmarks?sort=random" },
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
        "bg-background/85 px-8 py-4 backdrop-blur-md",
      )}
    >
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
      </nav>

      <div className="flex items-center">
        <ProfileOptions />
      </div>
    </header>
  );
}
