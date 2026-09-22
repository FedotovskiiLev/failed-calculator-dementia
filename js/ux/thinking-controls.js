import { el, t } from "../ui-utils.js";

export const THINKING_COMPACT_KEY = "failed-calculator-thinking-compact";

export function readThinkingCompact(storage = localStorage) {
  const value = storage.getItem(THINKING_COMPACT_KEY);
  return value == null ? true : value === "true";
}

export function initThinkingControls() {
  const thinking = document.getElementById("thinking");
  if (!thinking) return;

  const bar = el("div", { className: "ux-thinking-bar" });
  const label = el("span");
  const toggle = el("button", {
    className: "feature-button tiny subtle",
    type: "button"
  });
  bar.append(label, toggle);
  thinking.before(bar);

  const apply = () => {
    const compact = readThinkingCompact();
    document.body.classList.toggle("thinking-compact", compact);
    label.textContent = t(
      "ХОД РАССУЖДЕНИЯ",
      "REASONING TRACE"
    );
    toggle.textContent = compact
      ? t("РАЗВЕРНУТЬ", "EXPAND")
      : t("СВЕРНУТЬ", "COMPACT");
  };

  toggle.addEventListener("click", () => {
    localStorage.setItem(
      THINKING_COMPACT_KEY,
      String(!readThinkingCompact())
    );
    apply();
  });

  new MutationObserver(apply).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });

  apply();
}
