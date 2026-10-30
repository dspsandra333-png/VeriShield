import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson } from "../src/utils/canonicalJson.js";

test("canonicalJson produces identical strings regardless of object key insertion order", () => {
  const obj1 = {
    z: 10,
    a: "first",
    m: {
      deepZ: true,
      deepA: "nested",
    },
    list: [3, 2, 1],
  };

  const obj2 = {
    a: "first",
    list: [3, 2, 1],
    m: {
      deepA: "nested",
      deepZ: true,
    },
    z: 10,
  };

  assert.equal(canonicalJson(obj1), canonicalJson(obj2));
});

test("canonicalJson preserves array order", () => {
  const arr1 = ["z", "a", "m"];
  const arr2 = ["a", "m", "z"];
  assert.notEqual(canonicalJson(arr1), canonicalJson(arr2));
});

