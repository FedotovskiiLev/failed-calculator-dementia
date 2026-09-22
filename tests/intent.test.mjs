import test from "node:test";
import assert from "node:assert/strict";
import { detectIntent, suggestedActions } from "../js/ux/intent-core.js";

test("equation is detected", () => {
  const result = detectIntent("x^2=2");
  assert.equal(result.type, "equation");
  assert.equal(result.variable, "x");
});

test("matrix literal is detected", () => {
  assert.equal(detectIntent("[[1,2],[3,4]]").type, "matrix");
});

test("data vector is detected", () => {
  assert.equal(detectIntent("[1,2,3,4]").type, "data");
});

test("function expression gets plot suggestion", () => {
  const keys = suggestedActions("sin(x)+x").map(item => item.key);
  assert.ok(keys.includes("plot"));
  assert.ok(keys.includes("diff"));
});
