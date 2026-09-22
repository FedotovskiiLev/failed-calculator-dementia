function assertData(values) {
  if (!Array.isArray(values) || !values.length || !values.every(Number.isFinite)) {
    throw new Error("Expected a non-empty numeric data vector");
  }
  return values.map(Number);
}

export function mean(values) {
  values = assertData(values);
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

export function median(values) {
  values = assertData(values).slice().sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2
    ? values[mid]
    : (values[mid - 1] + values[mid]) / 2;
}

export function variance(values, sample = false) {
  values = assertData(values);
  if (sample && values.length < 2) {
    throw new Error("Sample variance requires at least two values");
  }
  const center = mean(values);
  let sum = 0;
  for (const value of values) {
    const d = value - center;
    sum += d * d;
  }
  return sum / (values.length - (sample ? 1 : 0));
}

function sqrtNewton(value) {
  if (value < 0) return NaN;
  if (value === 0) return 0;
  let x = value >= 1 ? value : 1;
  for (let i = 0; i < 24; i++) x = 0.5 * (x + value / x);
  return x;
}

export function stdev(values, sample = false) {
  return sqrtNewton(variance(values, sample));
}

export function quantile(values, q) {
  values = assertData(values).slice().sort((a, b) => a - b);
  q = Number(q);
  if (!(q >= 0 && q <= 1)) throw new Error("Quantile q must be between 0 and 1");
  if (values.length === 1) return values[0];

  const position = (values.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return values[lower];

  const weight = position - lower;
  return values[lower] * (1 - weight) + values[upper] * weight;
}

export function summary(values) {
  values = assertData(values);
  return {
    count: values.length,
    min: Math.min(...values),
    q1: quantile(values, 0.25),
    median: median(values),
    mean: mean(values),
    q3: quantile(values, 0.75),
    max: Math.max(...values),
    variance: variance(values),
    stdev: stdev(values)
  };
}

export function linearRegression(xs, ys) {
  xs = assertData(xs);
  ys = assertData(ys);

  if (xs.length !== ys.length) throw new Error("x and y data must have equal length");
  if (xs.length < 2) throw new Error("Linear regression requires at least two points");

  const mx = mean(xs);
  const my = mean(ys);

  let numerator = 0;
  let denominator = 0;
  let totalY = 0;
  let residual = 0;

  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx;
    numerator += dx * (ys[i] - my);
    denominator += dx * dx;
  }

  if (Math.abs(denominator) < 1e-15) throw new Error("x values have zero variance");

  const slope = numerator / denominator;
  const intercept = my - slope * mx;

  for (let i = 0; i < xs.length; i++) {
    const predicted = slope * xs[i] + intercept;
    const dy = ys[i] - my;
    const er = ys[i] - predicted;
    totalY += dy * dy;
    residual += er * er;
  }

  const r2 = totalY === 0 ? 1 : 1 - residual / totalY;

  return {
    slope: Number(slope.toPrecision(12)),
    intercept: Number(intercept.toPrecision(12)),
    r2: Number(r2.toPrecision(12)),
    equation: `y = ${Number(slope.toPrecision(12))} * x ${intercept >= 0 ? "+" : "-"} ${Math.abs(Number(intercept.toPrecision(12)))}`
  };
}
