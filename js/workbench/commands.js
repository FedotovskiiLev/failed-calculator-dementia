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
  "eigen2"
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
      "Matrix/vector literals use bracket syntax, for example [[1,2],[3,4]]"
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
    const matrix = literal(args[0]);
    return {
      kind:"scalar",
      title:"det(A)",
      value:determinant(matrix)
    };
  }

  if (name === "inverse") {
    if (args.length !== 1) throw new Error("inverse(matrix)");
    return {
      kind:"matrix",
      title:"A⁻¹",
      value:inverse(literal(args[0]))
    };
  }

  if (name === "transpose") {
    if (args.length !== 1) throw new Error("transpose(matrix)");
    return {
      kind:"matrix",
      title:"Aᵀ",
      value:transpose(literal(args[0]))
    };
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
    return {
      kind:"scalar",
      title:"rank(A)",
      value:rank(literal(args[0]))
    };
  }

  if (name === "trace") {
    if (args.length !== 1) throw new Error("trace(matrix)");
    return {
      kind:"scalar",
      title:"tr(A)",
      value:trace(literal(args[0]))
    };
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
    return {
      kind:"scalar",
      title:"‖v‖",
      value:norm(literal(args[0]))
    };
  }

  if (name === "linsolve") {
    if (args.length < 2 || args.length > 3) {
      throw new Error("linsolve(A,b [, [x,y,...]])");
    }

    const matrix = literal(args[0]);
    const rhs = literal(args[1]);
    const solution = solveLinear(matrix, rhs);
    const names = vectorNames(args[2], solution.length);

    return {
      kind:"system",
      title:"linear system",
      value:solution,
      variables:names,
      equations:names.map((name, i) => `${name} = ${solution[i]}`)
    };
  }

  if (name === "eigen2") {
    if (args.length !== 1) throw new Error("eigen2(matrix)");

    const values = eigenvalues2(literal(args[0]));

    return {
      kind:"vector",
      title:"eigenvalues",
      value:values.map(formatComplex)
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

  return null;
}
