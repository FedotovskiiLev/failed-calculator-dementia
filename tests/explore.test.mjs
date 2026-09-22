import test from "node:test";
import assert from "node:assert/strict";

import { valueTable,parseExpressionList,sampleFunctions } from "../js/workbench/explore.js";
import { numericSolve,minimizeGolden } from "../js/workbench/numerical.js";
import { executeWorkbenchCommand } from "../js/workbench/commands.js";

const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);

test("table generates inclusive rows",()=> {
  const rows=valueTable("x^2","x",-1,1,1);
  assert.deepEqual(rows,[{x:-1,y:1},{x:0,y:0},{x:1,y:1}]);
});
test("expression list handles nested calls",()=> {
  assert.deepEqual(parseExpressionList("[sin(x),cos(x),exp(-x^2)]"),["sin(x)","cos(x)","exp(-x^2)"]);
});
test("sampleFunctions samples multiple curves",()=> {
  const data=sampleFunctions(["x","x^2"],"x",-1,1,20);
  assert.equal(data.series.length,2);
  assert.equal(data.series[0].points.length,21);
});
test("Newton solver finds sqrt(2)",()=> {
  const r=numericSolve("x^2-2","x",1);
  near(r.root,Math.sqrt(2),1e-8);
});
test("golden minimizer finds quadratic minimum",()=> {
  const r=minimizeGolden("(x-3)^2+4","x",-10,10);
  near(r.x,3,1e-5);
  near(r.value,4,1e-7);
});
test("summary command",()=> {
  const r=executeWorkbenchCommand("summary([1,2,3,4,5])");
  assert.equal(r.kind,"summary");
  assert.equal(r.value.mean,3);
});
test("nsolve command",()=> {
  const r=executeWorkbenchCommand("nsolve(x^2-2,x,1)");
  near(r.value.root,Math.sqrt(2),1e-8);
});
