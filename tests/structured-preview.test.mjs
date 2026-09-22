import test from "node:test";
import assert from "node:assert/strict";

import {
  structuredPreviewHtml
} from "../js/ux/structured-preview.js";

test("preview formats explicit fraction", () => {
  const html = structuredPreviewHtml("(a)/(b)");
  assert.match(html, /structured-frac/);
  assert.match(html, /structured-num/);
  assert.match(html, /structured-den/);
});

test("preview formats powers", () => {
  const html = structuredPreviewHtml("x^(2)");
  assert.match(html, /structured-power/);
});

test("preview escapes HTML input", () => {
  const html = structuredPreviewHtml("<img>");
  assert.doesNotMatch(html, /<img>/);
  assert.match(html, /&lt;img&gt;/);
});
