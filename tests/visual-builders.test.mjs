import test from "node:test";
import assert from "node:assert/strict";
import {
  parseNumberList,
  buildMatrixCommand,
  buildLinearSystemCommand,
  buildDataCommand
} from "../js/ux/visual-builders-core.js";

test("number list accepts commas and spaces", () => {
  assert.deepEqual(parseNumberList("1, 2  3;4"), [1,2,3,4]);
});

test("matrix builder emits determinant command", () => {
  assert.equal(
    buildMatrixCommand([[1,2],[3,4]], "det"),
    "det([[1,2],[3,4]])"
  );
});

test("system builder emits linsolve", () => {
  assert.equal(
    buildLinearSystemCommand([[2,1],[1,-1]], [5,1], ["x","y"]),
    "linsolve([[2,1],[1,-1]],[5,1],[x,y])"
  );
});

test("data builder emits regression command", () => {
  assert.equal(
    buildDataCommand("1,2,3", "linreg", "2,4,6"),
    "linreg([1,2,3],[2,4,6])"
  );
});
