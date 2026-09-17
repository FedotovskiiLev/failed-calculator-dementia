(() => {
  "use strict";

  const BRAIN_KEY = "failed-calculator-brain-v1";
  const LOG_KEY = "failed-calculator-observer-log-v1";
  const MAX_TABLE_ABS = 35;

  const OPS = {
    "+":  { label: "сложение",  glyph: "+", calc: (a,b) => a + b },
    "-":  { label: "вычитание", glyph: "−", calc: (a,b) => a - b },
    "*":  { label: "умножение", glyph: "×", calc: (a,b) => a * b },
    "/":  { label: "деление",   glyph: "÷", calc: (a,b) => b === 0 ? NaN : a / b },
    "%":  { label: "остаток",   glyph: "%", calc: (a,b) => b === 0 ? NaN : a % b },
    "**": { label: "степень",   glyph: "^", calc: (a,b) => a ** b }
  };

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function emptyOp() {
    return { discovered:false, min:null, max:null, cells:{}, specials:{}, last:null };
  }

  function randomizedDuration(meanSeconds) {
    const factor = 0.65 + Math.random() * 0.70;
    return Math.round(meanSeconds * factor * 1000);
  }

  function freshBrain(meanSeconds = 150) {
    const duration = randomizedDuration(meanSeconds);
    return {
      version:1,
      meanSeconds,
      cycleStartedAt:Date.now(),
      cycleDurationMs:duration,
      forgetAt:Date.now() + duration,
      ops:Object.fromEntries(Object.keys(OPS).map(k => [k, emptyOp()]))
    };
  }

  function saveBrain(b = brain) {
    sessionStorage.setItem(BRAIN_KEY, JSON.stringify(b));
  }

  function loadBrain() {
    const raw = sessionStorage.getItem(BRAIN_KEY);
    if (!raw) {
      const b = freshBrain();
      saveBrain(b);
      return b;
    }
    try {
      const parsed = JSON.parse(raw);
      for (const k of Object.keys(OPS)) parsed.ops[k] ??= emptyOp();
      return parsed;
    } catch {
      const b = freshBrain();
      saveBrain(b);
      return b;
    }
  }

  function loadLog() {
    try { return JSON.parse(sessionStorage.getItem(LOG_KEY) || "[]"); }
    catch { return []; }
  }

  function saveLog() {
    sessionStorage.setItem(LOG_KEY, JSON.stringify(observerLog.slice(-350)));
  }

  function log(message, type = "") {
    observerLog.push({ at:Date.now(), message, type });
    saveLog();
    renderLog();
  }

  function timeString(ts) {
    return new Date(ts).toLocaleTimeString("ru-RU", {hour12:false});
  }

  function formatNumber(n) {
    if (Number.isNaN(n)) return "НЕОПРЕДЕЛЕНО";
    if (!Number.isFinite(n)) return n > 0 ? "∞" : "−∞";
    if (Object.is(n, -0)) return "0";
    if (Number.isInteger(n)) return String(n);
    return Number(n.toPrecision(12)).toString();
  }

  function parseNumber(text) {
    const cleaned = text.trim().replace(",", ".");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function resultFor(op, a, b) {
    return OPS[op].calc(a,b);
  }

  function cellKey(a,b) { return `${a},${b}`; }
  function specialKey(a,b) { return `${a}|${b}`; }

  let brain = loadBrain();
  let observerLog = loadLog();
  let selectedMemoryOp = "+";
  let busy = false;

  if (!observerLog.length) {
    log("Создан новый пустой мозг. Ни одна математическая операция не известна.", "discover");
  }

  function operationStatus(op) {
    if (!op.discovered) return "не знает";
    if (op.min !== null) return `таблица ${op.min}…${op.max}`;
    return "видел отдельные случаи";
  }

  function renderOps() {
    const list = $("opsList");
    list.innerHTML = "";
    let known = 0;

    for (const [symbol, spec] of Object.entries(OPS)) {
      const op = brain.ops[symbol];
      if (op.discovered) known++;

      const row = document.createElement("div");
      row.className = "op-state";
      row.innerHTML = `
        <div class="op-symbol">${spec.glyph}</div>
        <div><b>${spec.label}</b><br><small>${operationStatus(op)}</small></div>
        <span class="badge ${op.discovered ? "known" : "unknown"}">${op.discovered ? "ПОМНИТ" : "НЕ ЗНАЕТ"}</span>
      `;
      list.appendChild(row);
    }

    $("knownOps").textContent = `${known} / ${Object.keys(OPS).length}`;
    $("brainState").textContent =
      known === 0 ? "ПУСТ" :
      known <= 2 ? "УЧИТСЯ" :
      known < Object.keys(OPS).length ? "ОБРАЗОВАН" : "ПОДОЗРИТЕЛЬНО УМЁН";
  }

  function setResult(html) {
    $("result").innerHTML = html;
  }

  function showToast(text) {
    const t = $("toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => t.classList.remove("show"), 4300);
  }

  function setProgress(show, percent = 0, label = "") {
    $("progressWrap").classList.toggle("show", show);
    $("progressBar").style.width = `${Math.max(0, Math.min(100, percent))}%`;
    $("progressLabel").textContent = label;
  }

  async function discoverOperation(symbol) {
    const op = brain.ops[symbol];
    if (op.discovered) return false;

    op.discovered = true;
    saveBrain();
    renderOps();

    log(`Открытие: калькулятор впервые встретил операцию «${OPS[symbol].label}» (${OPS[symbol].glyph}).`, "discover");

    setResult(`<span class="shock">[НИФИГА СЕБЕ]</span>
Обнаружена неизвестная операция: <b>${OPS[symbol].label}</b> ${OPS[symbol].glyph}

Пытаюсь понять, что она делает…`);

    await sleep(700);
    return true;
  }

  function boundsNeeded(op, a, b) {
    const low = Math.min(0, a, b);
    const high = Math.max(0, a, b);

    if (Math.abs(low) > MAX_TABLE_ABS || Math.abs(high) > MAX_TABLE_ABS) return null;

    return {
      min:op.min === null ? low : Math.min(op.min, low),
      max:op.max === null ? high : Math.max(op.max, high)
    };
  }

  async function learnIntegerTable(symbol, newMin, newMax) {
    const op = brain.ops[symbol];
    const oldMin = op.min;
    const oldMax = op.max;
    const rows = newMax - newMin + 1;
    const total = rows * rows;
    let done = 0;

    setProgress(true, 0, `строю таблицу ${OPS[symbol].label}: ${newMin}…${newMax}`);

    for (let a = newMin; a <= newMax; a++) {
      for (let b = newMin; b <= newMax; b++) {
        const key = cellKey(a,b);

        if (!(key in op.cells)) {
          const value = resultFor(symbol, a, b);
          op.cells[key] = Number.isNaN(value) ? null : formatNumber(value);
        }

        done++;
      }

      const pct = done / total * 100;
      setProgress(
        true,
        pct,
        `запоминаю строку ${a}; ${done.toLocaleString("ru-RU")} / ${total.toLocaleString("ru-RU")} ячеек`
      );

      // Пользователь видит, как таблица буквально растёт.
      op.min = newMin;
      op.max = newMax;
      saveBrain();
      renderMemoryTable();

      await sleep(rows > 45 ? 8 : 24);
    }

    op.min = newMin;
    op.max = newMax;
    saveBrain();
    setProgress(false);

    log(
      `Выучена таблица «${OPS[symbol].label}» для диапазона ${newMin}…${newMax}` +
      (oldMin === null ? "." : `; раньше было ${oldMin}…${oldMax}.`),
      "learn"
    );
  }

  async function answer() {
    if (busy) return;

    const a = parseNumber($("a").value);
    const b = parseNumber($("b").value);
    const symbol = $("operator").value;

    if (a === null || b === null) {
      setResult(`<span class="forgot">[ОШИБКА]</span>
Мне дали не два обычных конечных числа.
Я пока даже не знаю, как этому удивляться.`);
      return;
    }

    busy = true;
    $("calculate").disabled = true;

    try {
      await discoverOperation(symbol);

      const op = brain.ops[symbol];
      const bothIntegers = Number.isSafeInteger(a) && Number.isSafeInteger(b);

      let fromMemory = false;
      let value;

      if (bothIntegers) {
        const bounds = boundsNeeded(op, a, b);

        if (bounds) {
          if (op.min === null || bounds.min < op.min || bounds.max > op.max) {
            setResult(`<span class="shock">[НЕДОСТАТОЧНО ЗНАНИЙ]</span>
Чтобы ответить на ${a} ${OPS[symbol].glyph} ${b},
я сначала построю таблицу «${OPS[symbol].label}» для диапазона ${bounds.min}…${bounds.max}.

Да. Всю таблицу.`);

            await sleep(450);
            await learnIntegerTable(symbol, bounds.min, bounds.max);
          }

          const remembered = op.cells[cellKey(a,b)];
          value = remembered === null ? NaN : Number(remembered);
          fromMemory = true;
        } else {
          const sk = specialKey(a,b);

          if (sk in op.specials) {
            value = Number(op.specials[sk]);
            fromMemory = true;
          } else {
            value = resultFor(symbol, a, b);
            op.specials[sk] = formatNumber(value);
            op.last = {a,b};
            saveBrain();
            log(
              `Числа ${a} и ${b} слишком велики для полной таблицы; запомнен отдельный пример ${a} ${OPS[symbol].glyph} ${b}.`,
              "learn"
            );
          }
        }
      } else {
        const sk = specialKey(a,b);

        if (sk in op.specials) {
          value = Number(op.specials[sk]);
          fromMemory = true;
        } else {
          value = resultFor(symbol, a, b);
          op.specials[sk] = formatNumber(value);
          op.last = {a,b};
          saveBrain();
          log(`Запомнен отдельный дробный пример ${a} ${OPS[symbol].glyph} ${b}.`, "learn");
        }
      }

      const shown = formatNumber(value);
      const mode = fromMemory
        ? "[ПАМЯТЬ] Такой пример покрывается уже выученными знаниями."
        : "[ЭКСПЕРИМЕНТ] Ответ получен один раз и записан в память.";

      setResult(`${mode}

<span class="answer">${a} ${OPS[symbol].glyph} ${b} = ${shown}</span>`);

      renderEverything();
    } finally {
      busy = false;
      $("calculate").disabled = false;
    }
  }

  function forgetEverything(reason = "случайный приступ") {
    const mean = brain.meanSeconds;
    const knownBefore = Object.values(brain.ops).filter(x => x.discovered).length;

    brain = freshBrain(mean);
    saveBrain();

    log(
      `ПРОВАЛ ПАМЯТИ (${reason}). Стерты таблицы и ${knownBefore} известных операций.`,
      "dementia"
    );

    setResult(`<span class="forgot">[ПРИСТУП ДЕМЕНЦИИ]</span>
Все математические знания исчезли.

«А что вообще означает плюс?»`);

    showToast("ПРОВАЛ ПАМЯТИ: калькулятор забыл всю математику.");
    setProgress(false);
    renderEverything();
  }

  function renderMemoryButtons() {
    const box = $("memoryOps");
    box.innerHTML = "";

    for (const [symbol, spec] of Object.entries(OPS)) {
      const btn = document.createElement("button");
      btn.textContent = `${spec.glyph} ${spec.label}`;
      btn.classList.toggle("active", selectedMemoryOp === symbol);

      btn.onclick = () => {
        selectedMemoryOp = symbol;
        renderMemoryButtons();
        renderMemoryTable();
      };

      box.appendChild(btn);
    }
  }

  function visibleRange(op) {
    if (op.min === null) return [];

    let lo = op.min;
    let hi = op.max;
    const maxCellsSide = 17;

    if (hi - lo + 1 <= maxCellsSide) {
      return Array.from({length:hi-lo+1}, (_,i) => lo+i);
    }

    if (lo <= 0 && hi >= 0) {
      lo = Math.max(lo, -6);
      hi = Math.min(hi, 10);
    } else {
      hi = Math.min(hi, lo + maxCellsSide - 1);
    }

    return Array.from({length:hi-lo+1}, (_,i) => lo+i);
  }

  function renderMemoryTable() {
    const op = brain.ops[selectedMemoryOp];
    const spec = OPS[selectedMemoryOp];
    const wrap = $("memoryTableWrap");
    const meta = $("tableMeta");
    const specials = $("specialList");

    specials.innerHTML = "";

    if (!op.discovered) {
      meta.textContent = `Операция «${spec.label}» пока не открыта.`;
      wrap.innerHTML = `<div style="padding:18px;color:var(--muted)">Здесь пока буквально ничего нет.</div>`;
      return;
    }

    if (op.min === null) {
      meta.textContent = `Операция «${spec.label}» известна, но полной целочисленной таблицы пока нет.`;
      wrap.innerHTML = `<div style="padding:18px;color:var(--muted)">Калькулятор видел только отдельные случаи.</div>`;
    } else {
      const range = visibleRange(op);
      const clipped = range.length < (op.max - op.min + 1);

      meta.textContent =
        `В памяти: таблица «${spec.label}» для ${op.min}…${op.max}. ` +
        `${Object.keys(op.cells).length.toLocaleString("ru-RU")} явных ячеек.` +
        (clipped ? " Ниже показан только фрагмент, чтобы не убить браузер." : "");

      let html = `<table class="memory-table"><thead><tr><th>a ${spec.glyph} b</th>`;

      for (const b of range) html += `<th>${b}</th>`;

      html += `</tr></thead><tbody>`;

      for (const a of range) {
        html += `<tr><td>${a}</td>`;

        for (const b of range) {
          const key = cellKey(a,b);
          const value = key in op.cells ? op.cells[key] : "·";
          html += `<td>${value === null ? "ERR" : value}</td>`;
        }

        html += `</tr>`;
      }

      html += `</tbody></table>`;
      wrap.innerHTML = html;
    }

    const entries = Object.entries(op.specials);

    if (entries.length) {
      const title = document.createElement("h3");
      title.textContent = "Отдельные эпизодические воспоминания";
      specials.appendChild(title);

      for (const [key, value] of entries.slice(-30).reverse()) {
        const [a,b] = key.split("|");
        const div = document.createElement("div");
        div.className = "special";
        div.textContent = `${a} ${spec.glyph} ${b} = ${value}`;
        specials.appendChild(div);
      }
    }
  }

  function renderLog() {
    const box = $("eventLog");
    if (!box) return;

    box.innerHTML = observerLog
      .slice()
      .reverse()
      .map(e => `<div class="${e.type || ""}"><time>${timeString(e.at)}</time> — ${escapeHtml(e.message)}</div>`)
      .join("");

    if (!observerLog.length) {
      box.innerHTML = `<div>Журнал пуст.</div>`;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  function renderDementia() {
    const now = Date.now();
    const left = Math.max(0, brain.forgetAt - now);
    const mins = Math.floor(left / 60000);
    const secs = Math.floor((left % 60000) / 1000);

    $("forgetCountdown").textContent = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;

    const total = brain.cycleDurationMs;
    const ratio = total > 0 ? left / total : 0;
    const health = $("healthFill");

    health.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
    health.style.background =
      ratio > .5 ? "var(--good)" :
      ratio > .2 ? "var(--warn)" :
      "var(--bad)";

    if (left <= 0 && !busy) {
      forgetEverything("таймер когнитивного распада");
    }
  }

  function renderEverything() {
    renderOps();
    renderMemoryButtons();
    renderMemoryTable();
    renderLog();
    renderDementia();
  }

  function changeMeanInterval(seconds) {
    brain.meanSeconds = seconds;
    const duration = randomizedDuration(seconds);
    brain.cycleStartedAt = Date.now();
    brain.cycleDurationMs = duration;
    brain.forgetAt = Date.now() + duration;
    saveBrain();

    $("intervalLabel").textContent = prettySeconds(seconds);
    log(`Средний интервал деменции изменён на ${prettySeconds(seconds)}.`, "discover");
    renderDementia();
  }

  function prettySeconds(s) {
    if (s < 60) return `${s} с`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec ? `${m} мин ${sec} с` : `${m} мин`;
  }

  // Tabs
  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));

      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");

      if (btn.dataset.tab === "memory") {
        renderMemoryButtons();
        renderMemoryTable();
      }
    });
  });

  $("calculate").addEventListener("click", answer);

  [$("a"), $("b")].forEach(input => {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") answer();
    });
  });

  $("interval").value = brain.meanSeconds;
  $("intervalLabel").textContent = prettySeconds(brain.meanSeconds);

  $("interval").addEventListener("input", e => {
    $("intervalLabel").textContent = prettySeconds(Number(e.target.value));
  });

  $("interval").addEventListener("change", e => {
    changeMeanInterval(Number(e.target.value));
  });

  $("resetBrain").addEventListener("click", () => {
    forgetEverything("ручная лоботомия пользователем");
  });

  // Если вкладка была заморожена браузером и время уже вышло.
  if (Date.now() >= brain.forgetAt) {
    forgetEverything("время прошло, пока вкладка спала");
  } else {
    renderEverything();
  }

  setInterval(renderDementia, 500);
})();
