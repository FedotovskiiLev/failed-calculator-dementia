import { SLOT } from "./structured-input-core.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function replaceFractions(html) {
  // Handles the explicit structured-input shape "(...)/(...)"
  // for simple, non-nested inner expressions.
  const fraction =
    /\(([^()]*)\)\/\(([^()]*)\)/g;

  let previous = null;

  while (previous !== html) {
    previous = html;

    html = html.replace(
      fraction,
      (_, numerator, denominator) =>
        `<span class="structured-frac">` +
          `<span class="structured-num">${numerator}</span>` +
          `<span class="structured-den">${denominator}</span>` +
        `</span>`
    );
  }

  return html;
}

function replacePowers(html) {
  return html.replace(
    /\^\(([^()]*)\)/g,
    (_, exponent) =>
      `<sup class="structured-power">${exponent}</sup>`
  );
}

export function structuredPreviewHtml(source) {
  let html = escapeHtml(source);

  html = html
    .replace(/\bpi\b/g, "π")
    .replace(/\*/g, "·")
    .replace(
      new RegExp(escapeHtml(SLOT), "g"),
      `<span class="structured-slot">${SLOT}</span>`
    );

  html = replaceFractions(html);
  html = replacePowers(html);

  html = html.replace(
    /sqrt\(([^()]*)\)/g,
    (_, body) =>
      `<span class="structured-root">` +
        `<span class="structured-root-symbol">√</span>` +
        `<span class="structured-radicand">${body}</span>` +
      `</span>`
  );

  return html || "—";
}
