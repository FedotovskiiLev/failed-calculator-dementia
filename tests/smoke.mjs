import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";

const appUrl = new URL("../app.js", import.meta.url);
const source = fs.readFileSync(appUrl, "utf8");

const CUT_MARKER =
  "/* ----------------------------- dementia ---------------------------- */";

const cut = source.indexOf(CUT_MARKER);
assert.notEqual(cut, -1, "Could not find the test cut marker in app.js");

const storage = () => {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(String(key)) ? data.get(String(key)) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(String(key));
    },
    clear() {
      data.clear();
    }
  };
};

const thinkingBox = {
  appendChild() {},
  scrollTop: 0,
  scrollHeight: 0
};

const documentStub = {
  getElementById(id) {
    if (id === "thinking") return thinkingBox;
    return {
      appendChild() {},
      classList: { add() {}, remove() {}, toggle() {} },
      style: {},
      dataset: {},
      textContent: "",
      innerHTML: "",
      value: "",
      disabled: false,
      scrollTop: 0,
      scrollHeight: 0
    };
  },
  createElement() {
    return {
      className: "",
      innerHTML: "",
      style: {},
      dataset: {}
    };
  },
  querySelectorAll() {
    return [];
  }
};

const context = vm.createContext({
  console,
  performance,
  localStorage: storage(),
  sessionStorage: storage(),
  document: documentStub,
  setTimeout,
  clearTimeout
});

const prefix = source.slice(0, cut);

const instrumented = `${prefix}

/* Test-only exports. This code exists only inside the VM created by
   tests/smoke.mjs and is never written back into app.js. */
function escapeHtml(value) { return String(value); }

globalThis.__FCD_TEST__ = {
  Complex,
  tokenize,
  Parser,
  qPi,
  qE,
  qLnPositive,
  qAtanReal,
  qRoot,
  qPow,
  beginRun,
  deriveE,
  makeConcept,
  brain,
  getActiveRun: () => activeRun
};
})();`;

vm.runInContext(instrumented, context, {
  filename: "app.test-runtime.js",
  timeout: 10_000
});

const api = context.__FCD_TEST__;
assert.ok(api, "Test exports were not created");

const near = (actual, expected, epsilon, label) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${label}: expected ${expected} ± ${epsilon}, got ${actual}`
  );
};

const complexPow = (z, n) => {
  let out = { re: 1, im: 0 };
  for (let i = 0; i < n; i++) {
    out = {
      re: out.re * z.re - out.im * z.im,
      im: out.re * z.im + out.im * z.re
    };
  }
  return out;
};

console.log("parser: implicit multiplication");
{
  const ast = new api.Parser(api.tokenize("2(3+4)")).parse();
  assert.equal(ast.type, "binary");
  assert.equal(ast.op, "*");
}

console.log("parser: exponent binds tighter than unary minus");
{
  const ast = new api.Parser(api.tokenize("-2^2")).parse();
  assert.equal(ast.type, "unary");
  assert.equal(ast.op, "-");
  assert.equal(ast.arg.type, "binary");
  assert.equal(ast.arg.op, "^");
}

console.log("constants: pi and e approximations");
{
  near(api.qPi(), Math.PI, 2e-5, "qPi()");
  near(api.qE(), Math.E, 1e-9, "qE()");
}

console.log("logarithm: range reduction");
{
  near(api.qLnPositive(1), 0, 1e-12, "ln(1)");
  near(api.qLnPositive(10), Math.log(10), 1e-10, "ln(10)");
  near(
    api.qLnPositive(100_000_000),
    Math.log(100_000_000),
    1e-9,
    "ln(1e8)"
  );
}

console.log("atan: convergence near one");
{
  near(api.qAtanReal(1), api.qPi() / 4, 1e-12, "atan(1)");
  near(api.qAtanReal(-1), -api.qPi() / 4, 1e-12, "atan(-1)");
}

console.log("roots: negative real inputs");
{
  const r2 = api.qRoot(new api.Complex(-16, 0), new api.Complex(2, 0));
  near(r2.re, 0, 5e-4, "root(-16,2).re");
  near(r2.im, 4, 5e-4, "root(-16,2).im");

  const r4 = api.qRoot(new api.Complex(-16, 0), new api.Complex(4, 0));
  const fourth = complexPow(r4, 4);
  near(fourth.re, -16, 5e-3, "root(-16,4)^4.re");
  near(fourth.im, 0, 5e-3, "root(-16,4)^4.im");

  const r3 = api.qRoot(new api.Complex(-27, 0), new api.Complex(3, 0));
  near(r3.re, -3, 1e-10, "root(-27,3).re");
  near(r3.im, 0, 1e-10, "root(-27,3).im");
}

console.log("budget: e derivation bails out locally and returns an approximation");
{
  api.brain.concepts = {};
  for (const id of ["e", "fact", "mul"]) {
    api.brain.concepts[id] = api.makeConcept(id);
  }

  api.beginRun("e");
  const e = await api.deriveE();
  const run = api.getActiveRun();

  assert.ok(Number.isFinite(e), "deriveE() must return a finite approximation");
  assert.ok(e > 2.7 && e < 2.72, `deriveE() returned an implausible value: ${e}`);
  assert.ok(run.steps < 160_000, "local bailout must leave the run below the hard limit");

  // The point of the regression test: after deriveE() returns, the outer
  // expression still has a usable number and can keep evaluating.
  near(e + 1, 3.71827876984127, 2e-6, "e + 1 after local bailout");
}

console.log("all smoke tests passed");

// Let any already-created zero-delay timer callbacks flush before Node exits.
await delay(0);
