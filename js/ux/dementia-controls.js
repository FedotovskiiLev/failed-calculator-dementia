import { el, featureToast, t } from "../ui-utils.js";

export const DEMENTIA_ENABLED_KEY = "failed-calculator-dementia-enabled";

export function readDementiaEnabled(storage = localStorage) {
  return storage.getItem(DEMENTIA_ENABLED_KEY) !== "false";
}

export function writeDementiaEnabled(enabled, storage = localStorage) {
  storage.setItem(DEMENTIA_ENABLED_KEY, enabled ? "true" : "false");
}

export function initDementiaControls() {
  const card = document.querySelector("#dementia .card");
  const slider = document.getElementById("decayInterval");
  const damage = document.getElementById("damageBrain");
  const countdown = document.getElementById("decayCountdown");
  if (!card || !slider || !damage) return;

  const section = el("div", { className: "ux-dementia-toggle" });
  const label = el("label", { className: "ux-switch-row" });
  const checkbox = el("input");
  checkbox.type = "checkbox";
  const textBox = el("span");
  const title = el("strong");
  const description = el("small");
  textBox.append(title, description);
  label.append(checkbox, textBox);

  const badge = el("div", { className: "ux-dementia-badge" });
  section.append(label, badge);

  const heading = card.querySelector("h2");
  heading?.after(section);

  let guardTimer = null;

  const pushDecayForward = () => {
    if (readDementiaEnabled()) return;
    slider.dispatchEvent(new Event("change", { bubbles: true }));
    if (countdown) countdown.textContent = t("ВЫКЛ", "OFF");
  };

  const stopGuard = () => {
    if (guardTimer) clearInterval(guardTimer);
    guardTimer = null;
  };

  const startGuard = () => {
    stopGuard();
    pushDecayForward();
    guardTimer = setInterval(pushDecayForward, 400);
  };

  const apply = (announce = false) => {
    const enabled = readDementiaEnabled();
    checkbox.checked = enabled;
    damage.disabled = !enabled;
    slider.disabled = !enabled;
    section.classList.toggle("disabled", !enabled);

    if (enabled) {
      stopGuard();
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      startGuard();
    }

    badge.textContent = enabled
      ? t("АКТИВНА", "ACTIVE")
      : t("ПАУЗА", "PAUSED");

    title.textContent = t(
      "Деменция включена",
      "Dementia enabled"
    );
    description.textContent = enabled
      ? t(
          "Память может повреждаться автоматически и вручную.",
          "Memory may decay automatically and manually."
        )
      : t(
          "Автоматическое и ручное повреждение памяти остановлено. Уже выученное сохраняется.",
          "Automatic and manual memory damage is paused. Existing knowledge is preserved."
        );

    if (announce) {
      featureToast(enabled
        ? t("Деменция снова включена", "Dementia enabled")
        : t("Деменция выключена — память не будет разрушаться", "Dementia paused — memory will not decay")
      );
    }
  };

  checkbox.addEventListener("change", () => {
    writeDementiaEnabled(checkbox.checked);
    apply(true);
  });

  // Block the legacy manual-damage handler before it receives the click.
  damage.addEventListener("click", event => {
    if (!readDementiaEnabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      featureToast(t(
        "Деменция выключена",
        "Dementia is paused"
      ));
    }
  }, true);

  new MutationObserver(() => apply(false)).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });

  apply(false);
}
