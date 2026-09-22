import { el, t } from "../ui-utils.js";

const TASKS = [
  {
    key:"calculate",
    ru:"Посчитать",
    en:"Calculate",
    hintRu:"обычное выражение",
    hintEn:"ordinary expression",
    template:"2pi + e"
  },
  {
    key:"equation",
    ru:"Решить уравнение",
    en:"Solve equation",
    hintRu:"можно писать со знаком =",
    hintEn:"you can use =",
    template:"x^2 - 5x + 6 = 0"
  },
  {
    key:"plot",
    ru:"Построить график",
    en:"Plot",
    hintRu:"функция от x",
    hintEn:"function of x",
    template:"график sin(x) + x/4"
  },
  {
    key:"derivative",
    ru:"Производная",
    en:"Derivative",
    hintRu:"символьное вычисление",
    hintEn:"symbolic calculus",
    template:"производная x^3 + sin(x)"
  },
  {
    key:"matrix",
    ru:"Матрица",
    en:"Matrix",
    hintRu:"линейная алгебра",
    hintEn:"linear algebra",
    template:"inverse([[1,2],[3,4]])"
  },
  {
    key:"data",
    ru:"Данные",
    en:"Data",
    hintRu:"статистика",
    hintEn:"statistics",
    template:"summary([1,2,3,4,5,10])"
  }
];

function runTemplate(template, run = false) {
  const input = document.getElementById("expression");
  const calculate = document.getElementById("calculate");
  if (!input) return;

  input.value = template;
  input.focus();
  input.dispatchEvent(new Event("input", { bubbles:true }));

  if (run && calculate && !calculate.disabled) {
    calculate.click();
  }
}

function closeSyntaxDetails(syntax) {
  syntax.querySelectorAll("details").forEach(details => {
    details.open = false;
  });
}

function makePanelButton(ru, en, onClick) {
  const button = el("button", {
    className:"workspace-tool-button",
    type:"button"
  });

  button.addEventListener("click", onClick);

  const localize = () => {
    button.textContent = t(ru, en);
  };

  new MutationObserver(localize).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();
  return button;
}

export function initWorkspace() {
  const calculator = document.getElementById("calculator");
  const grid = calculator?.querySelector(".calculator-grid");
  const mainCard = grid?.querySelector(".card:not(.concepts-card)");
  const concepts = grid?.querySelector(".concepts-card");
  const expressionRow = mainCard?.querySelector(".expression-row");
  const input = document.getElementById("expression");
  const result = document.getElementById("result");
  const progress = document.getElementById("progressWrap");
  const thinking = document.getElementById("thinking");
  const syntax = mainCard?.querySelector(".syntax-help");
  const history = calculator?.querySelector(".feature-history-card");

  if (
    !calculator ||
    !grid ||
    !mainCard ||
    !expressionRow ||
    !input ||
    !result
  ) return;

  document.body.classList.add("workspace-v2");
  grid.classList.add("workspace-grid");
  mainCard.classList.add("workspace-main-card");

  if (concepts) {
    concepts.classList.add("workspace-side-panel");
    concepts.hidden = true;
  }

  if (history) {
    history.classList.add("workspace-history-panel");
    history.hidden = true;
  }

  const oldHeading = mainCard.querySelector(":scope > h2");
  if (oldHeading) oldHeading.hidden = true;

  const head = el("div", {
    className:"workspace-query-head"
  });

  const title = el("h2");
  const subtitle = el("p", {
    className:"workspace-query-subtitle"
  });

  const tools = el("div", {
    className:"workspace-top-tools"
  });

  const interpretation = el("div", {
    className:"workspace-interpretation"
  });

  interpretation.hidden = true;

  head.append(title, subtitle, tools, interpretation);
  mainCard.insertBefore(head, expressionRow);

  const taskGrid = el("div", {
    className:"workspace-task-grid"
  });

  for (const task of TASKS) {
    const button = el("button", {
      className:"workspace-task",
      type:"button"
    });

    const name = el("strong");
    const hint = el("small");
    button.append(name, hint);

    const localize = () => {
      name.textContent = t(task.ru, task.en);
      hint.textContent = t(task.hintRu, task.hintEn);
    };

    button.addEventListener("click", () => {
      runTemplate(task.template);
    });

    new MutationObserver(localize).observe(
      document.documentElement,
      {
        attributes:true,
        attributeFilter:["lang"]
      }
    );

    localize();
    taskGrid.appendChild(button);
  }

  expressionRow.after(taskGrid);

  const resultZone = el("section", {
    className:"workspace-result-zone"
  });

  const resultHeading = el("div", {
    className:"workspace-section-heading"
  });

  const resultTitle = el("span");

  const newButton = el("button", {
    className:"workspace-link-button",
    type:"button"
  });

  newButton.addEventListener("click", () => {
    input.value = "";
    result.innerHTML = "";
    interpretation.hidden = true;
    input.focus();
  });

  resultHeading.append(resultTitle, newButton);
  resultZone.append(resultHeading);

  if (progress) {
    progress.after(resultZone);
  } else {
    taskGrid.after(resultZone);
  }

  resultZone.appendChild(result);

  const resultTools =
    mainCard.querySelector(".feature-result-tools");

  const resultActions =
    mainCard.querySelector(".ux-result-actions");

  const errorHelp =
    mainCard.querySelector(".ux-error-help");

  if (resultTools) resultZone.appendChild(resultTools);
  if (resultActions) resultZone.appendChild(resultActions);
  if (errorHelp) resultZone.appendChild(errorHelp);

  const reasoning = document.createElement("details");
  reasoning.className = "workspace-reasoning";

  const reasoningSummary = document.createElement("summary");
  const reasoningLabel = el("span");
  const reasoningHint = el("small");

  reasoningSummary.append(reasoningLabel, reasoningHint);
  reasoning.appendChild(reasoningSummary);

  const thinkingBar =
    mainCard.querySelector(".ux-thinking-bar");

  if (thinkingBar) reasoning.appendChild(thinkingBar);
  if (thinking) reasoning.appendChild(thinking);

  resultZone.after(reasoning);

  let reference = null;

  if (syntax) {
    closeSyntaxDetails(syntax);

    reference = document.createElement("details");
    reference.className = "workspace-reference";

    const summary = document.createElement("summary");
    const referenceLabel = el("span");
    summary.append(referenceLabel);

    reference.append(summary, syntax);
    reasoning.after(reference);

    const localizeReference = () => {
      referenceLabel.textContent =
        t("Все функции и синтаксис", "All functions and syntax");
    };

    new MutationObserver(localizeReference).observe(
      document.documentElement,
      {
        attributes:true,
        attributeFilter:["lang"]
      }
    );

    localizeReference();
  }

  const commandButton = makePanelButton(
    "КОМАНДЫ  Ctrl+K",
    "COMMANDS  Ctrl+K",
    () => {
      const paletteButton =
        document.querySelector(".ux-input-toolbar button");
      paletteButton?.click();
    }
  );

  const memoryButton = makePanelButton(
    "ПАМЯТЬ",
    "MEMORY",
    () => {
      if (!concepts) return;
      concepts.hidden = !concepts.hidden;

      if (!concepts.hidden) {
        concepts.scrollIntoView({
          behavior:"smooth",
          block:"start"
        });
      }
    }
  );

  const historyButton = makePanelButton(
    "ИСТОРИЯ",
    "HISTORY",
    () => {
      if (!history) return;
      history.hidden = !history.hidden;

      if (!history.hidden) {
        history.scrollIntoView({
          behavior:"smooth",
          block:"start"
        });
      }
    }
  );

  const referenceButton = makePanelButton(
    "СПРАВКА",
    "REFERENCE",
    () => {
      if (!reference) return;
      reference.open = !reference.open;

      if (reference.open) {
        reference.scrollIntoView({
          behavior:"smooth",
          block:"nearest"
        });
      }
    }
  );

  tools.append(
    commandButton,
    memoryButton,
    historyButton,
    referenceButton
  );

  document.addEventListener(
    "failed-calculator:interpreted",
    event => {
      const detail = event.detail || {};

      interpretation.innerHTML = "";

      const label = el("span", {
        text:t(
          `Понял как: ${detail.reasonRu || ""}`,
          `Interpreted as: ${detail.reasonEn || ""}`
        )
      });

      const code = el("code", {
        text:String(detail.source || "")
      });

      interpretation.append(label, code);
      interpretation.hidden = false;
    }
  );

  document.addEventListener(
    "failed-calculator:run-end",
    () => {
      taskGrid.classList.add("compact");
      resultZone.classList.add("has-result");

      resultZone.scrollIntoView({
        behavior:"smooth",
        block:"nearest"
      });
    }
  );

  document.addEventListener("keydown", event => {
    const target = event.target;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable;

    if (
      event.key === "/" &&
      !typing &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      input.focus();
      event.preventDefault();
    }
  });

  const localize = () => {
    title.textContent =
      t("Что посчитать?", "What should we solve?");

    subtitle.textContent =
      t(
        "Можно писать обычную математику, уравнение со знаком = или выбрать готовое действие.",
        "Type ordinary math, an equation with =, or choose a common task."
      );

    resultTitle.textContent =
      t("РЕЗУЛЬТАТ", "RESULT");

    newButton.textContent =
      t("НОВЫЙ ЗАПРОС", "NEW QUERY");

    reasoningLabel.textContent =
      t("Как он до этого додумался", "How it got there");

    reasoningHint.textContent =
      t(
        "внутренний монолог и обучение",
        "reasoning trace and learning"
      );

    input.placeholder =
      t(
        "Например: x^2 = 2, sin x, производная x^3…",
        "For example: x^2 = 2, sin x, derivative x^3…"
      );
  };

  new MutationObserver(localize).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();
}
