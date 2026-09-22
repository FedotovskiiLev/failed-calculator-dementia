import { initHistory } from "./history.js";
import { initBrainTransfer } from "./brain-transfer.js";
import { initPlotTools } from "./plot-tools.js";
import { initCasLayer } from "./cas/ui.js";
import { initWorkbench } from "./workbench/ui.js";
import { initInteractivePlot } from "./workbench/plot-interaction.js";
import { applyBuildVersion } from "./version.js";
import { initAutocomplete } from "./ux/autocomplete.js";
import { initCommandPalette } from "./ux/command-palette.js";
import { initDementiaControls } from "./ux/dementia-controls.js";
import { initThinkingControls } from "./ux/thinking-controls.js";
import { initResultActions } from "./ux/result-actions.js";
import { initErrorHelp } from "./ux/error-help.js";
import { copyText, featureToast, t } from "./ui-utils.js";

function ensureStyles() {
  if (!document.querySelector('link[href="ux.css"]')) {
    const ux = document.createElement("link");
    ux.rel = "stylesheet";
    ux.href = "ux.css";
    document.head.appendChild(ux);
  }

  if (!document.querySelector('link[href="workbench.css"]')) {
    const workbench = document.createElement("link");
    workbench.rel = "stylesheet";
    workbench.href = "workbench.css";
    document.head.appendChild(workbench);
  }
}

function initResultTools() {
  const result = document.getElementById("result");
  if (!result) return;

  const row = document.createElement("div");
  row.className = "feature-result-tools";

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "feature-button tiny subtle";

  copy.addEventListener("click", async () => {
    const ok = await copyText(result.textContent.trim());

    featureToast(
      ok
        ? t("Результат скопирован", "Result copied")
        : t("Не удалось скопировать", "Could not copy")
    );
  });

  const localize = () => {
    copy.textContent = t(
      "КОПИРОВАТЬ РЕЗУЛЬТАТ",
      "COPY RESULT"
    );
  };

  row.appendChild(copy);
  result.after(row);

  new MutationObserver(localize).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();
}

function initKeyboardShortcuts() {
  document.addEventListener("keydown", event => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "Enter"
    ) {
      const calculate =
        document.getElementById("calculate");

      if (calculate && !calculate.disabled) {
        calculate.click();
        event.preventDefault();
      }
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "l"
    ) {
      const input =
        document.getElementById("expression");

      if (input) {
        input.focus();
        input.select();
        event.preventDefault();
      }
    }
  });
}

function boot() {
  ensureStyles();
  applyBuildVersion();

  initWorkbench();
  initCasLayer();

  initAutocomplete();
  initCommandPalette();
  initDementiaControls();
  initThinkingControls();

  initHistory();
  initBrainTransfer();

  initPlotTools();
  initInteractivePlot();

  initResultTools();
  initResultActions();
  initErrorHelp();

  initKeyboardShortcuts();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    boot,
    { once:true }
  );
} else {
  boot();
}
