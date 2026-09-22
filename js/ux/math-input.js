import {
  el,
  t
} from "../ui-utils.js";

const ITEMS = [
  ["π","pi"],
  ["e","e"],
  ["i","i"],
  ["x²","x^2"],
  ["xⁿ","x^n"],
  ["√","sqrt(x)"],
  ["a⁄b","(a)/(b)"],
  ["|x|","abs(x)"],
  ["sin","sin(x)"],
  ["cos","cos(x)"],
  ["tan","tan(x)"],
  ["ln","ln(x)"],
  ["d/dx","diff(f(x),x)"],
  ["∫","integrate(f(x),x,a,b)"],
  ["Σ","sum(f(n),n,a,b)"],
  ["matrix","[[1,2],[3,4]]"]
];

export function bracketStatus(source) {
  const stack = [];

  for (const char of String(source)) {
    if (
      char === "(" ||
      char === "["
    ) {
      stack.push(char);
    } else if (char === ")") {
      if (
        stack.pop() !== "("
      ) {
        return {
          ok:false,
          message:"parentheses"
        };
      }
    } else if (char === "]") {
      if (
        stack.pop() !== "["
      ) {
        return {
          ok:false,
          message:"brackets"
        };
      }
    }
  }

  return {
    ok:stack.length === 0,
    message:
      stack.length
        ? "unclosed"
        : null
  };
}

export function prettyMathPreview(source) {
  let text =
    String(source || "");

  text = text
    .replace(/\bpi\b/g,"π")
    .replace(/\*/g,"·")
    .replace(/\bsqrt\s*\(/g,"√(")
    .replace(/\^2\b/g,"²")
    .replace(/\^3\b/g,"³");

  return text;
}

export function insertAtSelection(
  input,
  template
) {
  const start =
    input.selectionStart ??
    input.value.length;

  const end =
    input.selectionEnd ??
    start;

  const selected =
    input.value.slice(
      start,
      end
    );

  let insertion =
    template;

  if (selected) {
    if (
      template.includes("f(x)")
    ) {
      insertion =
        template.replace(
          "f(x)",
          selected
        );
    } else if (
      template.includes("x")
    ) {
      insertion =
        template.replace(
          "x",
          selected
        );
    }
  }

  input.value =
    input.value.slice(0,start) +
    insertion +
    input.value.slice(end);

  let placeholder =
    insertion.search(
      /\b(?:x|n|a|b|f)\b/
    );

  if (placeholder < 0) {
    placeholder =
      insertion.length;
  }

  const caret =
    start + placeholder;

  input.focus();

  input.setSelectionRange(
    caret,
    caret
  );

  input.dispatchEvent(
    new Event(
      "input",
      { bubbles:true }
    )
  );
}

export function initMathInput() {
  const input =
    document.getElementById(
      "expression"
    );

  const row =
    document.querySelector(
      ".expression-row"
    );

  if (!input || !row) return;

  const shell = el("div", {
    className:"math-input-shell"
  });

  const toolbar = el("div", {
    className:"math-input-toolbar"
  });

  toolbar.hidden = true;

  for (
    const [label,template]
    of ITEMS
  ) {
    const key = el("button", {
      className:"math-input-key",
      type:"button",
      text:label
    });

    key.addEventListener(
      "mousedown",
      event => {
        event.preventDefault();

        insertAtSelection(
          input,
          template
        );
      }
    );

    toolbar.appendChild(key);
  }

  const preview = el("div", {
    className:"math-input-preview"
  });

  const previewLabel = el("span");
  const previewValue = el("code");
  const status = el("span", {
    className:"math-input-status"
  });

  preview.append(
    previewLabel,
    previewValue,
    status
  );

  const toggle = el("button", {
    className:
      "workspace-tool-button",
    type:"button"
  });

  toggle.addEventListener(
    "click",
    () => {
      toolbar.hidden =
        !toolbar.hidden;

      toggle.classList.toggle(
        "active",
        !toolbar.hidden
      );
    }
  );

  const topTools =
    document.querySelector(
      ".workspace-top-tools"
    );

  topTools?.prepend(toggle);

  shell.append(
    toolbar,
    preview
  );

  row.after(shell);

  const render = () => {
    const source =
      input.value;

    const brackets =
      bracketStatus(source);

    previewValue.textContent =
      prettyMathPreview(source) ||
      "—";

    preview.classList.toggle(
      "bad",
      !brackets.ok
    );

    status.textContent =
      brackets.ok
        ? ""
        : t(
            "проверьте скобки",
            "check brackets"
          );

    previewLabel.textContent =
      t(
        "ВИД:",
        "PREVIEW:"
      );

    toggle.textContent =
      toolbar.hidden
        ? t(
            "MATH INPUT",
            "MATH INPUT"
          )
        : t(
            "СКРЫТЬ MATH",
            "HIDE MATH"
          );
  };

  input.addEventListener(
    "input",
    render
  );

  new MutationObserver(
    render
  ).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  render();
}
