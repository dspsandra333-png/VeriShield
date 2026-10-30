import type { PiiType, DetectedItem } from "../types.js";
import { detectAll, normalizeValue, OPTIONAL_TYPES } from "./detectors.js";

export interface SessionPlaceholderMap {
  // Normalized real value -> placeholder (e.g. "user@example.com" -> "[EMAIL_1]")
  valueToPlaceholder: Map<string, string>;
  // Placeholder -> original exact value as first seen
  placeholderToValue: Map<string, string>;
  // Type -> current count of distinct values allocated
  typeCounts: Map<PiiType, number>;
}

export function createSessionPlaceholderMap(): SessionPlaceholderMap {
  return {
    valueToPlaceholder: new Map<string, string>(),
    placeholderToValue: new Map<string, string>(),
    typeCounts: new Map<PiiType, number>(),
  };
}

export interface MaskOptions {
  // Set of placeholder keys that user chose to skip/untick
  skippedPlaceholders?: Set<string>;
}

export interface MaskResult {
  maskedText: string;
  items: DetectedItem[];
}

/**
 * Masks sensitive items in raw text using the session placeholder map.
 * Items of optional types (NAME, DOB, UPI) that are skipped remain unmasked.
 */
export function mask(
  text: string,
  sessionMap: SessionPlaceholderMap,
  options?: MaskOptions
): MaskResult {
  const matches = detectAll(text);
  const items: DetectedItem[] = [];

  // Determine placeholders for each detected item
  for (const m of matches) {
    const isOptional = OPTIONAL_TYPES.has(m.type);
    const normalized = normalizeValue(m.type, m.original);
    const lookupKey = `${m.type}:${normalized}`;

    let placeholder = sessionMap.valueToPlaceholder.get(lookupKey);
    if (!placeholder) {
      const currentCount = sessionMap.typeCounts.get(m.type) || 0;
      const nextCount = currentCount + 1;
      sessionMap.typeCounts.set(m.type, nextCount);
      placeholder = `[${m.type}_${nextCount}]`;

      sessionMap.valueToPlaceholder.set(lookupKey, placeholder);
      sessionMap.placeholderToValue.set(placeholder, m.original);
    }

    items.push({
      type: m.type,
      placeholder,
      start: m.start,
      end: m.end,
      original: m.original,
      optional: isOptional,
    });
  }

  // Construct masked text by applying replacements from end to start
  // to maintain valid index offsets
  let result = text;
  const skipped = options?.skippedPlaceholders || new Set<string>();

  // Sort items descending by start offset
  const sortedItems = [...items].sort((a, b) => b.start - a.start);

  for (const item of sortedItems) {
    if (item.optional && skipped.has(item.placeholder)) {
      // User unticked this optional item, keep original text
      continue;
    }
    result =
      result.slice(0, item.start) + item.placeholder + result.slice(item.end);
  }

  return {
    maskedText: result,
    items,
  };
}

