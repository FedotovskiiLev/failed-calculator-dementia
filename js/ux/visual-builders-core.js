function number(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number: ${value}`);
  return parsed;
}

export function parseNumberList(text) {
  const parts = String(text || "")
    .split(/[\s,;]+/)
    .map(x => x.trim())
    .filter(Boolean);

  if (!parts.length) throw new Error("Enter at least one number");
  return parts.map(number);
}

export function buildMatrixCommand(matrix, action = "det") {
  if (!Array.isArray(matrix) || !matrix.length || !matrix.every(Array.isArray)) {
    throw new Error("Matrix is empty");
  }

  const width = matrix[0].length;
  if (!width || !matrix.every(row => row.length === width)) {
    throw new Error("Matrix must be rectangular");
  }

  const numeric = matrix.map(row => row.map(number));
  const literal = JSON.stringify(numeric);

  const supported = new Set(["det","inverse","transpose","rank","trace","eigen2"]);
  if (!supported.has(action)) throw new Error(`Unsupported matrix action: ${action}`);

  return `${action}(${literal})`;
}

export function buildLinearSystemCommand(matrix, rhs, variables) {
  if (!Array.isArray(matrix) || !matrix.length) throw new Error("Coefficient matrix is empty");
  const numericMatrix = matrix.map(row => row.map(number));
  const numericRhs = rhs.map(number);

  if (numericMatrix.length !== numericRhs.length) {
    throw new Error("Equation count and right-hand side length differ");
  }

  const cols = numericMatrix[0].length;
  if (!numericMatrix.every(row => row.length === cols)) {
    throw new Error("Coefficient matrix must be rectangular");
  }

  if (!Array.isArray(variables) || variables.length !== cols) {
    throw new Error("Variable count must match coefficient columns");
  }

  const names = variables.map(name => String(name).trim());
  if (!names.every(name => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
    throw new Error("Variable names must be identifiers");
  }

  return `linsolve(${JSON.stringify(numericMatrix)},${JSON.stringify(numericRhs)},[${names.join(",")}])`;
}

export function buildDataCommand(values, action = "summary", secondValues = null) {
  const first = Array.isArray(values) ? values.map(number) : parseNumberList(values);
  const firstLiteral = JSON.stringify(first);

  const single = new Set(["summary","mean","median","variance","stdev"]);
  if (single.has(action)) return `${action}(${firstLiteral})`;

  if (action === "linreg") {
    const second = Array.isArray(secondValues)
      ? secondValues.map(number)
      : parseNumberList(secondValues);

    if (first.length !== second.length) {
      throw new Error("x and y lists must have equal length");
    }

    return `linreg(${firstLiteral},${JSON.stringify(second)})`;
  }

  throw new Error(`Unsupported data action: ${action}`);
}
