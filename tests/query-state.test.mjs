import test from "node:test";
import assert from "node:assert/strict";

import {
  queryFromUrl
} from "../js/ux/query-state.js";

test("queryFromUrl reads q parameter", () => {
  const url =
    new URL(
      "https://example.test/?q=x%5E2%2B1"
    );

  assert.equal(
    queryFromUrl(url),
    "x^2+1"
  );
});
