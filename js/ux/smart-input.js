const POLY_CHARS = /^[0-9A-Za-z_+\-*/^().\s]+$/;

function oneVariable(source) {
  const candidates = ["x", "y", "z", "t", "n"];
  return candidates.find(name => new RegExp(`\\b${name}\\b`).test(source)) || null;
}

function simpleAtom(source) {
  return /^[A-Za-z_][A-Za-z0-9_]*$|^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(source.trim());
}

export function interpretFriendlyInput(raw) {
  const source = String(raw || "").trim();
  if (!source) return null;

  const prefixes = [
    { re:/^(?:график|построй|plot)\s+(.+)$/i, build:x=>`plot(${x},x,-10,10)`, ru:"построить график", en:"plot function" },
    { re:/^(?:производная|derivative|differentiate)\s+(.+)$/i, build:x=>`diff(${x},x)`, ru:"найти производную", en:"differentiate" },
    { re:/^(?:первообразная|antiderivative)\s+(.+)$/i, build:x=>`antiderivative(${x},x)`, ru:"найти первообразную", en:"antiderivative" },
    { re:/^(?:упрости|simplify)\s+(.+)$/i, build:x=>`simplify(${x})`, ru:"упростить", en:"simplify" },
    { re:/^(?:раскрой|expand)\s+(.+)$/i, build:x=>`expand(${x})`, ru:"раскрыть скобки", en:"expand" },
    { re:/^(?:разложи|factor)\s+(.+)$/i, build:x=>`factor(${x},x)`, ru:"разложить на множители", en:"factor" },
    { re:/^(?:корни|roots)\s+(.+)$/i, build:x=>`roots(${x},x)`, ru:"найти корни", en:"find roots" },
    { re:/^(?:таблица|table)\s+(.+)$/i, build:x=>`table(${x},x,-5,5,1)`, ru:"построить таблицу", en:"make value table" }
  ];

  for (const rule of prefixes) {
    const match = source.match(rule.re);
    if (match) {
      return {
        source: rule.build(match[1].trim()),
        reasonRu: rule.ru,
        reasonEn: rule.en
      };
    }
  }

  const equation = source.match(/^(.+?)=(.+)$/);
  if (
    equation &&
    !source.includes("==") &&
    POLY_CHARS.test(equation[1]) &&
    POLY_CHARS.test(equation[2])
  ) {
    const variable = oneVariable(source);

    if (variable) {
      const left = equation[1].trim();
      const right = equation[2].trim();

      return {
        source: `roots((${left})-(${right}),${variable})`,
        reasonRu: "распознал полиномиальное уравнение",
        reasonEn: "recognized a polynomial equation"
      };
    }
  }

  const simpleFunction = source.match(
    /^(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|ln|exp|sqrt|abs)\s+(.+)$/i
  );

  if (simpleFunction && simpleAtom(simpleFunction[2])) {
    return {
      source: `${simpleFunction[1].toLowerCase()}(${simpleFunction[2].trim()})`,
      reasonRu: "добавил привычные скобки функции",
      reasonEn: "inserted function parentheses"
    };
  }

  return null;
}

export function initSmartInput() {
  const input = document.getElementById("expression");
  const calculate = document.getElementById("calculate");
  if (!input || !calculate) return;

  const rewrite = () => {
    const interpreted = interpretFriendlyInput(input.value);
    if (!interpreted || interpreted.source === input.value.trim()) return;

    const original = input.value.trim();
    input.value = interpreted.source;

    document.dispatchEvent(
      new CustomEvent("failed-calculator:interpreted", {
        detail: {
          original,
          source: interpreted.source,
          reasonRu: interpreted.reasonRu,
          reasonEn: interpreted.reasonEn
        }
      })
    );
  };

  calculate.addEventListener("click", rewrite, true);

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") rewrite();
  }, true);
}
