import { binary, num, print, sym } from "../cas/ast.js";
import { differentiate, simplify } from "../cas/algebra.js";
import { parseExpression } from "../cas/parser.js";
import { evaluateNumeric, factorial } from "./numeric.js";

function powerAround(variable, center, degree) {
  if (degree === 0) return num(1);

  const base = center === 0
    ? sym(variable)
    : binary("-", sym(variable), num(center));

  return degree === 1 ? base : binary("^", base, num(degree));
}

export function taylorSeries(source, variable, center = 0, order = 6) {
  if (!Number.isInteger(order) || order < 0 || order > 14) {
    throw new Error("Taylor order must be an integer from 0 to 14");
  }

  let derivative = parseExpression(source);
  const terms = [];

  for (let n = 0; n <= order; n++) {
    const value = evaluateNumeric(derivative, { [variable]: center });
    const coefficient = value / factorial(n);

    if (Math.abs(coefficient) > 1e-12) {
      const power = powerAround(variable, center, n);
      let term;

      if (n === 0) term = num(coefficient);
      else if (Math.abs(coefficient - 1) < 1e-12) term = power;
      else if (Math.abs(coefficient + 1) < 1e-12) {
        term = binary("*", num(-1), power);
      } else {
        term = binary("*", num(coefficient), power);
      }

      terms.push(term);
    }

    derivative = simplify(differentiate(derivative, variable));
  }

  if (!terms.length) {
    return { ast:num(0), text:"0", center, order };
  }

  const ast = terms.slice(1).reduce(
    (acc, term) => binary("+", acc, term),
    terms[0]
  );

  const simplified = simplify(ast);

  return {
    ast:simplified,
    text:print(simplified),
    center,
    order
  };
}
