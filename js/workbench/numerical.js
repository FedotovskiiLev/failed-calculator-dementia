import { differentiate, simplify } from "../cas/algebra.js";
import { parseExpression } from "../cas/parser.js";
import { evaluateNumeric } from "./numeric.js";

export function numericSolve(source, variable, guess, options = {}) {
  const maxIterations = options.maxIterations ?? 30;
  const tolerance = options.tolerance ?? 1e-10;

  const expression = parseExpression(source);
  const derivative = simplify(differentiate(expression, variable));

  let x = Number(guess);
  if (!Number.isFinite(x)) throw new Error("Initial guess must be finite");

  const steps = [];

  for (let i = 0; i < maxIterations; i++) {
    const fx = evaluateNumeric(expression, { [variable]: x });
    const dfx = evaluateNumeric(derivative, { [variable]: x });

    steps.push({
      iteration: i + 1,
      x,
      fx,
      dfx
    });

    if (Math.abs(fx) <= tolerance) {
      return {
        root: Number(x.toPrecision(12)),
        residual: Number(fx.toPrecision(6)),
        iterations: i + 1,
        steps
      };
    }

    if (!Number.isFinite(dfx) || Math.abs(dfx) < 1e-14) {
      throw new Error("Newton derivative became zero or non-finite");
    }

    const next = x - fx / dfx;

    if (!Number.isFinite(next)) {
      throw new Error("Newton iteration diverged");
    }

    if (Math.abs(next - x) <= tolerance * Math.max(1, Math.abs(next))) {
      x = next;
      const finalFx = evaluateNumeric(expression, { [variable]: x });
      return {
        root: Number(x.toPrecision(12)),
        residual: Number(finalFx.toPrecision(6)),
        iterations: i + 1,
        steps
      };
    }

    x = next;
  }

  throw new Error("Newton method did not converge within the iteration limit");
}

export function minimizeGolden(source, variable, left, right, options = {}) {
  left = Number(left);
  right = Number(right);

  if (!Number.isFinite(left) || !Number.isFinite(right) || !(left < right)) {
    throw new Error("minimize requires finite bounds with left < right");
  }

  const expression = parseExpression(source);
  const tolerance = options.tolerance ?? 1e-8;
  const maxIterations = options.maxIterations ?? 120;
  const phi = (1 + Math.sqrt(5)) / 2;

  let a = left;
  let b = right;
  let c = b - (b - a) / phi;
  let d = a + (b - a) / phi;
  let fc = evaluateNumeric(expression, { [variable]: c });
  let fd = evaluateNumeric(expression, { [variable]: d });

  let iterations = 0;

  while (Math.abs(b - a) > tolerance && iterations < maxIterations) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - (b - a) / phi;
      fc = evaluateNumeric(expression, { [variable]: c });
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + (b - a) / phi;
      fd = evaluateNumeric(expression, { [variable]: d });
    }
    iterations++;
  }

  const x = (a + b) / 2;
  const value = evaluateNumeric(expression, { [variable]: x });

  return {
    x: Number(x.toPrecision(12)),
    value: Number(value.toPrecision(12)),
    iterations
  };
}
