import { searchCommands } from "./command-catalog.js";
import { applyTemplate } from "./autocomplete.js";
import { el, t } from "../ui-utils.js";

export function initCommandPalette() {
  const input = document.getElementById("expression");
  if (!input) return;

  const overlay = el("div", { className: "ux-palette-overlay" });
  overlay.hidden = true;

  const panel = el("div", { className: "ux-palette" });
  const search = el("input");
  search.type = "search";
  search.autocomplete = "off";

  const hint = el("div", { className: "ux-palette-hint" });
  const list = el("div", { className: "ux-palette-list" });

  panel.append(search, hint, list);
  overlay.append(panel);
  document.body.appendChild(overlay);

  let items = [];
  let selected = 0;

  const close = () => {
    overlay.hidden = true;
    search.value = "";
    input.focus();
  };

  const choose = item => {
    input.value = "";
    input.setSelectionRange(0, 0);
    applyTemplate(input, item.template, "");
    close();
  };

  const render = () => {
    items = searchCommands(search.value, 12);
    list.innerHTML = "";

    items.forEach((item, index) => {
      const row = el("button", {
        className: `ux-palette-item ${index === selected ? "active" : ""}`,
        type: "button"
      });
      const left = el("div");
      left.append(
        el("strong", { text: item.template }),
        el("small", { text: t(item.ru, item.en) })
      );
      row.append(left, el("span", { className: "ux-category", text: item.category }));
      row.addEventListener("click", () => choose(item));
      list.appendChild(row);
    });

    hint.textContent = t(
      "Enter — выбрать · ↑↓ — навигация · Esc — закрыть",
      "Enter — choose · ↑↓ — navigate · Esc — close"
    );
  };

  const open = () => {
    overlay.hidden = false;
    selected = 0;
    render();
    search.focus();
  };

  search.addEventListener("input", () => {
    selected = 0;
    render();
  });

  search.addEventListener("keydown", event => {
    if (event.key === "ArrowDown") {
      selected = Math.min(items.length - 1, selected + 1);
      render();
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      selected = Math.max(0, selected - 1);
      render();
      event.preventDefault();
    } else if (event.key === "Enter" && items[selected]) {
      choose(items[selected]);
      event.preventDefault();
    } else if (event.key === "Escape") {
      close();
      event.preventDefault();
    }
  });

  overlay.addEventListener("mousedown", event => {
    if (event.target === overlay) close();
  });

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      overlay.hidden ? open() : close();
    }
  });

  const toolbar = el("div", { className: "ux-input-toolbar" });
  const button = el("button", {
    className: "feature-button tiny subtle",
    type: "button"
  });
  button.addEventListener("click", open);

  const localize = () => {
    button.textContent = t("КОМАНДЫ  Ctrl+K", "COMMANDS  Ctrl+K");
    search.placeholder = t(
      "Найти функцию или действие…",
      "Find a function or action…"
    );
  };

  toolbar.append(button);
  document.querySelector(".expression-row")?.after(toolbar);

  new MutationObserver(localize).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });
  localize();
}
