/**
 * Canonical JSON serialization.
 * Recursively sorts object keys alphabetically while preserving array order.
 * Ensures identical serialization across server, database, and client implementations.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`
  );
  return "{" + pairs.join(",") + "}";
}

