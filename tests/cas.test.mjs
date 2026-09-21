import test from "node:test";
import assert from "node:assert/strict";

import { print } from "../js/cas/ast.js";
import { parseExpression } from "../js/cas/parser.js";
import {
  differentiate,
  expand,
  factorPolynomial,
  polynomialDegree,
  simplify,
  substitute
} from "../js/cas/algebra.js";
import { executeCasCommand } from "../js/cas/commands.js";

test("CAS parser understands implicit multiplication", () => {
  assert.equal(print(parseExpression("3x^2")), "3 * x ^ 2");
});

test("simplify combines simple like terms", () => {
  const result = simplify(parseExpression("x+x+2x+0"));
  assert.equal(print(result), "4 * x");
});

test("expand distributes powers", () => {
  const result = expand(parseExpression("(x+1)^3"));
  const text = print(result);
  assert.match(text, /x \^ 3/);
  assert.match(text, /3 \* x \^ 2/);
  assert.match(text, /3 \* x/);
});

test("substitution replaces a symbol recursively", () => {
  const result = simplify(
    substitute(
      parseExpression("x^2+y"),
      "x",
      parseExpression("3")
    )
  );
  assert.ok(["9 + y", "y + 9"].includes(print(result)));
});

test("symbolic differentiation handles products", () => {
  const result = simplify(
    differentiate(parseExpression("x*sin(x)"), "x")
  );
  const text = print(result);
  assert.match(text, /sin\(x\)/);
  assert.ok(text.includes("x * cos(x)") || text.includes("cos(x) * x"));
});

test("polynomial degree is detected", () => {
  assert.equal(polynomialDegree(parseExpression("3x^4+2x+7"), "x"), 4);
});

test("quadratic integer factorization works", () => {
  const result = factorPolynomial(parseExpression("x^2-5x+6"), "x");
  const text = print(result);
  assert.match(text, /x - 3/);
  assert.match(text, /x - 2/);
});

test("simplify command executes", () => {
  const result = executeCasCommand("simplify(x+x+0)");
  assert.equal(result.text, "2 * x");
});

test("expand command executes", () => {
  const result = executeCasCommand("expand((x+1)^2)");
  assert.match(result.text, /x \^ 2/);
  assert.match(result.text, /2 \* x/);
});

test("factor command executes", () => {
  const result = executeCasCommand("factor(x^2-5x+6,x)");
  assert.match(result.text, /x - 3/);
  assert.match(result.text, /x - 2/);
});

test("gradient command returns a vector", () => {
  const result = executeCasCommand("gradient(x^2+y^2,x,y)");
  assert.equal(result.text, "(2 * x, 2 * y)");
});

test("degree command returns polynomial degree", () => {
  const result = executeCasCommand("degree(3x^4+2x,x)");
  assert.equal(result.text, "4");
});

test("roots command solves linear polynomials", () => {
  const result = executeCasCommand("roots(2x-6,x)");
  assert.equal(result.text, "x = 3");
});

test("roots command solves quadratics", () => {
  const result = executeCasCommand("roots(x^2-5x+6,x)");
  assert.match(result.text, /x = 3/);
  assert.match(result.text, /x = 2/);
});

test("roots command handles complex quadratic roots", () => {
  const result = executeCasCommand("roots(x^2+1,x)");
  assert.match(result.text, /i/);
});
