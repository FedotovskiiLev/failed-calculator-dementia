import test from "node:test";
import assert from "node:assert/strict";

import {
  activeWord,
  searchCommands
} from "../js/ux/command-catalog.js";

import {
  buildActions
} from "../js/ux/result-actions.js";

test("autocomplete discovers matrix workbench commands", () => {
  const names =
    searchCommands("determ").map(
      item => item.name
    );

  assert.ok(names.includes("det"));
});

test("autocomplete discovers linear systems", () => {
  const names =
    searchCommands("linear system").map(
      item => item.name
    );

  assert.ok(names.includes("linsolve"));
});

test("activeWord still extracts ordinary prefixes", () => {
  assert.equal(
    activeWord("sin(x) + inv"),
    "inv"
  );
});

test("result actions offer Taylor series", () => {
  const keys =
    buildActions("sin(x)").map(
      action => action.key
    );

  assert.ok(keys.includes("taylor"));
});

test("workbench commands are not recursively wrapped", () => {
  assert.deepEqual(
    buildActions("det([[1,2],[3,4]])"),
    []
  );
});
