import {
  executeWorkbenchCommand,
  parseWorkbenchCommand
} from "./commands.js";
import {
  copyText,
  el,
  featureToast,
  t
} from "../ui-utils.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function matrixHtml(matrix) {
  return `
    <div class="wb-matrix">
      <span class="wb-bracket">[</span>
      <table>
        ${matrix.map(
          row => `<tr>${row.map(
            value => `<td>${escapeHtml(value)}</td>`
          ).join("")}</tr>`
        ).join("")}
      </table>
      <span class="wb-bracket">]</span>
    </div>
  `;
}

function vectorHtml(vector) {
  return matrixHtml(vector.map(value => [value]));
}

function resultBody(result) {
  if (result.kind === "matrix") return matrixHtml(result.value);
  if (result.kind === "vector") return vectorHtml(result.value);

  if (result.kind === "system") {
    return `
      <div class="wb-equations">
        ${result.equations.map(
          equation => `<div>${escapeHtml(equation)}</div>`
        ).join("")}
      </div>
    `;
  }

  if (result.kind === "series") {
    return `<div class="wb-expression">${escapeHtml(result.value)}</div>`;
  }

  return `<div class="wb-scalar">${escapeHtml(result.value)}</div>`;
}

function dispatch(source, resultElement) {
  const detail = {
    source,
    resultText:resultElement.textContent.trim(),
    resultHtml:resultElement.innerHTML,
    finishedAt:Date.now()
  };

  document.dispatchEvent(
    new CustomEvent("failed-calculator:result-change", { detail })
  );

  document.dispatchEvent(
    new CustomEvent("failed-calculator:run-end", { detail })
  );
}

function render(source, result) {
  const target = document.getElementById("result");
  if (!target) return;

  target.dataset.touched = "1";

  target.innerHTML = `
    <div class="wb-result-card">
      <div class="wb-result-kicker">${escapeHtml(result.title || "Workbench")}</div>
      ${resultBody(result)}
      <div class="wb-result-meta">${escapeHtml(source)}</div>
    </div>
  `;

  const card = target.querySelector(".wb-result-card");
  const toolbar = el("div", { className:"wb-card-actions" });

  const copy = el("button", {
    className:"feature-button tiny subtle",
    type:"button",
    text:t("КОПИРОВАТЬ", "COPY")
  });

  copy.addEventListener("click", async () => {
    const ok = await copyText(target.textContent.trim());
    featureToast(
      ok
        ? t("Результат скопирован", "Result copied")
        : t("Не удалось скопировать", "Could not copy")
    );
  });

  toolbar.append(copy);

  if (result.kind === "series") {
    const plot = el("button", {
      className:"feature-button tiny subtle",
      type:"button",
      text:t("ГРАФИК ПОЛИНОМА", "PLOT POLYNOMIAL")
    });

    plot.addEventListener("click", () => {
      const input = document.getElementById("expression");
      const calculate = document.getElementById("calculate");

      input.value = `plot(${result.value},${result.variable},-10,10)`;
      calculate.click();
    });

    toolbar.append(plot);
  }

  card.append(toolbar);
  dispatch(source, target);
}

function renderError(source, error) {
  const target = document.getElementById("result");
  if (!target) return;

  target.dataset.touched = "1";

  target.innerHTML = `
    <div class="wb-result-card error">
      <div class="wb-result-kicker">${t("WORKBENCH: ОШИБКА", "WORKBENCH: ERROR")}</div>
      <div>${escapeHtml(error?.message || error)}</div>
      <div class="wb-result-meta">${escapeHtml(source)}</div>
    </div>
  `;

  dispatch(source, target);
}

function tryRun(source) {
  if (!parseWorkbenchCommand(source)) return false;

  try {
    const result = executeWorkbenchCommand(source);
    if (!result) return false;
    render(source, result);
  } catch (error) {
    renderError(source, error);
  }

  return true;
}

function installInterceptors() {
  document.addEventListener("click", event => {
    const calculate = document.getElementById("calculate");
    if (event.target !== calculate) return;

    const source =
      document.getElementById("expression")?.value?.trim() || "";

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

  if (!help || help.querySelector("[data-workbench-reference]")) return;

  const details = el("details");
  details.dataset.workbenchReference = "1";

  const summary = el("summary");
  const chips = el("div", { className:"syntax-chips" });

  const templates = [
    ["det([[1,2],[3,4]])","det(A)"],
    ["inverse([[1,2],[3,4]])","inverse(A)"],
    ["matmul([[1,2],[3,4]],[[5,6],[7,8]])","matmul(A,B)"],
    ["rank([[1,2],[2,4]])","rank(A)"],
    ["dot([1,2,3],[4,5,6])","dot(a,b)"],
    ["cross([1,0,0],[0,1,0])","cross(a,b)"],
    ["linsolve([[2,1],[1,-1]],[5,1],[x,y])","linsolve(A,b,[x,y])"],
    ["taylor(sin(x),x,0,7)","taylor(f,x,a,n)"]
  ];

  for (const [template,label] of templates) {
    const button = el("button");
    button.dataset.template = template;
    button.appendChild(el("code", { text:label }));

    button.addEventListener("click", () => {
      const input = document.getElementById("expression");
      input.value = template;
      input.focus();
    });

    chips.appendChild(button);
  }

  const localize = () => {
    summary.textContent = t(
      "WORKBENCH: матрицы, векторы и ряды",
      "WORKBENCH: matrices, vectors, and series"
    );
  };

  details.append(summary, chips);
  help.appendChild(details);

  new MutationObserver(localize).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();
}

export function initWorkbench() {
  installInterceptors();
  injectReference();
}
