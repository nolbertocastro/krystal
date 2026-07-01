import { useEffect } from "react";

import Logo from "./Logo";

/**
 * Ambient save confirmation.
 *
 * Shows the Krystal wordmark, a short "Saved to Krystal" line, and a
 * thin progress bar that drains left-to-right over 2.5s, then closes
 * the popup. No actions, no undo, no bookmark title — the save happens
 * silently, the confirmation appears calmly, and the popup dismisses
 * itself.
 *
 * All post-save enrichment (tags, notes, lists) is handled server-side —
 * DeepSeek auto-tags via the inference worker, so the extension has
 * nothing to prompt the user for. The dashboard shows an in-progress
 * placeholder card while that work happens.
 */
const AUTO_CLOSE_MS = 2500;

export default function SavedToast() {
  useEffect(() => {
    const t = setTimeout(() => {
      window.close();
    }, AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="krystal-saved-toast relative flex flex-col items-center justify-center gap-4 py-6">
      <div
        aria-hidden
        className="krystal-progress-bar absolute left-0 right-0 top-0 h-[3px] origin-left bg-primary"
      />
      <Logo />
      <p className="text-lg text-foreground">Saved to Krystal</p>
    </div>
  );
}
