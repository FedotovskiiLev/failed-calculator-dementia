import test from "node:test";
import assert from "node:assert/strict";

import {
  bracketStatus,
  prettyMathPreview
} from "../js/ux/math-input.js";

test("balanced parentheses pass", () => {
  assert.equal(
    bracketStatus("(x+1)^2").ok,
    true
  );
});

test("mismatched brackets fail", () => {
  assert.equal(
    bracketStatus("[1,2)").ok,
    false
  );
});

test("pretty preview replaces common notation", () => {
  assert.equal(
    prettyMathPreview("sqrt(x^2)+pi"),
    "√(x²)+π"
  );
});
