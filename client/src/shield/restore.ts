import type { SessionPlaceholderMap } from "./mask.js";

/**
 * Restores placeholders like [EMAIL_1], [PHONE_1] back to their original values
 * using the in-memory session placeholder map.
 * Unknown placeholders and [REDACTED_*] markers (with no trailing digit) are left untouched.
 */
export function restore(
  text: string,
  sessionMap: SessionPlaceholderMap
): string {
  if (!text) return "";

  return text.replace(/\[([A-Z_]+)_(\d+)\]/g, (match) => {
    const original = sessionMap.placeholderToValue.get(match);
    return original !== undefined ? original : match;
  });
}

