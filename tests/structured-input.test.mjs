import test from "node:test";
import assert from "node:assert/strict";

import {
  SLOT,
  findNextSlot,
  fractionTransform,
  hasSlots,
  powerTransform,
  trailingAtomRange
} from "../js/ux/structured-input-core.js";

test("trailing atom captures function call", () => {
  const source = "2+sin(x)";
  assert.deepEqual(
    trailingAtomRange(source, source.length),
    { start:2, end:8 }
  );
});

test("slash transforms previous atom into fraction", () => {
  const result = fractionTransform("2+x", 3, 3);
  assert.equal(result.value, `2+(x)/(${SLOT})`);
  assert.equal(
    result.value.slice(result.selectionStart, result.selectionEnd),
    SLOT
  );
});

test("slash wraps selected numerator", () => {
  const result = fractionTransform("abc", 0, 3);
  assert.equal(result.value, `(abc)/(${SLOT})`);
});

test("power creates an exponent slot", () => {
  const result = powerTransform("x", 1, 1);
  assert.equal(result.value, `x^(${SLOT})`);
});

test("Tab slot search wraps", () => {
  const value = `${SLOT}+x+${SLOT}`;
  assert.deepEqual(
    findNextSlot(value, value.length, 1),
    { start:0, end:1 }
  );
});

test("slot detection", () => {
  assert.equal(hasSlots(`sqrt(${SLOT})`), true);
  assert.equal(hasSlots("sqrt(x)"), false);
});
