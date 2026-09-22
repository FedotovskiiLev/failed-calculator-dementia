import {
  executeWorkbenchCommand,
  parseWorkbenchCommand
} from "./commands.js";
import {
  copyText,
  el,
  featureToast,
  t
} from "../ui-utils.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function matrixHtml(matrix) {
  return `
    <div class="wb-matrix">
      <span class="wb-bracket">[</span>
      <table>
        ${matrix.map(row =>
          `<tr>${row.map(value =>
            `<td>${escapeHtml(value)}</td>`
          ).join("")}</tr>`
        ).join("")}
      </table>
      <span class="wb-bracket">]</span>
    </div>
  `;
}

function vectorHtml(vector) {
  return matrixHtml(vector.map(value => [value]));
}

function summaryHtml(summary) {
  const labels = {
    count:"n",
    min:"min",
    q1:"Q1",
    median:"median",
    mean:"mean",
    q3:"Q3",
    max:"max",
    variance:"variance",
    stdev:"stdev"
  };

  return `
    <div class="wb-summary-grid">
      ${Object.entries(labels).map(([key,label]) => `
        <div class="wb-stat">
          <small>${label}</small>
          <strong>${escapeHtml(summary[key])}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function tableHtml(result) {
  const rows = result.value;
  const maxPreview = 120;
  const shown = rows.slice(0, maxPreview);

  return `
    <div class="wb-table-wrap">
      <table class="wb-data-table">
        <thead>
          <tr>
            <th>${escapeHtml(result.columns[0])}</th>
            <th>${escapeHtml(result.columns[1])}</th>
          </tr>
        </thead>
        <tbody>
          ${shown.map(row => `
            <tr>
              <td>${escapeHtml(row.x)}</td>
              <td>${escapeHtml(row.y)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${
        rows.length > maxPreview
          ? `<div class="wb-result-meta">${rows.length - maxPreview} more rows not shown</div>`
          : ""
      }
    </div>
  `;
}

function resultBody(result) {
  if (result.kind === "matrix") {
    return matrixHtml(result.value);
  }

  if (result.kind === "vector") {
    return vectorHtml(result.value);
  }

  if (result.kind === "system") {
    return `
      <div class="wb-equations">
        ${result.equations.map(
          equation => `<div>${escapeHtml(equation)}</div>`
        ).join("")}
      </div>
    `;
  }

  if (result.kind === "series") {
    return `
      <div class="wb-expression">
        ${escapeHtml(result.value)}
      </div>
    `;
  }

  if (result.kind === "summary") {
    return summaryHtml(result.value);
  }

  if (result.kind === "regression") {
    return `
      <div class="wb-equations">
        <div>${escapeHtml(result.value.equation)}</div>
        <div>R² = ${escapeHtml(result.value.r2)}</div>
      </div>
    `;
  }

  if (result.kind === "table") {
    return tableHtml(result);
  }

  if (result.kind === "root") {
    return `
      <div class="wb-summary-grid">
        <div class="wb-stat">
          <small>root</small>
          <strong>${escapeHtml(result.value.root)}</strong>
        </div>
        <div class="wb-stat">
          <small>residual</small>
          <strong>${escapeHtml(result.value.residual)}</strong>
        </div>
        <div class="wb-stat">
          <small>iterations</small>
          <strong>${escapeHtml(result.value.iterations)}</strong>
        </div>
      </div>
    `;
  }

  if (result.kind === "minimum") {
    return `
      <div class="wb-summary-grid">
        <div class="wb-stat">
          <small>x</small>
          <strong>${escapeHtml(result.value.x)}</strong>
        </div>
        <div class="wb-stat">
          <small>f(x)</small>
          <strong>${escapeHtml(result.value.value)}</strong>
        </div>
        <div class="wb-stat">
          <small>iterations</small>
          <strong>${escapeHtml(result.value.iterations)}</strong>
        </div>
      </div>
    `;
  }

  if (result.kind === "multiplot") {
    return `<div class="wb-multiplot-host"></div>`;
  }

  return `
    <div class="wb-scalar">
      ${escapeHtml(result.value)}
    </div>
  `;
}

function dispatch(source, target) {
  const detail = {
    source,
    resultText:target.textContent.trim(),
    resultHtml:target.innerHTML,
    finishedAt:Date.now()
  };

  document.dispatchEvent(
    new CustomEvent(
      "failed-calculator:result-change",
      { detail }
    )
  );

  document.dispatchEvent(
    new CustomEvent(
      "failed-calculator:run-end",
      { detail }
    )
  );
}

function renderMultiplot(host, data) {
  if (!host) return;

  const canvas =
    document.createElement("canvas");

  canvas.width = 980;
  canvas.height = 480;
  canvas.className =
    "wb-multiplot-canvas";

  host.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  const ys = data.series
    .flatMap(
      series =>
        series.points.map(point => point.y)
    )
    .filter(Number.isFinite);

  if (!ys.length) {
    ctx.fillStyle = "#89929d";
    ctx.fillText("no finite points",20,30);
    return;
  }

  let ymin = Math.min(...ys);
  let ymax = Math.max(...ys);

  if (ymin === ymax) {
    ymin -= 1;
    ymax += 1;
  }

  const pad =
    (ymax - ymin) * .08;

  ymin -= pad;
  ymax += pad;

  const px = x =>
    (x - data.start) /
      (data.end - data.start) *
      (w - 70) +
    52;

  const py = y =>
    h -
    34 -
    (y - ymin) /
      (ymax - ymin) *
      (h - 70);

  ctx.fillStyle = "#090c0f";
  ctx.fillRect(0,0,w,h);

  ctx.strokeStyle = "#303740";
  ctx.lineWidth = 1;

  if (
    data.start <= 0 &&
    data.end >= 0
  ) {
    const x0 = px(0);
    ctx.beginPath();
    ctx.moveTo(x0,18);
    ctx.lineTo(x0,h - 28);
    ctx.stroke();
  }

  if (
    ymin <= 0 &&
    ymax >= 0
  ) {
    const y0 = py(0);
    ctx.beginPath();
    ctx.moveTo(46,y0);
    ctx.lineTo(w - 12,y0);
    ctx.stroke();
  }

  const dashSets = [
    [],
    [8,4],
    [3,3],
    [10,3,2,3],
    [1,3],
    [12,5],
    [6,2,2,2],
    [15,4,3,4]
  ];

  data.series.forEach(
    (series,index) => {
      ctx.strokeStyle =
        `hsl(${(index * 53 + 78) % 360} 48% 68%)`;

      ctx.lineWidth = 2;
      ctx.setLineDash(
        dashSets[index % dashSets.length]
      );

      ctx.beginPath();

      let drawing = false;

      for (const point of series.points) {
        if (!Number.isFinite(point.y)) {
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
  );

  ctx.setLineDash([]);

  const legend = el("div", {
    className:"wb-legend"
  });

  data.series.forEach(
    (series,index) => {
      legend.appendChild(
        el("span", {
          text:`${index + 1}. ${series.expression}`
        })
      );
    }
  );

  host.appendChild(legend);
}

function render(source,result) {
  const target =
    document.getElementById("result");

  if (!target) return;

  target.dataset.touched = "1";

  target.innerHTML = `
    <div class="wb-result-card">
      <div class="wb-result-kicker">
        ${escapeHtml(result.title || "Workbench")}
      </div>
      ${resultBody(result)}
      <div class="wb-result-meta">
        ${escapeHtml(source)}
      </div>
    </div>
  `;

  const card =
    target.querySelector(".wb-result-card");

  if (
    result.kind === "multiplot"
  ) {
    renderMultiplot(
      card.querySelector(
        ".wb-multiplot-host"
      ),
      result.value
    );
  }

  const toolbar = el("div", {
    className:"wb-card-actions"
  });

  const copy = el("button", {
    className:"feature-button tiny subtle",
    type:"button",
    text:t("КОПИРОВАТЬ","COPY")
  });

  copy.addEventListener(
    "click",
    async () => {
      const ok =
        await copyText(
          target.textContent.trim()
        );

      featureToast(
        ok
          ? t(
              "Результат скопирован",
              "Result copied"
            )
          : t(
              "Не удалось скопировать",
              "Could not copy"
            )
      );
    }
  );

  toolbar.append(copy);

  if (result.kind === "series") {
    const plot = el("button", {
      className:"feature-button tiny subtle",
      type:"button",
      text:t(
        "ГРАФИК ПОЛИНОМА",
        "PLOT POLYNOMIAL"
      )
    });

    plot.addEventListener(
      "click",
      () => {
        const input =
          document.getElementById(
            "expression"
          );

        const calculate =
          document.getElementById(
            "calculate"
          );

        input.value =
          `plot(${result.value},${result.variable},-10,10)`;

        calculate.click();
      }
    );

    toolbar.append(plot);
  }

  card.append(toolbar);
  dispatch(source,target);
}

function renderError(source,error) {
  const target =
    document.getElementById("result");

  if (!target) return;

  target.dataset.touched = "1";

  target.innerHTML = `
    <div class="wb-result-card error">
      <div class="wb-result-kicker">
        ${t(
          "WORKBENCH: ОШИБКА",
          "WORKBENCH: ERROR"
        )}
      </div>
      <div>
        ${escapeHtml(
          error?.message || error
        )}
      </div>
      <div class="wb-result-meta">
        ${escapeHtml(source)}
      </div>
    </div>
  `;

  dispatch(source,target);
}

function tryRun(source) {
  if (
    !parseWorkbenchCommand(source)
  ) return false;

  try {
    const result =
      executeWorkbenchCommand(source);

    if (!result) return false;

    render(source,result);
  } catch (error) {
    renderError(source,error);
  }

  return true;
}

function installInterceptors() {
  document.addEventListener(
    "click",
    event => {
      const calculate =
        document.getElementById(
          "calculate"
        );

      if (
        event.target !== calculate
      ) return;

      const source =
        document
          .getElementById("expression")
          ?.value
          ?.trim() || "";

      if (!tryRun(source)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  document.addEventListener(
    "keydown",
    event => {
      const input =
        document.getElementById(
          "expression"
        );

      if (
        event.target !== input ||
        event.key !== "Enter"
      ) return;

      const source =
        input.value.trim();

      if (!tryRun(source)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );
}

function injectReference() {
  const help =
    document.querySelector(
      ".syntax-help"
    );

  if (
    !help ||
    help.querySelector(
      "[data-workbench-reference]"
    )
  ) return;

  const details =
    el("details");

  details.dataset.workbenchReference =
    "1";

  const summary =
    el("summary");

  const chips =
    el("div", {
      className:"syntax-chips"
    });

  const templates = [
    [
      "table(sin(x),x,-3,3,0.5)",
      "table(f,x,a,b,step)"
    ],
    [
      "multiplot([sin(x),cos(x)],x,-6,6)",
      "multiplot([f,g],x,a,b)"
    ],
    [
      "nsolve(cos(x)-x,x,1)",
      "nsolve(f,x,guess)"
    ],
    [
      "minimize(x^4-3x^2+2,x,-3,3)",
      "minimize(f,x,a,b)"
    ],
    [
      "summary([1,2,3,4,5,10])",
      "summary([data])"
    ],
    [
      "linreg([1,2,3,4],[2,4.1,5.9,8.2])",
      "linreg([x],[y])"
    ],
    [
      "det([[1,2],[3,4]])",
      "det(A)"
    ],
    [
      "taylor(sin(x),x,0,7)",
      "taylor(f,x,a,n)"
    ]
  ];

  for (
    const [template,label]
    of templates
  ) {
    const button =
      el("button");

    button.dataset.template =
      template;

    button.appendChild(
      el("code", {
        text:label
      })
    );

    button.addEventListener(
      "click",
      () => {
        const input =
          document.getElementById(
            "expression"
          );

        input.value = template;
        input.focus();
      }
    );

    chips.appendChild(button);
  }

  const localize = () => {
    summary.textContent = t(
      "WORKBENCH: исследование функций и данных",
      "WORKBENCH: explore functions and data"
    );
  };

  details.append(
    summary,
    chips
  );

  help.appendChild(details);

  new MutationObserver(
    localize
  ).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();
}

export function initWorkbench() {
  installInterceptors();
  injectReference();
}
