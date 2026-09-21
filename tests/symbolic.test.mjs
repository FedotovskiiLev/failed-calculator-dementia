import test from "node:test";
import assert from "node:assert/strict";
import { loadRuntime, near } from "./runtime-harness.mjs";

const api = loadRuntime();

const parse = source => new api.Parser(api.tokenize(source)).parse();

test("symbolic derivative of x^3 is 3*x^2 equivalent", () => {
  const derivative = api.simplifyAst(api.diffAst(parse("x^3"), "x"));
  const text = api.astString(derivative);

  assert.match(text, /3/);
  assert.match(text, /x \^ 2/);

  const value = api.evalResearch(derivative, {
    x: new api.Complex(2, 0)
  });
  near(value.re, 12, 1e-9, "d/dx x^3 at x=2");
});

test("symbolic derivative uses the product rule", () => {
  const derivative = api.simplifyAst(
    api.diffAst(parse("x*sin(x)"), "x")
  );

  const value = api.evalResearch(derivative, {
    x: new api.Complex(1, 0)
  });

  near(
    value.re,
    Math.sin(1) + Math.cos(1),
    2e-4,
    "product-rule derivative"
  );
});

test("symbolic derivative of ln(x) evaluates as 1/x", () => {
  const derivative = api.simplifyAst(
    api.diffAst(parse("ln(x)"), "x")
  );

  const value = api.evalResearch(derivative, {
    x: new api.Complex(4, 0)
  });

  near(value.re, 0.25, 1e-10, "d/dx ln(x)");
});

test("antiderivative engine recognizes x", () => {
  const anti = api.simplifyAst(api.antiAst(parse("x"), "x"));
  const text = api.astString(anti);

  assert.match(text, /x \^ 2/);
  assert.match(text, /\/ 2/);
});

test("antiderivative engine recognizes sin(x)", () => {
  const anti = api.simplifyAst(api.antiAst(parse("sin(x)"), "x"));
  assert.equal(api.astString(anti), "-cos(x)");
});

test("antiderivative engine recognizes exp(x)", () => {
  const anti = api.simplifyAst(api.antiAst(parse("exp(x)"), "x"));
  assert.equal(api.astString(anti), "exp(x)");
});

test("simplifier removes neutral additions and multiplications", () => {
  assert.equal(
    api.astString(api.simplifyAst(parse("x+0"))),
    "x"
  );
  assert.equal(
    api.astString(api.simplifyAst(parse("1*x"))),
    "x"
  );
});
