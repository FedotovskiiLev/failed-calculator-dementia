import {
  FEATURE_HISTORY_KEY,
  button,
  downloadBlob,
  el,
  featureToast,
  t
} from "./ui-utils.js";

const KEYS = {
  brain: "failed-calculator-brain-v4",
  log: "failed-calculator-observer-log-v4",
  stats: "failed-calculator-stats-v4",
  language: "failed-calculator-language",
  history: FEATURE_HISTORY_KEY
};

function safeParse(value, fallback) {
  try { return value == null ? fallback : JSON.parse(value); }
  catch { return fallback; }
}

export function createSnapshot(storage = sessionStorage, languageStorage = localStorage) {
  return {
    format: "failed-calculator-brain-snapshot",
    version: 1,
    exportedAt: new Date().toISOString(),
    state: {
      brain: safeParse(storage.getItem(KEYS.brain), null),
      observerLog: safeParse(storage.getItem(KEYS.log), []),
      statsHistory: safeParse(storage.getItem(KEYS.stats), []),
      expressionHistory: safeParse(storage.getItem(KEYS.history), []),
      language: languageStorage.getItem(KEYS.language) || "ru"
    }
  };
}

export function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (snapshot.format !== "failed-calculator-brain-snapshot") return false;
  if (snapshot.version !== 1) return false;
  if (!snapshot.state || typeof snapshot.state !== "object") return false;
  if (snapshot.state.language !== "ru" && snapshot.state.language !== "en") return false;
  if (snapshot.state.brain != null && typeof snapshot.state.brain !== "object") return false;
  if (!Array.isArray(snapshot.state.observerLog)) return false;
  if (!Array.isArray(snapshot.state.statsHistory)) return false;
  if (!Array.isArray(snapshot.state.expressionHistory)) return false;
  return true;
}

export function applySnapshot(snapshot, storage = sessionStorage, languageStorage = localStorage) {
  if (!validateSnapshot(snapshot)) throw new Error("Invalid FAILED Calculator snapshot");
  const state = snapshot.state;

  if (state.brain == null) storage.removeItem(KEYS.brain);
  else storage.setItem(KEYS.brain, JSON.stringify(state.brain));
  storage.setItem(KEYS.log, JSON.stringify(state.observerLog));
  storage.setItem(KEYS.stats, JSON.stringify(state.statsHistory));
  storage.setItem(KEYS.history, JSON.stringify(state.expressionHistory));
  languageStorage.setItem(KEYS.language, state.language);
}

export function initBrainTransfer() {
  const card = document.querySelector("#dementia .card");
  if (!card) return;

  const section = el("div", { className: "feature-transfer" });
  const title = el("h3");
  const copy = el("p", { className: "muted" });
  const row = el("div", { className: "feature-button-row" });
  const input = el("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.hidden = true;

  const exportButton = button("", () => {
    const snapshot = createSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
    downloadBlob(blob, `failed-calculator-brain-${stamp}.json`);
    featureToast(t("Снимок мозга экспортирован", "Brain snapshot exported"));
  });

  const importButton = button("", () => input.click(), "feature-button subtle");

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const snapshot = JSON.parse(await file.text());
      if (!validateSnapshot(snapshot)) throw new Error("invalid snapshot");
      applySnapshot(snapshot);
      featureToast(t("Состояние восстановлено. Перезагрузка…", "State restored. Reloading…"));
      setTimeout(() => location.reload(), 350);
    } catch {
      featureToast(t("Этот файл не похож на снимок FAILED Calculator", "This file is not a FAILED Calculator snapshot"));
    } finally {
      input.value = "";
    }
  });

  const localize = () => {
    title.textContent = t("СНИМОК МОЗГА", "BRAIN SNAPSHOT");
    copy.textContent = t(
      "Экспортируйте выученную математику, журнал и историю этой вкладки в локальный JSON-файл или восстановите их позже.",
      "Export the learned mathematics, observer log, and this tab's history to a local JSON file, or restore them later."
    );
    exportButton.textContent = t("ЭКСПОРТ JSON", "EXPORT JSON");
    importButton.textContent = t("ИМПОРТ JSON", "IMPORT JSON");
  };

  row.append(exportButton, importButton, input);
  section.append(title, copy, row);
  card.appendChild(section);

  new MutationObserver(localize).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });
  localize();
}
