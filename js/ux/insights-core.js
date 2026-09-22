import { print, symbols } from "../cas/ast.js";
import { parseExpression } from "../cas/parser.js";
import {
  differentiate,
  expand,
  factorPolynomial,
  polynomialDegree,
  simplify,
  solvePolynomial
} from "../cas/algebra.js";
import { parseCasCommand } from "../cas/commands.js";

const WRAPPER_COMMANDS = new Set([
  "simplify",
  "expand",
  "factor",
  "roots"
]);

function unwrap(source) {
  const command = parseCasCommand(source);

  if (
    command &&
    WRAPPER_COMMANDS.has(command.name) &&
    command.args?.[0]
  ) {
    return {
      expression: command.args[0],
      requestedVariable:
        command.args?.[1]?.trim() || null
    };
  }

  const topLevelCommand =
    source.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\s*\(/
    )?.[1]?.toLowerCase();

  const nonExpressionCommands =
    new Set([
      "plot",
      "table",
      "multiplot",
      "mean",
      "median",
      "variance",
      "stdev",
      "quantile",
      "summary",
      "linreg",
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
      "nsolve",
      "minimize",
      "integrate",
      "limit",
      "sum",
      "product",
      "solve",
      "diff",
      "antiderivative"
    ]);

  if (
    topLevelCommand &&
    nonExpressionCommands.has(
      topLevelCommand
    )
  ) {
    return null;
  }

  return {
    expression: source,
    requestedVariable: null
  };
}

function uniqueText(items) {
  const seen = new Set();

  return items.filter(item => {
    const key = item.text;

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function analyzeExpressionSource(
  source,
  preferredVariable = null
) {
  source = String(source || "").trim();

  if (!source) return null;

  const unwrapped = unwrap(source);

  if (!unwrapped) return null;

  let ast;

  try {
    ast = parseExpression(
      unwrapped.expression
    );
  } catch {
    return null;
  }

  const originalText = print(ast);

  const variables = [
    ...symbols(ast)
  ].filter(
    name =>
      !["pi", "e", "i"].includes(name)
  );

  const variable =
    preferredVariable &&
    variables.includes(preferredVariable)
      ? preferredVariable
      : unwrapped.requestedVariable &&
          variables.includes(
            unwrapped.requestedVariable
          )
        ? unwrapped.requestedVariable
        : variables[0] || null;

  const forms = [];

  try {
    const simplified =
      print(simplify(ast));

    if (
      simplified &&
      simplified !== originalText
    ) {
      forms.push({
        label:"simplified",
        text:simplified
      });
    }
  } catch {}

  try {
    const expanded =
      print(expand(ast));

    if (
      expanded &&
      expanded !== originalText
    ) {
      forms.push({
        label:"expanded",
        text:expanded
      });
    }
  } catch {}

  let degree = null;
  let roots = null;

  if (variable) {
    try {
      degree =
        polynomialDegree(
          ast,
          variable
        );
    } catch {}

    try {
      const factored =
        factorPolynomial(
          ast,
          variable
        );

      const factoredText =
        factored
          ? print(factored)
          : null;

      if (
        factoredText &&
        factoredText !== originalText
      ) {
        forms.push({
          label:"factored",
          text:factoredText
        });
      }
    } catch {}

    try {
      roots =
        solvePolynomial(
          ast,
          variable
        );
    } catch {}
  }

  let derivative = null;

  if (variable) {
    try {
      derivative =
        print(
          simplify(
            differentiate(
              ast,
              variable
            )
          )
        );

      if (
        derivative?.includes("D(")
      ) {
        derivative = null;
      }
    } catch {
      derivative = null;
    }
  }

  return {
    source,
    expression:
      unwrapped.expression,
    originalText,
    variables,
    variable,
    degree,
    forms:
      uniqueText(forms),
    roots:
      Array.isArray(roots)
        ? roots
        : null,
    derivative
  };
}
