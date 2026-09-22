import { el, t } from "../ui-utils.js";

function parseBound(text) {
  const source = String(text)
    .trim()
    .toLowerCase()
    .replaceAll("π","pi");

  if (/^[+-]?\d+(?:\.\d+)?$/.test(source)) {
    return Number(source);
  }

  if (source === "pi") return Math.PI;
  if (source === "-pi") return -Math.PI;

  const match = source.match(
    /^([+-]?\d*(?:\.\d+)?)\s*\*?\s*pi$/
  );

  if (match) {
    const raw = match[1];
    const factor =
      raw === "" || raw === "+"
        ? 1
        : raw === "-"
          ? -1
          : Number(raw);

    return factor * Math.PI;
  }

  return Number(source);
}

export function initInteractivePlot() {
  const canvas = document.getElementById("mathPlotCanvas");
  const minInput = document.getElementById("plotMin");
  const maxInput = document.getElementById("plotMax");
  const plotButton = document.getElementById("plotButton");

  if (!canvas || !minInput || !maxInput || !plotButton) return;

  const wrap = canvas.parentElement;
  const tooltip = el("div", { className:"wb-plot-tooltip" });
  tooltip.hidden = true;

  wrap.style.position = "relative";
  wrap.appendChild(tooltip);

  let dragging = false;
  let startX = 0;
  let startMin = 0;
  let startMax = 0;
  let redrawTimer = null;

  const redraw = () => {
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(() => plotButton.click(), 55);
  };

  canvas.addEventListener("mousemove", event => {
    const rect = canvas.getBoundingClientRect();
    const min = parseBound(minInput.value);
    const max = parseBound(maxInput.value);

    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      return;
    }

    const ratio = (event.clientX - rect.left) / rect.width;
    const x = min + ratio * (max - min);

    tooltip.textContent = `x ≈ ${Number(x.toPrecision(8))}`;
    tooltip.style.left = `${event.clientX - rect.left + 12}px`;
    tooltip.style.top = `${event.clientY - rect.top + 12}px`;
    tooltip.hidden = false;

    if (dragging) {
      const deltaRatio = (event.clientX - startX) / rect.width;
      const span = startMax - startMin;
      const shift = -deltaRatio * span;

      minInput.value = Number((startMin + shift).toPrecision(10));
      maxInput.value = Number((startMax + shift).toPrecision(10));
      redraw();
    }
  });

  canvas.addEventListener("mouseleave", () => {
    tooltip.hidden = true;
  });

  canvas.addEventListener("mousedown", event => {
    const min = parseBound(minInput.value);
    const max = parseBound(maxInput.value);

    if (!Number.isFinite(min) || !Number.isFinite(max)) return;

    dragging = true;
    startX = event.clientX;
    startMin = min;
    startMax = max;

    canvas.classList.add("dragging");
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    canvas.classList.remove("dragging");
  });

  canvas.addEventListener("wheel", event => {
    const rect = canvas.getBoundingClientRect();
    const min = parseBound(minInput.value);
    const max = parseBound(maxInput.value);

    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      return;
    }

    const cursor =
      min +
      ((event.clientX - rect.left) / rect.width) *
      (max - min);

    const factor = event.deltaY > 0 ? 1.18 : 0.84;
    const nextMin = cursor + (min - cursor) * factor;
    const nextMax = cursor + (max - cursor) * factor;

    minInput.value = Number(nextMin.toPrecision(10));
    maxInput.value = Number(nextMax.toPrecision(10));

    redraw();
    event.preventDefault();
  }, { passive:false });

  const hint = el("div", { className:"wb-plot-hint" });

  hint.textContent = t(
    "Колесо — масштаб · перетаскивание — панорама · наведи мышь — координата x",
    "Wheel — zoom · drag — pan · hover — x coordinate"
  );

  wrap.after(hint);
}
