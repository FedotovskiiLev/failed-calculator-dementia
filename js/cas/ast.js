export function num(value) {
  return { type: "number", value: Number(value) };
}

export function sym(name) {
  return { type: "symbol", name };
}

export function unary(op, arg) {
  return { type: "unary", op, arg };
}

export function binary(op, left, right) {
  return { type: "binary", op, left, right };
}

export function call(name, args) {
  return { type: "call", name, args };
}

export function isNumber(node, value = null) {
  return node?.type === "number" && (value === null || node.value === value);
}

export function clone(node) {
  return structuredClone(node);
}

export function containsSymbol(node, name) {
  if (!node) return false;
  if (node.type === "symbol") return node.name === name;
  if (node.type === "unary") return containsSymbol(node.arg, name);
  if (node.type === "binary") {
    return containsSymbol(node.left, name) || containsSymbol(node.right, name);
  }
  if (node.type === "call") return node.args.some(arg => containsSymbol(arg, name));
  return false;
}

export function symbols(node, out = new Set()) {
  if (!node) return out;
  if (node.type === "symbol") out.add(node.name);
  if (node.type === "unary") symbols(node.arg, out);
  if (node.type === "binary") {
    symbols(node.left, out);
    symbols(node.right, out);
  }
  if (node.type === "call") node.args.forEach(arg => symbols(arg, out));
  return out;
}

const PRECEDENCE = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "^": 3
};

function cleanNumber(value) {
  if (Object.is(value, -0)) return "0";
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(12)));
}

export function print(node, parentPrecedence = 0) {
  if (!node) return "?";

  if (node.type === "number") return cleanNumber(node.value);
  if (node.type === "symbol") return node.name;
  if (node.type === "call") {
    return `${node.name}(${node.args.map(arg => print(arg, 0)).join(", ")})`;
  }
  if (node.type === "unary") {
    const text = `${node.op}${print(node.arg, 4)}`;
    return parentPrecedence > 4 ? `(${text})` : text;
  }

  if (node.type === "binary") {
    const prec = PRECEDENCE[node.op] || 0;
    const rightPrec = node.op === "^" ? prec - 1 : prec;
    const text = `${print(node.left, prec)} ${node.op} ${print(node.right, rightPrec)}`;
    return prec < parentPrecedence ? `(${text})` : text;
  }

  return "?";
}
