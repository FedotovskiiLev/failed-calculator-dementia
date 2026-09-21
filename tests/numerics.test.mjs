import test from "node:test";
import assert from "node:assert/strict";
import { loadRuntime, near, complexPow } from "./runtime-harness.mjs";

const api = loadRuntime();

test("pi approximation stays close to Math.PI", () => {
  near(api.qPi(), Math.PI, 2e-5, "qPi()");
});

test("quiet e approximation stays close to Math.E", () => {
  near(api.qE(), Math.E, 1e-9, "qE()");
});

test("logarithm range reduction handles ordinary and large inputs", () => {
  near(api.qLnPositive(1), 0, 1e-12, "ln(1)");
  near(api.qLnPositive(10), Math.log(10), 1e-10, "ln(10)");
  near(
    api.qLnPositive(100_000_000),
    Math.log(100_000_000),
    1e-9,
    "ln(1e8)"
  );
});

test("atan converges around x = 1", () => {
  near(api.qAtanReal(1), api.qPi() / 4, 1e-12, "atan(1)");
  near(api.qAtanReal(-1), -api.qPi() / 4, 1e-12, "atan(-1)");
});

test("principal square root of -16 is approximately 4i", () => {
  const result = api.qRoot(
    new api.Complex(-16, 0),
    new api.Complex(2, 0)
  );

  near(result.re, 0, 5e-4, "real part");
  near(result.im, 4, 5e-4, "imaginary part");
});

test("principal fourth root of -16 really raises back to -16", () => {
  const result = api.qRoot(
    new api.Complex(-16, 0),
    new api.Complex(4, 0)
  );
  const fourth = complexPow(result, 4);

  near(fourth.re, -16, 5e-3, "real part");
  near(fourth.im, 0, 5e-3, "imaginary residue");
});

test("odd root of a negative real remains real", () => {
  const result = api.qRoot(
    new api.Complex(-27, 0),
    new api.Complex(3, 0)
  );

  near(result.re, -3, 1e-10, "root(-27,3)");
  near(result.im, 0, 1e-10, "imaginary part");
});

test("negative-degree roots use the reciprocal", () => {
  const positive = api.qRoot(
    new api.Complex(16, 0),
    new api.Complex(2, 0)
  );
  const negative = api.qRoot(
    new api.Complex(16, 0),
    new api.Complex(-2, 0)
  );

  near(positive.re * negative.re, 1, 1e-9, "reciprocal relation");
});

test("factorial handles its supported integer domain", () => {
  assert.equal(api.qFactorial(0), 1);
  assert.equal(api.qFactorial(1), 1);
  assert.equal(api.qFactorial(5), 120);
  assert.ok(Number.isNaN(api.qFactorial(-1)));
});

test("discrete helpers return known values", () => {
  assert.equal(api.qGcd(84, 30), 6);
  assert.equal(api.qNcr(10, 3), 120);
  assert.equal(api.qNpr(10, 3), 720);
});

test("elementary log with an explicit base uses the same engine", () => {
  const value = api.qElementary("log", [
    new api.Complex(8, 0),
    new api.Complex(2, 0)
  ]);
  near(value.re, 3, 1e-9, "log(8,2)");
});

test("local e bailout leaves budget for the outer expression", async () => {
  api.brain.concepts = {};
  for (const id of ["e", "fact", "mul"]) {
    api.brain.concepts[id] = api.makeConcept(id);
  }

  api.beginRun("e + 1");
  const e = await api.deriveE();
  const run = api.getActiveRun();

  assert.ok(Number.isFinite(e));
  assert.ok(e > 2.7 && e < 2.72);
  assert.ok(run.steps < 160_000);

  near(e + 1, 3.71827876984127, 2e-6, "e + 1");
});
