import { button, copyText, downloadBlob, el, featureToast, t } from "./ui-utils.js";

function setRange(min, max) {
  const a = document.getElementById("plotMin");
  const b = document.getElementById("plotMax");
  if (!a || !b) return;
  a.value = min;
  b.value = max;
}

export function initPlotTools() {
  const card = document.querySelector("#charts .math-plot-card");
  const canvas = document.getElementById("mathPlotCanvas");
  if (!card || !canvas) return;

  const tools = el("div", { className: "feature-plot-tools" });
  const presets = el("div", { className: "feature-button-row wrap" });
  const actions = el("div", { className: "feature-button-row wrap" });
  const label = el("span", { className: "feature-inline-label" });

  const ranges = [
    ["[-10, 10]", "-10", "10"],
    ["[-π, π]", "-pi", "pi"],
    ["[0, 2π]", "0", "2pi"]
  ];

  for (const [name, min, max] of ranges) {
    presets.appendChild(button(name, () => setRange(min, max), "feature-button tiny subtle"));
  }

  const fromInput = button("", () => {
    const expression = document.getElementById("expression")?.value?.trim();
    const plotExpression = document.getElementById("plotExpression");
    if (!expression || !plotExpression) return;
    plotExpression.value = expression;
    featureToast(t("Выражение перенесено в график", "Expression copied to plotter"));
  });

  const copyCommand = button("", async () => {
    const expr = document.getElementById("plotExpression")?.value?.trim() || "x";
    const min = document.getElementById("plotMin")?.value?.trim() || "-10";
    const max = document.getElementById("plotMax")?.value?.trim() || "10";
    const ok = await copyText(`plot(${expr},x,${min},${max})`);
    featureToast(ok ? t("Команда графика скопирована", "Plot command copied") : t("Не удалось скопировать", "Could not copy"));
  }, "feature-button subtle");

  const png = button("PNG", () => {
    canvas.toBlob(blob => {
      if (!blob) return;
      downloadBlob(blob, "failed-calculator-plot.png");
      featureToast(t("График сохранён в PNG", "Plot saved as PNG"));
    }, "image/png");
  }, "feature-button subtle");

  const localize = () => {
    label.textContent = t("Быстрый диапазон:", "Quick range:");
    fromInput.textContent = t("ВЗЯТЬ ИЗ КАЛЬКУЛЯТОРА", "USE CALCULATOR INPUT");
    copyCommand.textContent = t("КОПИРОВАТЬ КОМАНДУ", "COPY COMMAND");
  };

  presets.prepend(label);
  actions.append(fromInput, copyCommand, png);
  tools.append(presets, actions);
  card.querySelector(".plot-controls")?.after(tools);

  new MutationObserver(localize).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });
  localize();
}
