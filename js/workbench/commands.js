import {
  determinant,
  dot,
  cross,
  eigenvalues2,
  inverse,
  matmul,
  norm,
  rank,
  solveLinear,
  trace,
  transpose
} from "./linear-algebra.js";
import { taylorSeries } from "./taylor.js";
import {
  mean,
  median,
  variance,
  stdev,
  quantile,
  summary,
  linearRegression
} from "./statistics.js";
import {
  numericSolve,
  minimizeGolden
} from "./numerical.js";
import {
  valueTable,
  parseExpressionList,
  sampleFunctions
} from "./explore.js";

const COMMANDS = new Set([
  "det",
  "inverse",
  "transpose",
  "matmul",
  "rank",
  "trace",
  "dot",
  "cross",
  "norm",
  "linsolve",
  "taylor",
  "eigen2",
  "mean",
  "median",
  "variance",
  "stdev",
  "quantile",
  "summary",
  "linreg",
  "table",
  "multiplot",
  "nsolve",
  "minimize"
]);

export function splitArguments(text) {
  const parts = [];
  let parens = 0;
  let brackets = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "(") parens++;
    else if (ch === ")") parens--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
    else if (ch === "," && parens === 0 && brackets === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

export function parseWorkbenchCommand(source) {
  const match = String(source).trim().match(
    /^([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)$/
  );

  if (!match) return null;

  const name = match[1].toLowerCase();
  if (!COMMANDS.has(name)) return null;

  return {
    name,
    args:splitArguments(match[2])
  };
}

function literal(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Data literals use bracket syntax, for example [1,2,3] or [[1,2],[3,4]]"
    );
  }
}

function vectorNames(text, count) {
  if (!text) {
    return Array.from({ length:count }, (_, i) => `x${i + 1}`);
  }

  const parsed = text.trim();

  if (!parsed.startsWith("[") || !parsed.endsWith("]")) {
    throw new Error("Variable names must look like [x,y,z]");
  }

  const names = parsed
    .slice(1, -1)
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  if (names.length !== count) {
    throw new Error("Number of variable names must match the system size");
  }

  return names;
}

function formatComplex(value) {
  if (typeof value === "number") return String(value);
  if (Math.abs(value.im) < 1e-12) return String(value.re);

  const sign = value.im >= 0 ? "+" : "-";
  return `${value.re} ${sign} ${Math.abs(value.im)}i`;
}

export function executeWorkbenchCommand(source) {
  const command = parseWorkbenchCommand(source);
  if (!command) return null;

  const { name, args } = command;

  if (name === "det") {
    if (args.length !== 1) throw new Error("det(matrix)");
    return { kind:"scalar", title:"det(A)", value:determinant(literal(args[0])) };
  }

  if (name === "inverse") {
    if (args.length !== 1) throw new Error("inverse(matrix)");
    return { kind:"matrix", title:"A⁻¹", value:inverse(literal(args[0])) };
  }

  if (name === "transpose") {
    if (args.length !== 1) throw new Error("transpose(matrix)");
    return { kind:"matrix", title:"Aᵀ", value:transpose(literal(args[0])) };
  }

  if (name === "matmul") {
    if (args.length !== 2) throw new Error("matmul(A,B)");
    return {
      kind:"matrix",
      title:"A · B",
      value:matmul(literal(args[0]), literal(args[1]))
    };
  }

  if (name === "rank") {
    if (args.length !== 1) throw new Error("rank(matrix)");
    return { kind:"scalar", title:"rank(A)", value:rank(literal(args[0])) };
  }

  if (name === "trace") {
    if (args.length !== 1) throw new Error("trace(matrix)");
    return { kind:"scalar", title:"tr(A)", value:trace(literal(args[0])) };
  }

  if (name === "dot") {
    if (args.length !== 2) throw new Error("dot(a,b)");
    return {
      kind:"scalar",
      title:"a · b",
      value:dot(literal(args[0]), literal(args[1]))
    };
  }

  if (name === "cross") {
    if (args.length !== 2) throw new Error("cross(a,b)");
    return {
      kind:"vector",
      title:"a × b",
      value:cross(literal(args[0]), literal(args[1]))
    };
  }

  if (name === "norm") {
    if (args.length !== 1) throw new Error("norm(v)");
    return { kind:"scalar", title:"‖v‖", value:norm(literal(args[0])) };
  }

  if (name === "linsolve") {
    if (args.length < 2 || args.length > 3) {
      throw new Error("linsolve(A,b [, [x,y,...]])");
    }

    const solution = solveLinear(literal(args[0]), literal(args[1]));
    const names = vectorNames(args[2], solution.length);

    return {
      kind:"system",
      title:"linear system",
      value:solution,
      variables:names,
      equations:names.map((variable, i) => `${variable} = ${solution[i]}`)
    };
  }

  if (name === "eigen2") {
    if (args.length !== 1) throw new Error("eigen2(matrix)");

    return {
      kind:"vector",
      title:"eigenvalues",
      value:eigenvalues2(literal(args[0])).map(formatComplex)
    };
  }

  if (name === "taylor") {
    if (args.length < 2 || args.length > 4) {
      throw new Error("taylor(expr,variable [, center [, order]])");
    }

    const expression = args[0];
    const variable = args[1].trim();
    const center = args[2] == null ? 0 : Number(args[2]);
    const order = args[3] == null ? 6 : Number(args[3]);

    if (!Number.isFinite(center) || !Number.isFinite(order)) {
      throw new Error("Taylor center/order must be numeric");
    }

    const result = taylorSeries(expression, variable, center, order);

    return {
      kind:"series",
      title:`Taylor order ${order} around ${variable}=${center}`,
      value:result.text,
      source:expression,
      variable,
      center,
      order
    };
  }

  if (name === "mean") {
    if (args.length !== 1) throw new Error("mean([data])");
    return { kind:"scalar", title:"mean", value:mean(literal(args[0])) };
  }

  if (name === "median") {
    if (args.length !== 1) throw new Error("median([data])");
    return { kind:"scalar", title:"median", value:median(literal(args[0])) };
  }

  if (name === "variance") {
    if (args.length !== 1) throw new Error("variance([data])");
    return { kind:"scalar", title:"variance", value:variance(literal(args[0])) };
  }

  if (name === "stdev") {
    if (args.length !== 1) throw new Error("stdev([data])");
    return { kind:"scalar", title:"standard deviation", value:stdev(literal(args[0])) };
  }

  if (name === "quantile") {
    if (args.length !== 2) throw new Error("quantile([data],q)");
    return {
      kind:"scalar",
      title:`quantile q=${args[1]}`,
      value:quantile(literal(args[0]), Number(args[1]))
    };
  }

  if (name === "summary") {
    if (args.length !== 1) throw new Error("summary([data])");
    return {
      kind:"summary",
      title:"descriptive statistics",
      value:summary(literal(args[0]))
    };
  }

  if (name === "linreg") {
    if (args.length !== 2) throw new Error("linreg([x],[y])");

    return {
      kind:"regression",
      title:"linear regression",
      value:linearRegression(literal(args[0]), literal(args[1])),
      x:literal(args[0]),
      y:literal(args[1])
    };
  }

  if (name === "table") {
    if (args.length !== 5) throw new Error("table(expr,variable,start,end,step)");

    return {
      kind:"table",
      title:`value table: ${args[0]}`,
      columns:[args[1].trim(), args[0]],
      value:valueTable(
        args[0],
        args[1].trim(),
        Number(args[2]),
        Number(args[3]),
        Number(args[4])
      )
    };
  }

  if (name === "multiplot") {
    if (args.length < 4 || args.length > 5) {
      throw new Error("multiplot([f(x),g(x)],variable,start,end [, samples])");
    }

    const expressions = parseExpressionList(args[0]);
    const sampled = sampleFunctions(
      expressions,
      args[1].trim(),
      Number(args[2]),
      Number(args[3]),
      args[4] == null ? 480 : Number(args[4])
    );

    return {
      kind:"multiplot",
      title:"multiple functions",
      value:sampled
    };
  }

  if (name === "nsolve") {
    if (args.length !== 3) throw new Error("nsolve(expr,variable,guess)");

    return {
      kind:"root",
      title:"Newton solve",
      value:numericSolve(args[0], args[1].trim(), Number(args[2]))
    };
  }

  if (name === "minimize") {
    if (args.length !== 4) throw new Error("minimize(expr,variable,left,right)");

    return {
      kind:"minimum",
      title:"interval minimum",
      value:minimizeGolden(
        args[0],
        args[1].trim(),
        Number(args[2]),
        Number(args[3])
      )
    };
  }

  return null;
}
