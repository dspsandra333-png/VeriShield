import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  verifyReceiptChainPure,
  PureReceiptRecord,
} from "../src/services/receiptChain.js";

test("Golden chain vector verifies correctly", () => {
  const url = new URL("../data/chain-vector.json", import.meta.url);
  const raw = fs.readFileSync(url, "utf-8");
  const chain = JSON.parse(raw) as PureReceiptRecord[];

  const result = verifyReceiptChainPure(chain);
  assert.equal(result.valid, true);
  assert.equal(result.checked, 6);
  assert.equal(result.broken_at_seq, null);
  assert.equal(result.head_seq, 6);
});

test("Editing a field breaks verification at the tampered sequence", () => {
  const url = new URL("../data/chain-vector.json", import.meta.url);
  const raw = fs.readFileSync(url, "utf-8");
  const chain = JSON.parse(raw) as PureReceiptRecord[];

  // Tamper seq 3 explanation
  const tampered = JSON.parse(JSON.stringify(chain)) as PureReceiptRecord[];
  tampered[2].explanation = "Tampered explanation";

  const result = verifyReceiptChainPure(tampered);
  assert.equal(result.valid, false);
  assert.equal(result.broken_at_seq, 3);
});

test("Deleting a middle entry breaks contiguous sequence check", () => {
  const url = new URL("../data/chain-vector.json", import.meta.url);
  const raw = fs.readFileSync(url, "utf-8");
  const chain = JSON.parse(raw) as PureReceiptRecord[];

  // Remove seq 3
  const withDeleted = [...chain.slice(0, 2), ...chain.slice(3)];

  const result = verifyReceiptChainPure(withDeleted);
  assert.equal(result.valid, false);
  assert.equal(result.broken_at_seq, 4); // encountered seq 4 where seq 3 was expected
});

test("Altering prev_hash breaks hash link check", () => {
  const url = new URL("../data/chain-vector.json", import.meta.url);
  const raw = fs.readFileSync(url, "utf-8");
  const chain = JSON.parse(raw) as PureReceiptRecord[];

  const tampered = JSON.parse(JSON.stringify(chain)) as PureReceiptRecord[];
  tampered[3].prev_hash = "1".repeat(64);

  const result = verifyReceiptChainPure(tampered);
  assert.equal(result.valid, false);
  assert.equal(result.broken_at_seq, 4);
});

test("Anchor verification detects deleted latest entry", () => {
  const url = new URL("../data/chain-vector.json", import.meta.url);
  const raw = fs.readFileSync(url, "utf-8");
  const chain = JSON.parse(raw) as PureReceiptRecord[];

  // Anchor to head (seq 6)
  const headAnchor = { seq: 6, hash: chain[5].entry_hash };

  // Valid when full chain present
  const validRes = verifyReceiptChainPure(chain, headAnchor);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.anchorOk, true);

  // If latest entry (seq 6) was deleted from database
  const truncatedChain = chain.slice(0, 5);
  const failRes = verifyReceiptChainPure(truncatedChain, headAnchor);
  assert.equal(failRes.valid, false);
  assert.equal(failRes.anchorOk, false);
});
