import fs from "node:fs";
import vm from "node:vm";
import { performance } from "node:perf_hooks";

const APP_URL = new URL("../app.js", import.meta.url);
const CUT_MARKER =
  "/* ----------------------------- dementia ---------------------------- */";

function storage() {
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
}

function elementStub() {
  return {
    appendChild() {},
    addEventListener() {},
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
}

function documentStub() {
  const thinking = elementStub();
  return {
    getElementById(id) {
      return id === "thinking" ? thinking : elementStub();
    },
    createElement() {
      return elementStub();
    },
    querySelectorAll() {
      return [];
    }
  };
}

export function loadRuntime() {
  const source = fs.readFileSync(APP_URL, "utf8");
  const cut = source.indexOf(CUT_MARKER);

  if (cut === -1) {
    throw new Error("Could not find the test cut marker in app.js");
  }

  const context = vm.createContext({
    console,
    performance,
    localStorage: storage(),
    sessionStorage: storage(),
    document: documentStub(),
    setTimeout,
    clearTimeout
  });

  const prefix = source.slice(0, cut);

  const instrumented = `${prefix}

/* Test-only exports. Never written into production app.js. */
function escapeHtml(value) { return String(value); }

globalThis.__FCD_TEST__ = {
  Complex,
  tokenize,
  Parser,
  normalize,
  qPi,
  qE,
  qLnPositive,
  qAtanReal,
  qRoot,
  qPow,
  qFactorial,
  qGcd,
  qNcr,
  qNpr,
  qElementary,
  researchComplexCore,
  beginRun,
  deriveE,
  makeConcept,
  brain,
  getActiveRun: () => activeRun,
  N,
  V,
  B,
  U,
  C,
  simplifyAst,
  astString,
  diffAst,
  antiAst,
  freeVariables,
  evalResearch
};
})();`;

  vm.runInContext(instrumented, context, {
    filename: "app.test-runtime.js",
    timeout: 10_000
  });

  if (!context.__FCD_TEST__) {
    throw new Error("Test exports were not created");
  }

  return context.__FCD_TEST__;
}

export function near(actual, expected, epsilon, label = "value") {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(
      `${label}: expected ${expected} ± ${epsilon}, got ${actual}`
    );
  }
}

export function complexPow(z, n) {
  let re = 1;
  let im = 0;

  for (let i = 0; i < n; i++) {
    const nextRe = re * z.re - im * z.im;
    const nextIm = re * z.im + im * z.re;
    re = nextRe;
    im = nextIm;
  }

  return { re, im };
}
