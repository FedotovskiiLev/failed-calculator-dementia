import { executeCasCommand, parseCasCommand } from "./commands.js";
import { el, t } from "../ui-utils.js";

function setResult(source, result) {
  const target = document.getElementById("result");
  if (!target) return;

  target.dataset.touched = "1";
  target.innerHTML =
    `<span class="answer symbolic-answer">${escapeHtml(source)} → ${escapeHtml(result.text)}</span>` +
    `<br><small>${escapeHtml(result.explanation || "CAS")}</small>`;

  document.dispatchEvent(new CustomEvent("failed-calculator:result-change", {
    detail: {
      source,
      resultText: target.textContent.trim(),
      finishedAt: Date.now()
    }
  }));

  document.dispatchEvent(new CustomEvent("failed-calculator:run-end", {
    detail: {
      source,
      resultText: target.textContent.trim(),
      finishedAt: Date.now()
    }
  }));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function appendThinking(text) {
  const box = document.getElementById("thinking");
  if (!box) return;
  const row = document.createElement("div");
  row.className = "think-line research";
  const time = new Date().toLocaleTimeString(
    document.documentElement.lang === "en" ? "en-GB" : "ru-RU",
    { hour12: false }
  );
  row.innerHTML = `<span class="time">${time}</span>${escapeHtml(text)}`;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

function tryRun(source) {
  if (!parseCasCommand(source)) return false;

  try {
    appendThinking(t(
      "Распознал символическую CAS-команду. Работаю с деревом выражения.",
      "Recognized a symbolic CAS command. Working with the expression tree."
    ));
    const result = executeCasCommand(source);
    if (!result) return false;
    appendThinking(t(
      `Символьное преобразование завершено: ${result.text}`,
      `Symbolic transformation complete: ${result.text}`
    ));
    setResult(source, result);
  } catch (error) {
    setResult(source, {
      text: t("ошибка CAS", "CAS error"),
      explanation: error?.message || String(error)
    });
  }

  return true;
}


function injectStyles() {
  if (document.getElementById("failedCasStyles")) return;
  const style = document.createElement("style");
  style.id = "failedCasStyles";
  style.textContent = `
    .cas-about { margin-top:24px; padding-top:20px; border-top:1px solid #303740; }
    .cas-about h3 { margin-top:0; }
    [data-cas-reference] summary { color:#cbd9a6; }
    [data-cas-reference] code { white-space:nowrap; }
  `;
  document.head.appendChild(style);
}
function installInterceptors() {
  document.addEventListener("click", event => {
    const calculate = document.getElementById("calculate");
    if (event.target !== calculate) return;

    const source = document.getElementById("expression")?.value?.trim() || "";
    if (!tryRun(source)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener("keydown", event => {
    const input = document.getElementById("expression");
    if (event.target !== input || event.key !== "Enter") return;

    const source = input.value.trim();
    if (!tryRun(source)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

function injectReference() {
  const help = document.querySelector(".syntax-help");
  if (!help || help.querySelector("[data-cas-reference]")) return;

  const details = el("details");
  details.dataset.casReference = "1";

  const summary = el("summary");
  const chips = el("div", { className: "syntax-chips" });

  const templates = [
    ["simplify((x+x)+0)", "simplify(expr)"],
    ["expand((x+1)^3)", "expand(expr)"],
    ["factor(x^2-5x+6,x)", "factor(expr,x)"],
    ["subs(x^2+y,x,3)", "subs(expr,x,value)"],
    ["gradient(x^2+y^2,x,y)", "gradient(expr,x,y)"],
    ["degree(3x^4+2x,x)", "degree(expr,x)"],
    ["collect((x+1)^3,x)", "collect(expr,x)"],
    ["roots(x^2-5x+6,x)", "roots(expr,x)"]
  ];

  for (const [template, label] of templates) {
    const button = el("button");
    button.dataset.template = template;
    const code = el("code", { text: label });
    button.appendChild(code);
    button.addEventListener("click", () => {
      const input = document.getElementById("expression");
      if (!input) return;
      input.value = template;
      input.focus();
    });
    chips.appendChild(button);
  }

  const localize = () => {
    summary.textContent = t(
      "CAS: символьная алгебра",
      "CAS: symbolic algebra"
    );
  };

  details.append(summary, chips);
  help.appendChild(details);

  new MutationObserver(localize).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });
  localize();
}

function injectAboutCard() {
  const about = document.querySelector("#about .card");
  if (!about || about.querySelector("[data-cas-about]")) return;

  const section = el("div", { className: "cas-about" });
  section.dataset.casAbout = "1";
  const title = el("h3");
  const copy = el("p", { className: "muted" });
  const code = el("pre", {
    className: "syntax",
    text:
`simplify((x+x)+0)
expand((x+1)^3)
factor(x^2-5x+6,x)
subs(x^2+y,x,3)
gradient(x^2+y^2,x,y)
degree(3x^4+2x,x)
collect((x+1)^3,x)
roots(x^2-5x+6,x)`
  });

  const localize = () => {
    title.textContent = t("СИМВОЛЬНЫЙ CAS-СЛОЙ", "SYMBOLIC CAS LAYER");
    copy.textContent = t(
      "Эти команды работают с деревом выражения: упрощают, раскрывают скобки, факторизуют поддерживаемые полиномы, делают подстановки, строят градиенты и решают полиномы первой и второй степени.",
      "These commands operate on the expression tree: simplify, expand, factor supported polynomials, substitute expressions, build gradients, and solve first- and second-degree polynomials."
    );
  };

  section.append(title, copy, code);
  about.appendChild(section);
  localize();
}

export function initCasLayer() {
  injectStyles();
  installInterceptors();
  injectReference();
  injectAboutCard();
}
