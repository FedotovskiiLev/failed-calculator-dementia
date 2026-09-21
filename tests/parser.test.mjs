import test from "node:test";
import assert from "node:assert/strict";
import { loadRuntime } from "./runtime-harness.mjs";

const api = loadRuntime();

test("normalization accepts common mathematical glyphs", () => {
  assert.equal(api.normalize("2×3 − 4÷2"), "2*3 - 4/2");
  assert.equal(api.normalize("2π"), "2pi");
});

test("implicit multiplication is inserted", () => {
  const ast = new api.Parser(api.tokenize("2(3+4)")).parse();
  assert.equal(ast.type, "binary");
  assert.equal(ast.op, "*");
});

test("implicit multiplication works with constants", () => {
  const ast = new api.Parser(api.tokenize("2pi")).parse();
  assert.equal(ast.type, "binary");
  assert.equal(ast.op, "*");
  assert.equal(ast.right.type, "constant");
  assert.equal(ast.right.name, "pi");
});

test("function calls are not mistaken for implicit multiplication", () => {
  const ast = new api.Parser(api.tokenize("sin(x)")).parse();
  assert.equal(ast.type, "call");
  assert.equal(ast.name, "sin");
});

test("power binds tighter than unary minus", () => {
  const ast = new api.Parser(api.tokenize("-2^2")).parse();
  assert.equal(ast.type, "unary");
  assert.equal(ast.op, "-");
  assert.equal(ast.arg.type, "binary");
  assert.equal(ast.arg.op, "^");
});

test("power is right-associative", () => {
  const ast = new api.Parser(api.tokenize("2^3^2")).parse();
  assert.equal(ast.op, "^");
  assert.equal(ast.right.op, "^");
});

test("factorial binds before power", () => {
  const ast = new api.Parser(api.tokenize("3!^2")).parse();
  assert.equal(ast.op, "^");
  assert.equal(ast.left.type, "postfix");
});

test("scientific notation remains one number", () => {
  const ast = new api.Parser(api.tokenize("1e-3")).parse();
  assert.equal(ast.type, "number");
  assert.equal(ast.value, 0.001);
});

test("multiple free variables are discoverable", () => {
  const ast = new api.Parser(api.tokenize("x+y+z")).parse();
  assert.deepEqual([...api.freeVariables(ast)].sort(), ["x", "y", "z"]);
});
