import {
  binary,
  call,
  containsSymbol,
  isNumber,
  num,
  print,
  sym,
  unary
} from "./ast.js";

function numericBinary(op, a, b) {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") return b === 0 ? NaN : a / b;
  if (op === "^") return a ** b;
  return NaN;
}

function flatten(node, op, out = []) {
  if (node?.type === "binary" && node.op === op) {
    flatten(node.left, op, out);
    flatten(node.right, op, out);
  } else {
    out.push(node);
  }
  return out;
}

function buildChain(op, nodes) {
  if (!nodes.length) return op === "*" ? num(1) : num(0);
  return nodes.slice(1).reduce((acc, node) => binary(op, acc, node), nodes[0]);
}

function negate(node) {
  if (node.type === "number") return num(-node.value);
  if (node.type === "unary" && node.op === "-") return node.arg;
  return unary("-", node);
}

function simplifyPower(base, exponent) {
  if (isNumber(exponent, 0)) return num(1);
  if (isNumber(exponent, 1)) return base;
  if (isNumber(base, 1)) return num(1);
  if (isNumber(base, 0) && exponent.type === "number" && exponent.value > 0) return num(0);
  if (base.type === "number" && exponent.type === "number" && Number.isInteger(exponent.value)) {
    return num(base.value ** exponent.value);
  }
  return binary("^", base, exponent);
}

function collectSimpleTerms(nodes) {
  let constant = 0;
  const groups = new Map();
  const leftovers = [];

  for (const node of nodes) {
    if (node.type === "number") {
      constant += node.value;
      continue;
    }

    let coefficient = 1;
    let body = node;

    if (node.type === "unary" && node.op === "-") {
      coefficient = -1;
      body = node.arg;
    } else if (node.type === "binary" && node.op === "*" && node.left.type === "number") {
      coefficient = node.left.value;
      body = node.right;
    }

    const key = print(body);
    if (/^[A-Za-z_][A-Za-z0-9_]*(?: \^ \d+)?$/.test(key)) {
      const entry = groups.get(key) || { coefficient: 0, body };
      entry.coefficient += coefficient;
      groups.set(key, entry);
    } else {
      leftovers.push(node);
    }
  }

  const out = [];
  for (const { coefficient, body } of groups.values()) {
    if (coefficient === 0) continue;
    if (coefficient === 1) out.push(body);
    else if (coefficient === -1) out.push(negate(body));
    else out.push(binary("*", num(coefficient), body));
  }
  out.push(...leftovers);
  if (constant !== 0 || !out.length) out.push(num(constant));
  return out;
}

export function simplify(node) {
  if (!node) return node;
  if (node.type === "number" || node.type === "symbol") return node;

  if (node.type === "call") {
    return call(node.name, node.args.map(simplify));
  }

  if (node.type === "unary") {
    const arg = simplify(node.arg);
    if (node.op === "+") return arg;
    if (arg.type === "number") return num(-arg.value);
    if (arg.type === "unary" && arg.op === "-") return arg.arg;
    return unary("-", arg);
  }

  const left = simplify(node.left);
  const right = simplify(node.right);

  if (left.type === "number" && right.type === "number") {
    const value = numericBinary(node.op, left.value, right.value);
    if (Number.isFinite(value)) return num(value);
  }

  if (node.op === "+") {
    if (isNumber(left, 0)) return right;
    if (isNumber(right, 0)) return left;
    const terms = collectSimpleTerms(flatten(binary("+", left, right), "+"));
    return buildChain("+", terms);
  }

  if (node.op === "-") {
    if (isNumber(right, 0)) return left;
    if (print(left) === print(right)) return num(0);
    if (right.type === "unary" && right.op === "-") {
      return simplify(binary("+", left, right.arg));
    }
    return binary("-", left, right);
  }

  if (node.op === "*") {
    if (isNumber(left, 0) || isNumber(right, 0)) return num(0);
    if (isNumber(left, 1)) return right;
    if (isNumber(right, 1)) return left;

    const factors = flatten(binary("*", left, right), "*");
    let coefficient = 1;
    const powers = new Map();
    const others = [];

    for (const factor of factors) {
      if (factor.type === "number") {
        coefficient *= factor.value;
        continue;
      }

      if (factor.type === "symbol") {
        powers.set(factor.name, (powers.get(factor.name) || 0) + 1);
        continue;
      }

      if (
        factor.type === "binary" &&
        factor.op === "^" &&
        factor.left.type === "symbol" &&
        factor.right.type === "number" &&
        Number.isInteger(factor.right.value)
      ) {
        powers.set(
          factor.left.name,
          (powers.get(factor.left.name) || 0) + factor.right.value
        );
        continue;
      }

      others.push(factor);
    }

    if (coefficient === 0) return num(0);

    for (const [name, exponent] of [...powers].sort(([a], [b]) => a.localeCompare(b))) {
      if (exponent === 1) others.push(sym(name));
      else others.push(binary("^", sym(name), num(exponent)));
    }

    if (coefficient !== 1 || !others.length) others.unshift(num(coefficient));
    return buildChain("*", others);
  }

  if (node.op === "/") {
    if (isNumber(left, 0)) return num(0);
    if (isNumber(right, 1)) return left;
    if (print(left) === print(right)) return num(1);
    return binary("/", left, right);
  }

  if (node.op === "^") return simplifyPower(left, right);

  return binary(node.op, left, right);
}

function multiplyExpanded(a, b) {
  if (a.type === "binary" && (a.op === "+" || a.op === "-")) {
    return simplify(binary(
      a.op,
      multiplyExpanded(a.left, b),
      multiplyExpanded(a.right, b)
    ));
  }

  if (b.type === "binary" && (b.op === "+" || b.op === "-")) {
    return simplify(binary(
      b.op,
      multiplyExpanded(a, b.left),
      multiplyExpanded(a, b.right)
    ));
  }

  return simplify(binary("*", a, b));
}

export function expand(node) {
  node = simplify(node);

  if (node.type === "number" || node.type === "symbol") return node;
  if (node.type === "call") return call(node.name, node.args.map(expand));
  if (node.type === "unary") return simplify(unary(node.op, expand(node.arg)));

  const left = expand(node.left);
  const right = expand(node.right);

  if (node.op === "*") {
    return multiplyExpanded(left, right);
  }

  if (
    node.op === "^" &&
    right.type === "number" &&
    Number.isInteger(right.value) &&
    right.value >= 0 &&
    right.value <= 8
  ) {
    let out = num(1);
    for (let i = 0; i < right.value; i++) {
      out = multiplyExpanded(out, left);
    }
    return simplify(out);
  }

  return simplify(binary(node.op, left, right));
}

export function substitute(node, variable, replacement) {
  if (node.type === "symbol") {
    return node.name === variable ? replacement : node;
  }
  if (node.type === "number") return node;
  if (node.type === "unary") {
    return unary(node.op, substitute(node.arg, variable, replacement));
  }
  if (node.type === "binary") {
    return binary(
      node.op,
      substitute(node.left, variable, replacement),
      substitute(node.right, variable, replacement)
    );
  }
  if (node.type === "call") {
    return call(
      node.name,
      node.args.map(arg => substitute(arg, variable, replacement))
    );
  }
  return node;
}

export function differentiate(node, variable) {
  if (node.type === "number") return num(0);
  if (node.type === "symbol") return num(node.name === variable ? 1 : 0);

  if (node.type === "unary") {
    const d = differentiate(node.arg, variable);
    return node.op === "-" ? unary("-", d) : d;
  }

  if (node.type === "binary") {
    const u = node.left;
    const v = node.right;
    const du = differentiate(u, variable);
    const dv = differentiate(v, variable);

    if (node.op === "+") return simplify(binary("+", du, dv));
    if (node.op === "-") return simplify(binary("-", du, dv));
    if (node.op === "*") {
      return simplify(
        binary(
          "+",
          binary("*", du, v),
          binary("*", u, dv)
        )
      );
    }
    if (node.op === "/") {
      return simplify(
        binary(
          "/",
          binary(
            "-",
            binary("*", du, v),
            binary("*", u, dv)
          ),
          binary("^", v, num(2))
        )
      );
    }
    if (node.op === "^") {
      if (!containsSymbol(v, variable)) {
        return simplify(
          binary(
            "*",
            binary("*", v, binary("^", u, binary("-", v, num(1)))),
            du
          )
        );
      }

      return simplify(
        binary(
          "*",
          binary("^", u, v),
          binary(
            "+",
            binary("*", dv, call("ln", [u])),
            binary("*", v, binary("/", du, u))
          )
        )
      );
    }
  }

  if (node.type === "call" && node.args.length >= 1) {
    const u = node.args[0];
    const du = differentiate(u, variable);

    if (node.name === "sin") return simplify(binary("*", call("cos", [u]), du));
    if (node.name === "cos") return simplify(binary("*", unary("-", call("sin", [u])), du));
    if (node.name === "tan") {
      return simplify(binary("/", du, binary("^", call("cos", [u]), num(2))));
    }
    if (node.name === "exp") return simplify(binary("*", call("exp", [u]), du));
    if (node.name === "ln") return simplify(binary("/", du, u));
    if (node.name === "sqrt") {
      return simplify(binary("/", du, binary("*", num(2), call("sqrt", [u]))));
    }
    if (node.name === "sinh") return simplify(binary("*", call("cosh", [u]), du));
    if (node.name === "cosh") return simplify(binary("*", call("sinh", [u]), du));
    if (node.name === "tanh") {
      return simplify(binary("/", du, binary("^", call("cosh", [u]), num(2))));
    }
  }

  return call("D", [node, sym(variable)]);
}

function addPoly(a, b, sign = 1) {
  const out = new Map(a);
  for (const [degree, coefficient] of b) {
    out.set(degree, (out.get(degree) || 0) + sign * coefficient);
  }
  for (const [degree, coefficient] of [...out]) {
    if (Math.abs(coefficient) < 1e-12) out.delete(degree);
  }
  return out;
}

function mulPoly(a, b) {
  const out = new Map();
  for (const [da, ca] of a) {
    for (const [db, cb] of b) {
      const degree = da + db;
      out.set(degree, (out.get(degree) || 0) + ca * cb);
    }
  }
  return out;
}

export function polynomialCoefficients(node, variable) {
  node = expand(simplify(node));

  function walk(current) {
    if (current.type === "number") return new Map([[0, current.value]]);
    if (current.type === "symbol") {
      if (current.name === variable) return new Map([[1, 1]]);
      return null;
    }
    if (current.type === "unary" && current.op === "-") {
      const inner = walk(current.arg);
      if (!inner) return null;
      return new Map([...inner].map(([d, c]) => [d, -c]));
    }
    if (current.type !== "binary") return null;

    if (current.op === "+" || current.op === "-") {
      const a = walk(current.left);
      const b = walk(current.right);
      if (!a || !b) return null;
      return addPoly(a, b, current.op === "+" ? 1 : -1);
    }

    if (current.op === "*") {
      const a = walk(current.left);
      const b = walk(current.right);
      if (!a || !b) return null;
      return mulPoly(a, b);
    }

    if (
      current.op === "^" &&
      current.left.type === "symbol" &&
      current.left.name === variable &&
      current.right.type === "number" &&
      Number.isInteger(current.right.value) &&
      current.right.value >= 0
    ) {
      return new Map([[current.right.value, 1]]);
    }

    return null;
  }

  return walk(node);
}

export function polynomialDegree(node, variable) {
  const coeffs = polynomialCoefficients(node, variable);
  if (!coeffs) return null;
  return coeffs.size ? Math.max(...coeffs.keys()) : 0;
}

export function polynomialToAst(coeffs, variable) {
  const degrees = [...coeffs.keys()].sort((a, b) => b - a);
  const terms = [];

  for (const degree of degrees) {
    const coefficient = coeffs.get(degree);
    if (Math.abs(coefficient) < 1e-12) continue;

    let body;
    if (degree === 0) body = num(Math.abs(coefficient));
    else if (degree === 1) body = sym(variable);
    else body = binary("^", sym(variable), num(degree));

    const magnitude = Math.abs(coefficient);
    if (degree !== 0 && magnitude !== 1) {
      body = binary("*", num(magnitude), body);
    }

    terms.push({ sign: coefficient < 0 ? -1 : 1, body });
  }

  if (!terms.length) return num(0);

  let out = terms[0].sign < 0 ? unary("-", terms[0].body) : terms[0].body;
  for (const term of terms.slice(1)) {
    out = binary(term.sign < 0 ? "-" : "+", out, term.body);
  }
  return simplify(out);
}

function integerGcd(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) [a, b] = [b, a % b];
  return a;
}

export function factorPolynomial(node, variable) {
  const coeffs = polynomialCoefficients(node, variable);
  if (!coeffs) return null;

  const degree = polynomialDegree(node, variable);
  if (degree === 0) return simplify(node);

  const allCoefficients = [...coeffs.values()];
  const integerCoefficients = allCoefficients.every(Number.isInteger);

  let gcd = 1;
  if (integerCoefficients) {
    gcd = allCoefficients.reduce((acc, value) => integerGcd(acc, value), 0) || 1;
  }

  const normalized = new Map(
    [...coeffs].map(([d, c]) => [d, c / gcd])
  );

  if (degree === 1) {
    const a = normalized.get(1) || 0;
    const b = normalized.get(0) || 0;
    if (a !== 0 && Number.isInteger(-b / a)) {
      const root = -b / a;
      let factor = binary("-", sym(variable), num(root));
      if (a !== 1) factor = binary("*", num(a), factor);
      if (gcd !== 1) factor = binary("*", num(gcd), factor);
      return simplify(factor);
    }
  }

  if (degree === 2) {
    const a = normalized.get(2) || 0;
    const b = normalized.get(1) || 0;
    const c = normalized.get(0) || 0;
    const discriminant = b * b - 4 * a * c;
    const sqrtD = Math.sqrt(discriminant);

    if (
      discriminant >= 0 &&
      Number.isInteger(sqrtD) &&
      Number.isInteger((-b + sqrtD) / (2 * a)) &&
      Number.isInteger((-b - sqrtD) / (2 * a))
    ) {
      const r1 = (-b + sqrtD) / (2 * a);
      const r2 = (-b - sqrtD) / (2 * a);
      let out = binary(
        "*",
        binary("-", sym(variable), num(r1)),
        binary("-", sym(variable), num(r2))
      );
      if (a !== 1) out = binary("*", num(a), out);
      if (gcd !== 1) out = binary("*", num(gcd), out);
      return simplify(out);
    }
  }

  if (gcd !== 1) {
    return simplify(
      binary("*", num(gcd), polynomialToAst(normalized, variable))
    );
  }

  return simplify(node);
}

export function solvePolynomial(node, variable) {
  const coeffs = polynomialCoefficients(node, variable);
  if (!coeffs) return null;

  const degree = polynomialDegree(node, variable);
  if (degree === 1) {
    const a = coeffs.get(1) || 0;
    const b = coeffs.get(0) || 0;
    if (a === 0) return null;
    return [`${variable} = ${Number((-b / a).toPrecision(12))}`];
  }

  if (degree === 2) {
    const a = coeffs.get(2) || 0;
    const b = coeffs.get(1) || 0;
    const c = coeffs.get(0) || 0;
    if (a === 0) return solvePolynomial(polynomialToAst(new Map([[1, b], [0, c]]), variable), variable);

    const d = b * b - 4 * a * c;
    if (d < 0) {
      const real = -b / (2 * a);
      const imag = Math.sqrt(-d) / Math.abs(2 * a);
      return [
        `${variable} = ${Number(real.toPrecision(12))} + ${Number(imag.toPrecision(12))}i`,
        `${variable} = ${Number(real.toPrecision(12))} - ${Number(imag.toPrecision(12))}i`
      ];
    }

    const sqrtD = Math.sqrt(d);
    return [
      `${variable} = ${Number(((-b + sqrtD) / (2 * a)).toPrecision(12))}`,
      `${variable} = ${Number(((-b - sqrtD) / (2 * a)).toPrecision(12))}`
    ];
  }

  return null;
}
