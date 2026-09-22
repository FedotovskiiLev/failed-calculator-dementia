import test from "node:test";
import assert from "node:assert/strict";

import {
  activeWord,
  searchCommands
} from "../js/ux/command-catalog.js";
import {
  readDementiaEnabled,
  writeDementiaEnabled
} from "../js/ux/dementia-controls.js";
import {
  readThinkingCompact
} from "../js/ux/thinking-controls.js";
import {
  buildActions
} from "../js/ux/result-actions.js";
import {
  diagnoseInput
} from "../js/ux/error-help.js";

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); }
  };
}

test("autocomplete finds functions by prefix", () => {
  const names = searchCommands("sq").map(item => item.name);
  assert.ok(names.includes("sqrt"));
});

test("autocomplete searches English descriptions", () => {
  const names = searchCommands("derivative").map(item => item.name);
  assert.ok(names.some(name => name.startsWith("diff")));
});

test("autocomplete searches Russian descriptions", () => {
  const names = searchCommands("градиент").map(item => item.name);
  assert.ok(names.includes("gradient"));
});

test("activeWord extracts the current command prefix", () => {
  assert.equal(activeWord("2 + sq"), "sq");
  assert.equal(activeWord("sin(x) + gra"), "gra");
});

test("dementia is enabled by default", () => {
  assert.equal(readDementiaEnabled(storage()), true);
});

test("dementia preference round-trips", () => {
  const store = storage();
  writeDementiaEnabled(false, store);
  assert.equal(readDementiaEnabled(store), false);
  writeDementiaEnabled(true, store);
  assert.equal(readDementiaEnabled(store), true);
});

test("thinking trace is compact by default", () => {
  assert.equal(readThinkingCompact(storage()), true);
});

test("result actions suggest calculus for expressions in x", () => {
  const keys = buildActions("x^2+1").map(action => action.key);
  assert.ok(keys.includes("diff"));
  assert.ok(keys.includes("plot"));
  assert.ok(keys.includes("factor"));
  assert.ok(keys.includes("roots"));
});

test("result actions do not recursively wrap existing CAS commands", () => {
  assert.deepEqual(buildActions("factor(x^2-1,x)"), []);
});

test("error helper detects missing parenthesis", () => {
  const tips = diagnoseInput("sin(x");
  assert.ok(tips.some(tip => /скоб|parenthesis/i.test(`${tip.ru} ${tip.en}`)));
});

test("error helper suggests tan for tg", () => {
  const tips = diagnoseInput("tg(x)");
  assert.ok(tips.some(tip => /tan/.test(tip.en)));
});

test("error helper recognizes equation syntax", () => {
  const tips = diagnoseInput("x^2=2");
  assert.ok(tips.some(tip => /solve/.test(tip.en)));
});
