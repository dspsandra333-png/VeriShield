import { createHash } from "node:crypto";

/**
 * Returns the SHA-256 hex digest of a given string input.
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

