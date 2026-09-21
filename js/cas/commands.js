import { print, symbols } from "./ast.js";
import { parseExpression } from "./parser.js";
import {
  differentiate,
  expand,
  factorPolynomial,
  polynomialDegree,
  polynomialToAst,
  polynomialCoefficients,
  simplify,
  solvePolynomial,
  substitute
} from "./algebra.js";

const COMMANDS = new Set([
  "simplify",
  "expand",
  "factor",
  "subs",
  "gradient",
  "degree",
  "collect",
  "roots"
]);

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

export function parseCasCommand(source) {
  const match = String(source).trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)$/);
  if (!match) return null;

  const name = match[1].toLowerCase();
  if (!COMMANDS.has(name)) return null;

  return {
    name,
    args: splitTopLevel(match[2])
  };
}

function chooseVariable(expr, requested = null) {
  if (requested) return requested.trim();
  const found = [...symbols(expr)].filter(name => !["pi", "e", "i"].includes(name));
  return found[0] || "x";
}

export function executeCasCommand(source) {
  const command = parseCasCommand(source);
  if (!command) return null;

  const { name, args } = command;

  if (name === "simplify") {
    if (args.length !== 1) throw new Error("simplify(expr)");
    const expr = parseExpression(args[0]);
    return {
      kind: "symbolic",
      text: print(simplify(expr)),
      explanation: "algebraic simplification"
    };
  }

  if (name === "expand") {
    if (args.length !== 1) throw new Error("expand(expr)");
    const expr = parseExpression(args[0]);
    return {
      kind: "symbolic",
      text: print(expand(expr)),
      explanation: "distributive expansion"
    };
  }

  if (name === "factor") {
    if (args.length < 1 || args.length > 2) throw new Error("factor(expr [, variable])");
    const expr = parseExpression(args[0]);
    const variable = chooseVariable(expr, args[1]);
    const factored = factorPolynomial(expr, variable);
    if (!factored) {
      return {
        kind: "symbolic",
        text: print(simplify(expr)),
        explanation: `no polynomial factorization recognized in ${variable}`
      };
    }
    return {
      kind: "symbolic",
      text: print(factored),
      explanation: `polynomial factorization in ${variable}`
    };
  }

  if (name === "subs") {
    if (args.length !== 3) throw new Error("subs(expr, variable, replacement)");
    const expr = parseExpression(args[0]);
    const variable = args[1].trim();
    const replacement = parseExpression(args[2]);
    return {
      kind: "symbolic",
      text: print(simplify(substitute(expr, variable, replacement))),
      explanation: `substitution ${variable} → ${args[2]}`
    };
  }

  if (name === "gradient") {
    if (args.length < 2) throw new Error("gradient(expr, x [, y, ...])");
    const expr = parseExpression(args[0]);
    const variables = args.slice(1).map(value => value.trim());
    const parts = variables.map(variable =>
      print(simplify(differentiate(expr, variable)))
    );
    return {
      kind: "symbolic",
      text: `(${parts.join(", ")})`,
      explanation: `gradient with respect to ${variables.join(", ")}`
    };
  }

  if (name === "degree") {
    if (args.length < 1 || args.length > 2) throw new Error("degree(expr [, variable])");
    const expr = parseExpression(args[0]);
    const variable = chooseVariable(expr, args[1]);
    const degree = polynomialDegree(expr, variable);
    return {
      kind: "symbolic",
      text: degree == null ? "not a polynomial" : String(degree),
      explanation: `polynomial degree in ${variable}`
    };
  }

  if (name === "collect") {
    if (args.length !== 2) throw new Error("collect(expr, variable)");
    const expr = parseExpression(args[0]);
    const variable = args[1].trim();
    const coeffs = polynomialCoefficients(expr, variable);
    if (!coeffs) {
      return {
        kind: "symbolic",
        text: print(simplify(expr)),
        explanation: `expression is not a polynomial in ${variable}`
      };
    }
    return {
      kind: "symbolic",
      text: print(polynomialToAst(coeffs, variable)),
      explanation: `collected by powers of ${variable}`
    };
  }

  if (name === "roots") {
    if (args.length < 1 || args.length > 2) throw new Error("roots(expr [, variable])");
    const expr = parseExpression(args[0]);
    const variable = chooseVariable(expr, args[1]);
    const roots = solvePolynomial(expr, variable);
    return {
      kind: "symbolic",
      text: roots ? roots.join(" ; ") : "degree > 2 or not a supported polynomial",
      explanation: `polynomial roots in ${variable}`
    };
  }

  return null;
}
