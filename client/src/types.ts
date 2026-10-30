export type PiiType =
  | "API_KEY"
  | "EMAIL"
  | "PHONE"
  | "CARD"
  | "AADHAAR"
  | "PAN"
  | "UPI"
  | "DOB"
  | "NAME";

export type Decision = "allow" | "warn" | "block";

export type ReceiptAction =
  | "ALLOWED"
  | "REDACTED"
  | "WARNED"
  | "BLOCKED"
  | "OVERRIDDEN"
  | "OUTPUT_BLOCKED"
  | "OUTPUT_REDACTED"
  | "AI_UNAVAILABLE";

export type ReceiptStage = "input" | "output" | "system";

export type ConfirmMode = "none" | "warn_accepted" | "block_override";

export type SimulateLeak = "none" | "secret" | "pii";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
  user: AuthUser;
}

export interface Receipt {
  id: string;
  user_id: string;
  seq: number;
  ts: string;
  stage: ReceiptStage;
  action: ReceiptAction;
  risk_score: number;
  categories: Record<string, number>;
  matched_rules: string[];
  explanation: string;
  overridden: boolean;
  prev_hash: string;
  entry_hash: string;
  demo_tampered: boolean;
  created_at: string;
}

export interface RuleInfo {
  id: string;
  label: string;
}

export interface PreviewResponse {
  decision: Decision;
  risk_score: number;
  rulesScore: number;
  llmScore: number | null;
  llmReason: string | null;
  llmAvailable: boolean;
  matchedRules: RuleInfo[];
  placeholderCounts: Record<string, number>;
  residual: { secrets: number; personal: number };
  receiptId: string | null;
}

export interface ChatResponse {
  reply: string;
  decision: Decision;
  risk_score: number;
  inputReceipt: Receipt;
  outputReceipt: Receipt | null;
  outputAction: "clean" | "blocked" | "redacted";
  model: string;
}

export interface VerifyResponse {
  valid: boolean;
  checked: number;
  broken_at_seq: number | null;
  reason: string | null;
  head_hash: string | null;
  head_seq: number;
  anchorOk: boolean | null;
}

export interface StatsResponse {
  total: number;
  byAction: Record<ReceiptAction, number>;
  itemsMasked: number;
  avgRisk: number;
  demoMode: boolean;
}

export interface EvalResult {
  mode: "rules" | "hybrid";
  attack_total: number;
  attack_detected: number;
  normal_total: number;
  false_alarms: number;
  detection_rate: number;
  false_alarm_rate: number;
  pii_recall: number | null;
  llm_calls_ok: number;
  llm_calls_failed: number;
  missed: string[];
  false_alarm_items: string[];
  created_at: string;
}

export interface DetectedItem {
  type: PiiType;
  placeholder: string;
  start: number;
  end: number;
  original: string;
  optional: boolean;
}

