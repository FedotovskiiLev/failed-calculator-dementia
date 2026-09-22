import { button, el, t } from "../ui-utils.js";

function run(source) {
  const input = document.getElementById("expression");
  const calculate = document.getElementById("calculate");
  if (!input || !calculate) return;
  input.value = source;
  input.focus();
  calculate.click();
}

export function buildActions(source) {
  source = String(source || "").trim();
  if (!source) return [];

  const actions = [];
  const hasX = /\bx\b/.test(source);
  const plain = !/^(?:simplify|expand|factor|subs|gradient|degree|collect|roots|plot|diff|integrate|limit|solve)\s*\(/i.test(source);

  if (plain) {
    actions.push({
      key: "simplify",
      ru: "УПРОСТИТЬ",
      en: "SIMPLIFY",
      source: `simplify(${source})`
    });
  }

  if (hasX && plain) {
    actions.push(
      { key:"diff", ru:"ПРОИЗВОДНАЯ", en:"DERIVATIVE", source:`diff(${source},x)` },
      { key:"plot", ru:"ГРАФИК", en:"PLOT", source:`plot(${source},x,-10,10)` },
      { key:"expand", ru:"РАСКРЫТЬ", en:"EXPAND", source:`expand(${source})` },
      { key:"factor", ru:"РАЗЛОЖИТЬ", en:"FACTOR", source:`factor(${source},x)` },
      { key:"roots", ru:"КОРНИ", en:"ROOTS", source:`roots(${source},x)` }
    );
  }

  return actions.slice(0, 6);
}

export function initResultActions() {
  const result = document.getElementById("result");
  if (!result) return;

  const section = el("div", { className: "ux-result-actions" });
  const label = el("span", { className: "feature-inline-label" });
  const row = el("div", { className: "feature-button-row wrap" });
  section.append(label, row);

  const tools = result.nextElementSibling?.classList?.contains("feature-result-tools")
    ? result.nextElementSibling
    : null;
  (tools || result).after(section);

  let lastSource = "";

  const render = () => {
    label.textContent = t("Дальше:", "Next:");
    row.innerHTML = "";

    for (const action of buildActions(lastSource)) {
      row.appendChild(
        button(t(action.ru, action.en), () => run(action.source), "feature-button tiny subtle")
      );
    }

    section.hidden = row.children.length === 0;
  };

  document.addEventListener("failed-calculator:run-end", event => {
    lastSource = String(event.detail?.source || "");
    render();
  });

  new MutationObserver(render).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });

  render();
}
