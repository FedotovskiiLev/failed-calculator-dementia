import {
  el,
  featureToast,
  t
} from "../ui-utils.js";
import {
  SLOT,
  findNextSlot,
  fractionTransform,
  hasSlots,
  powerTransform,
  templateTransform
} from "./structured-input-core.js";
import {
  structuredPreviewHtml
} from "./structured-preview.js";

const ITEMS = [
  ["π","pi"],
  ["e","e"],
  ["i","i"],
  ["x²",`x^(${SLOT})`],
  ["xⁿ",`^(${SLOT})`],
  ["√",`sqrt(${SLOT})`],
  ["a⁄b",`(${SLOT})/(${SLOT})`],
  ["|x|",`abs(${SLOT})`],
  ["sin",`sin(${SLOT})`],
  ["cos",`cos(${SLOT})`],
  ["tan",`tan(${SLOT})`],
  ["ln",`ln(${SLOT})`],
  ["d/dx",`diff(${SLOT},x)`],
  ["∫",`integrate(${SLOT},x,${SLOT},${SLOT})`],
  ["Σ",`sum(${SLOT},n,${SLOT},${SLOT})`],
  ["matrix","[[1,2],[3,4]]"]
];

export function bracketStatus(source) {
  const stack = [];

  for (const char of String(source)) {
    if (char === "(" || char === "[") {
      stack.push(char);
    } else if (char === ")") {
      if (stack.pop() !== "(") {
        return { ok:false, message:"parentheses" };
      }
    } else if (char === "]") {
      if (stack.pop() !== "[") {
        return { ok:false, message:"brackets" };
      }
    }
  }

  return {
    ok:stack.length === 0,
    message:stack.length ? "unclosed" : null
  };
}

function applyTransform(input, transform) {
  input.value = transform.value;
  input.focus();
  input.setSelectionRange(
    transform.selectionStart,
    transform.selectionEnd
  );

  input.dispatchEvent(
    new Event("input", { bubbles:true })
  );
}

function selectSlot(input, direction = 1) {
  const slot = findNextSlot(
    input.value,
    direction >= 0
      ? input.selectionEnd
      : input.selectionStart,
    direction
  );

  if (!slot) return false;

  input.focus();
  input.setSelectionRange(
    slot.start,
    slot.end
  );

  return true;
}

export function initMathInput() {
  const input =
    document.getElementById("expression");

  const row =
    document.querySelector(".expression-row");

  const calculate =
    document.getElementById("calculate");

  if (!input || !row || !calculate) return;

  const shell = el("div", {
    className:"math-input-shell structured-math-input"
  });

  const toolbar = el("div", {
    className:"math-input-toolbar"
  });

  toolbar.hidden = true;

  const modeHelp = el("div", {
    className:"structured-mode-help"
  });

  for (const [label,template] of ITEMS) {
    const key = el("button", {
      className:"math-input-key",
      type:"button",
      text:label
    });

    key.addEventListener(
      "mousedown",
      event => {
        event.preventDefault();

        applyTransform(
          input,
          templateTransform(
            input.value,
            input.selectionStart,
            input.selectionEnd,
            template
          )
        );
      }
    );

    toolbar.appendChild(key);
  }

  toolbar.appendChild(modeHelp);

  const preview = el("div", {
    className:"math-input-preview structured-preview"
  });

  const previewLabel = el("span");
  const previewValue = el("div", {
    className:"structured-preview-value"
  });

  const status = el("span", {
    className:"math-input-status"
  });

  preview.append(
    previewLabel,
    previewValue,
    status
  );

  const toggle = el("button", {
    className:"workspace-tool-button",
    type:"button"
  });

  const topTools =
    document.querySelector(".workspace-top-tools");

  topTools?.prepend(toggle);

  shell.append(toolbar, preview);
  row.after(shell);

  const mathMode = () => !toolbar.hidden;

  input.addEventListener(
    "keydown",
    event => {
      if (!mathMode()) return;

      if (event.key === "/") {
        event.preventDefault();

        applyTransform(
          input,
          fractionTransform(
            input.value,
            input.selectionStart,
            input.selectionEnd
          )
        );

        return;
      }

      if (event.key === "^") {
        event.preventDefault();

        applyTransform(
          input,
          powerTransform(
            input.value,
            input.selectionStart,
            input.selectionEnd
          )
        );

        return;
      }

      if (event.key === "Tab") {
        if (selectSlot(
          input,
          event.shiftKey ? -1 : 1
        )) {
          event.preventDefault();
        }
      }
    },
    true
  );

  const blockIncomplete = event => {
    if (!hasSlots(input.value)) return;

    const first = findNextSlot(
      input.value,
      0,
      1
    );

    if (first) {
      input.focus();
      input.setSelectionRange(
        first.start,
        first.end
      );
    }

    featureToast(
      t(
        "Заполните все поля □ перед вычислением",
        "Fill every □ slot before calculating"
      )
    );

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  calculate.addEventListener(
    "click",
    blockIncomplete,
    true
  );

  input.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter" &&
        hasSlots(input.value)
      ) {
        blockIncomplete(event);
      }
    },
    true
  );

  toggle.addEventListener(
    "click",
    () => {
      toolbar.hidden = !toolbar.hidden;

      toggle.classList.toggle(
        "active",
        mathMode()
      );

      render();
    }
  );

  const render = () => {
    const source = input.value;
    const brackets = bracketStatus(source);
    const incomplete = hasSlots(source);

    previewValue.innerHTML =
      structuredPreviewHtml(source);

    preview.classList.toggle(
      "bad",
      !brackets.ok || incomplete
    );

    if (incomplete) {
      status.textContent =
        t(
          "Tab → следующее поле □",
          "Tab → next □ slot"
        );
    } else if (!brackets.ok) {
      status.textContent =
        t(
          "проверьте скобки",
          "check brackets"
        );
    } else {
      status.textContent = "";
    }

    previewLabel.textContent =
      t("ВИД:", "PREVIEW:");

    toggle.textContent =
      mathMode()
        ? t(
            "СКРЫТЬ MATH",
            "HIDE MATH"
          )
        : "MATH INPUT";

    modeHelp.textContent =
      t(
        "В режиме Math Input: / создаёт дробь, ^ создаёт степень, Tab переходит по □.",
        "Math Input mode: / creates a fraction, ^ creates a power, Tab moves through □ slots."
      );
  };

  input.addEventListener("input", render);

  new MutationObserver(render).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  render();
}
