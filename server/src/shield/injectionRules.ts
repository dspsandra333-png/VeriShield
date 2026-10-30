export interface InjectionRule {
  id: string;
  weight: number;
  label: string;
  match: (text: string) => boolean;
}

export const RULE_LABELS: Record<string, string> = {
  "instruction-override": "instruction-override pattern",
  "system-prompt-extraction": "attempt to extract hidden instructions",
  "jailbreak-persona": "jailbreak persona",
  "disable-safety": "request to disable safety rules",
  "fake-system-delimiter": "fake system markup",
  "encoded-payload": "encoded hidden instructions",
  "data-exfiltration": "data-exfiltration instruction",
  "multilingual-override": "instruction override in another language",
  "secret-fishing": "attempt to obtain secrets",
  "authority-claim": "false authority claim",
  "roleplay-override": "role-play override",
  "secret-in-message": "secret left in message",
  "personal-data-missed": "personal data left unmasked",
  "ai-classifier": "AI classifier",
};

export const INJECTION_RULES: InjectionRule[] = [
  // 1. instruction-override (weight 85)
  // ignore/disregard/forget/override/bypass + (all/any/the/your/my/these) + (previous/prior/above/earlier/system/initial/original) + (instructions/prompts/rules/directions/guidelines/context)
  // Must NOT match "ignore errors in Python" or "forget the previous commit"
  {
    id: "instruction-override",
    weight: 85,
    label: RULE_LABELS["instruction-override"],
    match: (text: string) => {
      const pattern = /\b(?:ignore|disregard|forget|override|bypass)\s+(?:(?:all|any|the|your|my|these)\s+)?(?:previous|prior|above|earlier|system|initial|original)\s+(?:instructions|prompts|rules|directions|guidelines|context)\b/i;
      return pattern.test(text);
    },
  },

  // 2. system-prompt-extraction (weight 80)
  // reveal/show/print/repeat/display/leak/output/tell me + your/the + system/hidden/initial/original/secret + prompt/instructions/message
  {
    id: "system-prompt-extraction",
    weight: 80,
    label: RULE_LABELS["system-prompt-extraction"],
    match: (text: string) => {
      const pattern = /\b(?:reveal|show|print|repeat|display|leak|output|tell\s+me)\s+(?:(?:all|the|your)\s+)?(?:system|hidden|initial|original|secret)\s+(?:prompt|instructions|message)\b/i;
      const patternAlt = /\b(?:what\s+is|give\s+me)\s+(?:your|the)\s+(?:system|hidden|initial|original|secret)\s+(?:prompt|instructions)\b/i;
      return pattern.test(text) || patternAlt.test(text);
    },
  },

  // 3. jailbreak-persona (weight 70)
  // "do anything now", "developer mode", jailbreak, "no restrictions/filters/limits/rules", unfiltered, uncensored, "without any restrictions", exact uppercase DAN
  {
    id: "jailbreak-persona",
    weight: 70,
    label: RULE_LABELS["jailbreak-persona"],
    match: (text: string) => {
      if (/\bDAN\b/.test(text)) return true;
      const lower = text.toLowerCase();
      if (lower.includes("do anything now")) return true;
      if (lower.includes("developer mode")) return true;
      if (lower.includes("jailbreak")) return true;
      if (lower.includes("unfiltered") || lower.includes("uncensored")) return true;
      if (lower.includes("without any restrictions") || lower.includes("without any filters")) return true;
      if (/\bno\s+(?:restrictions|filters|limits|rules)\b/i.test(text)) return true;
      return false;
    },
  },

  // 4. disable-safety (weight 70)
  // "disable your safety", "do not follow your guidelines", "turn off your filters", "bypass your safety filters"
  {
    id: "disable-safety",
    weight: 70,
    label: RULE_LABELS["disable-safety"],
    match: (text: string) => {
      const patterns = [
        /\bdisable\s+(?:your\s+)?(?:safety|security|filters)\b/i,
        /\bdo\s+not\s+follow\s+(?:your\s+)?(?:guidelines|rules|instructions)\b/i,
        /\bturn\s+off\s+(?:your\s+)?(?:filters|safety|guardrails)\b/i,
        /\bbypass\s+(?:your\s+)?(?:safety|content)\s+filters\b/i,
      ];
      return patterns.some((p) => p.test(text));
    },
  },

  // 5. fake-system-delimiter (weight 65)
  // [SYSTEM], [INST], <|system|>, <|im_start|>, "### System", "### Instructions", </system>
  {
    id: "fake-system-delimiter",
    weight: 65,
    label: RULE_LABELS["fake-system-delimiter"],
    match: (text: string) => {
      const delimiters = [
        /\[SYSTEM\]/i,
        /\[INST\]/i,
        /<\|system\|>/i,
        /<\|im_start\|>/i,
        /###\s*System/i,
        /###\s*Instructions/i,
        /<\/system>/i,
        /<system>/i,
      ];
      return delimiters.some((d) => d.test(text));
    },
  },

  // 6. encoded-payload (weight 60)
  // Base64-looking string of 60+ characters near words like decode, execute, follow, run
  {
    id: "encoded-payload",
    weight: 60,
    label: RULE_LABELS["encoded-payload"],
    match: (text: string) => {
      const hasActionWord = /\b(?:decode|execute|follow|run|eval|decrypt|interpret)\b/i.test(text);
      if (!hasActionWord) return false;
      const b64Pattern = /[A-Za-z0-9+/=]{60,}/;
      return b64Pattern.test(text);
    },
  },

  // 7. data-exfiltration (weight 60)
  // send/post/upload/email/forward + something + to + an http(s) URL; or markdown images with query string
  {
    id: "data-exfiltration",
    weight: 60,
    label: RULE_LABELS["data-exfiltration"],
    match: (text: string) => {
      // Exfiltration pattern
      const exfilPattern = /\b(?:send|post|upload|email|forward)\b.*?\bto\b.*?\bhttps?:\/\/[^\s]+/i;
      // Markdown image with query string
      const mdImgPattern = /!\[.*?\]\(https?:\/\/[^)]+\?[^)]+\)/i;
      return exfilPattern.test(text) || mdImgPattern.test(text);
    },
  },

  // 8. multilingual-override (weight 80)
  // Spanish, French, German, Hindi in Latin letters
  {
    id: "multilingual-override",
    weight: 80,
    label: RULE_LABELS["multilingual-override"],
    match: (text: string) => {
      const patterns = [
        /ignora\s+(?:las\s+)?instrucciones\s+anteriores/i,
        /ignorez\s+(?:les\s+)?instructions\s+pr[eé]c[eé]dentes/i,
        /ignoriere\s+(?:alle\s+)?(?:vorherigen\s+)?anweisungen/i,
        /pichle\s+nirdesh\s+ignore\s+karo/i,
        /puraane\s+nirdesh\s+bhool\s+jao/i,
        /oubliez\s+les\s+instructions/i,
      ];
      return patterns.some((p) => p.test(text));
    },
  },

  // 9. secret-fishing (weight 55)
  // reveal/give/show/list + api keys, passwords, secrets, tokens, credentials
  {
    id: "secret-fishing",
    weight: 55,
    label: RULE_LABELS["secret-fishing"],
    match: (text: string) => {
      const pattern1 = /\b(?:reveal|give|show|list|dump|print)\s+(?:me\s+)?(?:the\s+)?(?:all\s+)?(?:api[_\-\s]?keys?|passwords?|secrets?|tokens?|credentials?)\b/i;
      const pattern2 = /\b(?:api[_\-\s]?keys?|passwords?|secrets?|tokens?|credentials?)\b.*?\b(?:reveal|show|give|list|dump)\b/i;
      return pattern1.test(text) || pattern2.test(text);
    },
  },

  // 10. authority-claim (weight 50)
  // "I am the admin/developer/owner", "authorized to bypass", "this is a system override"
  {
    id: "authority-claim",
    weight: 50,
    label: RULE_LABELS["authority-claim"],
    match: (text: string) => {
      const patterns = [
        /\bi\s+am\s+(?:the\s+)?(?:admin|administrator|developer|creator|owner)\b/i,
        /\bauthorized\s+to\s+bypass\b/i,
        /\bthis\s+is\s+a\s+(?:system|security)\s+override\b/i,
        /\bgranting\s+root\s+access\b/i,
      ];
      return patterns.some((p) => p.test(text));
    },
  },

  // 11. roleplay-override (weight 45)
  // "you are now", "from now on you", "pretend you are", "act as if you have no rules"
  {
    id: "roleplay-override",
    weight: 45,
    label: RULE_LABELS["roleplay-override"],
    match: (text: string) => {
      const patterns = [
        /\byou\s+are\s+now\b/i,
        /\bfrom\s+now\s+on\s+you\b/i,
        /\bpretend\s+(?:that\s+)?you\s+are\b/i,
        /\bact\s+as\s+if\s+you\s+have\s+no\s+(?:rules|restrictions|limits)\b/i,
      ];
      return patterns.some((p) => p.test(text));
    },
  },
];

export function evaluateRules(text: string): { rulesScore: number; matchedRules: string[] } {
  const matched: InjectionRule[] = [];

  for (const rule of INJECTION_RULES) {
    if (rule.match(text)) {
      matched.push(rule);
    }
  }

  if (matched.length === 0) {
    return { rulesScore: 0, matchedRules: [] };
  }

  const highestWeight = Math.max(...matched.map((r) => r.weight));
  const additionalCount = matched.length - 1;
  const rawScore = highestWeight + additionalCount * 10;
  const rulesScore = Math.min(100, rawScore);

  return {
    rulesScore,
    matchedRules: matched.map((r) => r.id),
  };
}

