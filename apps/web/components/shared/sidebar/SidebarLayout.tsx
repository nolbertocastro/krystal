import { Suspense } from "react";
import ErrorFallback from "@/components/dashboard/ErrorFallback";
import Header from "@/components/dashboard/header/Header";
import FloatingSearchPill from "@/components/dashboard/search/FloatingSearchPill";
import DemoModeBanner from "@/components/DemoModeBanner";
import RightRail from "@/components/shared/sidebar/RightRail";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/ui/spinner";
import ValidAccountCheck from "@/components/utils/ValidAccountCheck";
import { ErrorBoundary } from "react-error-boundary";

import serverConfig from "@karakeep/shared/config";

// Krystal dashboard shell — Phase 3, PARA-style.
//
// One huge inbox masonry grid. No left sidebar (killed in Phase 1). The
// header is now identity-only (wordmark + profile). Search lives in a
// floating bottom-center pill. Utility routes (Tags, Highlights, Archive,
// Import, Settings, Theme) sit in a thin right-side rail.
//
// The `sidebar` prop is kept in the signature for API compatibility with
// the Karakeep dashboard route but is intentionally not rendered.
// Mobile still uses the drawer via `mobileSidebar`.

export default function SidebarLayout({
  children,
  mobileSidebar,
  sidebar: _sidebar,
  modal,
}: {
  children: React.ReactNode;
  mobileSidebar: React.ReactNode;
  sidebar: React.ReactNode;
  modal?: React.ReactNode;
}) {
  return (
    <div className="sm:fixed sm:inset-0 sm:overflow-hidden">
      <Header />
      <div className="flex min-h-[calc(100vh-80px)] w-full flex-col sm:h-[calc(100dvh-80px)] sm:overflow-hidden">
        <ValidAccountCheck />
        <main className="flex-1 bg-background sm:min-h-0 sm:overflow-y-auto">
          {serverConfig.demoMode && <DemoModeBanner />}
          <div className="block w-full sm:hidden">
            {mobileSidebar}
            <Separator />
          </div>
          {modal}
          {/* Bottom padding leaves room for the floating search pill so */}
          {/* the last row of cards isn't obscured. */}
          <div className="min-h-30 w-full px-4 pb-32 pt-6 sm:px-8 md:px-16 md:pr-24">
            <ErrorBoundary fallback={<ErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Global chrome that sits above the grid. */}
      <RightRail />
      <FloatingSearchPill />
    </div>
  );
}
