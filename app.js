(() => {
"use strict";

/* ============================================================
   FAILED CALCULATOR 1.0.1

   The expression evaluator deliberately does not dispatch an
   expression straight to JavaScript arithmetic or eval().

   Small integer arithmetic is learned as explicit tables.
   New table cells are derived from rules the calculator has
   discovered: successor/predecessor for addition, repeated
   addition for multiplication, repeated subtraction/long
   division for division, etc.

   Transcendental functions are approximated with iterations and
   series. Complex arithmetic is decomposed into real operations.
   JavaScript numbers remain the physical substrate of the browser,
   but there is no "native calculator" shortcut for the answer.
   ============================================================ */

const BRAIN_KEY = "failed-calculator-brain-v3";
const LOG_KEY = "failed-calculator-observer-log-v3";
const STATS_KEY = "failed-calculator-stats-v3";
const LANG_KEY = "failed-calculator-language";
const TABLE_LIMIT = 18;
const TABLE_VIEW_LIMIT = 17;

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (n,a,b) => n<a?a:n>b?b:n;
const absN = n => n < 0 ? -n : n;

/* ---------------------- computation safety ----------------------
   Deliberate thinking delays are allowed to take time because they
   yield to the browser. What we do not allow is an enormous tight
   arithmetic loop that locks the tab and burns a CPU core forever.

   The work budget is intentionally conservative. When it is exhausted,
   the calculator keeps everything it learned so far, reports its last
   meaningful intermediate result, and stops the current expression.
   ---------------------------------------------------------------- */
const RUN_STEP_LIMIT = 160000;
const SINGLE_LINEAR_LIMIT = 60000;
const EMERGENCY_WALL_MS = 60000;

class ComputationBudgetExceeded extends Error {
  constructor(detail="") {
    super("computation budget exceeded");
    this.name = "ComputationBudgetExceeded";
    this.detail = detail;
  }
}

let activeRun = null;

function beginRun(source) {
  activeRun = {
    source,
    startedAt: performance.now(),
    steps: 0,
    lastGood: "",
    technical: ""
  };
}

function setRunProgress(ru, en) {
  if (!activeRun) return;
  activeRun.lastGood = L(ru, en);
}

function budgetTick(units=1, technical="") {
  if (!activeRun) return;

  activeRun.steps += units;
  if (technical) activeRun.technical = technical;

  if (
    activeRun.steps > RUN_STEP_LIMIT ||
    performance.now() - activeRun.startedAt > EMERGENCY_WALL_MS
  ) {
    throw new ComputationBudgetExceeded(
      technical || activeRun.technical
    );
  }
}

function budgetPreflight(projectedSteps, technical="") {
  if (!activeRun) return;

  if (
    projectedSteps > SINGLE_LINEAR_LIMIT ||
    activeRun.steps + projectedSteps > RUN_STEP_LIMIT
  ) {
    activeRun.technical = technical;
    throw new ComputationBudgetExceeded(technical);
  }
}

function budgetChunk(i, total, chunk=256, technical="") {
  if ((i % chunk) === 0) {
    budgetTick(Math.min(chunk, total - i), technical);
  }
}

const I18N = {
  ru: {
    kicker:"НЕЙРОДЕГЕНЕРАТИВНАЯ АРИФМЕТИЧЕСКАЯ СИСТЕМА",
    hero:"Пишите выражение целиком. Калькулятор начинает сеанс без математики, открывает правила по ходу работы, строит таблицы и алгоритмы, а затем постепенно теряет ячейки, понятия и целые разделы собственного образования.",
    status:"состояние", memoryHealth:"здоровье памяти", knownConcepts:"понятий помнит", nextEpisode:"следующий эпизод",
    tabCalculator:"КАЛЬКУЛЯТОР", tabMemory:"ПАМЯТЬ", tabCharts:"ГРАФИКИ", tabObserver:"ЖУРНАЛ НАБЛЮДАТЕЛЯ", tabDementia:"ДЕМЕНЦИЯ", tabAbout:"О ПРОЕКТЕ",
    experienceTitle:"МАТЕМАТИЧЕСКИЙ ОПЫТ", expressionPlaceholder:"например: 2 + 5i", thinkButton:"ДУМАТЬ", tryExamples:"попробуйте:", thinkingPlaceholder:"Внутренний монолог появится здесь.", rememberTitle:"ЧТО ОН СЕЙЧАС ПОМНИТ",
    internalMemory:"ВНУТРЕННЯЯ ПАМЯТЬ", memorySubtitle:"Ячейки тускнеют по мере деградации и исчезают, когда забыты.",
    chartsTitle:"ГРАФИКИ КОГНИТИВНОЙ ЖИЗНИ", chartsSubtitle:"Данные записывает внешний наблюдатель, поэтому история переживает приступы забывания.",
    chartHealth:"Целостность памяти", chartKnowledge:"Количество сохранённых знаний", chartConcepts:"Число известных понятий", chartDecay:"Накопленные приступы деменции",
    observerTitle:"ЖУРНАЛ ВНЕШНЕГО НАБЛЮДАТЕЛЯ", observerSubtitle:"Журнал находится «снаружи мозга» и переживает его забывание.",
    dementiaTitle:"ПАРАМЕТРЫ КОГНИТИВНОГО РАСПАДА", decayInterval:"Средний интервал между приступами:", decayHelp:"Приступ повреждает случайные понятия, ослабляет воспоминания и вырывает отдельные ячейки таблиц.", triggerEpisode:"ВЫЗВАТЬ ПРИСТУП", lobotomy:"ПОЛНАЯ ЛОБОТОМИЯ", currentStage:"Текущая стадия:",
    aboutTitle:"КАК ЭТО РАБОТАЕТ",
    aboutP1:"Это не обычный калькулятор с театральной задержкой. Он действительно хранит приобретённые таблицы и алгоритмические знания в памяти сеанса и старается выводить новое из уже открытого.",
    aboutP2:"Сложение маленьких целых строится рекуррентно через следующий элемент; умножение выводится из повторного сложения; деление — из длинного деления; степень и факториал — из умножения. Трансцендентные функции исследуются итерациями и рядами, а комплексная арифметика раскладывается на уже изученные операции над действительными частями.",
    aboutP3:"Поэтому первое знакомство с новой математикой действительно занимает время. Повторные примеры обычно становятся быстрее — пока деменция не вырвет нужные куски памяти.",
    aboutP4:"Состояние мозга хранится только в sessionStorage: новый посетитель начинает с нуля, обновление той же вкладки сохраняет текущую личность калькулятора.",
    footer:"без фреймворков · без backend · public-repo friendly",
    emptyBrain:"МОЗГ ПУСТ.\nЯ пока не знаю даже, что означает знак «+».", empty:"пока ничего", memoryEmpty:"память пуста", noTables:"таблиц нет", episodes:"Эпизодические воспоминания",
    stage0:"почти ясное сознание", stage0d:"Большая часть приобретённых знаний ещё держится.", stage1:"лёгкая забывчивость", stage1d:"Отдельные ячейки таблиц начинают тускнеть и выпадать.", stage2:"фрагментация памяти", stage2d:"Некоторые операции узнаются не сразу; таблицы становятся дырявыми.", stage3:"тяжёлая деградация", stage3d:"Сохранились обрывки правил и отдельные эпизоды. Знакомые знаки иногда кажутся новыми.", stage4:"почти полная амнезия", stage4d:"Остатки математики держатся на нескольких случайных воспоминаниях."
  },
  en: {
    kicker:"NEURODEGENERATIVE ARITHMETIC SYSTEM",
    hero:"Type a whole expression. The calculator starts each session without mathematics, discovers rules while working, builds tables and algorithms, and then gradually loses cells, concepts, and entire parts of its education.",
    status:"state", memoryHealth:"memory health", knownConcepts:"known concepts", nextEpisode:"next episode",
    tabCalculator:"CALCULATOR", tabMemory:"MEMORY", tabCharts:"CHARTS", tabObserver:"OBSERVER LOG", tabDementia:"DEMENTIA", tabAbout:"ABOUT",
    experienceTitle:"MATHEMATICAL EXPERIENCE", expressionPlaceholder:"for example: 2 + 5i", thinkButton:"THINK", tryExamples:"try:", thinkingPlaceholder:"The internal monologue will appear here.", rememberTitle:"WHAT IT REMEMBERS NOW",
    internalMemory:"INTERNAL MEMORY", memorySubtitle:"Cells fade as memory degrades and disappear when forgotten.",
    chartsTitle:"CHARTS OF COGNITIVE LIFE", chartsSubtitle:"Measurements are kept by an external observer, so their history survives memory-loss episodes.",
    chartHealth:"Memory integrity", chartKnowledge:"Stored knowledge", chartConcepts:"Known concepts", chartDecay:"Cumulative dementia episodes",
    observerTitle:"EXTERNAL OBSERVER LOG", observerSubtitle:"This log exists outside the brain and survives forgetting.",
    dementiaTitle:"COGNITIVE DECAY PARAMETERS", decayInterval:"Average time between episodes:", decayHelp:"An episode damages random concepts, weakens memories, and tears individual cells out of learned tables.", triggerEpisode:"TRIGGER EPISODE", lobotomy:"FULL LOBOTOMY", currentStage:"Current stage:",
    aboutTitle:"HOW IT WORKS",
    aboutP1:"This is not a normal calculator with theatrical delays. It actually stores acquired tables and algorithmic knowledge in session memory and tries to derive new results from what it has already discovered.",
    aboutP2:"Small-integer addition is constructed recursively through successor steps; multiplication is derived from repeated addition; division from long division; powers and factorials from multiplication. Transcendental functions are researched with iterations and series, while complex arithmetic is reduced to already learned real operations.",
    aboutP3:"That is why the first encounter with new mathematics genuinely takes time. Repeated examples usually become faster — until dementia removes the pieces of memory they depend on.",
    aboutP4:"The brain exists only in sessionStorage: each new visitor starts from zero, while reloading the same tab keeps that calculator's current personality.",
    footer:"no framework · no backend · public-repo friendly",
    emptyBrain:"EMPTY BRAIN.\nI do not even know what the “+” sign means yet.", empty:"nothing yet", memoryEmpty:"empty memory", noTables:"no tables", episodes:"Episodic memories",
    stage0:"almost clear", stage0d:"Most acquired knowledge is still intact.", stage1:"mild forgetfulness", stage1d:"Individual table cells begin to fade and disappear.", stage2:"fragmented memory", stage2d:"Some operations are not recognized immediately; tables develop holes.", stage3:"severe degradation", stage3d:"Only fragments of rules and isolated episodes remain. Familiar symbols may look new.", stage4:"near-total amnesia", stage4d:"The remains of mathematics survive in only a few random memories."
  }
};

let lang = localStorage.getItem(LANG_KEY) || (navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en");
const tr = key => I18N[lang][key] ?? I18N.ru[key] ?? key;
const L = (ru,en) => lang === "ru" ? ru : en;

/* ----------------------------- complex ----------------------------- */
class Complex {
  constructor(re=0,im=0){ this.re=Number(re); this.im=Number(im); }
  static from(v){ return v instanceof Complex ? v : new Complex(Number(v),0); }
  isReal(eps=1e-10){ return absN(this.im) < eps; }
  isFinite(){ return Number.isFinite(this.re) && Number.isFinite(this.im); }
}
const ser = z => { z=Complex.from(z); return {re:z.re,im:z.im}; };
const de = v => new Complex(v.re,v.im);
function clean(n){ if(absN(n)<1e-12)return 0; const x=Number(n.toPrecision(12)); return Object.is(x,-0)?0:x; }
function fmt(z){
  z=Complex.from(z); const re=clean(z.re), im=clean(z.im);
  if(!Number.isFinite(re)||!Number.isFinite(im)) return L("не определено","undefined");
  if(absN(im)<1e-10) return String(re);
  if(absN(re)<1e-10){ if(im===1)return"i"; if(im===-1)return"-i"; return `${im}i`; }
  const sign=im>=0?"+":"−", mag=absN(im); return `${re} ${sign} ${mag===1?"i":`${mag}i`}`;
}
const hashZ = z => { z=Complex.from(z); return `${clean(z.re)}:${clean(z.im)}`; };

/* ------------------------------ parser ----------------------------- */
const FUNCTIONS = new Set(["sqrt","abs","sin","cos","tan","ln","log","exp"]);
const CONSTANTS = new Set(["pi","e","i"]);
function normalize(s){ return s.replaceAll("π","pi").replaceAll("×","*").replaceAll("·","*").replaceAll("÷","/").replaceAll("−","-").replaceAll("**","^").trim(); }
function canEnd(t){ return ["number","ident",")","!"].includes(t.type); }
function canStart(t){ return ["number","ident","("].includes(t.type); }
function tokenize(source){
  source=normalize(source); const raw=[]; let i=0;
  while(i<source.length){
    const c=source[i]; if(/\s/.test(c)){i++;continue;}
    const num=source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if(num){ raw.push({type:"number",value:num[0]}); i+=num[0].length; continue; }
    const id=source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if(id){ raw.push({type:"ident",value:id[0].toLowerCase()}); i+=id[0].length; continue; }
    if("+-*/%^!(),".includes(c)){ raw.push({type:c,value:c}); i++; continue; }
    throw new Error(L(`не понимаю символ «${c}»`,`I do not understand the symbol “${c}”`));
  }
  const out=[];
  for(const cur of raw){
    const prev=out[out.length-1];
    if(prev && canEnd(prev) && canStart(cur) && !(prev.type==="ident" && FUNCTIONS.has(prev.value) && cur.type==="(")) out.push({type:"*",value:"*",implicit:true});
    out.push(cur);
  }
  out.push({type:"EOF",value:"EOF"}); return out;
}
class Parser{
  constructor(tokens){this.t=tokens;this.p=0} peek(){return this.t[this.p]} next(){return this.t[this.p++]}
  match(x){if(this.peek().type===x){this.p++;return true}return false}
  expect(x){const t=this.next();if(t.type!==x)throw new Error(L(`ожидал «${x}», увидел «${t.value}»`,`expected “${x}”, got “${t.value}”`));return t}
  parse(){const n=this.add();if(this.peek().type!=="EOF")throw new Error(L("лишний хвост выражения","unexpected expression tail"));return n}
  add(){let n=this.mul();while(["+","-"].includes(this.peek().type)){const op=this.next().type;n={type:"binary",op,left:n,right:this.mul()}}return n}
  mul(){let n=this.unary();while(["*","/","%"].includes(this.peek().type)){const op=this.next().type;n={type:"binary",op,left:n,right:this.unary()}}return n}
  unary(){if(this.match("+"))return{type:"unary",op:"+",arg:this.unary()};if(this.match("-"))return{type:"unary",op:"-",arg:this.unary()};return this.power()}
  power(){let n=this.postfix();if(this.match("^"))n={type:"binary",op:"^",left:n,right:this.unary()};return n}
  postfix(){let n=this.primary();while(this.match("!"))n={type:"postfix",op:"!",arg:n};return n}
  primary(){
    const t=this.peek();
    if(t.type==="number"){this.next();return{type:"number",value:Number(t.value),raw:t.value}}
    if(t.type==="ident"){
      this.next();const name=t.value;
      if(CONSTANTS.has(name))return{type:"constant",name};
      if(FUNCTIONS.has(name)){this.expect("(");const arg=this.add();this.expect(")");return{type:"function",name,arg}}
      throw new Error(L(`не знаю имени «${name}»`,`unknown name “${name}”`));
    }
    if(this.match("(")){const n=this.add();this.expect(")");return n}
    throw new Error(L(`ожидал число или скобку, увидел «${t.value}»`,`expected a number or parenthesis, got “${t.value}”`));
  }
}

/* ----------------------------- concepts ---------------------------- */
const META = {
  add:{kind:"op",symbol:"+",ru:"сложение",en:"addition"}, sub:{kind:"op",symbol:"−",ru:"вычитание",en:"subtraction"},
  mul:{kind:"op",symbol:"×",ru:"умножение",en:"multiplication"}, div:{kind:"op",symbol:"÷",ru:"деление",en:"division"},
  mod:{kind:"op",symbol:"%",ru:"остаток",en:"remainder"}, pow:{kind:"op",symbol:"^",ru:"степень",en:"power"},
  fact:{kind:"postfix",symbol:"!",ru:"факториал",en:"factorial"}, imag:{kind:"const",symbol:"i",ru:"мнимая единица",en:"imaginary unit"},
  pi:{kind:"const",symbol:"π",ru:"число π",en:"pi"}, e:{kind:"const",symbol:"e",ru:"число e",en:"Euler's number"},
  sqrt:{kind:"fn",symbol:"√",ru:"квадратный корень",en:"square root"}, abs:{kind:"fn",symbol:"|x|",ru:"модуль",en:"absolute value"},
  sin:{kind:"fn",symbol:"sin",ru:"синус",en:"sine"}, cos:{kind:"fn",symbol:"cos",ru:"косинус",en:"cosine"}, tan:{kind:"fn",symbol:"tan",ru:"тангенс",en:"tangent"},
  exp:{kind:"fn",symbol:"exp",ru:"экспонента",en:"exponential"}, ln:{kind:"fn",symbol:"ln",ru:"натуральный логарифм",en:"natural logarithm"}, log:{kind:"fn",symbol:"log",ru:"десятичный логарифм",en:"base-10 logarithm"}
};
const labelOf = id => lang==="ru"?META[id].ru:META[id].en;

function randomDelay(mean){return Math.round(mean*(.65+Math.random()*.7)*1000)}
function freshBrain(mean=42){return{version:3,createdAt:Date.now(),decayMeanSec:mean,nextDecayAt:Date.now()+randomDelay(mean),concepts:{}}}
function loadBrain(){try{const r=sessionStorage.getItem(BRAIN_KEY);if(!r)return freshBrain();const b=JSON.parse(r);return b?.version===3?b:freshBrain()}catch{return freshBrain()}}
function saveBrain(){sessionStorage.setItem(BRAIN_KEY,JSON.stringify(brain))}
function loadJSON(key,fallback){try{return JSON.parse(sessionStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
function saveLog(){sessionStorage.setItem(LOG_KEY,JSON.stringify(observerLog.slice(-600)))}
function saveStats(){sessionStorage.setItem(STATS_KEY,JSON.stringify(statsHistory.slice(-800)))}

let brain=loadBrain(), observerLog=loadJSON(LOG_KEY,[]), statsHistory=loadJSON(STATS_KEY,[]), selectedMemoryKey=null, busy=false;
function concept(id){return brain.concepts[id]||null}
function makeConcept(id){return{id,strength:100,discoveredAt:Date.now(),lastSeen:Date.now(),table:null,episodes:{},constant:null,method:true}}
function remember(c){c.lastSeen=Date.now();c.strength=clamp(c.strength+4,0,100);saveBrain()}

/* --------------------------- visual thinking ----------------------- */
function clearThinking(){$("thinking").innerHTML=""}
function think(text,cls="memory"){
  const d=document.createElement("div");d.className=`think-line ${cls}`;
  d.innerHTML=`<span class="time">${new Date().toLocaleTimeString(lang==="ru"?"ru-RU":"en-GB",{hour12:false})}</span>${escapeHtml(text)}`;
  $("thinking").appendChild(d);$("thinking").scrollTop=$("thinking").scrollHeight;
}
function setResult(html){$("result").dataset.touched="1";$("result").innerHTML=html}
function showProgress(on,p=0,label=""){$("progressWrap").classList.toggle("show",on);$("progressBar").style.width=`${clamp(p,0,100)}%`;$("progressLabel").textContent=label}
function toast(text){const el=$("toast");el.textContent=text;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),4500)}
function logObserver(message,type="memory"){observerLog.push({at:Date.now(),message,type});saveLog();renderObserver();recordStats(true)}
async function dramatic(items){for(const x of items){think(L(x.ru,x.en),x.cls||"shock");await sleep(x.wait??850)}}

async function ensureConcept(id){
  let c=concept(id);
  if(c){
    if(c.strength<25){
      await dramatic([
        {ru:`Стоп. «${META[id].ru}»... Я это где-то знал.`,en:`Wait. “${META[id].en}”... I used to know this.`,cls:"confuse",wait:850},
        {ru:"В памяти остались только обрывки. Пытаюсь восстановить правило.",en:"Only fragments remain. Trying to reconstruct the rule.",cls:"confuse",wait:900},
        {ru:"Кажется, схема снова складывается.",en:"I think the pattern is coming back.",cls:"learn",wait:700}
      ]);
      c.strength=65;saveBrain();logObserver(L(`Восстановлено понятие «${META[id].ru}».`,`Reconstructed the concept “${META[id].en}”.`),"learn");
    } else remember(c);
    return c;
  }

  c=makeConcept(id);brain.concepts[id]=c;saveBrain();
  if(id==="imag"){
    await dramatic([
      {ru:"Подождите. Здесь появилась буква i.",en:"Wait. There is an i here.",wait:1050},
      {ru:"Но числа же должны лежать на числовой прямой.",en:"But numbers are supposed to live on a number line.",wait:1200},
      {ru:"Мне предлагают число, квадрат которого равен −1.",en:"I am being asked to accept a number whose square is −1.",wait:1300},
      {ru:"...",en:"...",cls:"confuse",wait:1000},
      {ru:"Хорошо. Видимо, одной прямой мало. Нужна плоскость.",en:"Fine. Apparently one line is not enough. I need a plane.",cls:"confuse",wait:1250},
      {ru:"Записываю новое существо: i = (0, 1).",en:"Recording a new creature: i = (0, 1).",cls:"learn",wait:900}
    ]);
  } else if(id==="pi"){
    await dramatic([
      {ru:"π — это не обычный ввод. Похоже, это постоянная.",en:"π is not ordinary input. It seems to be a constant.",wait:900},
      {ru:"Не буду брать готовое значение. Попробую восстановить его рядом дробей.",en:"I will not take a ready-made value. I will reconstruct it from a series.",cls:"research",wait:1000}
    ]);
  } else if(id==="e"){
    await dramatic([
      {ru:"Число e? Ещё одна именованная константа.",en:"The number e? Another named constant.",wait:850},
      {ru:"Попробую собрать его из суммы обратных факториалов.",en:"I will build it from the sum of reciprocal factorials.",cls:"research",wait:950}
    ]);
  } else if(META[id].kind==="fn"){
    await dramatic([
      {ru:`Что такое «${META[id].ru}»? Это уже не просто знак между числами.`,en:`What is “${META[id].en}”? This is more than a sign between numbers.`,wait:950},
      {ru:"Похоже, мне нужен целый алгоритм, а не одна таблица.",en:"It looks like I need an entire algorithm, not one table.",cls:"confuse",wait:1000},
      {ru:"Попробую вывести приближение шаг за шагом.",en:"I will derive an approximation step by step.",cls:"research",wait:900}
    ]);
  } else if(id==="fact"){
    await dramatic([
      {ru:"Почему после числа стоит восклицательный знак?",en:"Why is there an exclamation mark after the number?",wait:950},
      {ru:"Это не эмоция. Это операция: перемножить все предыдущие положительные целые.",en:"It is not emotion. It is an operation: multiply all preceding positive integers.",cls:"confuse",wait:1200},
      {ru:"Расточительно. Прекрасно.",en:"Wasteful. Excellent.",cls:"learn",wait:750}
    ]);
  } else {
    const special={
      add:["Кажется, знак + означает движение по числам шаг за шагом.","It seems + means moving through numbers one step at a time."],
      sub:["Вычитание похоже на сложение, только идти нужно назад.","Subtraction looks like addition, except I walk backwards."],
      mul:["Умножение... похоже на многократное сложение одного и того же числа.","Multiplication... looks like repeated addition of the same number."],
      div:["Деление, кажется, спрашивает: сколько раз одно число помещается в другом.","Division seems to ask how many times one number fits inside another."],
      mod:["Остаток — то, что остаётся после повторного вычитания делителя.","A remainder is what survives repeated subtraction of the divisor."],
      pow:["Степень выглядит как повторное умножение.","A power looks like repeated multiplication."]
    }[id];
    await dramatic([
      {ru:`НИФИГА СЕБЕ. Новый знак: «${META[id].symbol}».`,en:`OH. A new symbol: “${META[id].symbol}”.`,wait:1200},
      {ru:`Похоже, это называется «${META[id].ru}».`,en:`Apparently this is called “${META[id].en}”.`,wait:1000},
      {ru:special[0],en:special[1],cls:"research",wait:1250},
      {ru:"Не хочу просто запомнить один ответ. Построю правило и таблицу.",en:"I do not want to memorize one answer. I will build a rule and a table.",cls:"learn",wait:1000}
    ]);
  }
  logObserver(L(`Открыто новое понятие «${META[id].ru}».`,`Discovered a new concept: “${META[id].en}”.`),"discover");renderAll();return c;
}

/* -------------------- arithmetic without shortcuts ---------------- */
function succ(n){return n+1}
function pred(n){return n-1}

function addIntCore(a,b){
  let r=a,steps=absN(b);
  budgetPreflight(
    steps,
    L(
      `для сложения ${a} + ${b} требуется примерно ${steps} последовательных шагов`,
      `adding ${a} + ${b} needs roughly ${steps} successor/predecessor steps`
    )
  );

  for(let i=0;i<steps;i++){
    budgetChunk(
      i,
      steps,
      256,
      L(
        `иду по целым числам: выполнено ${i} из ${steps} шагов`,
        `walking through integers: ${i} of ${steps} steps`
      )
    );
    r=b>=0?succ(r):pred(r);
  }
  return r;
}

function subIntCore(a,b){
  return addIntCore(a,-b);
}

function mulIntCore(a,b){
  const neg=(a<0)!==(b<0),aa=absN(a),bb=absN(b);
  let r=0;

  budgetPreflight(
    bb,
    L(
      `умножение ${a} × ${b} требует ${bb} повторений сложения`,
      `multiplication ${a} × ${b} needs ${bb} repeated additions`
    )
  );

  for(let i=0;i<bb;i++){
    budgetTick(
      1,
      L(
        `повторное сложение: ${i} из ${bb}`,
        `repeated addition: ${i} of ${bb}`
      )
    );
    r=addIntCore(r,aa);
  }
  return neg?-r:r;
}

function divIntCore(a,b,precision=10){
  if(b===0)return NaN;

  const neg=(a<0)!==(b<0),aa=absN(a),bb=absN(b);
  let rem=aa,whole=0,wholeSteps=0;

  const roughWhole = bb===0 ? 0 : Math.floor(aa/bb);
  budgetPreflight(
    roughWhole,
    L(
      `целая часть деления потребует около ${roughWhole} повторных вычитаний`,
      `the integer part of the division needs about ${roughWhole} repeated subtractions`
    )
  );

  while(rem>=bb){
    if((wholeSteps%128)===0){
      budgetTick(
        Math.min(128,Math.max(1,roughWhole-wholeSteps)),
        L(
          `длинное деление: найдено ${wholeSteps} целых шагов`,
          `long division: ${wholeSteps} whole steps found`
        )
      );
    }
    rem=subIntCore(rem,bb);
    whole=succ(whole);
    wholeSteps++;
  }

  let digits="";
  for(let p=0;p<precision && rem!==0;p++){
    budgetTick(8,L("уточняю дробную часть деления","refining the fractional part"));
    rem=mulIntCore(rem,10);
    let d=0;
    while(rem>=bb){
      budgetTick(1,L("подбираю очередную цифру частного","finding the next quotient digit"));
      rem=subIntCore(rem,bb);
      d=succ(d);
    }
    digits+=String(d);
  }

  const text=(neg?"-":"")+String(whole)+(digits?"."+digits:"");
  return Number(text);
}

function modIntCore(a,b){
  if(b===0)return NaN;

  const neg=a<0;
  let rem=absN(a),bb=absN(b),steps=0;
  const rough=bb===0?0:Math.floor(rem/bb);

  budgetPreflight(
    rough,
    L(
      `поиск остатка потребует около ${rough} вычитаний`,
      `finding the remainder needs about ${rough} subtractions`
    )
  );

  while(rem>=bb){
    if((steps%128)===0){
      budgetTick(
        Math.min(128,Math.max(1,rough-steps)),
        L("последовательно вычитаю делитель","repeatedly subtracting the divisor")
      );
    }
    rem=subIntCore(rem,bb);
    steps++;
  }
  return neg?-rem:rem;
}

function powIntCore(a,b){
  if(!Number.isSafeInteger(b))return NaN;
  if(b===0)return 1;

  const n=absN(b);
  budgetPreflight(
    n,
    L(
      `степень ${a}^${b} требует ${n} последовательных умножений`,
      `${a}^${b} needs ${n} sequential multiplications`
    )
  );

  let r=1;
  for(let i=0;i<n;i++){
    budgetTick(
      1,
      L(
        `возведение в степень: умножение ${i+1} из ${n}`,
        `power: multiplication ${i+1} of ${n}`
      )
    );
    r=mulIntCore(r,a);
  }
  return b<0?divIntCore(1,r,12):r;
}

/* For non-integers the browser's Number type is the physical substrate.
   These helpers are intentionally isolated below the learned algorithms.
   The evaluator never dispatches an expression directly to them. */
const machineAdd=(a,b)=>a+b, machineSub=(a,b)=>a-b, machineMul=(a,b)=>a*b, machineDiv=(a,b)=>a/b;
function realCore(id,a,b){
  if(Number.isSafeInteger(a)&&Number.isSafeInteger(b)){
    if(id==="add")return addIntCore(a,b);if(id==="sub")return subIntCore(a,b);if(id==="mul")return mulIntCore(a,b);if(id==="div")return divIntCore(a,b,12);if(id==="mod")return modIntCore(a,b);if(id==="pow")return powIntCore(a,b);
  }
  if(id==="add")return machineAdd(a,b);if(id==="sub")return machineSub(a,b);if(id==="mul")return machineMul(a,b);if(id==="div")return b===0?NaN:machineDiv(a,b);if(id==="mod")return b===0?NaN:a%b;
  return NaN;
}
function complexCore(id,a,b){
  a=Complex.from(a);b=Complex.from(b);
  if(id==="add")return new Complex(realCore("add",a.re,b.re),realCore("add",a.im,b.im));
  if(id==="sub")return new Complex(realCore("sub",a.re,b.re),realCore("sub",a.im,b.im));
  if(id==="mul"){
    const ac=realCore("mul",a.re,b.re),bd=realCore("mul",a.im,b.im),ad=realCore("mul",a.re,b.im),bc=realCore("mul",a.im,b.re);
    return new Complex(realCore("sub",ac,bd),realCore("add",ad,bc));
  }
  if(id==="div"){
    const c2=realCore("mul",b.re,b.re),d2=realCore("mul",b.im,b.im),den=realCore("add",c2,d2);if(den===0)return new Complex(NaN,NaN);
    const ac=realCore("mul",a.re,b.re),bd=realCore("mul",a.im,b.im),bc=realCore("mul",a.im,b.re),ad=realCore("mul",a.re,b.im);
    return new Complex(realCore("div",realCore("add",ac,bd),den),realCore("div",realCore("sub",bc,ad),den));
  }
  return new Complex(NaN,NaN);
}

function tableBounds(a,b){const min=Math.min(0,a,b),max=Math.max(0,a,b);return absN(min)<=TABLE_LIMIT&&absN(max)<=TABLE_LIMIT?{min,max}:null}
function tableAlgorithm(id,a,b){
  if(id==="add")return addIntCore(a,b);if(id==="sub")return subIntCore(a,b);if(id==="mul")return mulIntCore(a,b);if(id==="div")return divIntCore(a,b,8);if(id==="mod")return modIntCore(a,b);return NaN;
}
async function buildTable(c,id,min,max){
  if(!c.table)c.table={min,max,cells:{}};c.table.min=Math.min(c.table.min,min);c.table.max=Math.max(c.table.max,max);min=c.table.min;max=c.table.max;
  const total=(max-min+1)**2;let done=0;
  think(L(`Строю таблицу «${META[id].ru}» для ${min}…${max}.`,`Building the “${META[id].en}” table for ${min}…${max}.`),"learn");
  setRunProgress(`таблица «${META[id].ru}»: начал диапазон ${min}…${max}`,`“${META[id].en}” table: started range ${min}…${max}`);
  showProgress(true,0,L("собираю знания по ячейкам","building knowledge cell by cell"));
  for(let a=min;a<=max;a++){
    for(let b=min;b<=max;b++){
      const k=`${a},${b}`;
      if(!c.table.cells[k])c.table.cells[k]={value:ser(new Complex(tableAlgorithm(id,a,b),0)),strength:100};
      done++;
    }
    showProgress(true,done/total*100,L(`строка ${a}: ${done} / ${total} ячеек`,`row ${a}: ${done} / ${total} cells`));
    setRunProgress(`таблица «${META[id].ru}»: готово ${done} из ${total} ячеек`,`“${META[id].en}” table: ${done} of ${total} cells built`);
    saveBrain();if(selectedMemoryKey===id)renderMemory();await sleep((max-min)>20?18:55);
  }
  showProgress(false);think(L(`Таблица готова: ${Object.keys(c.table.cells).length} явных ячеек.`,`Table complete: ${Object.keys(c.table.cells).length} explicit cells.`),"learn");
  logObserver(L(`Построена таблица «${META[id].ru}» ${min}…${max}.`,`Built the “${META[id].en}” table ${min}…${max}.`),"learn");
}
async function ensureDependencies(id){
  if(id==="sub")await ensureConcept("add");
  if(id==="mul")await ensureConcept("add");
  if(id==="div"||id==="mod"){await ensureConcept("sub");}
  if(id==="pow"||id==="fact")await ensureConcept("mul");
}
async function applyBinary(id,a,b){
  await ensureConcept(id);await ensureDependencies(id);const c=concept(id);remember(c);
  const epKey=`${hashZ(a)}|${hashZ(b)}`;
  if(c.episodes[epKey]&&c.episodes[epKey].strength>0){c.episodes[epKey].strength=clamp(c.episodes[epKey].strength+4,0,100);saveBrain();think(L("Это уже знакомый эпизод. Достаю ответ из памяти.","I have seen this exact episode before. Retrieving it from memory."),"memory");return de(c.episodes[epKey].value)}

  if(a.isReal()&&b.isReal()&&Number.isSafeInteger(a.re)&&Number.isSafeInteger(b.re)&&["add","sub","mul","div","mod"].includes(id)){
    const bounds=tableBounds(a.re,b.re);
    if(bounds){
      if(!c.table||bounds.min<c.table.min||bounds.max>c.table.max)await buildTable(c,id,bounds.min,bounds.max);
      const k=`${a.re},${b.re}`;let cell=c.table.cells[k];
      if(!cell){think(L("Нужная ячейка вырвана из памяти. Восстанавливаю её из правила.","The needed cell is missing. Reconstructing it from the rule."),"confuse");await sleep(700);cell={value:ser(new Complex(tableAlgorithm(id,a.re,b.re),0)),strength:100};c.table.cells[k]=cell;saveBrain()}
      cell.strength=clamp(cell.strength+5,0,100);saveBrain();think(L("Нашёл нужную ячейку в своей таблице.","Found the required cell in my table."),"memory");return de(cell.value);
    }
  }

  think(L("Этот случай не помещается в маленькую таблицу. Применяю выученное правило по шагам.","This case does not fit a small table. Applying the learned rule step by step."),"research");await sleep(700);
  let value;
  if(id==="pow"){
    if(!b.isReal()||!Number.isSafeInteger(b.re)){think(L("Дробные и комплексные степени пока за границей моей модели.","Fractional and complex exponents are outside my current model."),"bad");return new Complex(NaN,NaN)}
    let r=new Complex(1,0),n=absN(b.re);
    budgetPreflight(n,L(`степень требует ${n} умножений`,`the power requires ${n} multiplications`));
    for(let i=0;i<n;i++){
      budgetTick(1,L(`степень: ${i} из ${n} умножений`,`power: ${i} of ${n} multiplications`));
      r=complexCore("mul",r,a);
      setRunProgress(
        `после ${i+1} умножений промежуточно получено ${fmt(r)}`,
        `after ${i+1} multiplications the intermediate value is ${fmt(r)}`
      );
      if(i<6||i===n-1){
        think(L(`умножение ${i+1} из ${n}`,`multiplication ${i+1} of ${n}`),"research");
        await sleep(120);
      }
    }
    value=b.re<0?complexCore("div",new Complex(1,0),r):r;
  } else if(id==="mod"){
    if(!a.isReal()||!b.isReal())return new Complex(NaN,NaN);value=new Complex(realCore("mod",a.re,b.re),0);
  } else value=complexCore(id,a,b);

  c.episodes[epKey]={expression:`${fmt(a)} ${META[id].symbol} ${fmt(b)}`,value:ser(value),strength:100,createdAt:Date.now()};saveBrain();
  think(L("Сохраняю этот необычный случай как отдельное воспоминание.","Saving this unusual case as an episodic memory."),"learn");return value;
}

/* ---------------------- constants / functions ---------------------- */
async function derivePi(){
  const c=await ensureConcept("pi");if(c.constant!=null)return c.constant;
  let p=3,sign=1;
  setRunProgress("π ≈ 3 — старт ряда Нилаканты","π ≈ 3 — start of the Nilakantha series");
  think(L("Использую ряд Нилаканты: 3 + 4/(2·3·4) − 4/(4·5·6) + ...","Using the Nilakantha series: 3 + 4/(2·3·4) − 4/(4·5·6) + ..."),"research");
  for(let n=2,step=1;step<=28;n+=2,step++){
    budgetTick(30,L(`ряд π: итерация ${step}`,`π series: iteration ${step}`));
    const den=machineMul(machineMul(n,n+1),n+2),term=machineDiv(4,den);p=sign>0?machineAdd(p,term):machineSub(p,term);sign=-sign;
    setRunProgress(`π ≈ ${clean(p)} после ${step} итераций`,`π ≈ ${clean(p)} after ${step} iterations`);
    if(step<=6||step%5===0||step===28){think(L(`итерация ${step}: π ≈ ${clean(p)}`,`iteration ${step}: π ≈ ${clean(p)}`),"research");await sleep(120)}
  }
  c.constant=p;saveBrain();logObserver(L(`Самостоятельно получено приближение π ≈ ${clean(p)}.`,`Independently derived π ≈ ${clean(p)}.`),"learn");return p;
}
async function deriveE(){
  const c=await ensureConcept("e");if(c.constant!=null)return c.constant;
  await ensureConcept("fact");await ensureDependencies("fact");
  let sum=1,fact=1;
  setRunProgress("e ≈ 1 — ещё до первого члена ряда","e ≈ 1 — before the first series term");

  for(let n=1;n<=14;n++){
    budgetTick(15,L(`ряд e: готовлю ${n}!`,`e series: preparing ${n}!`));
    fact=mulIntCore(fact,n);
    sum=machineAdd(sum,machineDiv(1,fact));
    setRunProgress(
      `e ≈ ${clean(sum)} после члена 1/${n}!`,
      `e ≈ ${clean(sum)} after the term 1/${n}!`
    );
    if(n<=6||n===10||n===14){
      think(L(`член 1/${n}! → e ≈ ${clean(sum)}`,`term 1/${n}! → e ≈ ${clean(sum)}`),"research");
      await sleep(140);
    }
  }

  c.constant=sum;saveBrain();return sum;
}
async function deriveSqrtReal(x){
  if(x<0)return NaN;if(x===0)return 0;let g=x>=1?machineDiv(x,2):1;
  setRunProgress(`sqrt(${x}) ≈ ${clean(g)} — начальная догадка`,`sqrt(${x}) ≈ ${clean(g)} — initial guess`);
  for(let i=1;i<=12;i++){
    budgetTick(20,L(`метод Ньютона: шаг ${i}`,`Newton method: step ${i}`));
    g=machineDiv(machineAdd(g,machineDiv(x,g)),2);
    setRunProgress(`sqrt(${x}) ≈ ${clean(g)} после ${i} шагов Ньютона`,`sqrt(${x}) ≈ ${clean(g)} after ${i} Newton steps`);
    if(i<=5||i===8||i===12){think(L(`Ньютон, шаг ${i}: ${clean(g)}`,`Newton step ${i}: ${clean(g)}`),"research");await sleep(110)}
  }
  return g;
}
async function taylorExp(z){
  let sum=new Complex(1,0),term=new Complex(1,0);
  for(let n=1;n<=20;n++){budgetTick(40,L(`ряд exp: член ${n}`,`exp series: term ${n}`));term=complexCore("mul",term,z);term=complexCore("div",term,new Complex(n,0));sum=complexCore("add",sum,term);setRunProgress(`exp(${fmt(z)}) ≈ ${fmt(sum)} после ${n} членов`,`exp(${fmt(z)}) ≈ ${fmt(sum)} after ${n} terms`);if(n<=5||n%5===0){think(L(`ряд exp: член ${n}, сумма ≈ ${fmt(sum)}`,`exp series: term ${n}, sum ≈ ${fmt(sum)}`),"research");await sleep(100)}}return sum;
}
async function taylorSin(z){
  let sum=new Complex(0,0),term=z,zz=complexCore("mul",z,z);sum=complexCore("add",sum,term);
  for(let n=1;n<=10;n++){
    budgetTick(50,L(`ряд sin: член ${n+1}`,`sin series: term ${n+1}`));
    term=complexCore("mul",term,zz);term=complexCore("div",term,new Complex((2*n)*(2*n+1),0));term=new Complex(-term.re,-term.im);sum=complexCore("add",sum,term);
    setRunProgress(`sin(${fmt(z)}) ≈ ${fmt(sum)} после ${n+1} членов`,`sin(${fmt(z)}) ≈ ${fmt(sum)} after ${n+1} terms`);
    think(L(`sin: член ${n+1}, сумма ≈ ${fmt(sum)}`,`sin: term ${n+1}, sum ≈ ${fmt(sum)}`),"research");await sleep(115);
  }return sum;
}
async function taylorCos(z){
  let sum=new Complex(1,0),term=new Complex(1,0),zz=complexCore("mul",z,z);
  for(let n=1;n<=10;n++){
    budgetTick(50,L(`ряд cos: член ${n+1}`,`cos series: term ${n+1}`));
    term=complexCore("mul",term,zz);term=complexCore("div",term,new Complex((2*n-1)*(2*n),0));term=new Complex(-term.re,-term.im);sum=complexCore("add",sum,term);
    setRunProgress(`cos(${fmt(z)}) ≈ ${fmt(sum)} после ${n+1} членов`,`cos(${fmt(z)}) ≈ ${fmt(sum)} after ${n+1} terms`);
    think(L(`cos: член ${n+1}, сумма ≈ ${fmt(sum)}`,`cos: term ${n+1}, sum ≈ ${fmt(sum)}`),"research");await sleep(115);
  }return sum;
}
async function deriveLnPositive(x){
  if(!(x>0))return NaN;const y=machineDiv(machineSub(x,1),machineAdd(x,1)),y2=machineMul(y,y);let term=y,sum=0;
  for(let n=0;n<34;n++){budgetTick(30,L(`ряд ln: член ${n+1}`,`ln series: term ${n+1}`));const denom=2*n+1;sum=machineAdd(sum,machineDiv(term,denom));term=machineMul(term,y2);setRunProgress(`ln(${x}) ≈ ${clean(machineMul(2,sum))} после ${n+1} членов`,`ln(${x}) ≈ ${clean(machineMul(2,sum))} after ${n+1} terms`);if(n<5||n%6===0||n===33){think(L(`ln: член ${n+1}, приближение ≈ ${clean(machineMul(2,sum))}`,`ln: term ${n+1}, approximation ≈ ${clean(machineMul(2,sum))}`),"research");await sleep(85)}}return machineMul(2,sum);
}
async function applyFunction(id,z){
  const c=await ensureConcept(id);remember(c);const k=hashZ(z);
  if(c.episodes[k]&&c.episodes[k].strength>0){c.episodes[k].strength=clamp(c.episodes[k].strength+4,0,100);saveBrain();think(L("Такой аргумент уже исследован. Вспоминаю результат.","This argument has already been researched. Recalling the result."),"memory");return de(c.episodes[k].value)}

  let value=new Complex(NaN,NaN);
  if(id==="sqrt"){
    await ensureConcept("add");await ensureConcept("div");
    if(z.isReal()&&z.re<0){await ensureConcept("imag");think(L("Под корнем отрицательное число. Переношу знак минус в направление i.","The radicand is negative. Moving the minus sign into the i direction."),"confuse");const r=await deriveSqrtReal(-z.re);value=new Complex(0,r)}
    else if(z.isReal())value=new Complex(await deriveSqrtReal(z.re),0);
    else {
      await ensureConcept("imag");const mag=await deriveSqrtReal(machineAdd(machineMul(z.re,z.re),machineMul(z.im,z.im)));const a=await deriveSqrtReal(machineDiv(machineAdd(mag,z.re),2));const b=await deriveSqrtReal(machineDiv(machineSub(mag,z.re),2));value=new Complex(a,z.im<0?-b:b);
    }
  } else if(id==="abs"){
    await ensureConcept("sqrt");const s=machineAdd(machineMul(z.re,z.re),machineMul(z.im,z.im));value=new Complex(await deriveSqrtReal(s),0);
  } else if(id==="sin"){await ensureConcept("add");await ensureConcept("mul");await ensureConcept("div");value=await taylorSin(z)}
  else if(id==="cos"){await ensureConcept("add");await ensureConcept("mul");await ensureConcept("div");value=await taylorCos(z)}
  else if(id==="tan"){await ensureConcept("sin");await ensureConcept("cos");await ensureConcept("div");const s=await taylorSin(z),co=await taylorCos(z);value=complexCore("div",s,co)}
  else if(id==="exp"){await ensureConcept("add");await ensureConcept("mul");await ensureConcept("div");value=await taylorExp(z)}
  else if(id==="ln"){
    if(!z.isReal()||z.re<=0){think(L("Комплексный логарифм пока за пределами моей картины мира.","Complex logarithms are still outside my model."),"bad");value=new Complex(NaN,NaN)}
    else {await ensureConcept("add");await ensureConcept("mul");await ensureConcept("div");value=new Complex(await deriveLnPositive(z.re),0)}
  } else if(id==="log"){
    if(!z.isReal()||z.re<=0)value=new Complex(NaN,NaN);else {await ensureConcept("ln");const lnx=await deriveLnPositive(z.re),ln10=await deriveLnPositive(10);value=new Complex(machineDiv(lnx,ln10),0)}
  }
  c.episodes[k]={expression:`${id}(${fmt(z)})`,value:ser(value),strength:100,createdAt:Date.now()};saveBrain();return value;
}
async function applyFactorial(z){
  const c=await ensureConcept("fact");await ensureDependencies("fact");remember(c);const k=hashZ(z);
  if(c.episodes[k]&&c.episodes[k].strength>0)return de(c.episodes[k].value);
  if(!z.isReal()||!Number.isSafeInteger(z.re)||z.re<0||z.re>170){think(L("Такой факториал пока не умею строить.","I cannot construct that factorial yet."),"bad");return new Complex(NaN,NaN)}
  let r=1;
  setRunProgress(`${fmt(z)}!: пока дошёл только до 1`,` ${fmt(z)}!: currently only reached 1`);
  for(let n=2;n<=z.re;n++){
    budgetTick(10,L(`факториал: множитель ${n}`,`factorial: multiplier ${n}`));
    r=mulIntCore(r,n);
    setRunProgress(`${fmt(z)}!: произведение до ${n} = ${r}`,`${fmt(z)}!: product through ${n} = ${r}`);
    if(n<=7||n===z.re){think(L(`перемножаю до ${n}: ${r}`,`multiplying through ${n}: ${r}`),"research");await sleep(120)}
  }
  const v=new Complex(r,0);c.episodes[k]={expression:`${fmt(z)}!`,value:ser(v),strength:100,createdAt:Date.now()};saveBrain();return v;
}

/* ---------------------------- evaluator ---------------------------- */
async function evalNode(node){
  if(node.type==="number")return new Complex(node.value,0);
  if(node.type==="constant"){
    if(node.name==="i"){await ensureConcept("imag");return new Complex(0,1)}
    if(node.name==="pi")return new Complex(await derivePi(),0);
    if(node.name==="e")return new Complex(await deriveE(),0);
  }
  if(node.type==="unary"){
    const v=await evalNode(node.arg);if(node.op==="+")return v;await ensureConcept("sub");return new Complex(-v.re,-v.im);
  }
  if(node.type==="binary"){
    const a=await evalNode(node.left),b=await evalNode(node.right);const id={"+":"add","-":"sub","*":"mul","/":"div","%":"mod","^":"pow"}[node.op];return await applyBinary(id,a,b);
  }
  if(node.type==="function")return await applyFunction(node.name,await evalNode(node.arg));
  if(node.type==="postfix")return await applyFactorial(await evalNode(node.arg));
  return new Complex(NaN,NaN);
}

/* ----------------------------- dementia ---------------------------- */
function allConcepts(){return Object.values(brain.concepts)}
function knowledgeCount(){let n=0;for(const c of allConcepts()){n++;if(c.table)n+=Object.keys(c.table.cells).length;n+=Object.keys(c.episodes).length;if(c.constant!=null)n++}return n}
function memoryHealth(){
  const cs=allConcepts();if(!cs.length)return 100;let score=0,w=0;
  for(const c of cs){score+=c.strength*3;w+=3;if(c.table)for(const cell of Object.values(c.table.cells)){score+=cell.strength;w++}for(const ep of Object.values(c.episodes)){score+=ep.strength;w++}}
  return w?clamp(score/w,0,100):100;
}
function decayCount(){return observerLog.filter(x=>x.type==="decay").length}
function scheduleDecay(){brain.nextDecayAt=Date.now()+randomDelay(brain.decayMeanSec)}
function damageMemory(){
  const cs=allConcepts();if(!cs.length){scheduleDecay();saveBrain();logObserver(L("Приступ деменции прошёл впустую: мозг уже пуст.","A dementia episode had nothing to damage: the brain was already empty."),"decay");return}
  const chosen=[...cs].sort(()=>Math.random()-.5).slice(0,Math.min(cs.length,1+Math.floor(Math.random()*3)));const reports=[];
  for(const c of chosen){
    c.strength=clamp(c.strength-(8+Math.random()*19),0,100);let lost=0,damaged=0;
    if(c.table){const keys=Object.keys(c.table.cells).sort(()=>Math.random()-.5),n=Math.max(1,Math.floor(keys.length*(c.strength<35?.22:.08)));for(const k of keys.slice(0,n)){const cell=c.table.cells[k];cell.strength=clamp(cell.strength-(18+Math.random()*50),0,100);damaged++;if(cell.strength<3){delete c.table.cells[k];lost++}}}
    const eps=Object.keys(c.episodes).sort(()=>Math.random()-.5);for(const k of eps.slice(0,Math.floor(eps.length*(c.strength<40?.25:.08)))){c.episodes[k].strength=clamp(c.episodes[k].strength-(25+Math.random()*50),0,100);if(c.episodes[k].strength<3)delete c.episodes[k]}
    if(c.strength<2){delete brain.concepts[c.id];reports.push(L(`полностью забыто «${META[c.id].ru}»`,`completely forgot “${META[c.id].en}”`))}
    else reports.push(L(`«${META[c.id].ru}»: повреждено ${damaged}, потеряно ${lost} ячеек`,`“${META[c.id].en}”: damaged ${damaged}, lost ${lost} cells`));
  }
  scheduleDecay();saveBrain();const msg=reports.join("; ");logObserver(L(`Приступ деменции: ${msg}.`,`Dementia episode: ${msg}.`),"decay");toast(L("Память дала сбой.","Memory failure."));if(!busy)think(L(`[ПАМЯТЬ ДАЛА СБОЙ] ${msg}.`,`[MEMORY FAILURE] ${msg}.`),"bad");renderAll();
}
function fullLobotomy(){const mean=brain.decayMeanSec;brain=freshBrain(mean);saveBrain();logObserver(L("Полная лоботомия: уничтожены все внутренние математические знания.","Full lobotomy: all internal mathematical knowledge was destroyed."),"decay");clearThinking();think(L("Я... кто?","I... who?"),"bad");think(L("Что такое число?","What is a number?"),"confuse");$("result").dataset.touched="";$("result").textContent=tr("emptyBrain");renderAll()}
function stageInfo(h){if(h>=82)return[tr("stage0"),tr("stage0d")];if(h>=62)return[tr("stage1"),tr("stage1d")];if(h>=40)return[tr("stage2"),tr("stage2d")];if(h>=18)return[tr("stage3"),tr("stage3d")];return[tr("stage4"),tr("stage4d")]}

/* ------------------------------- stats ----------------------------- */
function recordStats(force=false){
  const now=Date.now(),last=statsHistory[statsHistory.length-1];if(!force&&last&&now-last.t<5000)return;
  statsHistory.push({t:now,health:memoryHealth(),knowledge:knowledgeCount(),concepts:allConcepts().length,decays:decayCount()});statsHistory=statsHistory.slice(-500);saveStats();
}
function drawLineChart(canvas,key,maxFixed=null){
  const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="#0a0c0f";ctx.fillRect(0,0,w,h);
  const data=statsHistory.slice(-120);ctx.strokeStyle="#2e343d";ctx.lineWidth=1;
  for(let i=1;i<4;i++){const y=20+(h-40)*i/4;ctx.beginPath();ctx.moveTo(42,y);ctx.lineTo(w-12,y);ctx.stroke()}
  ctx.fillStyle="#6f7782";ctx.font="11px monospace";if(!data.length){ctx.fillText(L("пока нет данных","no data yet"),52,h/2);return}
  let max=maxFixed??Math.max(1,...data.map(d=>d[key]));let min=maxFixed?0:Math.min(0,...data.map(d=>d[key]));if(max===min)max=min+1;
  ctx.strokeStyle="#cbd9a6";ctx.lineWidth=2;ctx.beginPath();data.forEach((d,i)=>{const x=42+(w-58)*(data.length===1?0:i/(data.length-1)),y=h-22-(h-42)*(d[key]-min)/(max-min);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();
  ctx.fillStyle="#89929d";ctx.fillText(String(clean(max)),5,18);ctx.fillText(String(clean(min)),5,h-20);
}
function renderCharts(){drawLineChart($("healthChart"),"health",100);drawLineChart($("knowledgeChart"),"knowledge");drawLineChart($("conceptChart"),"concepts");drawLineChart($("decayChart"),"decays")}

/* ------------------------------- render ---------------------------- */
function escapeHtml(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function renderConcepts(){
  const list=$("conceptList"),cs=allConcepts().sort((a,b)=>b.lastSeen-a.lastSeen);if(!cs.length){list.innerHTML=`<div class="empty-state">${tr("empty")}</div>`;return}
  list.innerHTML=cs.map(c=>{const meta=META[c.id],count=(c.table?Object.keys(c.table.cells).length:0)+Object.keys(c.episodes).length+(c.constant!=null?1:0);return`<div class="concept"><strong>${escapeHtml(meta.symbol)} — ${escapeHtml(labelOf(c.id))}</strong><span class="strength">${Math.round(c.strength)}%</span><small>${c.table?`${c.table.min}…${c.table.max}`:L("алгоритм/эпизоды","algorithm/episodes")} · ${count}</small><small>${c.strength<30?L("путается","confused"):c.strength<60?L("помнит неуверенно","uncertain"):L("помнит","remembers")}</small><div class="minihealth"><i style="width:${c.strength}%"></i></div></div>`}).join("");
}
function renderMemorySelect(){const s=$("memoryConcept"),cs=allConcepts();if(!cs.length){s.innerHTML=`<option>${tr("memoryEmpty")}</option>`;selectedMemoryKey=null;return}if(!selectedMemoryKey||!brain.concepts[selectedMemoryKey])selectedMemoryKey=cs[0].id;s.innerHTML=cs.map(c=>`<option value="${c.id}" ${c.id===selectedMemoryKey?"selected":""}>${META[c.id].symbol} — ${escapeHtml(labelOf(c.id))}</option>`).join("")}
function viewRange(t){if(!t)return[];let min=t.min,max=t.max;if(max-min+1>TABLE_VIEW_LIMIT){if(min<=0&&max>=0){min=Math.max(min,-6);max=Math.min(max,10)}else max=Math.min(max,min+TABLE_VIEW_LIMIT-1)}return Array.from({length:max-min+1},(_,i)=>min+i)}
function renderMemory(){
  renderMemorySelect();const summary=$("memorySummary"),wrap=$("memoryTableWrap"),eps=$("episodeList");if(!selectedMemoryKey||!brain.concepts[selectedMemoryKey]){summary.textContent=L("Внутри пока нет математических понятий.","There are no mathematical concepts inside yet.");wrap.innerHTML=`<div class="empty-state">${tr("noTables")}</div>`;eps.innerHTML="";return}
  const c=brain.concepts[selectedMemoryKey],t=c.table,e=Object.values(c.episodes).sort((a,b)=>b.createdAt-a.createdAt);summary.textContent=L(`«${META[c.id].ru}»: целостность ${Math.round(c.strength)}%. ${t?`В таблице осталось ${Object.keys(t.cells).length} ячеек.`:"Таблицы нет."} ${e.length} эпизодов.`,`“${META[c.id].en}”: integrity ${Math.round(c.strength)}%. ${t?`${Object.keys(t.cells).length} table cells remain.`:"No table."} ${e.length} episodes.`);
  if(!t)wrap.innerHTML=`<div class="empty-state">${L("Это знание хранится алгоритмом и отдельными эпизодами.","This knowledge is stored as an algorithm and episodic memories.")}</div>`;
  else{const r=viewRange(t);let html='<table class="memory-table"><thead><tr><th>a \\ b</th>';for(const b of r)html+=`<th>${b}</th>`;html+='</tr></thead><tbody>';for(const a of r){html+=`<tr><td>${a}</td>`;for(const b of r){const cell=t.cells[`${a},${b}`];html+=cell?`<td class="memory-cell" style="opacity:${.18+.82*cell.strength/100}" title="${Math.round(cell.strength)}%">${escapeHtml(fmt(de(cell.value)))}</td>`:'<td class="memory-cell dead">·</td>'}html+='</tr>'}wrap.innerHTML=html+'</tbody></table>'}
  eps.innerHTML=e.length?`<h3>${tr("episodes")}</h3>`+e.slice(0,60).map(x=>`<div class="episode" style="opacity:${.25+.75*x.strength/100}"><span>${escapeHtml(x.expression)} = ${escapeHtml(fmt(de(x.value)))}</span><span>${Math.round(x.strength)}%</span></div>`).join(""):"";
}
function renderObserver(){const box=$("observerLog");box.innerHTML=observerLog.length?observerLog.slice().reverse().map(e=>`<div class="${e.type||""}"><time>${new Date(e.at).toLocaleTimeString(lang==="ru"?"ru-RU":"en-GB",{hour12:false})}</time> — ${escapeHtml(e.message)}</div>`).join(""):L("<div>Журнал пуст.</div>","<div>The log is empty.</div>")}
function renderBrain(){const h=memoryHealth(),[stage,desc]=stageInfo(h);$("brainHealth").textContent=`${Math.round(h)}%`;$("knownConcepts").textContent=String(allConcepts().length);$("brainState").textContent=allConcepts().length?stage.toUpperCase():L("ПУСТ","EMPTY");$("stageName").textContent=stage;$("stageDescription").textContent=desc;const f=$("healthFill");f.style.width=`${h}%`;f.style.background=h>60?"var(--good)":h>30?"var(--warn)":"var(--bad)";const left=Math.max(0,brain.nextDecayAt-Date.now()),s=Math.ceil(left/1000);$("decayCountdown").textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`}
function renderAll(){renderConcepts();renderMemory();renderObserver();renderBrain();renderCharts()}
function applyLanguage(){document.documentElement.lang=lang;document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=tr(el.dataset.i18n));document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>el.placeholder=tr(el.dataset.i18nPlaceholder));$("langRu").classList.toggle("active",lang==="ru");$("langEn").classList.toggle("active",lang==="en");if(!$("result").dataset.touched)$("result").textContent=tr("emptyBrain");$("decayIntervalLabel").textContent=`${brain.decayMeanSec} ${lang==="ru"?"с":"s"}`;renderAll()}

/* ------------------------------- action ---------------------------- */
async function calculate(){
  if(busy)return;
  const source=$("expression").value.trim();
  if(!source)return;

  busy=true;
  $("calculate").disabled=true;
  clearThinking();
  showProgress(false);
  setResult(L("ДУМАЮ...","THINKING..."));
  beginRun(source);

  try{
    think(L(`Получено выражение: ${source}`,`Received expression: ${source}`),"memory");

    let ast;
    try{
      ast=new Parser(tokenize(source)).parse();
      think(
        L(
          "Разобрал синтаксис. Теперь иду изнутри выражения наружу.",
          "Parsed the syntax. Now working from the inside of the expression outward."
        ),
        "memory"
      );
    }catch(err){
      think(err.message,"bad");
      setResult(
        `<span class="answer" style="color:var(--bad)">${L("Не понял запись.","Could not parse it.")}</span><br>${escapeHtml(err.message)}`
      );
      return;
    }

    const value=await evalNode(ast);

    if(!value.isFinite()){
      think(
        L(
          "Я дошёл до границы текущей математической модели.",
          "I reached the boundary of my current mathematical model."
        ),
        "bad"
      );
      setResult(`<span class="answer" style="color:var(--bad)">${L("не определено","undefined")}</span>`);
    } else {
      think(L(`Получилось: ${fmt(value)}.`,`I got: ${fmt(value)}.`),"learn");
      setResult(
        `<span class="answer">${escapeHtml(source)} = ${escapeHtml(fmt(value))}</span>`
      );
      logObserver(
        L(`Решено «${source}» → ${fmt(value)}.`,`Solved “${source}” → ${fmt(value)}.`),
        "memory"
      );
    }

    renderAll();

  } catch(err) {
    if(err instanceof ComputationBudgetExceeded){
      showProgress(false);
      saveBrain();

      const partial = activeRun?.lastGood || L(
        "успел только разобрать задачу и начать алгоритм",
        "I only managed to parse the task and begin the algorithm"
      );

      const technical = err.detail
        ? `<br><small>${escapeHtml(err.detail)}</small>`
        : "";

      think(
        L(
          "Сорян, я начал зависать. Останавливаюсь раньше, чем положу вкладку.",
          "Sorry, I started getting stuck. I am stopping before I freeze the tab."
        ),
        "bad"
      );

      think(
        L(
          `Последнее устойчивое состояние: ${partial}`,
          `Last stable state: ${partial}`
        ),
        "confuse"
      );

      setResult(
        `<span class="answer" style="color:var(--warn)">${L("Сорян, дальше слишком тяжело.","Sorry, this got too expensive.")}</span><br>` +
        `${L(
          "Я остановил вычисление по защитному лимиту, чтобы сайт не завис и не начал бесконечно жрать ресурсы.",
          "I stopped at the safety budget so the page would not lock up and burn resources indefinitely."
        )}<br><br>` +
        `<b>${L("Вот что я успел получить:","Here is what I managed to obtain:")}</b><br>` +
        `${escapeHtml(partial)}` +
        technical +
        `<br><br><small>${L(
          "Это промежуточный результат, а не скрытый ответ из обычного калькулятора.",
          "This is an intermediate result, not a hidden answer from a normal calculator."
        )}</small>`
      );

      logObserver(
        L(
          `Вычисление «${source}» остановлено защитным лимитом. Последний прогресс: ${partial}.`,
          `Computation “${source}” stopped by the safety budget. Last progress: ${partial}.`
        ),
        "decay"
      );

      renderAll();
    } else {
      console.error(err);
      showProgress(false);
      think(
        L(
          "Я словил внутреннюю ошибку и остановил текущую мысль, чтобы не уронить страницу.",
          "I hit an internal error and stopped the current thought instead of crashing the page."
        ),
        "bad"
      );
      setResult(
        `<span class="answer" style="color:var(--bad)">${L("Внутренняя ошибка.","Internal error.")}</span>`
      );
    }
  } finally {
    activeRun=null;
    busy=false;
    $("calculate").disabled=false;
    recordStats(true);
  }
}

/* ------------------------------- events ---------------------------- */
document.querySelectorAll(".tabs button").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");$(btn.dataset.tab).classList.add("active");if(btn.dataset.tab==="charts")renderCharts();if(btn.dataset.tab==="memory")renderMemory()}));
$("calculate").addEventListener("click",calculate);$("expression").addEventListener("keydown",e=>{if(e.key==="Enter")calculate()});document.querySelectorAll("[data-expr]").forEach(btn=>btn.addEventListener("click",()=>{$("expression").value=btn.dataset.expr;$("expression").focus()}));
$("memoryConcept").addEventListener("change",e=>{selectedMemoryKey=e.target.value||null;renderMemory()});
$("langRu").addEventListener("click",()=>{lang="ru";localStorage.setItem(LANG_KEY,lang);applyLanguage()});$("langEn").addEventListener("click",()=>{lang="en";localStorage.setItem(LANG_KEY,lang);applyLanguage()});
$("decayInterval").value=brain.decayMeanSec;$("decayInterval").addEventListener("input",e=>$("decayIntervalLabel").textContent=`${e.target.value} ${lang==="ru"?"с":"s"}`);$("decayInterval").addEventListener("change",e=>{brain.decayMeanSec=Number(e.target.value);scheduleDecay();saveBrain();renderBrain()});
$("damageBrain").addEventListener("click",damageMemory);$("resetBrain").addEventListener("click",fullLobotomy);

/* -------------------------------- boot ----------------------------- */
if(!observerLog.length)logObserver(L("Создан новый пустой мозг. Математики внутри нет.","Created a new empty brain. There is no mathematics inside."),"discover");
recordStats(true);applyLanguage();
setInterval(()=>{if(Date.now()>=brain.nextDecayAt&&!busy)damageMemory();else renderBrain();recordStats(false)},1000);

})();
