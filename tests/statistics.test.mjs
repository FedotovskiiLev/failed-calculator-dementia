import test from "node:test";
import assert from "node:assert/strict";

import {
  mean,median,variance,stdev,quantile,summary,linearRegression
} from "../js/workbench/statistics.js";

const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);

test("mean and median",()=> {
  assert.equal(mean([1,2,3,4]),2.5);
  assert.equal(median([1,2,9]),2);
});
test("variance and stdev",()=> {
  near(variance([1,2,3]),2/3);
  near(stdev([3,4]),0.5);
});
test("quantile interpolates",()=>near(quantile([0,10],0.25),2.5));
test("summary contains quartiles",()=> {
  const s=summary([1,2,3,4,5]);
  assert.equal(s.median,3);
  assert.equal(s.q1,2);
  assert.equal(s.q3,4);
});
test("linear regression",()=> {
  const r=linearRegression([1,2,3],[2,4,6]);
  near(r.slope,2);
  near(r.intercept,0);
  near(r.r2,1);
});
