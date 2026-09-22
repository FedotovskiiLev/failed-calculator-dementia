import { parseExpression } from "../cas/parser.js";
import { evaluateNumeric } from "./numeric.js";

export function valueTable(source, variable, start, end, step) {
  start = Number(start);
  end = Number(end);
  step = Number(step);

  if (![start, end, step].every(Number.isFinite)) {
    throw new Error("table bounds and step must be finite numbers");
  }

  if (step === 0) throw new Error("table step cannot be zero");
  if ((end - start) * step < 0) throw new Error("table step moves away from the end bound");

  const expression = parseExpression(source);
  const rows = [];
  const maxRows = 500;

  let x = start;
  let count = 0;

  const keepGoing = step > 0
    ? () => x <= end + Math.abs(step) * 1e-10
    : () => x >= end - Math.abs(step) * 1e-10;

  while (keepGoing()) {
    if (count++ >= maxRows) {
      throw new Error(`table is limited to ${maxRows} rows`);
    }

    const y = evaluateNumeric(expression, { [variable]: x });

    rows.push({
      x: Number(x.toPrecision(12)),
      y: Number(y.toPrecision(12))
    });

    x += step;
  }

  return rows;
}

export function parseExpressionList(text) {
  text = String(text).trim();

  if (!text.startsWith("[") || !text.endsWith("]")) {
    throw new Error("Function list must look like [sin(x), cos(x)]");
  }

  const inside = text.slice(1, -1);
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < inside.length; i++) {
    const ch = inside[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(inside.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(inside.slice(start).trim());

  const clean = parts.filter(Boolean);
  if (!clean.length) throw new Error("Function list is empty");
  if (clean.length > 8) throw new Error("multiplot supports at most 8 functions");

  return clean;
}

export function sampleFunctions(expressions, variable, start, end, samples = 480) {
  start = Number(start);
  end = Number(end);
  samples = Math.max(20, Math.min(1200, Number(samples) || 480));

  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) {
    throw new Error("multiplot requires finite distinct bounds");
  }

  const parsed = expressions.map(parseExpression);
  const series = expressions.map((expression, index) => ({
    expression,
    index,
    points: []
  }));

  for (let i = 0; i <= samples; i++) {
    const x = start + (end - start) * i / samples;

    for (let j = 0; j < parsed.length; j++) {
      let y;

      try {
        y = evaluateNumeric(parsed[j], { [variable]: x });
      } catch {
        y = NaN;
      }

      series[j].points.push({
        x,
        y: Number.isFinite(y) ? y : null
      });
    }
  }

  return {
    variable,
    start,
    end,
    series
  };
}
