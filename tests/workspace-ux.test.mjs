import test from "node:test";
import assert from "node:assert/strict";

import {
  interpretFriendlyInput
} from "../js/ux/smart-input.js";

test("polynomial equality becomes roots command", () => {
  assert.equal(
    interpretFriendlyInput("x^2 - 5x + 6 = 0").source,
    "roots((x^2 - 5x + 6)-(0),x)"
  );
});

test("Russian derivative shorthand works", () => {
  assert.equal(
    interpretFriendlyInput("производная x^3 + sin(x)").source,
    "diff(x^3 + sin(x),x)"
  );
});

test("English plot shorthand works", () => {
  assert.equal(
    interpretFriendlyInput("plot sin(x)").source,
    "plot(sin(x),x,-10,10)"
  );
});

test("Russian simplify shorthand works", () => {
  assert.equal(
    interpretFriendlyInput("упрости x+x+0").source,
    "simplify(x+x+0)"
  );
});

test("simple function syntax gains parentheses", () => {
  assert.equal(
    interpretFriendlyInput("sin x").source,
    "sin(x)"
  );
});

test("ordinary calculator expression is left alone", () => {
  assert.equal(
    interpretFriendlyInput("2pi + e"),
    null
  );
});

test("equation without a recognized variable is left alone", () => {
  assert.equal(
    interpretFriendlyInput("2+2=4"),
    null
  );
});
