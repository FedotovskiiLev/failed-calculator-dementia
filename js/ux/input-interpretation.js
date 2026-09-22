import {
  el,
  t
} from "../ui-utils.js";
import {
  structuredPreviewHtml
} from "./structured-preview.js";

export function initInputInterpretation() {
  const zone =
    document.querySelector(".workspace-result-zone");

  if (!zone) return;

  const card = el("section", {
    className:"input-interpretation-pod"
  });

  card.hidden = true;

  const head = el("div", {
    className:"input-interpretation-head"
  });

  const title = el("h3");

  const edit = el("button", {
    className:"workspace-link-button",
    type:"button"
  });

  const body = el("div", {
    className:"input-interpretation-body"
  });

  const original = el("div", {
    className:"input-interpretation-line"
  });

  const interpreted = el("div", {
    className:"input-interpretation-line formal"
  });

  body.append(original, interpreted);
  head.append(title, edit);
  card.append(head, body);

  const heading =
    zone.querySelector(".workspace-section-heading");

  heading?.after(card);

  let lastOriginal = "";
  let lastFormal = "";
  let pendingInterpretation = null;

  document.addEventListener(
    "failed-calculator:interpreted",
    event => {
      pendingInterpretation = {
        original:String(
          event.detail?.original || ""
        ),
        formal:String(
          event.detail?.source || ""
        )
      };
    }
  );

  document.addEventListener(
    "failed-calculator:run-end",
    event => {
      const source =
        String(
          event.detail?.source || ""
        );

      lastOriginal =
        pendingInterpretation?.original ||
        source;

      lastFormal =
        pendingInterpretation?.formal ||
        source;

      pendingInterpretation = null;

      render();
      card.hidden = false;
    }
  );

  edit.addEventListener(
    "click",
    () => {
      const input =
        document.getElementById("expression");

      if (!input) return;

      input.value =
        lastOriginal || lastFormal;

      input.dispatchEvent(
        new Event(
          "input",
          { bubbles:true }
        )
      );

      input.focus();
      input.select();
    }
  );

  const render = () => {
    title.textContent =
      t(
        "ИНТЕРПРЕТАЦИЯ ВВОДА",
        "INPUT INTERPRETATION"
      );

    edit.textContent =
      t("ИЗМЕНИТЬ", "EDIT");

    original.innerHTML =
      `<span>${t(
        "Запрос:",
        "Query:"
      )}</span>` +
      `<div class="input-math-render">${structuredPreviewHtml(lastOriginal)}</div>`;

    if (
      lastFormal &&
      lastFormal !== lastOriginal
    ) {
      interpreted.hidden = false;

      interpreted.innerHTML =
        `<span>${t(
          "Понял как:",
          "Interpreted as:"
        )}</span>` +
        `<code>${lastFormal
          .replaceAll("&","&amp;")
          .replaceAll("<","&lt;")
          .replaceAll(">","&gt;")}</code>`;
    } else {
      interpreted.hidden = true;
    }
  };

  new MutationObserver(render).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );
}
