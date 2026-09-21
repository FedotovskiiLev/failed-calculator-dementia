import {
  FEATURE_HISTORY_KEY,
  button,
  copyText,
  el,
  featureToast,
  t
} from "./ui-utils.js";

const LIMIT = 40;

export function parseHistory(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.source === "string") : [];
  } catch {
    return [];
  }
}

function loadHistory() {
  return parseHistory(sessionStorage.getItem(FEATURE_HISTORY_KEY));
}

function saveHistory(history) {
  sessionStorage.setItem(FEATURE_HISTORY_KEY, JSON.stringify(history.slice(-LIMIT)));
}

function runExpression(source) {
  const input = document.getElementById("expression");
  const calculate = document.getElementById("calculate");
  if (!input || !calculate) return;
  input.value = source;
  input.focus();
  calculate.click();
}

export function initHistory() {
  const calculator = document.getElementById("calculator");
  const input = document.getElementById("expression");
  if (!calculator || !input) return;

  const panel = el("article", { className: "card feature-history-card" });
  panel.innerHTML = `
    <div class="feature-heading-row">
      <div>
        <h2 data-feature-title></h2>
        <p class="muted" data-feature-subtitle></p>
      </div>
      <button type="button" class="feature-button subtle" data-history-clear></button>
    </div>
    <div class="feature-history-list" data-history-list></div>
  `;
  calculator.appendChild(panel);

  const title = panel.querySelector("[data-feature-title]");
  const subtitle = panel.querySelector("[data-feature-subtitle]");
  const clear = panel.querySelector("[data-history-clear]");
  const list = panel.querySelector("[data-history-list]");

  const localize = () => {
    title.textContent = t("ИСТОРИЯ ВЫЧИСЛЕНИЙ", "CALCULATION HISTORY");
    subtitle.textContent = t(
      "Хранится только в этой вкладке. Нажмите выражение, чтобы запустить его снова.",
      "Stored only in this tab. Click an expression to run it again."
    );
    clear.textContent = t("ОЧИСТИТЬ", "CLEAR");
  };

  const render = () => {
    const history = loadHistory().slice().reverse();
    list.innerHTML = "";
    if (!history.length) {
      list.appendChild(el("div", {
        className: "empty-state",
        text: t("История пока пуста.", "History is empty.")
      }));
      return;
    }

    for (const item of history.slice(0, 24)) {
      const row = el("div", { className: "feature-history-item" });
      const main = button(item.source, () => runExpression(item.source), "history-expression");
      const result = el("div", { className: "history-result", text: item.resultText || "—" });
      const actions = el("div", { className: "history-actions" });
      actions.append(
        button(t("СНОВА", "RERUN"), () => runExpression(item.source), "feature-button tiny"),
        button(t("КОПИРОВАТЬ", "COPY"), async () => {
          const ok = await copyText(item.resultText || item.source);
          featureToast(ok ? t("Скопировано", "Copied") : t("Не удалось скопировать", "Could not copy"));
        }, "feature-button tiny subtle")
      );
      row.append(main, result, actions);
      list.appendChild(row);
    }
  };

  document.addEventListener("failed-calculator:run-end", event => {
    const detail = event.detail || {};
    const source = String(detail.source || "").trim();
    if (!source) return;
    const history = loadHistory();
    const last = history[history.length - 1];
    const entry = {
      source,
      resultText: String(detail.resultText || "").trim(),
      finishedAt: Number(detail.finishedAt || Date.now())
    };
    if (last && last.source === entry.source && last.resultText === entry.resultText) {
      last.finishedAt = entry.finishedAt;
    } else {
      history.push(entry);
    }
    saveHistory(history);
    render();
  });

  clear.addEventListener("click", () => {
    sessionStorage.removeItem(FEATURE_HISTORY_KEY);
    render();
  });

  let cursor = null;
  input.addEventListener("keydown", event => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const history = loadHistory();
    if (!history.length) return;

    if (cursor === null) cursor = history.length;
    if (event.key === "ArrowUp") cursor = Math.max(0, cursor - 1);
    else cursor = Math.min(history.length, cursor + 1);

    if (cursor < history.length) input.value = history[cursor].source;
    else input.value = "";
    event.preventDefault();
  });

  input.addEventListener("input", () => { cursor = null; });

  const languageObserver = new MutationObserver(() => {
    localize();
    render();
  });
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  localize();
  render();
}
