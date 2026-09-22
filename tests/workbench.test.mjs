import test from "node:test";
import assert from "node:assert/strict";

import {
  determinant,
  inverse,
  matmul,
  rank,
  trace,
  dot,
  cross,
  norm,
  solveLinear,
  eigenvalues2
} from "../js/workbench/linear-algebra.js";

import {
  parseWorkbenchCommand,
  splitArguments,
  executeWorkbenchCommand
} from "../js/workbench/commands.js";

const near = (actual, expected, epsilon = 1e-8) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${actual} != ${expected}`
  );
};

test("nested matrix arguments split correctly", () => {
  assert.deepEqual(
    splitArguments(
      "[[1,2],[3,4]],[[5,6],[7,8]]"
    ),
    [
      "[[1,2],[3,4]]",
      "[[5,6],[7,8]]"
    ]
  );
});

test("workbench command parser recognizes det", () => {
  assert.equal(
    parseWorkbenchCommand(
      "det([[1,2],[3,4]])"
    ).name,
    "det"
  );
});

test("determinant", () => {
  assert.equal(
    determinant([[1,2],[3,4]]),
    -2
  );
});

test("trace", () => {
  assert.equal(
    trace([[1,2],[3,4]]),
    5
  );
});

test("inverse", () => {
  const value =
    inverse([[1,2],[3,4]]);

  near(value[0][0], -2);
  near(value[1][1], -0.5);
});

test("matrix multiplication", () => {
  assert.deepEqual(
    matmul([[1,2]], [[3],[4]]),
    [[11]]
  );
});

test("rank", () => {
  assert.equal(
    rank([[1,2],[2,4]]),
    1
  );
});

test("dot product", () => {
  assert.equal(
    dot([1,2,3], [4,5,6]),
    32
  );
});

test("cross product", () => {
  assert.deepEqual(
    cross([1,0,0], [0,1,0]),
    [0,0,1]
  );
});

test("vector norm", () => {
  near(norm([3,4]), 5);
});

test("linear system solver", () => {
  assert.deepEqual(
    solveLinear(
      [[2,1],[1,-1]],
      [5,1]
    ),
    [2,1]
  );
});

test("2x2 eigenvalues", () => {
  assert.deepEqual(
    eigenvalues2([[2,1],[1,2]]),
    [3,1]
  );
});

test("workbench linsolve produces named equations", () => {
  const result =
    executeWorkbenchCommand(
      "linsolve([[2,1],[1,-1]],[5,1],[x,y])"
    );

  assert.deepEqual(
    result.equations,
    ["x = 2", "y = 1"]
  );
});

test("workbench det command", () => {
  assert.equal(
    executeWorkbenchCommand(
      "det([[1,2],[3,4]])"
    ).value,
    -2
  );
});
