export const FEATURE_HISTORY_KEY = "failed-calculator-expression-history-v1";

export function currentLanguage() {
  return document.documentElement.lang === "en" ? "en" : "ru";
}

export function t(ru, en) {
  return currentLanguage() === "en" ? en : ru;
}

export function el(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text != null) node.textContent = options.text;
  if (options.html != null) node.innerHTML = options.html;
  if (options.type) node.type = options.type;
  if (options.title) node.title = options.title;
  if (options.ariaLabel) node.setAttribute("aria-label", options.ariaLabel);
  return node;
}

export function featureToast(message) {
  let toast = document.getElementById("featureToast");
  if (!toast) {
    toast = el("div", { className: "feature-toast" });
    toast.id = "featureToast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(featureToast.timer);
  featureToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

export async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = el("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function button(text, onClick, className = "feature-button") {
  const b = el("button", { className, text, type: "button" });
  b.addEventListener("click", onClick);
  return b;
}
