const PI = (() => {
  let value = 3;
  let sign = 1;

  for (let n = 2; n < 162; n += 2) {
    value += sign * 4 / (n * (n + 1) * (n + 2));
    sign *= -1;
  }

  return value;
})();

function reduceAngle(x) {
  const twoPi = 2 * PI;
  while (x > PI) x -= twoPi;
  while (x < -PI) x += twoPi;
  return x;
}

export function sinSeries(x) {
  x = reduceAngle(x);
  let term = x;
  let sum = x;

  for (let n = 1; n < 20; n++) {
    term *= -x * x / ((2 * n) * (2 * n + 1));
    sum += term;
  }

  return sum;
}

export function cosSeries(x) {
  x = reduceAngle(x);
  let term = 1;
  let sum = 1;

  for (let n = 1; n < 20; n++) {
    term *= -x * x / ((2 * n - 1) * (2 * n));
    sum += term;
  }

  return sum;
}

export function expSeries(x) {
  if (x < 0) return 1 / expSeries(-x);

  let scale = 0;
  while (x > 1) {
    x /= 2;
    scale++;
  }

  let term = 1;
  let sum = 1;

  for (let n = 1; n < 30; n++) {
    term *= x / n;
    sum += term;
  }

  while (scale-- > 0) sum *= sum;
  return sum;
}

export function lnSeries(x) {
  if (!(x > 0)) return NaN;

  let shifts = 0;
  while (x > 1.5) {
    x /= 2;
    shifts++;
  }
  while (x < 0.75) {
    x *= 2;
    shifts--;
  }

  const series = value => {
    const y = (value - 1) / (value + 1);
    const y2 = y * y;
    let term = y;
    let sum = 0;

    for (let n = 0; n < 42; n++) {
      sum += term / (2 * n + 1);
      term *= y2;
    }

    return 2 * sum;
  };

  return series(x) + shifts * series(2);
}

export function sqrtNewton(x) {
  if (x < 0) return NaN;
  if (x === 0) return 0;

  let g = x >= 1 ? x : 1;
  for (let i = 0; i < 24; i++) g = 0.5 * (g + x / g);
  return g;
}

function powReal(base, exponent) {
  if (Number.isInteger(exponent)) {
    if (exponent < 0) return 1 / powReal(base, -exponent);

    let out = 1;
    let b = base;
    let e = exponent;

    while (e > 0) {
      if (e % 2) out *= b;
      b *= b;
      e = Math.floor(e / 2);
    }

    return out;
  }

  if (base <= 0) return NaN;
  return expSeries(exponent * lnSeries(base));
}

export function evaluateNumeric(node, env = {}) {
  if (node.type === "number") return node.value;

  if (node.type === "symbol") {
    if (node.name in env) return Number(env[node.name]);
    if (node.name === "pi") return PI;
    if (node.name === "e") return expSeries(1);
    throw new Error(`Unknown numeric symbol: ${node.name}`);
  }

  if (node.type === "unary") {
    const value = evaluateNumeric(node.arg, env);
    return node.op === "-" ? -value : value;
  }

  if (node.type === "binary") {
    const a = evaluateNumeric(node.left, env);
    const b = evaluateNumeric(node.right, env);

    if (node.op === "+") return a + b;
    if (node.op === "-") return a - b;
    if (node.op === "*") return a * b;
    if (node.op === "/") return a / b;
    if (node.op === "^") return powReal(a, b);
  }

  if (node.type === "call" && node.args.length >= 1) {
    const x = evaluateNumeric(node.args[0], env);

    if (node.name === "sin") return sinSeries(x);
    if (node.name === "cos") return cosSeries(x);
    if (node.name === "tan") return sinSeries(x) / cosSeries(x);
    if (node.name === "exp") return expSeries(x);
    if (node.name === "ln") return lnSeries(x);
    if (node.name === "sqrt") return sqrtNewton(x);
    if (node.name === "sinh") return (expSeries(x) - expSeries(-x)) / 2;
    if (node.name === "cosh") return (expSeries(x) + expSeries(-x)) / 2;

    if (node.name === "tanh") {
      const ep = expSeries(x);
      const em = expSeries(-x);
      return (ep - em) / (ep + em);
    }
  }

  throw new Error("This Taylor coefficient is outside the current numeric evaluator");
}

export function factorial(n) {
  if (!Number.isInteger(n) || n < 0) return NaN;

  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}
