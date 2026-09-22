import {
  analyzeExpressionSource
} from "./insights-core.js";
import {
  sampleFunctions,
  valueTable
} from "../workbench/explore.js";
import {
  copyText,
  el,
  featureToast,
  t
} from "../ui-utils.js";

const VARIABLE_KEY =
  "failed-calculator-preferred-variable";

function preferredVariable() {
  return sessionStorage.getItem(VARIABLE_KEY);
}

function setPreferredVariable(value) {
  if (value) {
    sessionStorage.setItem(VARIABLE_KEY, value);
  } else {
    sessionStorage.removeItem(VARIABLE_KEY);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function addCopyButton(head, getText) {
  const copy = el("button", {
    className:"insight-pod-control",
    type:"button"
  });

  const localize = () => {
    copy.textContent = t("КОПИРОВАТЬ","COPY");
  };

  copy.addEventListener("click", async () => {
    const ok = await copyText(getText());

    featureToast(
      ok
        ? t("Pod скопирован","Pod copied")
        : t("Не удалось скопировать","Could not copy")
    );
  });

  new MutationObserver(localize).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();
  head.appendChild(copy);
}

function pod(titleRu, titleEn) {
  const card = el("section", {
    className:"insight-pod"
  });

  const head = el("div", {
    className:"insight-pod-head"
  });

  const title = el("h3");

  const controls = el("div", {
    className:"insight-pod-controls"
  });

  const body = el("div", {
    className:"insight-pod-body"
  });

  const localize = () => {
    title.textContent = t(titleRu,titleEn);
  };

  head.append(title, controls);
  card.append(head, body);

  new MutationObserver(localize).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();

  addCopyButton(
    controls,
    () => body.textContent.trim()
  );

  return {
    card,
    head,
    controls,
    body
  };
}

function renderForms(root, analysis) {
  if (!analysis.forms.length) return;

  const section = pod(
    "АЛЬТЕРНАТИВНЫЕ ФОРМЫ",
    "ALTERNATE FORMS"
  );

  const grid = el("div", {
    className:"insight-form-grid"
  });

  const labels = {
    simplified:["Упрощённая форма","Simplified form"],
    expanded:["Раскрытая форма","Expanded form"],
    factored:["Разложение","Factorization"]
  };

  for (const form of analysis.forms.slice(0,3)) {
    const item = el("div", {
      className:"insight-form"
    });

    const label =
      labels[form.label] ||
      [form.label,form.label];

    item.append(
      el("small", {
        text:t(label[0],label[1])
      }),
      el("code", {
        text:form.text
      })
    );

    grid.appendChild(item);
  }

  section.body.appendChild(grid);
  root.appendChild(section.card);
}

function renderRoots(root, analysis) {
  if (!analysis.roots?.length) return;

  const section = pod("КОРНИ","ROOTS");

  const list = el("div", {
    className:"insight-root-list"
  });

  for (const value of analysis.roots) {
    list.appendChild(
      el("code", { text:value })
    );
  }

  section.body.appendChild(list);
  root.appendChild(section.card);
}

function renderDerivative(root, analysis) {
  if (
    !analysis.derivative ||
    !analysis.variable
  ) return;

  const section = pod(
    `ПРОИЗВОДНАЯ ПО ${analysis.variable}`,
    `DERIVATIVE WITH RESPECT TO ${analysis.variable}`
  );

  section.body.appendChild(
    el("code", {
      className:"insight-large-expression",
      text:analysis.derivative
    })
  );

  root.appendChild(section.card);
}

function drawPlot(canvas, points) {
  const finite =
    points.filter(
      point => Number.isFinite(point.y)
    );

  if (finite.length < 4) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  let ymin =
    Math.min(
      ...finite.map(point => point.y)
    );

  let ymax =
    Math.max(
      ...finite.map(point => point.y)
    );

  if (ymin === ymax) {
    ymin -= 1;
    ymax += 1;
  }

  const span = ymax - ymin;
  const medianBand =
    Math.max(1, span * 12);

  const clipped =
    finite.filter(
      point =>
        point.y >= ymin - medianBand &&
        point.y <= ymax + medianBand
    );

  if (clipped.length) {
    ymin =
      Math.min(
        ...clipped.map(point => point.y)
      );
    ymax =
      Math.max(
        ...clipped.map(point => point.y)
      );
  }

  if (ymin === ymax) {
    ymin -= 1;
    ymax += 1;
  }

  const pad = (ymax - ymin) * .08;
  ymin -= pad;
  ymax += pad;

  const px = x =>
    (x + 6) / 12 * (w - 50) + 38;

  const py = y =>
    h -
    24 -
    (y - ymin) /
      (ymax - ymin) *
      (h - 46);

  ctx.fillStyle = "#090c0f";
  ctx.fillRect(0,0,w,h);

  ctx.strokeStyle = "#303740";
  ctx.lineWidth = 1;

  if (ymin <= 0 && ymax >= 0) {
    const y0 = py(0);
    ctx.beginPath();
    ctx.moveTo(36,y0);
    ctx.lineTo(w - 10,y0);
    ctx.stroke();
  }

  const x0 = px(0);
  ctx.beginPath();
  ctx.moveTo(x0,10);
  ctx.lineTo(x0,h - 18);
  ctx.stroke();

  ctx.strokeStyle = "#b7c69a";
  ctx.lineWidth = 2;
  ctx.beginPath();

  let drawing = false;

  for (const point of points) {
    if (
      !Number.isFinite(point.y) ||
      point.y < ymin ||
      point.y > ymax
    ) {
      drawing = false;
      continue;
    }

    const x = px(point.x);
    const y = py(point.y);

    if (!drawing) {
      ctx.moveTo(x,y);
      drawing = true;
    } else {
      ctx.lineTo(x,y);
    }
  }

  ctx.stroke();
}

function renderPlot(root, analysis) {
  if (!analysis.variable) return;

  let sampled;

  try {
    sampled =
      sampleFunctions(
        [analysis.expression],
        analysis.variable,
        -6,
        6,
        320
      );
  } catch {
    return;
  }

  const points =
    sampled.series?.[0]?.points ||
    [];

  if (
    points.filter(
      point => Number.isFinite(point.y)
    ).length < 4
  ) return;

  const section = pod("ГРАФИК","PLOT");

  const canvas =
    document.createElement("canvas");

  canvas.width = 900;
  canvas.height = 300;
  canvas.className = "insight-plot";

  section.body.appendChild(canvas);

  requestAnimationFrame(
    () => drawPlot(canvas,points)
  );

  const actions = el("div", {
    className:"insight-pod-actions"
  });

  const open = el("button", {
    className:"feature-button tiny subtle",
    type:"button"
  });

  const localize = () => {
    open.textContent =
      t("ОТКРЫТЬ ГРАФИК","OPEN PLOT");
  };

  open.addEventListener("click", () => {
    const input =
      document.getElementById("expression");

    const calculate =
      document.getElementById("calculate");

    input.value =
      `plot(${analysis.expression},${analysis.variable},-10,10)`;

    calculate.click();
  });

  new MutationObserver(localize).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();
  actions.appendChild(open);
  section.body.appendChild(actions);
  root.appendChild(section.card);
}

function renderTable(root, analysis) {
  if (!analysis.variable) return;

  let rows;

  try {
    rows =
      valueTable(
        analysis.expression,
        analysis.variable,
        -2,
        2,
        1
      );
  } catch {
    return;
  }

  if (!rows?.length) return;

  const section = pod(
    "НЕСКОЛЬКО ЗНАЧЕНИЙ",
    "SAMPLE VALUES"
  );

  const table =
    document.createElement("table");

  table.className =
    "insight-mini-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>${escapeHtml(analysis.variable)}</th>
        <th>f(${escapeHtml(analysis.variable)})</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `
        <tr>
          <td>${escapeHtml(row.x)}</td>
          <td>${escapeHtml(row.y)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;

  section.body.appendChild(table);
  root.appendChild(section.card);
}

function renderAssumptions(
  host,
  analysis,
  rerender
) {
  if (!analysis.variables.length) return;

  const bar = el("div", {
    className:"insight-assumption"
  });

  const text = el("span");

  const choices = el("div", {
    className:"insight-assumption-choices"
  });

  const updateText = () => {
    text.textContent =
      t(
        `Считаю ${analysis.variable} основной переменной.`,
        `Treating ${analysis.variable} as the main variable.`
      );
  };

  for (const variable of analysis.variables) {
    const choice = el("button", {
      className:
        variable === analysis.variable
          ? "active"
          : "",
      type:"button",
      text:variable
    });

    choice.addEventListener("click", () => {
      setPreferredVariable(variable);
      rerender(variable);
    });

    choices.appendChild(choice);
  }

  bar.append(text,choices);
  host.appendChild(bar);
  updateText();
}

function eligibleSource(source) {
  return !!source &&
    !/^(?:plot|table|multiplot|mean|median|variance|stdev|quantile|summary|linreg|det|inverse|transpose|matmul|rank|trace|dot|cross|norm|linsolve|taylor|eigen2|nsolve|minimize|integrate|limit|sum|product)\s*\(/i.test(
      source
    );
}

export function initResultPods() {
  const result =
    document.getElementById("result");

  if (!result) return;

  const host = el("div", {
    className:"insight-pods"
  });

  host.hidden = true;

  const zone =
    document.querySelector(
      ".workspace-result-zone"
    );

  (zone || result.parentElement)
    ?.appendChild(host);

  let lastSource = "";
  let expanded = false;

  const render = (
    source,
    forcedVariable = null
  ) => {
    host.innerHTML = "";
    host.hidden = true;

    if (!eligibleSource(source)) return;

    const analysis =
      analyzeExpressionSource(
        source,
        forcedVariable ||
          preferredVariable()
      );

    if (!analysis?.variable) return;

    const rerender =
      variable =>
        render(source,variable);

    renderAssumptions(
      host,
      analysis,
      rerender
    );

    const grid = el("div", {
      className:"insight-pod-grid"
    });

    renderForms(grid,analysis);
    renderRoots(grid,analysis);
    renderDerivative(grid,analysis);
    renderPlot(grid,analysis);
    renderTable(grid,analysis);

    const pods =
      [...grid.children];

    if (!expanded && pods.length > 3) {
      pods.slice(3).forEach(
        item =>
          item.classList.add(
            "insight-pod-extra"
          )
      );
    }

    if (pods.length) {
      host.appendChild(grid);

      const states = el("div", {
        className:"insight-state-bar"
      });

      if (pods.length > 3) {
        const more = el("button", {
          className:"insight-state-button",
          type:"button"
        });

        const renderMore = () => {
          more.textContent =
            expanded
              ? t("МЕНЬШЕ","LESS")
              : t("БОЛЬШЕ","MORE");
        };

        more.addEventListener("click", () => {
          expanded = !expanded;
          render(source,analysis.variable);
        });

        new MutationObserver(
          renderMore
        ).observe(
          document.documentElement,
          {
            attributes:true,
            attributeFilter:["lang"]
          }
        );

        renderMore();
        states.appendChild(more);
      }

      const steps = el("button", {
        className:"insight-state-button",
        type:"button"
      });

      const renderSteps = () => {
        steps.textContent =
          t("ПО ШАГАМ","STEPS");
      };

      steps.addEventListener("click", () => {
        document.dispatchEvent(
          new CustomEvent(
            "failed-calculator:show-steps"
          )
        );
      });

      new MutationObserver(
        renderSteps
      ).observe(
        document.documentElement,
        {
          attributes:true,
          attributeFilter:["lang"]
        }
      );

      renderSteps();
      states.appendChild(steps);
      host.appendChild(states);
      host.hidden = false;
    }
  };

  document.addEventListener(
    "failed-calculator:run-end",
    event => {
      const source =
        String(
          event.detail?.source || ""
        ).trim();

      if (!source) return;

      lastSource = source;
      expanded = false;

      requestAnimationFrame(
        () => render(source)
      );
    }
  );

  new MutationObserver(
    () => {
      if (lastSource) {
        render(lastSource);
      }
    }
  ).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );
}
