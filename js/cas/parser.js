import { binary, call, num, sym, unary } from "./ast.js";

const KNOWN_CALLS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan",
  "sinh", "cosh", "tanh", "exp", "ln", "log",
  "sqrt", "abs", "re", "im", "conj", "arg"
]);

function normalize(source) {
  return String(source)
    .replaceAll("π", "pi")
    .replaceAll("×", "*")
    .replaceAll("·", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replaceAll("**", "^")
    .trim();
}

function tokenCanEnd(token) {
  return ["number", "ident", ")"].includes(token.type);
}

function tokenCanStart(token) {
  return ["number", "ident", "("].includes(token.type);
}

export function tokenize(source) {
  source = normalize(source);
  const raw = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    const number = source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      raw.push({ type: "number", value: number[0] });
      i += number[0].length;
      continue;
    }

    const ident = source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (ident) {
      raw.push({ type: "ident", value: ident[0] });
      i += ident[0].length;
      continue;
    }

    if ("+-*/^(),".includes(ch)) {
      raw.push({ type: ch, value: ch });
      i++;
      continue;
    }

    throw new Error(`Unexpected symbol: ${ch}`);
  }

  const out = [];
  for (const current of raw) {
    const previous = out[out.length - 1];
    if (
      previous &&
      tokenCanEnd(previous) &&
      tokenCanStart(current) &&
      !(previous.type === "ident" &&
        KNOWN_CALLS.has(previous.value) &&
        current.type === "(")
    ) {
      out.push({ type: "*", value: "*", implicit: true });
    }
    out.push(current);
  }

  out.push({ type: "EOF", value: "EOF" });
  return out;
}

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  peek() {
    return this.tokens[this.position];
  }

  next() {
    return this.tokens[this.position++];
  }

  match(type) {
    if (this.peek().type === type) {
      this.position++;
      return true;
    }
    return false;
  }

  expect(type) {
    const token = this.next();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.value}`);
    }
    return token;
  }

  parse() {
    const node = this.additive();
    if (this.peek().type !== "EOF") {
      throw new Error(`Unexpected tail: ${this.peek().value}`);
    }
    return node;
  }

  additive() {
    let node = this.multiplicative();
    while (["+", "-"].includes(this.peek().type)) {
      const op = this.next().type;
      node = binary(op, node, this.multiplicative());
    }
    return node;
  }

  multiplicative() {
    let node = this.unary();
    while (["*", "/"].includes(this.peek().type)) {
      const op = this.next().type;
      node = binary(op, node, this.unary());
    }
    return node;
  }

  unary() {
    if (this.match("+")) return unary("+", this.unary());
    if (this.match("-")) return unary("-", this.unary());
    return this.power();
  }

  power() {
    let node = this.primary();
    if (this.match("^")) {
      node = binary("^", node, this.unary());
    }
    return node;
  }

  primary() {
    const token = this.peek();

    if (token.type === "number") {
      this.next();
      return num(token.value);
    }

    if (token.type === "ident") {
      this.next();
      const name = token.value;

      if (KNOWN_CALLS.has(name) && this.peek().type === "(") {
        this.expect("(");
        const args = [];
        if (this.peek().type !== ")") {
          args.push(this.additive());
          while (this.match(",")) args.push(this.additive());
        }
        this.expect(")");
        return call(name, args);
      }

      return sym(name);
    }

    if (this.match("(")) {
      const node = this.additive();
      this.expect(")");
      return node;
    }

    throw new Error(`Expected number, symbol, or parenthesis; got ${token.value}`);
  }
}

export function parseExpression(source) {
  return new Parser(tokenize(source)).parse();
}
