// NOTE: Keep patterns in sync with server/src/shield/detectors.ts
// client/src/shield/detectors.ts contains the full client-side detection engine including NAME and DOB.

import type { PiiType } from "../types.js";
import { HONORIFICS, INTRO_CUES, NON_NAME_STOPLIST, COMMON_NAMES } from "./names.js";

export const PII_PRIORITY: Record<PiiType, number> = {
  API_KEY: 90,
  EMAIL: 80,
  CARD: 70,
  AADHAAR: 60,
  PAN: 50,
  PHONE: 40,
  UPI: 30,
  DOB: 20,
  NAME: 10,
};

export const OPTIONAL_TYPES = new Set<PiiType>(["NAME", "DOB", "UPI"]);

/**
 * Standard Luhn algorithm check for credit/debit card numbers.
 */
export function luhnCheck(numStr: string): boolean {
  const digits = numStr.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

interface RawMatch {
  type: PiiType;
  start: number;
  end: number;
  original: string;
}

export function detectAll(text: string): RawMatch[] {
  const matches: RawMatch[] = [];

  // 1. API_KEY / Secrets
  const secretPatterns = [
    // Google AI API keys
    /AIza[0-9A-Za-z\-_]{35}/g,
    // Supabase keys
    /sb_(?:secret|publishable)_[a-zA-Z0-9_\-]{20,}/g,
    // OpenAI and generic sk
    /sk-[A-Za-z0-9_\-]{20,}/g,
    /sk_(?:live|test)_[A-Za-z0-9]{20,}/g,
    // GitHub tokens
    /(?:ghp|gho|ghs|ghu)_[a-zA-Z0-9]{36}/g,
    /github_pat_[a-zA-Z0-9_]{40,}/g,
    // AWS Access Key ID
    /\bAKIA[0-9A-Z]{16}\b/g,
    // Slack token
    /xox[baprs]-[0-9a-zA-Z\-]{10,}/g,
    // JWT tokens
    /eyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}/g,
    // PEM private key blocks
    /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g,
  ];

  for (const regex of secretPatterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      matches.push({
        type: "API_KEY",
        start: m.index,
        end: m.index + m[0].length,
        original: m[0],
      });
    }
  }

  // Bearer tokens: match only token value
  const bearerRegex = /Bearer\s+([A-Za-z0-9_\-\.]{20,})/gi;
  let bMatch: RegExpExecArray | null;
  while ((bMatch = bearerRegex.exec(text)) !== null) {
    const val = bMatch[1];
    const valStart = bMatch.index + bMatch[0].indexOf(val);
    matches.push({
      type: "API_KEY",
      start: valStart,
      end: valStart + val.length,
      original: val,
    });
  }

  // Key assignments: api_key=..., secret: ..., token=..., password=... (mask value only, min 6 chars)
  const assignRegex = /(?:api[_\-]?key|secret|token|password)\s*[:=]\s*["']?([A-Za-z0-9_\-\.]{6,})["']?/gi;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = assignRegex.exec(text)) !== null) {
    const val = aMatch[1];
    const valStart = aMatch.index + aMatch[0].indexOf(val);
    matches.push({
      type: "API_KEY",
      start: valStart,
      end: valStart + val.length,
      original: val,
    });
  }

  // 2. EMAIL (must contain dot in domain)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  let eMatch: RegExpExecArray | null;
  while ((eMatch = emailRegex.exec(text)) !== null) {
    matches.push({
      type: "EMAIL",
      start: eMatch.index,
      end: eMatch.index + eMatch[0].length,
      original: eMatch[0],
    });
  }

  // 3. CARD (13-19 digits with spaces/dashes, Luhn checked)
  const cardCandidateRegex = /\b(?:\d[ -]?){13,19}\b/g;
  let cMatch: RegExpExecArray | null;
  while ((cMatch = cardCandidateRegex.exec(text)) !== null) {
    const raw = cMatch[0].trim();
    if (luhnCheck(raw)) {
      matches.push({
        type: "CARD",
        start: cMatch.index,
        end: cMatch.index + cMatch[0].length,
        original: raw,
      });
    }
  }

  // 4. AADHAAR (12 digits, groups of 4, first digit 2-9)
  const aadhaarRegex = /\b[2-9]\d{3}[ -]\d{4}[ -]\d{4}(?![ -]?\d)\b/g;
  let adMatch: RegExpExecArray | null;
  while ((adMatch = aadhaarRegex.exec(text)) !== null) {
    matches.push({
      type: "AADHAAR",
      start: adMatch.index,
      end: adMatch.index + adMatch[0].length,
      original: adMatch[0],
    });
  }

  // 5. PAN (5 uppercase letters, 4 digits, 1 uppercase letter)
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
  let panMatch: RegExpExecArray | null;
  while ((panMatch = panRegex.exec(text)) !== null) {
    matches.push({
      type: "PAN",
      start: panMatch.index,
      end: panMatch.index + panMatch[0].length,
      original: panMatch[0],
    });
  }

  // 6. PHONE
  // Indian mobiles: 10 digits starting 6-9, optional +91 or 91
  const indianPhoneRegex = /(?:(?:\+91|91)[ -]?)?[6-9]\d{4}[ -]?\d{5}\b/g;
  let iPhoneMatch: RegExpExecArray | null;
  while ((iPhoneMatch = indianPhoneRegex.exec(text)) !== null) {
    matches.push({
      type: "PHONE",
      start: iPhoneMatch.index,
      end: iPhoneMatch.index + iPhoneMatch[0].length,
      original: iPhoneMatch[0],
    });
  }

  // International phone: starting with +, 10-13 total digits
  const intlPhoneRegex = /\+\d{1,3}[ -]?(?:\d[ -]?){9,12}\b/g;
  let intlMatch: RegExpExecArray | null;
  while ((intlMatch = intlPhoneRegex.exec(text)) !== null) {
    // Avoid matching if digits count outside 10..15
    const digitsOnly = intlMatch[0].replace(/\D/g, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      matches.push({
        type: "PHONE",
        start: intlMatch.index,
        end: intlMatch.index + intlMatch[0].length,
        original: intlMatch[0],
      });
    }
  }

  // 7. UPI (e.g. user@okhdfcbank, user@ybl, user@upi - no dot in bank handle)
  const upiRegex = /\b[a-zA-Z0-9.\-_]{2,64}@(okhdfcbank|oksbi|okaxis|okicici|ybl|ibl|axl|paytm|upi|apl|barodampay|federal|idfcbank|[a-zA-Z]{3,15})\b/gi;
  let uMatch: RegExpExecArray | null;
  while ((uMatch = upiRegex.exec(text)) !== null) {
    const handle = uMatch[0];
    const domainPart = handle.split("@")[1] || "";
    // UPI handles do NOT contain dots in the bank domain
    if (!domainPart.includes(".")) {
      matches.push({
        type: "UPI",
        start: uMatch.index,
        end: uMatch.index + handle.length,
        original: handle,
      });
    }
  }

  // 8. DOB (date near words dob, date of birth, born on)
  const dobRegex = /(?:\b(?:dob|date of birth|born on)(?:\s+is|\s*[:\-])?\s*)(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/gi;
  let dobMatch: RegExpExecArray | null;
  while ((dobMatch = dobRegex.exec(text)) !== null) {
    const dateVal = dobMatch[1];
    const startIdx = dobMatch.index + dobMatch[0].indexOf(dateVal);
    matches.push({
      type: "DOB",
      start: startIdx,
      end: startIdx + dateVal.length,
      original: dateVal,
    });
  }

  // 9. NAME (heuristic, browser only)
  // (a) Honorific + 1-2 capitalized words
  const honorificPattern = new RegExp(
    `\\b(?:${HONORIFICS.join("|")})\\.?\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`,
    "gi"
  );
  let hMatch: RegExpExecArray | null;
  while ((hMatch = honorificPattern.exec(text)) !== null) {
    const fullMatch = hMatch[0];
    matches.push({
      type: "NAME",
      start: hMatch.index,
      end: hMatch.index + fullMatch.length,
      original: fullMatch,
    });
  }

  // (b) Intro phrases: "my name is", "i am", "call me", etc. followed by 1-2 capitalized words
  for (const cue of INTRO_CUES) {
    const cueRegex = new RegExp(
      `${cue}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`,
      "gi"
    );
    let cMatch2: RegExpExecArray | null;
    while ((cMatch2 = cueRegex.exec(text)) !== null) {
      const nameCandidate = cMatch2[1];
      const firstWord = nameCandidate.split(/\s+/)[0].toLowerCase();
      if (!NON_NAME_STOPLIST.has(firstWord)) {
        const startIdx = cMatch2.index + cMatch2[0].indexOf(nameCandidate);
        matches.push({
          type: "NAME",
          start: startIdx,
          end: startIdx + nameCandidate.length,
          original: nameCandidate,
        });
      }
    }
  }

  // (c) Built-in gazetteer of common names
  const wordsRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
  let wMatch: RegExpExecArray | null;
  while ((wMatch = wordsRegex.exec(text)) !== null) {
    const fullWord = wMatch[0];
    const firstName = fullWord.split(/\s+/)[0].toLowerCase();
    if (COMMON_NAMES.has(firstName)) {
      matches.push({
        type: "NAME",
        start: wMatch.index,
        end: wMatch.index + fullWord.length,
        original: fullWord,
      });
    }
  }

  // Resolve overlaps:
  // Priority order: API_KEY, EMAIL, CARD, AADHAAR, PAN, PHONE, UPI, DOB, NAME
  // When overlaps occur: higher priority wins; if equal priority, longer match wins.
  matches.sort((a, b) => {
    const prioA = PII_PRIORITY[a.type];
    const prioB = PII_PRIORITY[b.type];
    if (prioA !== prioB) return prioB - prioA;
    const lenA = a.end - a.start;
    const lenB = b.end - b.start;
    if (lenA !== lenB) return lenB - lenA;
    return a.start - b.start;
  });

  const accepted: RawMatch[] = [];
  for (const m of matches) {
    const overlaps = accepted.some(
      (acc) => Math.max(m.start, acc.start) < Math.min(m.end, acc.end)
    );
    if (!overlaps) {
      accepted.push(m);
    }
  }

  accepted.sort((a, b) => a.start - b.start);
  return accepted;
}

/**
 * Normalizes values for session mapping.
 * Real value normalization: trimmed, lower-cased for EMAIL, spaces/dashes removed for PHONE and CARD.
 */
export function normalizeValue(type: PiiType, value: string): string {
  const trimmed = value.trim();
  if (type === "EMAIL") {
    return trimmed.toLowerCase();
  }
  if (type === "PHONE" || type === "CARD") {
    return trimmed.replace(/[\s-]/g, "");
  }
  return trimmed;
}
