const EPS = 1e-12;

export function cleanNumber(value) {
  if (Math.abs(value) < EPS) return 0;
  return Number(value.toPrecision(12));
}

export function sqrtNewton(value) {
  if (value < 0) return NaN;
  if (value === 0) return 0;
  let x = value >= 1 ? value : 1;
  for (let i = 0; i < 24; i++) x = 0.5 * (x + value / x);
  return x;
}

export function assertVector(vector) {
  if (!Array.isArray(vector) || !vector.length || !vector.every(Number.isFinite)) {
    throw new Error("Expected a non-empty numeric vector");
  }
  return vector.map(Number);
}

export function assertMatrix(matrix) {
  if (!Array.isArray(matrix) || !matrix.length || !Array.isArray(matrix[0]) || !matrix[0].length) {
    throw new Error("Expected a non-empty numeric matrix");
  }
  const cols = matrix[0].length;
  if (!matrix.every(row => Array.isArray(row) && row.length === cols && row.every(Number.isFinite))) {
    throw new Error("Matrix must be rectangular and numeric");
  }
  return matrix.map(row => row.map(Number));
}

export function shape(matrix) {
  matrix = assertMatrix(matrix);
  return [matrix.length, matrix[0].length];
}

export function transpose(matrix) {
  matrix = assertMatrix(matrix);
  const [rows, cols] = shape(matrix);
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => matrix[r][c])
  );
}

export function trace(matrix) {
  matrix = assertMatrix(matrix);
  const [rows, cols] = shape(matrix);
  if (rows !== cols) throw new Error("Trace requires a square matrix");
  let sum = 0;
  for (let i = 0; i < rows; i++) sum += matrix[i][i];
  return cleanNumber(sum);
}

export function determinant(matrix) {
  matrix = assertMatrix(matrix);
  const [n, cols] = shape(matrix);
  if (n !== cols) throw new Error("Determinant requires a square matrix");

  const a = matrix.map(row => row.slice());
  let det = 1;
  let sign = 1;

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }

    if (Math.abs(a[pivot][col]) < EPS) return 0;

    if (pivot !== col) {
      [a[pivot], a[col]] = [a[col], a[pivot]];
      sign *= -1;
    }

    const p = a[col][col];
    det *= p;

    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / p;
      for (let k = col + 1; k < n; k++) {
        a[row][k] -= factor * a[col][k];
      }
    }
  }

  return cleanNumber(sign * det);
}

export function inverse(matrix) {
  matrix = assertMatrix(matrix);
  const [n, cols] = shape(matrix);
  if (n !== cols) throw new Error("Inverse requires a square matrix");

  const a = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  ]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }

    if (Math.abs(a[pivot][col]) < EPS) throw new Error("Matrix is singular");
    if (pivot !== col) [a[pivot], a[col]] = [a[col], a[pivot]];

    const p = a[col][col];
    for (let k = 0; k < 2 * n; k++) a[col][k] /= p;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let k = 0; k < 2 * n; k++) a[row][k] -= factor * a[col][k];
    }
  }

  return a.map(row => row.slice(n).map(cleanNumber));
}

export function matmul(a, b) {
  a = assertMatrix(a);
  b = assertMatrix(b);
  const [ar, ac] = shape(a);
  const [br, bc] = shape(b);

  if (ac !== br) {
    throw new Error(`Matrix shapes ${ar}×${ac} and ${br}×${bc} cannot be multiplied`);
  }

  const out = Array.from({ length: ar }, () => Array(bc).fill(0));

  for (let i = 0; i < ar; i++) {
    for (let k = 0; k < ac; k++) {
      for (let j = 0; j < bc; j++) {
        out[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return out.map(row => row.map(cleanNumber));
}

export function rank(matrix) {
  const a = assertMatrix(matrix).map(row => row.slice());
  const rows = a.length;
  const cols = a[0].length;
  let r = 0;

  for (let col = 0; col < cols && r < rows; col++) {
    let pivot = r;

    for (let row = r + 1; row < rows; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }

    if (Math.abs(a[pivot][col]) < EPS) continue;
    [a[pivot], a[r]] = [a[r], a[pivot]];

    const p = a[r][col];
    for (let k = col; k < cols; k++) a[r][k] /= p;

    for (let row = 0; row < rows; row++) {
      if (row === r) continue;
      const factor = a[row][col];
      for (let k = col; k < cols; k++) a[row][k] -= factor * a[r][k];
    }

    r++;
  }

  return r;
}

export function dot(a, b) {
  a = assertVector(a);
  b = assertVector(b);

  if (a.length !== b.length) {
    throw new Error("Dot product requires vectors of equal length");
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return cleanNumber(sum);
}

export function cross(a, b) {
  a = assertVector(a);
  b = assertVector(b);

  if (a.length !== 3 || b.length !== 3) {
    throw new Error("Cross product requires two 3D vectors");
  }

  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ].map(cleanNumber);
}

export function norm(vector) {
  vector = assertVector(vector);
  return cleanNumber(sqrtNewton(dot(vector, vector)));
}

export function solveLinear(matrix, vector) {
  matrix = assertMatrix(matrix);
  vector = assertVector(vector);

  const [rows, cols] = shape(matrix);
  if (rows !== cols) {
    throw new Error("Linear solver currently requires a square coefficient matrix");
  }
  if (vector.length !== rows) {
    throw new Error("Right-hand side vector has the wrong length");
  }

  const a = matrix.map((row, i) => [...row, vector[i]]);

  for (let col = 0; col < rows; col++) {
    let pivot = col;

    for (let row = col + 1; row < rows; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }

    if (Math.abs(a[pivot][col]) < EPS) {
      throw new Error("System has no unique solution");
    }

    [a[pivot], a[col]] = [a[col], a[pivot]];

    const p = a[col][col];
    for (let k = col; k <= rows; k++) a[col][k] /= p;

    for (let row = 0; row < rows; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let k = col; k <= rows; k++) {
        a[row][k] -= factor * a[col][k];
      }
    }
  }

  return a.map(row => cleanNumber(row[rows]));
}

export function eigenvalues2(matrix) {
  matrix = assertMatrix(matrix);

  if (matrix.length !== 2 || matrix[0].length !== 2) {
    throw new Error("eigen2 currently supports only 2×2 matrices");
  }

  const tr = matrix[0][0] + matrix[1][1];
  const det = determinant(matrix);
  const discriminant = tr * tr - 4 * det;

  if (discriminant >= 0) {
    const s = sqrtNewton(discriminant);
    return [
      cleanNumber((tr + s) / 2),
      cleanNumber((tr - s) / 2)
    ];
  }

  const real = cleanNumber(tr / 2);
  const imag = cleanNumber(sqrtNewton(-discriminant) / 2);

  return [
    { re: real, im: imag },
    { re: real, im: -imag }
  ];
}
