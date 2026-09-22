import { el, t } from "../ui-utils.js";

export function diagnoseInput(source) {
  source = String(source || "");
  const tips = [];

  const opens = (source.match(/\(/g) || []).length;
  const closes = (source.match(/\)/g) || []).length;
  if (opens > closes) tips.push({ ru:"Не хватает закрывающей скобки )", en:"A closing parenthesis ) is missing" });
  if (closes > opens) tips.push({ ru:"Есть лишняя закрывающая скобка )", en:"There is an extra closing parenthesis )" });

  if (/\b(?:tg)\s*\(/i.test(source)) {
    tips.push({ ru:"Используйте tan(x) вместо tg(x)", en:"Use tan(x) instead of tg(x)" });
  }
  if (/\b(?:arctg)\s*\(/i.test(source)) {
    tips.push({ ru:"Используйте atan(x) вместо arctg(x)", en:"Use atan(x) instead of arctg(x)" });
  }
  if (/√/.test(source)) {
    tips.push({ ru:"Запись корня: sqrt(x)", en:"Square-root syntax: sqrt(x)" });
  }
  if (/[=]/.test(source) && !/\bsolve\s*\(/i.test(source)) {
    tips.push({
      ru:"Для уравнения используйте solve(f(x),x,a,b) или roots(polynomial,x)",
      en:"For equations use solve(f(x),x,a,b) or roots(polynomial,x)"
    });
  }

  return tips;
}

export function initErrorHelp() {
  const result = document.getElementById("result");
  const input = document.getElementById("expression");
  if (!result || !input) return;

  const panel = el("div", { className: "ux-error-help" });
  panel.hidden = true;
  result.after(panel);

  const update = () => {
    const text = result.textContent || "";
    const looksBad =
      /не понял|не смог|undefined|could not|error|ошиб/i.test(text);

    if (!looksBad) {
      panel.hidden = true;
      return;
    }

    const tips = diagnoseInput(input.value);
    if (!tips.length) {
      panel.hidden = true;
      return;
    }

    panel.innerHTML = "";
    panel.appendChild(el("strong", {
      text: t("Возможно, поможет:", "Possible fixes:")
    }));

    const list = el("ul");
    for (const tip of tips) {
      list.appendChild(el("li", { text: t(tip.ru, tip.en) }));
    }
    panel.appendChild(list);
    panel.hidden = false;
  };

  new MutationObserver(update).observe(result, {
    subtree: true,
    childList: true,
    characterData: true
  });
}
