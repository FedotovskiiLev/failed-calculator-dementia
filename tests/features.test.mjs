import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  applySnapshot,
  createSnapshot,
  validateSnapshot
} from "../js/brain-transfer.js";
import { parseHistory } from "../js/history.js";

function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    dump() { return Object.fromEntries(data); }
  };
}

test("history parser tolerates broken storage", () => {
  assert.deepEqual(parseHistory("not json"), []);
  assert.deepEqual(parseHistory("{}"), []);
});

test("history parser keeps expression entries", () => {
  const parsed = parseHistory(JSON.stringify([
    { source: "2+2", resultText: "2+2 = 4" },
    { nope: true }
  ]));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].source, "2+2");
});

test("brain snapshots validate and round-trip", () => {
  const session = storage({
    "failed-calculator-brain-v4": JSON.stringify({ version: 4, concepts: {} }),
    "failed-calculator-observer-log-v4": "[]",
    "failed-calculator-stats-v4": "[]",
    "failed-calculator-expression-history-v1": JSON.stringify([{ source: "e+1" }])
  });
  const local = storage({ "failed-calculator-language": "en" });

  const snapshot = createSnapshot(session, local);
  assert.equal(validateSnapshot(snapshot), true);

  const restoredSession = storage();
  const restoredLocal = storage();
  applySnapshot(snapshot, restoredSession, restoredLocal);

  const dump = restoredSession.dump();
  assert.match(dump["failed-calculator-brain-v4"], /"version":4/);
  assert.match(dump["failed-calculator-expression-history-v1"], /e\+1/);
  assert.equal(restoredLocal.getItem("failed-calculator-language"), "en");
});

test("brain snapshot validation rejects incompatible input", () => {
  assert.equal(validateSnapshot(null), false);
  assert.equal(validateSnapshot({ format: "something-else", version: 1, state: {} }), false);
  assert.equal(validateSnapshot({
    format: "failed-calculator-brain-snapshot",
    version: 99,
    state: {}
  }), false);
});

test("index loads the production feature layer", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /features\.css/);
  assert.match(html, /type="module" src="js\/features\.js"/);
});
