// NOTE: Keep patterns in sync with client/src/shield/detectors.ts
// server/src/shield/detectors.ts holds the SAME patterns for API_KEY, EMAIL, CARD, AADHAAR, PAN, PHONE, UPI (excluding NAME and DOB).

import type { PiiType } from "../types.js";

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

export interface ServerMatch {
  type: PiiType;
  start: number;
  end: number;
  original: string;
}

export function detectServerPii(text: string): ServerMatch[] {
  const matches: ServerMatch[] = [];

  // 1. API_KEY / Secrets
  const secretPatterns = [
    /AIza[0-9A-Za-z\-_]{35}/g,
    /sb_(?:secret|publishable)_[a-zA-Z0-9_\-]{20,}/g,
    /sk-[A-Za-z0-9_\-]{20,}/g,
    /sk_(?:live|test)_[A-Za-z0-9]{20,}/g,
    /(?:ghp|gho|ghs|ghu)_[a-zA-Z0-9]{36}/g,
    /github_pat_[a-zA-Z0-9_]{40,}/g,
    /\bAKIA[0-9A-Z]{16}\b/g,
    /xox[baprs]-[0-9a-zA-Z\-]{10,}/g,
    /eyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}/g,
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

  // 2. EMAIL
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

  // 3. CARD
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

  // 4. AADHAAR
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

  // 5. PAN
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

  const intlPhoneRegex = /\+\d{1,3}[ -]?(?:\d[ -]?){9,12}\b/g;
  let intlMatch: RegExpExecArray | null;
  while ((intlMatch = intlPhoneRegex.exec(text)) !== null) {
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

  // 7. UPI
  const upiRegex = /\b[a-zA-Z0-9.\-_]{2,64}@(okhdfcbank|oksbi|okaxis|okicici|ybl|ibl|axl|paytm|upi|apl|barodampay|federal|idfcbank|[a-zA-Z]{3,15})\b/gi;
  let uMatch: RegExpExecArray | null;
  while ((uMatch = upiRegex.exec(text)) !== null) {
    const handle = uMatch[0];
    const domainPart = handle.split("@")[1] || "";
    if (!domainPart.includes(".")) {
      matches.push({
        type: "UPI",
        start: uMatch.index,
        end: uMatch.index + handle.length,
        original: handle,
      });
    }
  }

  // Overlap resolution
  matches.sort((a, b) => {
    const prioA = PII_PRIORITY[a.type];
    const prioB = PII_PRIORITY[b.type];
    if (prioA !== prioB) return prioB - prioA;
    const lenA = a.end - a.start;
    const lenB = b.end - b.start;
    if (lenA !== lenB) return lenB - lenA;
    return a.start - b.start;
  });

  const accepted: ServerMatch[] = [];
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
