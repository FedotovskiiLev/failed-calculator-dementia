import { detectIntent, suggestedActions } from "./intent-core.js";
import { el, t } from "../ui-utils.js";

const LABELS = {
  calculation:["Вычисление","Calculation"],
  function:["Функция","Function"],
  equation:["Уравнение","Equation"],
  algebra:["Алгебра","Algebra"],
  calculus:["Матанализ","Calculus"],
  plot:["График / таблица","Plot / table"],
  matrix:["Матрица / система","Matrix / system"],
  data:["Данные","Data"],
  numerical:["Численный метод","Numerical method"],
  discrete:["Дискретная математика","Discrete math"]
};

export function initIntentPreview() {
  const input = document.getElementById("expression");
  const row = document.querySelector(".expression-row");
  if (!input || !row) return;

  const panel = el("div", { className:"intent-preview" });
  const left = el("div", { className:"intent-summary" });
  const badge = el("span", { className:"intent-badge" });
  const text = el("span");
  left.append(badge, text);

  const actions = el("div", { className:"intent-actions" });
  panel.append(left, actions);

  const mathShell = document.querySelector(".math-input-shell");
  (mathShell || row).after(panel);

  const render = () => {
    const source = input.value.trim();
    if (!source) {
      panel.hidden = true;
      return;
    }

    const intent = detectIntent(source);
    const label = LABELS[intent.type] || [intent.type, intent.type];

    badge.textContent = t(label[0], label[1]);
    text.textContent = intent.variable
      ? t(`переменная: ${intent.variable}`, `variable: ${intent.variable}`)
      : t("готово к вычислению", "ready to calculate");

    actions.innerHTML = "";

    for (const action of suggestedActions(source).slice(0,3)) {
      const button = el("button", {
        className:"intent-action",
        type:"button",
        text:t(action.ru, action.en)
      });

      button.addEventListener("click", () => {
        if (!action.template) {
          document.getElementById("calculate")?.click();
          return;
        }

        input.value = action.template;
        input.dispatchEvent(new Event("input", { bubbles:true }));
        input.focus();
      });

      actions.appendChild(button);
    }

    panel.hidden = false;
  };

  input.addEventListener("input", render);
  new MutationObserver(render).observe(document.documentElement, {
    attributes:true,
    attributeFilter:["lang"]
  });

  render();
}
