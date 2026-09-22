import {
  buildDataCommand,
  buildLinearSystemCommand,
  buildMatrixCommand,
  parseNumberList
} from "./visual-builders-core.js";
import { el, featureToast, t } from "../ui-utils.js";

function makeNumberInput(value = 0) {
  const input = el("input", { className:"builder-cell" });
  input.type = "number";
  input.step = "any";
  input.value = value;
  return input;
}

function matrixGrid(rows, cols, seed = null) {
  const grid = el("div", { className:"builder-matrix-grid" });
  grid.style.setProperty("--cols", cols);

  const cells = [];

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const input = makeNumberInput(seed?.[r]?.[c] ?? (r === c ? 1 : 0));
      grid.appendChild(input);
      row.push(input);
    }
    cells.push(row);
  }

  return {
    element:grid,
    values:() => cells.map(row => row.map(input => input.value))
  };
}

function variableNames(count) {
  const defaults = ["x","y","z","w","u","v"];
  return defaults.slice(0, count);
}

function modalShell() {
  const overlay = el("div", { className:"builder-overlay" });
  overlay.hidden = true;

  const modal = el("div", { className:"builder-modal" });
  const top = el("div", { className:"builder-modal-head" });
  const title = el("h2");
  const close = el("button", {
    className:"workspace-link-button",
    type:"button",
    text:"×"
  });

  close.addEventListener("click", () => {
    overlay.hidden = true;
  });

  top.append(title, close);
  const tabs = el("div", { className:"builder-tabs" });
  const body = el("div", { className:"builder-body" });

  modal.append(top, tabs, body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", event => {
    if (event.target === overlay) overlay.hidden = true;
  });

  return { overlay, modal, title, tabs, body };
}

function runCommand(command) {
  const input = document.getElementById("expression");
  const calculate = document.getElementById("calculate");
  if (!input || !calculate) return;

  input.value = command;
  input.dispatchEvent(new Event("input", { bubbles:true }));
  input.focus();
  calculate.click();
}

function matrixBuilder(host) {
  const controls = el("div", { className:"builder-controls" });
  const size = el("select");
  for (const n of [2,3,4]) {
    const option = document.createElement("option");
    option.value = n;
    option.textContent = `${n}×${n}`;
    size.appendChild(option);
  }

  const action = el("select");
  const actions = [
    ["det","det(A)"],
    ["inverse","inverse(A)"],
    ["transpose","transpose(A)"],
    ["rank","rank(A)"],
    ["trace","trace(A)"],
    ["eigen2","eigen2(A)"]
  ];

  for (const [value,label] of actions) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    action.appendChild(option);
  }

  const gridHost = el("div");
  let grid = null;

  const rebuild = () => {
    const n = Number(size.value);
    if (n !== 2 && action.value === "eigen2") action.value = "det";
    action.querySelector('option[value="eigen2"]').disabled = n !== 2;

    grid = matrixGrid(n, n);
    gridHost.innerHTML = "";
    gridHost.appendChild(grid.element);
  };

  size.addEventListener("change", rebuild);

  controls.append(
    el("span", { text:"Size" }),
    size,
    el("span", { text:"Action" }),
    action
  );

  const run = el("button", {
    className:"feature-button",
    type:"button",
    text:t("СОЗДАТЬ И ЗАПУСТИТЬ","BUILD & RUN")
  });

  run.addEventListener("click", () => {
    try {
      runCommand(buildMatrixCommand(grid.values(), action.value));
    } catch (error) {
      featureToast(error.message);
    }
  });

  host.append(controls, gridHost, run);
  rebuild();
}

function systemBuilder(host) {
  const controls = el("div", { className:"builder-controls" });
  const size = el("select");

  for (const n of [2,3,4]) {
    const option = document.createElement("option");
    option.value = n;
    option.textContent = `${n} variables`;
    size.appendChild(option);
  }

  const area = el("div");
  let matrix = null;
  let rhs = [];
  let names = [];

  const rebuild = () => {
    const n = Number(size.value);
    area.innerHTML = "";

    const vars = variableNames(n);
    names = vars.map(name => {
      const input = el("input", { className:"builder-variable" });
      input.value = name;
      return input;
    });

    const header = el("div", { className:"builder-system-header" });
    for (const input of names) header.appendChild(input);
    header.appendChild(el("span", { text:"=" }));

    matrix = matrixGrid(n, n, Array.from({length:n}, (_,r) =>
      Array.from({length:n}, (_,c) => r === c ? 1 : 0)
    ));

    rhs = Array.from({length:n}, () => makeNumberInput(0));

    const equationGrid = el("div", { className:"builder-system-grid" });
    equationGrid.style.setProperty("--cols", n);

    const cells = [...matrix.element.children];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        equationGrid.appendChild(cells[r*n+c]);
      }
      const eq = el("span", { className:"builder-equals", text:"=" });
      equationGrid.appendChild(eq);
      equationGrid.appendChild(rhs[r]);
    }

    area.append(header, equationGrid);
  };

  size.addEventListener("change", rebuild);
  controls.append(el("span", { text:"Size" }), size);

  const run = el("button", {
    className:"feature-button",
    type:"button",
    text:t("РЕШИТЬ СИСТЕМУ","SOLVE SYSTEM")
  });

  run.addEventListener("click", () => {
    try {
      runCommand(
        buildLinearSystemCommand(
          matrix.values(),
          rhs.map(input => input.value),
          names.map(input => input.value)
        )
      );
    } catch (error) {
      featureToast(error.message);
    }
  });

  host.append(controls, area, run);
  rebuild();
}

function dataBuilder(host) {
  const labelX = el("label", { className:"builder-field" });
  const titleX = el("span");
  const x = el("textarea");
  x.rows = 4;
  x.value = "1, 2, 3, 4, 5";
  labelX.append(titleX, x);

  const labelY = el("label", { className:"builder-field" });
  const titleY = el("span");
  const y = el("textarea");
  y.rows = 4;
  y.placeholder = "2, 4, 6, 8, 10";
  labelY.append(titleY, y);

  const actions = el("div", { className:"builder-action-row" });

  const make = (ru,en,fn) => {
    const b = el("button", {
      className:"feature-button subtle",
      type:"button"
    });
    b.addEventListener("click", fn);

    const localize = () => b.textContent = t(ru,en);
    new MutationObserver(localize).observe(document.documentElement, {
      attributes:true,
      attributeFilter:["lang"]
    });
    localize();
    return b;
  };

  actions.append(
    make("СВОДКА","SUMMARY", () => {
      try { runCommand(buildDataCommand(x.value, "summary")); }
      catch (error) { featureToast(error.message); }
    }),
    make("СРЕДНЕЕ","MEAN", () => {
      try { runCommand(buildDataCommand(x.value, "mean")); }
      catch (error) { featureToast(error.message); }
    }),
    make("РЕГРЕССИЯ","REGRESSION", () => {
      try { runCommand(buildDataCommand(x.value, "linreg", y.value)); }
      catch (error) { featureToast(error.message); }
    })
  );

  const localize = () => {
    titleX.textContent = t("Значения / X","Values / X");
    titleY.textContent = t("Y (только для регрессии)","Y (regression only)");
  };

  new MutationObserver(localize).observe(document.documentElement, {
    attributes:true,
    attributeFilter:["lang"]
  });

  localize();
  host.append(labelX, labelY, actions);
}

export function initVisualBuilders() {
  const shell = modalShell();

  const sections = {
    matrix:() => matrixBuilder(shell.body),
    system:() => systemBuilder(shell.body),
    data:() => dataBuilder(shell.body)
  };

  let active = "matrix";

  const render = () => {
    shell.body.innerHTML = "";
    sections[active]();

    for (const button of shell.tabs.querySelectorAll("button")) {
      button.classList.toggle("active", button.dataset.tab === active);
    }

    const titles = {
      matrix:["Матрица","Matrix"],
      system:["Система уравнений","Linear system"],
      data:["Данные и регрессия","Data & regression"]
    };

    shell.title.textContent = t(titles[active][0], titles[active][1]);
  };

  for (const [key,ru,en] of [
    ["matrix","МАТРИЦА","MATRIX"],
    ["system","СИСТЕМА","SYSTEM"],
    ["data","ДАННЫЕ","DATA"]
  ]) {
    const b = el("button", {
      className:"builder-tab",
      type:"button"
    });
    b.dataset.tab = key;

    const localize = () => b.textContent = t(ru,en);
    new MutationObserver(localize).observe(document.documentElement, {
      attributes:true,
      attributeFilter:["lang"]
    });
    localize();

    b.addEventListener("click", () => {
      active = key;
      render();
    });

    shell.tabs.appendChild(b);
  }

  const open = el("button", {
    className:"workspace-tool-button",
    type:"button"
  });

  const localizeOpen = () => {
    open.textContent = t("ВИЗУАЛЬНЫЕ ИНСТРУМЕНТЫ","VISUAL TOOLS");
  };

  open.addEventListener("click", () => {
    shell.overlay.hidden = false;
    render();
  });

  new MutationObserver(localizeOpen).observe(document.documentElement, {
    attributes:true,
    attributeFilter:["lang"]
  });

  localizeOpen();

  document.querySelector(".workspace-top-tools")?.prepend(open);
  render();
}
