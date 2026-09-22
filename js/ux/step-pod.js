import {
  analyzeExpressionSource
} from "./insights-core.js";
import {
  el,
  t
} from "../ui-utils.js";

function step(labelRu,labelEn,value) {
  const row = el("div", {
    className:"step-row"
  });

  const label = el("span", {
    className:"step-label"
  });

  const code = el("code", {
    text:value
  });

  const localize = () => {
    label.textContent =
      t(labelRu,labelEn);
  };

  new MutationObserver(localize).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();
  row.append(label,code);
  return row;
}

function buildSteps(analysis) {
  const rows = [];

  rows.push([
    "Исходное выражение",
    "Input",
    analysis.originalText
  ]);

  for (const form of analysis.forms) {
    if (form.label === "simplified") {
      rows.push([
        "Упростить",
        "Simplify",
        form.text
      ]);
    } else if (form.label === "expanded") {
      rows.push([
        "Раскрыть скобки",
        "Expand",
        form.text
      ]);
    } else if (form.label === "factored") {
      rows.push([
        "Разложить",
        "Factor",
        form.text
      ]);
    }
  }

  if (analysis.derivative) {
    rows.push([
      `Производная по ${analysis.variable}`,
      `Derivative with respect to ${analysis.variable}`,
      analysis.derivative
    ]);
  }

  if (analysis.roots?.length) {
    rows.push([
      "Решения",
      "Solutions",
      analysis.roots.join(" ; ")
    ]);
  }

  return rows;
}

export function initStepPod() {
  const resultZone =
    document.querySelector(
      ".workspace-result-zone"
    );

  if (!resultZone) return;

  const details =
    document.createElement("details");

  details.className =
    "step-pod";

  details.hidden = true;

  const summary =
    document.createElement("summary");

  const title = el("span");
  const hint = el("small");

  summary.append(title,hint);

  const body = el("div", {
    className:"step-body"
  });

  details.append(summary,body);

  const pods =
    resultZone.querySelector(
      ".insight-pods"
    );

  (pods || resultZone).after(
    details
  );

  const localize = () => {
    title.textContent =
      t(
        "ПО ШАГАМ",
        "STEP BY STEP"
      );

    hint.textContent =
      t(
        "показать преобразования",
        "show transformations"
      );
  };

  new MutationObserver(localize).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();

  document.addEventListener(
    "failed-calculator:show-steps",
    () => {
      if (details.hidden) return;

      details.open = true;

      details.scrollIntoView({
        behavior:"smooth",
        block:"nearest"
      });
    }
  );

  document.addEventListener(
    "failed-calculator:run-end",
    event => {
      const source =
        String(
          event.detail?.source || ""
        ).trim();

      const analysis =
        analyzeExpressionSource(
          source
        );

      body.innerHTML = "";
      details.open = false;

      if (!analysis) {
        details.hidden = true;
        return;
      }

      const rows =
        buildSteps(analysis);

      if (rows.length < 2) {
        details.hidden = true;
        return;
      }

      rows.forEach(
        ([ru,en,value],index) => {
          const wrapper = el("div", {
            className:"step-entry"
          });

          wrapper.append(
            el("div", {
              className:"step-number",
              text:String(index + 1)
            }),
            step(ru,en,value)
          );

          body.appendChild(wrapper);
        }
      );

      details.hidden = false;
    }
  );
}
