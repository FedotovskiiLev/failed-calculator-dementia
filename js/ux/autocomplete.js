import { activeWord, searchCommands } from "./command-catalog.js";
import { el, t } from "../ui-utils.js";

export function applyTemplate(input, template, word = "") {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const wordStart = word ? start - word.length : start;

  input.value =
    input.value.slice(0, wordStart) +
    template +
    input.value.slice(end);

  const firstPlaceholder = template.search(/[a-zA-Z](?=[),]|$)/);
  const nextCaret = firstPlaceholder >= 0
    ? wordStart + firstPlaceholder
    : wordStart + template.length;

  input.focus();
  input.setSelectionRange(nextCaret, nextCaret);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export function initAutocomplete() {
  const input = document.getElementById("expression");
  const row = document.querySelector(".expression-row");
  if (!input || !row) return;

  const box = el("div", { className: "ux-autocomplete", ariaLabel: "Suggestions" });
  box.hidden = true;
  row.after(box);

  let items = [];
  let selected = 0;
  let currentWord = "";

  const hide = () => {
    box.hidden = true;
    box.innerHTML = "";
    items = [];
    selected = 0;
  };

  const render = () => {
    box.innerHTML = "";
    if (!items.length) {
      hide();
      return;
    }

    items.forEach((item, index) => {
      const button = el("button", {
        className: `ux-suggestion ${index === selected ? "active" : ""}`,
        type: "button"
      });
      const name = el("strong", { text: item.template });
      const desc = el("span", {
        text: t(item.ru, item.en)
      });
      button.append(name, desc);
      button.addEventListener("mousedown", event => {
        event.preventDefault();
        applyTemplate(input, item.template, currentWord);
        hide();
      });
      box.appendChild(button);
    });

    box.hidden = false;
  };

  const update = () => {
    currentWord = activeWord(input.value, input.selectionStart ?? input.value.length);
    if (!currentWord || currentWord.length < 1) {
      hide();
      return;
    }
    items = searchCommands(currentWord, 7);
    selected = 0;
    render();
  };

  input.addEventListener("input", update);
  input.addEventListener("click", update);

  input.addEventListener("keydown", event => {
    if (box.hidden || !items.length) return;

    if (event.key === "ArrowDown") {
      selected = (selected + 1) % items.length;
      render();
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      selected = (selected - 1 + items.length) % items.length;
      render();
      event.preventDefault();
    } else if (event.key === "Tab") {
      applyTemplate(input, items[selected].template, currentWord);
      hide();
      event.preventDefault();
    } else if (event.key === "Escape") {
      hide();
      event.preventDefault();
    }
  }, true);

  document.addEventListener("click", event => {
    if (event.target !== input && !box.contains(event.target)) hide();
  });
}
