import Link from "next/link";
import { redirect } from "next/navigation";
import GlobalActions from "@/components/dashboard/GlobalActions";
import ProfileOptions from "@/components/dashboard/header/ProfileOptions";
import { cn } from "@/lib/utils";
import { getServerAuthSession } from "@/server/auth";

// Krystal top navigation — Phase 3, PARA-style.
//
// One huge inbox. No Spaces, no folders, no tabs. Search moved to a
// floating bottom-center pill (see <FloatingSearchPill>). The header now
// carries only the identity:
//   - Left:    "Krystal" serif italic wordmark
//   - Right:   Global actions (New bookmark) + profile avatar
//
// Utility routes (Tags, Highlights, Archive, Settings) live in the right
// side rail (see <RightRail>) so the top can stay quiet.

export default async function Header() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/");
  }

  return (
    <header
      className={cn(
        "sticky left-0 right-0 top-0 z-50",
        "flex h-16 items-center justify-between gap-6",
        "bg-background/85 px-6 py-3 backdrop-blur-md md:px-10",
      )}
    >
      {/* Wordmark — the only identity element up top. */}
      <Link
        href="/dashboard/bookmarks"
        className={cn(
          "select-none",
          "font-serif text-2xl italic tracking-tight",
          "text-foreground/70 transition-colors hover:text-foreground",
        )}
      >
        Krystal
      </Link>

      <div className="flex items-center gap-2">
        <GlobalActions />
        <ProfileOptions />
      </div>
    </header>
  );
}
