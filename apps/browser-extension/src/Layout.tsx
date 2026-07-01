import { Outlet, useNavigate } from "react-router-dom";

import usePluginSettings from "./utils/settings";

/**
 * Root layout for the popup save flow.
 *
 * Deliberately chrome-less — no header, no footer buttons. The popup is
 * either in-flight (saving) or dismissing itself (SavedToast auto-closes
 * in 2.5s), so surfacing Bookmarks/Settings/Close controls here just
 * competes with the ambient confirmation. Settings live under
 * /options (reachable via the extension's right-click Options menu) and
 * the popup closes itself when done.
 */
export default function Layout() {
  const navigate = useNavigate();
  const { settings, isPending: isInit } = usePluginSettings();
  if (!isInit) {
    return <div className="p-4">Loading ... </div>;
  }

  if (!settings.apiKey || !settings.address) {
    navigate("/notconfigured");
    return;
  }

  return (
    <div className="rounded-md bg-gray-100 p-4 dark:bg-gray-900">
      <Outlet />
    </div>
  );
}
