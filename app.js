(() => {
"use strict";

/* ============================================================
   FAILED CALCULATOR 1.1.1

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

const BRAIN_KEY = "failed-calculator-brain-v4";
const LOG_KEY = "failed-calculator-observer-log-v4";
const STATS_KEY = "failed-calculator-stats-v4";
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

function localBudgetCheckpoint() {
  if (!activeRun) return null;
  return {
    steps: activeRun.steps,
    technical: activeRun.technical
  };
}

function restoreLocalBudget(checkpoint, penalty=250) {
  if (!activeRun || !checkpoint) return;
  activeRun.steps = Math.min(
    checkpoint.steps + penalty,
    RUN_STEP_LIMIT - 1000
  );
  activeRun.technical = checkpoint.technical || "";
}

const I18N = {
  ru: {
    kicker:"НЕЙРОДЕГЕНЕРАТИВНАЯ МАТЕМАТИЧЕСКАЯ СИСТЕМА",
    hero:"Пишите выражение целиком. Калькулятор начинает сеанс без математики, открывает арифметику, функции и математический анализ по ходу работы, строит таблицы и алгоритмы, рисует функции — а затем постепенно забывает собственное образование.",
    status:"состояние", memoryHealth:"здоровье памяти", knownConcepts:"понятий помнит", nextEpisode:"следующий эпизод",
    tabCalculator:"КАЛЬКУЛЯТОР", tabMemory:"ПАМЯТЬ", tabCharts:"ГРАФИКИ", tabObserver:"ЖУРНАЛ НАБЛЮДАТЕЛЯ", tabDementia:"ДЕМЕНЦИЯ", tabAbout:"О ПРОЕКТЕ",
    experienceTitle:"МАТЕМАТИЧЕСКИЙ ОПЫТ", expressionPlaceholder:"пишите выражение: integrate(sin(x),x,0,pi)", thinkButton:"ДУМАТЬ",
    thinkingPlaceholder:"Внутренний монолог появится здесь.", rememberTitle:"ЧТО ОН СЕЙЧАС ПОМНИТ",
    syntaxHelpTitle:"ШПАРГАЛКА ПО СИНТАКСИСУ — нажмите на запись, чтобы вставить её",
    syntaxArithmetic:"Арифметика и запись выражений",
    syntaxNumbers:"Константы и комплексные числа",
    syntaxFunctions:"Элементарные функции",
    syntaxCalculus:"Производные, первообразные, интегралы и пределы",
    syntaxAnalysis:"Суммы, произведения, уравнения, графики и дискретные функции",
    internalMemory:"ВНУТРЕННЯЯ ПАМЯТЬ", memorySubtitle:"Ячейки тускнеют по мере деградации и исчезают, когда забыты.",
    mathPlotTitle:"МАТЕМАТИЧЕСКИЙ ГРАФИК",
    mathPlotSubtitle:"Можно вызвать график отсюда или прямо из калькулятора через plot(f(x),x,a,b). Свободное выражение с x тоже автоматически считается функцией.",
    plotExpressionPlaceholder:"например: sin(x) + x/4", plotFrom:"от x =", plotTo:"до x =", plotButton:"ПОСТРОИТЬ", plotEmpty:"График ещё не построен.",
    chartsTitle:"ГРАФИКИ КОГНИТИВНОЙ ЖИЗНИ", chartsSubtitle:"Данные записывает внешний наблюдатель, поэтому история переживает приступы забывания.",
    chartHealth:"Целостность памяти", chartKnowledge:"Количество сохранённых знаний", chartConcepts:"Число известных понятий", chartDecay:"Накопленные приступы деменции",
    observerTitle:"ЖУРНАЛ ВНЕШНЕГО НАБЛЮДАТЕЛЯ", observerSubtitle:"Журнал находится «снаружи мозга» и переживает забывание.",
    dementiaTitle:"ПАРАМЕТРЫ КОГНИТИВНОГО РАСПАДА", decayInterval:"Средний интервал между приступами:", decayHelp:"Приступ повреждает случайные понятия, ослабляет воспоминания и вырывает отдельные ячейки таблиц.", triggerEpisode:"ВЫЗВАТЬ ПРИСТУП", lobotomy:"ПОЛНАЯ ЛОБОТОМИЯ", currentStage:"Текущая стадия:",
    aboutTitle:"КАК ЭТО РАБОТАЕТ",
    aboutP1:"Это не обычный калькулятор с театральной задержкой. Он хранит приобретённые таблицы, численные методы и правила математического анализа в памяти сеанса и старается выводить новое из уже открытого.",
    aboutP2:"Сложение маленьких целых строится шагами successor/predecessor; умножение выводится из повторного сложения; деление — из длинного деления; степень и факториал — из умножения. Корни, экспоненты, тригонометрия, логарифмы, производные, интегралы, пределы и поиск корней исследуются собственными пошаговыми алгоритмами.",
    aboutP3:"Поэтому первое знакомство с новой математикой действительно занимает время. Повторные задачи становятся быстрее — пока деменция не повредит нужные правила, таблицы или эпизодические воспоминания.",
    aboutP4:"Состояние мозга хранится только в sessionStorage: новый посетитель начинает с нуля, обновление той же вкладки сохраняет текущую личность калькулятора. Язык сохраняется отдельно в браузере.",
    footer:"без фреймворков · без backend · открытый репозиторий",
    emptyBrain:"МОЗГ ПУСТ.\nЯ пока не знаю даже, что означает знак «+».", empty:"пока ничего", memoryEmpty:"память пуста", noTables:"таблиц нет", episodes:"Эпизодические воспоминания",
    stage0:"почти ясное сознание", stage0d:"Большая часть приобретённых знаний ещё держится.", stage1:"лёгкая забывчивость", stage1d:"Отдельные ячейки таблиц начинают тускнеть и выпадать.", stage2:"фрагментация памяти", stage2d:"Некоторые операции узнаются не сразу; таблицы становятся дырявыми.", stage3:"тяжёлая деградация", stage3d:"Сохранились обрывки правил и отдельные эпизоды. Знакомые знаки иногда кажутся новыми.", stage4:"почти полная амнезия", stage4d:"Остатки математики держатся на нескольких случайных воспоминаниях."
  },
  en: {
    kicker:"NEURODEGENERATIVE MATHEMATICAL SYSTEM",
    hero:"Type a whole expression. The calculator starts each session without mathematics, discovers arithmetic, functions, and calculus while working, builds tables and algorithms, draws functions — and then gradually forgets its own education.",
    status:"state", memoryHealth:"memory health", knownConcepts:"known concepts", nextEpisode:"next episode",
    tabCalculator:"CALCULATOR", tabMemory:"MEMORY", tabCharts:"GRAPHS", tabObserver:"OBSERVER LOG", tabDementia:"DEMENTIA", tabAbout:"ABOUT",
    experienceTitle:"MATHEMATICAL EXPERIENCE", expressionPlaceholder:"type an expression: integrate(sin(x),x,0,pi)", thinkButton:"THINK",
    thinkingPlaceholder:"The internal monologue will appear here.", rememberTitle:"WHAT IT REMEMBERS NOW",
    syntaxHelpTitle:"SYNTAX REFERENCE — click an expression to insert it",
    syntaxArithmetic:"Arithmetic and expression syntax",
    syntaxNumbers:"Constants and complex numbers",
    syntaxFunctions:"Elementary functions",
    syntaxCalculus:"Derivatives, antiderivatives, integrals, and limits",
    syntaxAnalysis:"Sums, products, equations, plots, and discrete functions",
    internalMemory:"INTERNAL MEMORY", memorySubtitle:"Cells fade as memory degrades and disappear when forgotten.",
    mathPlotTitle:"MATHEMATICAL PLOT",
    mathPlotSubtitle:"Plot from here or from the calculator with plot(f(x),x,a,b). A free expression containing x is also treated as a function automatically.",
    plotExpressionPlaceholder:"for example: sin(x) + x/4", plotFrom:"from x =", plotTo:"to x =", plotButton:"PLOT", plotEmpty:"No mathematical plot yet.",
    chartsTitle:"CHARTS OF COGNITIVE LIFE", chartsSubtitle:"Measurements are kept by an external observer, so their history survives memory-loss episodes.",
    chartHealth:"Memory integrity", chartKnowledge:"Stored knowledge", chartConcepts:"Known concepts", chartDecay:"Cumulative dementia episodes",
    observerTitle:"EXTERNAL OBSERVER LOG", observerSubtitle:"This log exists outside the brain and survives forgetting.",
    dementiaTitle:"COGNITIVE DECAY PARAMETERS", decayInterval:"Average time between episodes:", decayHelp:"An episode damages random concepts, weakens memories, and tears individual cells out of learned tables.", triggerEpisode:"TRIGGER EPISODE", lobotomy:"FULL LOBOTOMY", currentStage:"Current stage:",
    aboutTitle:"HOW IT WORKS",
    aboutP1:"This is not a normal calculator with theatrical delays. It stores acquired tables, numerical methods, and calculus rules in session memory and tries to derive new results from what it has already discovered.",
    aboutP2:"Small-integer addition is built from successor/predecessor steps; multiplication from repeated addition; division from long division; powers and factorials from multiplication. Roots, exponentials, trigonometry, logarithms, derivatives, integrals, limits, and root finding use explicit step-by-step algorithms.",
    aboutP3:"That is why the first encounter with new mathematics genuinely takes time. Repeated tasks become faster — until dementia damages the required rules, tables, or episodic memories.",
    aboutP4:"The brain exists only in sessionStorage: each new visitor starts from zero, while reloading the same tab keeps that calculator's current personality. The language choice is stored separately in the browser.",
    footer:"no framework · no backend · open repository",
    emptyBrain:"EMPTY BRAIN.\nI do not even know what the “+” sign means yet.", empty:"nothing yet", memoryEmpty:"empty memory", noTables:"no tables", episodes:"Episodic memories",
    stage0:"almost clear", stage0d:"Most acquired knowledge is still intact.", stage1:"mild forgetfulness", stage1d:"Individual table cells begin to fade and disappear.", stage2:"fragmented memory", stage2d:"Some operations are not recognized immediately; tables develop holes.", stage3:"severe degradation", stage3d:"Only fragments of rules and isolated episodes remain. Familiar symbols may look new.", stage4:"near-total amnesia", stage4d:"The remains of mathematics survive in only a few random memories."
  }
};

const HAD_LANGUAGE = !!localStorage.getItem(LANG_KEY);
let lang = localStorage.getItem(LANG_KEY) || "ru";
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
const ELEMENTARY_CALLS = new Set([
  "sqrt","root","abs",
  "sin","cos","tan","asin","acos","atan",
  "sinh","cosh","tanh",
  "ln","log","exp",
  "gcd","lcm","ncr","npr","min","max"
]);

const SPECIAL_CALLS = new Set([
  "diff","derivative",
  "antiderivative","anti",
  "integrate","integral",
  "limit","lim",
  "sum","product","prod",
  "solve","plot"
]);

const CALL_NAMES = new Set([...ELEMENTARY_CALLS,...SPECIAL_CALLS]);
const CONSTANTS = new Set(["pi","e","i"]);

function normalize(s){
  return s
    .replaceAll("π","pi")
    .replaceAll("×","*")
    .replaceAll("·","*")
    .replaceAll("÷","/")
    .replaceAll("−","-")
    .replaceAll("**","^")
    .trim();
}

function canEnd(t){return["number","ident",")","!"].includes(t.type)}
function canStart(t){return["number","ident","("].includes(t.type)}

function tokenize(source){
  source=normalize(source);
  const raw=[];
  let i=0;

  while(i<source.length){
    const c=source[i];
    if(/\s/.test(c)){i++;continue}

    const num=source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if(num){
      raw.push({type:"number",value:num[0]});
      i+=num[0].length;
      continue;
    }

    const id=source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if(id){
      raw.push({type:"ident",value:id[0].toLowerCase()});
      i+=id[0].length;
      continue;
    }

    if("+-*/%^!(),".includes(c)){
      raw.push({type:c,value:c});
      i++;
      continue;
    }

    throw new Error(L(`не понимаю символ «${c}»`,`I do not understand the symbol “${c}”`));
  }

  const out=[];
  for(const cur of raw){
    const prev=out[out.length-1];
    if(
      prev &&
      canEnd(prev) &&
      canStart(cur) &&
      !(prev.type==="ident" && CALL_NAMES.has(prev.value) && cur.type==="(")
    ){
      out.push({type:"*",value:"*",implicit:true});
    }
    out.push(cur);
  }

  out.push({type:"EOF",value:"EOF"});
  return out;
}

class Parser{
  constructor(tokens){this.t=tokens;this.p=0}
  peek(){return this.t[this.p]}
  next(){return this.t[this.p++]}
  match(x){if(this.peek().type===x){this.p++;return true}return false}
  expect(x){
    const t=this.next();
    if(t.type!==x)throw new Error(L(`ожидал «${x}», увидел «${t.value}»`,`expected “${x}”, got “${t.value}”`));
    return t;
  }

  parse(){
    const n=this.add();
    if(this.peek().type!=="EOF")throw new Error(L("лишний хвост выражения","unexpected expression tail"));
    return n;
  }

  add(){
    let n=this.mul();
    while(["+","-"].includes(this.peek().type)){
      const op=this.next().type;
      n={type:"binary",op,left:n,right:this.mul()};
    }
    return n;
  }

  mul(){
    let n=this.unary();
    while(["*","/","%"].includes(this.peek().type)){
      const op=this.next().type;
      n={type:"binary",op,left:n,right:this.unary()};
    }
    return n;
  }

  unary(){
    if(this.match("+"))return{type:"unary",op:"+",arg:this.unary()};
    if(this.match("-"))return{type:"unary",op:"-",arg:this.unary()};
    return this.power();
  }

  power(){
    let n=this.postfix();
    if(this.match("^"))n={type:"binary",op:"^",left:n,right:this.unary()};
    return n;
  }

  postfix(){
    let n=this.primary();
    while(this.match("!"))n={type:"postfix",op:"!",arg:n};
    return n;
  }

  primary(){
    const t=this.peek();

    if(t.type==="number"){
      this.next();
      return{type:"number",value:Number(t.value),raw:t.value};
    }

    if(t.type==="ident"){
      this.next();
      const name=t.value;

      if(CONSTANTS.has(name))return{type:"constant",name};

      if(CALL_NAMES.has(name) && this.peek().type==="("){
        this.expect("(");
        const args=[];

        if(this.peek().type!==")"){
          args.push(this.add());
          while(this.match(","))args.push(this.add());
        }

        this.expect(")");
        return{type:"call",name,args};
      }

      return{type:"variable",name};
    }

    if(this.match("(")){
      const n=this.add();
      this.expect(")");
      return n;
    }

    throw new Error(L(`ожидал число, имя или скобку, увидел «${t.value}»`,`expected a number, name, or parenthesis, got “${t.value}”`));
  }
}

/* ----------------------------- concepts ---------------------------- */
const META = {
  add:{kind:"op",symbol:"+",ru:"сложение",en:"addition"},
  sub:{kind:"op",symbol:"−",ru:"вычитание",en:"subtraction"},
  mul:{kind:"op",symbol:"×",ru:"умножение",en:"multiplication"},
  div:{kind:"op",symbol:"÷",ru:"деление",en:"division"},
  mod:{kind:"op",symbol:"%",ru:"остаток",en:"remainder"},
  pow:{kind:"op",symbol:"^",ru:"степень",en:"power"},
  fact:{kind:"postfix",symbol:"!",ru:"факториал",en:"factorial"},

  imag:{kind:"const",symbol:"i",ru:"мнимая единица",en:"imaginary unit"},
  pi:{kind:"const",symbol:"π",ru:"число π",en:"pi"},
  e:{kind:"const",symbol:"e",ru:"число e",en:"Euler's number"},

  sqrt:{kind:"fn",symbol:"√",ru:"квадратный корень",en:"square root"},
  root:{kind:"fn",symbol:"ⁿ√",ru:"корень n-й степени",en:"nth root"},
  abs:{kind:"fn",symbol:"|x|",ru:"модуль",en:"absolute value"},
  sin:{kind:"fn",symbol:"sin",ru:"синус",en:"sine"},
  cos:{kind:"fn",symbol:"cos",ru:"косинус",en:"cosine"},
  tan:{kind:"fn",symbol:"tan",ru:"тангенс",en:"tangent"},
  asin:{kind:"fn",symbol:"asin",ru:"арксинус",en:"arcsine"},
  acos:{kind:"fn",symbol:"acos",ru:"арккосинус",en:"arccosine"},
  atan:{kind:"fn",symbol:"atan",ru:"арктангенс",en:"arctangent"},
  sinh:{kind:"fn",symbol:"sinh",ru:"гиперболический синус",en:"hyperbolic sine"},
  cosh:{kind:"fn",symbol:"cosh",ru:"гиперболический косинус",en:"hyperbolic cosine"},
  tanh:{kind:"fn",symbol:"tanh",ru:"гиперболический тангенс",en:"hyperbolic tangent"},
  exp:{kind:"fn",symbol:"exp",ru:"экспонента",en:"exponential"},
  ln:{kind:"fn",symbol:"ln",ru:"натуральный логарифм",en:"natural logarithm"},
  log:{kind:"fn",symbol:"log",ru:"логарифм",en:"logarithm"},

  gcd:{kind:"discrete",symbol:"gcd",ru:"НОД",en:"greatest common divisor"},
  lcm:{kind:"discrete",symbol:"lcm",ru:"НОК",en:"least common multiple"},
  ncr:{kind:"discrete",symbol:"nCr",ru:"число сочетаний",en:"combinations"},
  npr:{kind:"discrete",symbol:"nPr",ru:"число размещений",en:"permutations"},
  min:{kind:"discrete",symbol:"min",ru:"минимум",en:"minimum"},
  max:{kind:"discrete",symbol:"max",ru:"максимум",en:"maximum"},

  diff:{kind:"calc",symbol:"d/dx",ru:"дифференцирование",en:"differentiation"},
  antiderivative:{kind:"calc",symbol:"∫?dx",ru:"поиск первообразной",en:"antiderivative"},
  integrate:{kind:"calc",symbol:"∫",ru:"определённый интеграл",en:"definite integration"},
  limit:{kind:"calc",symbol:"lim",ru:"предел",en:"limit"},
  sum:{kind:"analysis",symbol:"Σ",ru:"конечная сумма",en:"finite sum"},
  product:{kind:"analysis",symbol:"Π",ru:"конечное произведение",en:"finite product"},
  solve:{kind:"analysis",symbol:"=0",ru:"поиск корня уравнения",en:"root finding"},
  plot:{kind:"analysis",symbol:"y=f(x)",ru:"график функции",en:"function plotting"}
}
const labelOf = id => lang==="ru"?META[id].ru:META[id].en;

function randomDelay(mean){return Math.round(mean*(.65+Math.random()*.7)*1000)}
function freshBrain(mean=42){return{version:4,createdAt:Date.now(),decayMeanSec:mean,nextDecayAt:Date.now()+randomDelay(mean),concepts:{}}}
function loadBrain(){try{const r=sessionStorage.getItem(BRAIN_KEY);if(!r)return freshBrain();const b=JSON.parse(r);return b?.version===4?b:freshBrain()}catch{return freshBrain()}}
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
  } else if(META[id].kind==="calc"){
    const messages={
      diff:[
        "Производная? То есть нас интересует не значение функции, а скорость, с которой оно меняется.",
        "A derivative? So we care not about the function value itself, but how fast it changes."
      ],
      antiderivative:[
        "Первообразная звучит как попытка обратить производную назад.",
        "An antiderivative sounds like trying to reverse differentiation."
      ],
      integrate:[
        "Интеграл... похоже, площадь собирается из огромного числа очень тонких кусочков.",
        "An integral... apparently area is assembled from a huge number of very thin pieces."
      ],
      limit:[
        "Предел спрашивает не «чему равно здесь», а «к чему всё стремится рядом».",
        "A limit asks not “what is it here?” but “what does it approach nearby?”"
      ]
    }[id] || ["Мне понадобится новый раздел анализа.","I need a new branch of calculus."];

    await dramatic([
      {ru:`Новая идея: «${META[id].ru}».`,en:`A new idea: “${META[id].en}”.`,wait:1050},
      {ru:messages[0],en:messages[1],cls:"confuse",wait:1250},
      {ru:"Не буду брать готовую формулу. Сначала построю процедуру.",en:"I will not take a ready-made answer. I will build a procedure first.",cls:"research",wait:1050}
    ]);
  } else if(META[id].kind==="analysis"){
    const messages={
      sum:["Σ? Значит, одно правило нужно повторить по целому диапазону.","Σ? So one rule must be repeated over an entire range."],
      product:["Π — та же идея, только теперь всё перемножается.","Π is the same idea, except everything is multiplied."],
      solve:["Уравнение не даёт мне x. Придётся искать место, где выражение меняет знак или становится нулём.","An equation does not give me x. I need to search for where the expression crosses zero."],
      plot:["Функцию можно не только вычислять. Её можно превратить в форму.","A function can be more than evaluated. It can become a shape."]
    }[id] || ["Ещё один способ исследовать выражение.","Another way to investigate an expression."];

    await dramatic([
      {ru:`Обнаружен новый инструмент: «${META[id].ru}».`,en:`Discovered a new tool: “${META[id].en}”.`,wait:1000},
      {ru:messages[0],en:messages[1],cls:"confuse",wait:1200},
      {ru:"Хорошо. Буду делать это маленькими проверяемыми шагами.",en:"Fine. I will do it in small verifiable steps.",cls:"research",wait:900}
    ]);
  } else if(META[id].kind==="discrete"){
    await dramatic([
      {ru:`Ещё одна операция: «${META[id].ru}».`,en:`Another operation: “${META[id].en}”.`,wait:850},
      {ru:"Попробую свести её к уже понятным целочисленным шагам.",en:"I will reduce it to integer steps I already understand.",cls:"research",wait:900}
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
    const checkpoint=localBudgetCheckpoint();
    try{
      budgetTick(15,L(`ряд e: готовлю ${n}!`,`e series: preparing ${n}!`));
      const nextFact=mulIntCore(fact,n);
      const nextSum=machineAdd(sum,machineDiv(1,nextFact));
      fact=nextFact;
      sum=nextSum;
    }catch(err){
      if(!(err instanceof ComputationBudgetExceeded))throw err;
      restoreLocalBudget(checkpoint);
      think(
        L(
          `Следующий факториал слишком дорогой. Останавливаю ряд здесь и продолжаю с e ≈ ${clean(sum)}.`,
          `The next factorial is too expensive. Stopping the series here and continuing with e ≈ ${clean(sum)}.`
        ),
        "confuse"
      );
      setRunProgress(
        `e ≈ ${clean(sum)} — ряд остановлен на последнем безопасном члене`,
        `e ≈ ${clean(sum)} — series stopped at the last safe term`
      );
      break;
    }

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
  if(!(x>0))return NaN;

  const original=x;
  let shifts=0;

  while(x>1.5){
    budgetTick(4,L("привожу аргумент ln делением на 2","reducing ln argument by dividing by 2"));
    x=machineDiv(x,2);
    shifts++;
  }
  while(x<0.75){
    budgetTick(4,L("привожу аргумент ln умножением на 2","reducing ln argument by multiplying by 2"));
    x=machineMul(x,2);
    shifts--;
  }

  if(shifts!==0){
    think(
      L(
        `Сначала привожу ${clean(original)} к ${clean(x)} с помощью степени двойки.`,
        `First reducing ${clean(original)} to ${clean(x)} using a power of two.`
      ),
      "research"
    );
    await sleep(180);
  }

  const series=async(value,label)=>{
    const y=machineDiv(machineSub(value,1),machineAdd(value,1));
    const y2=machineMul(y,y);
    let term=y,sum=0;

    for(let n=0;n<34;n++){
      budgetTick(30,L(`ряд ln: член ${n+1}`,`ln series: term ${n+1}`));
      const denom=2*n+1;
      sum=machineAdd(sum,machineDiv(term,denom));
      term=machineMul(term,y2);

      const partial=machineMul(2,sum);
      if(n<5||n%6===0||n===33){
        think(
          L(
            `${label}: член ${n+1}, приближение ≈ ${clean(partial)}`,
            `${label}: term ${n+1}, approximation ≈ ${clean(partial)}`
          ),
          "research"
        );
        await sleep(85);
      }
    }
    return machineMul(2,sum);
  };

  const reduced=await series(x,"ln");
  const ln2=shifts===0?0:await series(2,"ln(2)");
  const result=machineAdd(reduced,machineMul(shifts,ln2));

  setRunProgress(
    `ln(${clean(original)}) ≈ ${clean(result)} после приведения диапазона`,
    `ln(${clean(original)}) ≈ ${clean(result)} after range reduction`
  );

  return result;
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
  } else if(["asin","acos","atan","sinh","cosh","tanh"].includes(id)){
    value=qElementary(id,[z]);
    think(L(`Применяю выведенный алгоритм ${id} шаг за шагом.`,`Applying the derived ${id} algorithm step by step.`),"research");
    await sleep(550);
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


/* -------------------- broader mathematics / calculus -------------------- */
/* Quiet numerical procedures used inside calculus and plotting. They use
   the same explicit arithmetic/series model, but suppress repetitive UI. */

function researchComplexCore(id,a,b){
  a=Complex.from(a);b=Complex.from(b);

  if(id==="add")return new Complex(machineAdd(a.re,b.re),machineAdd(a.im,b.im));
  if(id==="sub")return new Complex(machineSub(a.re,b.re),machineSub(a.im,b.im));

  if(id==="mul"){
    const ac=machineMul(a.re,b.re),bd=machineMul(a.im,b.im);
    const ad=machineMul(a.re,b.im),bc=machineMul(a.im,b.re);
    return new Complex(machineSub(ac,bd),machineAdd(ad,bc));
  }

  if(id==="div"){
    const den=machineAdd(machineMul(b.re,b.re),machineMul(b.im,b.im));
    if(den===0)return new Complex(NaN,NaN);
    return new Complex(
      machineDiv(machineAdd(machineMul(a.re,b.re),machineMul(a.im,b.im)),den),
      machineDiv(machineSub(machineMul(a.im,b.re),machineMul(a.re,b.im)),den)
    );
  }

  return new Complex(NaN,NaN);
}


function qPi(){
  const remembered=concept("pi")?.constant;
  if(remembered!=null)return remembered;
  let value=3,sign=1;
  for(let n=2,step=0;step<24;n+=2,step++){
    budgetTick(8,L("приближаю π внутри численного метода","approximating π inside a numerical method"));
    const den=machineMul(machineMul(n,n+1),n+2);
    const term=machineDiv(4,den);
    value=sign>0?machineAdd(value,term):machineSub(value,term);
    sign=-sign;
  }
  return value;
}

function qE(){
  const remembered=concept("e")?.constant;
  if(remembered!=null)return remembered;
  let sum=1,fact=1;
  for(let n=1;n<=13;n++){
    budgetTick(5,L("приближаю e внутри численного метода","approximating e inside a numerical method"));
    fact=machineMul(fact,n);
    sum=machineAdd(sum,machineDiv(1,fact));
  }
  return sum;
}

function qSqrtReal(x){
  if(x<0)return NaN;
  if(x===0)return 0;
  let g=x>=1?machineDiv(x,2):1;
  for(let i=0;i<11;i++){
    budgetTick(4,L("итерация Ньютона для корня","Newton iteration for a root"));
    g=machineDiv(machineAdd(g,machineDiv(x,g)),2);
  }
  return g;
}

function qExp(z){
  z=Complex.from(z);
  let sum=new Complex(1,0),term=new Complex(1,0);
  for(let n=1;n<=20;n++){
    budgetTick(8,L("член ряда exp","exp series term"));
    term=researchComplexCore("mul",term,z);
    term=researchComplexCore("div",term,new Complex(n,0));
    sum=researchComplexCore("add",sum,term);
  }
  return sum;
}

function qSin(z){
  z=Complex.from(z);
  let sum=new Complex(0,0),term=z,zz=researchComplexCore("mul",z,z);
  sum=researchComplexCore("add",sum,term);
  for(let n=1;n<=10;n++){
    budgetTick(8,L("член ряда sin","sin series term"));
    term=researchComplexCore("mul",term,zz);
    term=researchComplexCore("div",term,new Complex((2*n)*(2*n+1),0));
    term=new Complex(-term.re,-term.im);
    sum=researchComplexCore("add",sum,term);
  }
  return sum;
}

function qCos(z){
  z=Complex.from(z);
  let sum=new Complex(1,0),term=new Complex(1,0),zz=researchComplexCore("mul",z,z);
  for(let n=1;n<=10;n++){
    budgetTick(8,L("член ряда cos","cos series term"));
    term=researchComplexCore("mul",term,zz);
    term=researchComplexCore("div",term,new Complex((2*n-1)*(2*n),0));
    term=new Complex(-term.re,-term.im);
    sum=researchComplexCore("add",sum,term);
  }
  return sum;
}

function qLnPositive(x){
  if(!(x>0))return NaN;
  let shifts=0;
  while(x>1.5){x=machineDiv(x,2);shifts++;budgetTick(2)}
  while(x<0.75){x=machineMul(x,2);shifts--;budgetTick(2)}

  const series=value=>{
    const y=machineDiv(machineSub(value,1),machineAdd(value,1));
    const y2=machineMul(y,y);
    let term=y,sum=0;
    for(let n=0;n<28;n++){
      budgetTick(5,L("член ряда ln","ln series term"));
      sum=machineAdd(sum,machineDiv(term,2*n+1));
      term=machineMul(term,y2);
    }
    return machineMul(2,sum);
  };

  const ln2=series(2);
  return machineAdd(series(x),machineMul(shifts,ln2));
}

function qAtanReal(x){
  if(x===Infinity)return machineDiv(qPi(),2);
  if(x===-Infinity)return -machineDiv(qPi(),2);
  if(!Number.isFinite(x))return NaN;
  if(x<0)return -qAtanReal(-x);
  if(x>1)return machineSub(machineDiv(qPi(),2),qAtanReal(machineDiv(1,x)));
  if(x>0.5){
    const reduced=machineDiv(machineSub(x,1),machineAdd(x,1));
    return machineAdd(machineDiv(qPi(),4),qAtanReal(reduced));
  }

  let term=x,sum=0,xx=machineMul(x,x),sign=1;
  for(let n=0;n<26;n++){
    budgetTick(4,L("член ряда atan","atan series term"));
    const piece=machineDiv(term,2*n+1);
    sum=sign>0?machineAdd(sum,piece):machineSub(sum,piece);
    term=machineMul(term,xx);
    sign=-sign;
  }
  return sum;
}

function qPow(a,b){
  a=Complex.from(a);b=Complex.from(b);

  if(b.isReal()&&Number.isSafeInteger(b.re)){
    const n=absN(b.re);
    budgetPreflight(n,L(`степень внутри анализа требует ${n} умножений`,`power inside analysis needs ${n} multiplications`));
    let r=new Complex(1,0);
    for(let i=0;i<n;i++){budgetTick(1);r=researchComplexCore("mul",r,a)}
    return b.re<0?researchComplexCore("div",new Complex(1,0),r):r;
  }

  if(a.isReal()&&b.isReal()&&a.re>0){
    return qExp(new Complex(machineMul(b.re,qLnPositive(a.re)),0));
  }

  return new Complex(NaN,NaN);
}

function qRoot(value,n){
  value=Complex.from(value);n=Complex.from(n);
  if(!value.isReal()||!n.isReal()||!Number.isSafeInteger(n.re)||n.re===0)return new Complex(NaN,NaN);

  const degree=n.re;
  const absDegree=absN(degree);
  const target=absN(value.re);

  if(target===0){
    if(degree<0)return new Complex(NaN,NaN);
    return new Complex(0,0);
  }

  let g=target>=1?machineDiv(target,absDegree):1;
  const p=absDegree-1;

  for(let i=0;i<14;i++){
    budgetTick(12,L("итерация Ньютона для корня n-й степени","Newton iteration for an nth root"));
    let gp=1;
    for(let j=0;j<p;j++)gp=machineMul(gp,g);
    if(gp===0)gp=1e-12;
    g=machineDiv(machineAdd(machineMul(p,g),machineDiv(target,gp)),absDegree);
  }

  let root;
  if(value.re<0&&absDegree%2===0){
    const angle=machineDiv(qPi(),absDegree);
    const c=qCos(new Complex(angle,0));
    const si=qSin(new Complex(angle,0));
    root=new Complex(machineMul(g,c.re),machineMul(g,si.re));
  }else{
    root=new Complex(value.re<0?-g:g,0);
  }

  if(degree<0){
    root=researchComplexCore("div",new Complex(1,0),root);
  }

  return root;
}
function qFactorial(n){
  if(!Number.isSafeInteger(n)||n<0||n>170)return NaN;
  let r=1;
  budgetPreflight(n,L(`факториал требует ${n} последовательных множителей`,`factorial requires ${n} sequential factors`));
  for(let i=2;i<=n;i++){budgetTick(2);r=machineMul(r,i)}
  return r;
}

function qGcd(a,b){
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b))return NaN;
  a=absN(a);b=absN(b);
  while(b!==0){
    budgetTick(4,L("алгоритм Евклида","Euclidean algorithm"));
    const r=modIntCore(a,b);
    a=b;b=absN(r);
  }
  return a;
}

function qNcr(n,r){
  if(!Number.isSafeInteger(n)||!Number.isSafeInteger(r)||n<0||r<0||r>n)return NaN;
  r=Math.min(r,n-r);
  let out=1;
  for(let k=1;k<=r;k++){budgetTick(5);out=machineDiv(machineMul(out,n-r+k),k)}
  return out;
}

function qNpr(n,r){
  if(!Number.isSafeInteger(n)||!Number.isSafeInteger(r)||n<0||r<0||r>n)return NaN;
  let out=1;
  for(let k=0;k<r;k++){budgetTick(4);out=machineMul(out,n-k)}
  return out;
}

function qElementary(name,args){
  const a=args[0]??new Complex(NaN,NaN);
  const b=args[1]??new Complex(NaN,NaN);

  if(name==="sqrt"){
    if(a.isReal()&&a.re>=0)return new Complex(qSqrtReal(a.re),0);
    if(a.isReal()&&a.re<0)return new Complex(0,qSqrtReal(-a.re));
    const mag=qSqrtReal(machineAdd(machineMul(a.re,a.re),machineMul(a.im,a.im)));
    const re=qSqrtReal(machineDiv(machineAdd(mag,a.re),2));
    const im=qSqrtReal(machineDiv(machineSub(mag,a.re),2));
    return new Complex(re,a.im<0?-im:im);
  }

  if(name==="root")return qRoot(a,b);

  if(name==="abs"){
    return new Complex(qSqrtReal(machineAdd(machineMul(a.re,a.re),machineMul(a.im,a.im))),0);
  }

  if(name==="sin")return qSin(a);
  if(name==="cos")return qCos(a);
  if(name==="tan")return researchComplexCore("div",qSin(a),qCos(a));
  if(name==="exp")return qExp(a);

  if(name==="ln"){
    if(!a.isReal()||a.re<=0)return new Complex(NaN,NaN);
    return new Complex(qLnPositive(a.re),0);
  }

  if(name==="log"){
    if(!a.isReal()||a.re<=0)return new Complex(NaN,NaN);
    const base=args.length>1?b.re:10;
    if(!(base>0)||base===1)return new Complex(NaN,NaN);
    return new Complex(machineDiv(qLnPositive(a.re),qLnPositive(base)),0);
  }

  if(name==="atan"){
    if(!a.isReal())return new Complex(NaN,NaN);
    return new Complex(qAtanReal(a.re),0);
  }

  if(name==="asin"){
    if(!a.isReal()||a.re<-1||a.re>1)return new Complex(NaN,NaN);
    const den=qSqrtReal(machineSub(1,machineMul(a.re,a.re)));
    return new Complex(qAtanReal(machineDiv(a.re,den)),0);
  }

  if(name==="acos"){
    const asin=qElementary("asin",[a]);
    if(!asin.isFinite())return asin;
    return new Complex(machineSub(machineDiv(qPi(),2),asin.re),0);
  }

  if(name==="sinh"){
    const ez=qExp(a),enz=qExp(new Complex(-a.re,-a.im));
    return researchComplexCore("div",researchComplexCore("sub",ez,enz),new Complex(2,0));
  }

  if(name==="cosh"){
    const ez=qExp(a),enz=qExp(new Complex(-a.re,-a.im));
    return researchComplexCore("div",researchComplexCore("add",ez,enz),new Complex(2,0));
  }

  if(name==="tanh"){
    return researchComplexCore("div",qElementary("sinh",[a]),qElementary("cosh",[a]));
  }

  if(name==="min"||name==="max"){
    if(!a.isReal()||!b.isReal())return new Complex(NaN,NaN);
    return new Complex(name==="min"?(a.re<b.re?a.re:b.re):(a.re>b.re?a.re:b.re),0);
  }

  if(name==="gcd"){
    if(!a.isReal()||!b.isReal())return new Complex(NaN,NaN);
    return new Complex(qGcd(a.re,b.re),0);
  }

  if(name==="lcm"){
    if(!a.isReal()||!b.isReal())return new Complex(NaN,NaN);
    const g=qGcd(a.re,b.re);
    if(!Number.isFinite(g)||g===0)return new Complex(0,0);
    return new Complex(absN(machineDiv(machineMul(a.re,b.re),g)),0);
  }

  if(name==="ncr"){
    if(!a.isReal()||!b.isReal())return new Complex(NaN,NaN);
    return new Complex(qNcr(a.re,b.re),0);
  }

  if(name==="npr"){
    if(!a.isReal()||!b.isReal())return new Complex(NaN,NaN);
    return new Complex(qNpr(a.re,b.re),0);
  }

  return new Complex(NaN,NaN);
}

function freeVariables(node,out=new Set()){
  if(!node)return out;
  if(node.type==="variable")out.add(node.name);
  if(node.type==="unary"||node.type==="postfix")freeVariables(node.arg,out);
  if(node.type==="binary"){freeVariables(node.left,out);freeVariables(node.right,out)}
  if(node.type==="call")for(const a of node.args)freeVariables(a,out);
  return out;
}

function isVariableNode(node,name=null){
  return node?.type==="variable"&&(name===null||node.name===name);
}

async function teachTree(node){
  if(!node)return;

  if(node.type==="constant"){
    if(node.name==="i")await ensureConcept("imag");
    if(node.name==="pi")await derivePi();
    if(node.name==="e")await deriveE();
    return;
  }

  if(node.type==="unary"){
    await teachTree(node.arg);
    if(node.op==="-")await ensureConcept("sub");
    return;
  }

  if(node.type==="postfix"){
    await teachTree(node.arg);
    await ensureConcept("fact");
    await ensureDependencies("fact");
    return;
  }

  if(node.type==="binary"){
    await teachTree(node.left);await teachTree(node.right);
    const id={"+":"add","-":"sub","*":"mul","/":"div","%":"mod","^":"pow"}[node.op];
    await ensureConcept(id);await ensureDependencies(id);
    return;
  }

  if(node.type==="call"){
    if(ELEMENTARY_CALLS.has(node.name)&&META[node.name])await ensureConcept(node.name);
    for(const arg of node.args)await teachTree(arg);
  }
}

function evalResearch(node,env={}){
  budgetTick(1,L("обхожу дерево выражения","walking the expression tree"));

  if(node.type==="number")return new Complex(node.value,0);

  if(node.type==="variable"){
    if(Object.prototype.hasOwnProperty.call(env,node.name))return Complex.from(env[node.name]);
    return new Complex(NaN,NaN);
  }

  if(node.type==="constant"){
    if(node.name==="i")return new Complex(0,1);
    if(node.name==="pi")return new Complex(qPi(),0);
    if(node.name==="e")return new Complex(qE(),0);
  }

  if(node.type==="unary"){
    const v=evalResearch(node.arg,env);
    return node.op==="+"?v:new Complex(-v.re,-v.im);
  }

  if(node.type==="postfix"){
    const v=evalResearch(node.arg,env);
    if(!v.isReal())return new Complex(NaN,NaN);
    return new Complex(qFactorial(v.re),0);
  }

  if(node.type==="binary"){
    const a=evalResearch(node.left,env),b=evalResearch(node.right,env);
    if(node.op==="+")return researchComplexCore("add",a,b);
    if(node.op==="-")return researchComplexCore("sub",a,b);
    if(node.op==="*")return researchComplexCore("mul",a,b);
    if(node.op==="/")return researchComplexCore("div",a,b);
    if(node.op==="^")return qPow(a,b);
    if(node.op==="%"){
      if(!a.isReal()||!b.isReal()||b.re===0)return new Complex(NaN,NaN);
      return new Complex(realCore("mod",a.re,b.re),0);
    }
  }

  if(node.type==="call"&&ELEMENTARY_CALLS.has(node.name)){
    return qElementary(node.name,node.args.map(a=>evalResearch(a,env)));
  }

  return new Complex(NaN,NaN);
}


/* -------------------------- symbolic AST -------------------------- */
const N=v=>({type:"number",value:v,raw:String(v)});
const V=name=>({type:"variable",name});
const B=(op,left,right)=>({type:"binary",op,left,right});
const U=(op,arg)=>({type:"unary",op,arg});
const C=(name,...args)=>({type:"call",name,args});

function isZero(n){return n?.type==="number"&&n.value===0}
function isOne(n){return n?.type==="number"&&n.value===1}

function simplifyAst(n){
  if(!n)return n;

  if(n.type==="unary"){
    const a=simplifyAst(n.arg);
    if(n.op==="+")return a;
    if(a.type==="number")return N(-a.value);
    return U("-",a);
  }

  if(n.type==="binary"){
    const l=simplifyAst(n.left),r=simplifyAst(n.right);

    if(n.op==="+"){
      if(isZero(l))return r;
      if(isZero(r))return l;
      if(r.type==="unary"&&r.op==="-")return simplifyAst(B("-",l,r.arg));
    }
    if(n.op==="-"){
      if(isZero(r))return l;
      if(r.type==="unary"&&r.op==="-")return simplifyAst(B("+",l,r.arg));
    }
    if(n.op==="*"){if(isZero(l)||isZero(r))return N(0);if(isOne(l))return r;if(isOne(r))return l}
    if(n.op==="/"){if(isZero(l))return N(0);if(isOne(r))return l}
    if(n.op==="^"){if(isZero(r))return N(1);if(isOne(r))return l}

    if(l.type==="number"&&r.type==="number"){
      if(n.op==="+")return N(machineAdd(l.value,r.value));
      if(n.op==="-")return N(machineSub(l.value,r.value));
      if(n.op==="*")return N(machineMul(l.value,r.value));
      if(n.op==="/"&&r.value!==0)return N(machineDiv(l.value,r.value));
    }

    return B(n.op,l,r);
  }

  if(n.type==="call")return C(n.name,...n.args.map(simplifyAst));
  return n;
}

function astString(n,parent=0){
  if(!n)return "?";
  if(n.type==="number")return String(clean(n.value));
  if(n.type==="variable")return n.name;
  if(n.type==="constant")return n.name==="pi"?"pi":n.name;
  if(n.type==="postfix")return `${astString(n.arg,5)}!`;
  if(n.type==="call")return `${n.name}(${n.args.map(x=>astString(x,0)).join(", ")})`;
  if(n.type==="unary")return `${n.op}${astString(n.arg,4)}`;

  if(n.type==="binary"){
    const prec={"+":1,"-":1,"*":2,"/":2,"%":2,"^":3}[n.op]||0;
    const text=`${astString(n.left,prec)} ${n.op} ${astString(n.right,n.op==="^"?prec-1:prec)}`;
    return prec<parent?`(${text})`:text;
  }

  return "?";
}

function containsVar(node,name){
  return freeVariables(node,new Set()).has(name);
}

function diffAst(node,v){
  if(node.type==="number"||node.type==="constant")return N(0);
  if(node.type==="variable")return N(node.name===v?1:0);

  if(node.type==="unary"){
    const d=diffAst(node.arg,v);
    if(!d)return null;
    return node.op==="+"?d:U("-",d);
  }

  if(node.type==="binary"){
    const u=node.left,w=node.right,du=diffAst(u,v),dw=diffAst(w,v);
    if(!du||!dw)return null;

    if(node.op==="+")return simplifyAst(B("+",du,dw));
    if(node.op==="-")return simplifyAst(B("-",du,dw));
    if(node.op==="*")return simplifyAst(B("+",B("*",du,w),B("*",u,dw)));
    if(node.op==="/")return simplifyAst(B("/",B("-",B("*",du,w),B("*",u,dw)),B("^",w,N(2))));

    if(node.op==="^"){
      if(!containsVar(w,v)){
        return simplifyAst(B("*",B("*",w,B("^",u,B("-",w,N(1)))),du));
      }
      return simplifyAst(
        B("*",
          B("^",u,w),
          B("+",
            B("*",dw,C("ln",u)),
            B("*",w,B("/",du,u))
          )
        )
      );
    }
    return null;
  }

  if(node.type==="call"&&node.args.length>=1){
    const u=node.args[0],du=diffAst(u,v);
    if(!du)return null;

    if(node.name==="sin")return simplifyAst(B("*",C("cos",u),du));
    if(node.name==="cos")return simplifyAst(B("*",U("-",C("sin",u)),du));
    if(node.name==="tan")return simplifyAst(B("/",du,B("^",C("cos",u),N(2))));
    if(node.name==="exp")return simplifyAst(B("*",C("exp",u),du));
    if(node.name==="ln")return simplifyAst(B("/",du,u));
    if(node.name==="log")return simplifyAst(B("/",du,B("*",u,C("ln",N(10)))));
    if(node.name==="sqrt")return simplifyAst(B("/",du,B("*",N(2),C("sqrt",u))));
    if(node.name==="sinh")return simplifyAst(B("*",C("cosh",u),du));
    if(node.name==="cosh")return simplifyAst(B("*",C("sinh",u),du));
    if(node.name==="tanh")return simplifyAst(B("/",du,B("^",C("cosh",u),N(2))));
  }

  return null;
}

function antiAst(node,v){
  if(node.type==="number")return simplifyAst(B("*",node,V(v)));
  if(node.type==="constant")return simplifyAst(B("*",node,V(v)));

  if(node.type==="variable"){
    if(node.name===v)return simplifyAst(B("/",B("^",V(v),N(2)),N(2)));
    return simplifyAst(B("*",node,V(v)));
  }

  if(node.type==="unary"&&node.op==="-"){
    const a=antiAst(node.arg,v);
    return a?U("-",a):null;
  }

  if(node.type==="binary"){
    if(node.op==="+"||node.op==="-"){
      const a=antiAst(node.left,v),b=antiAst(node.right,v);
      if(!a||!b)return null;
      return simplifyAst(B(node.op,a,b));
    }

    if(node.op==="*"){
      if(!containsVar(node.left,v)){
        const a=antiAst(node.right,v);
        return a?simplifyAst(B("*",node.left,a)):null;
      }
      if(!containsVar(node.right,v)){
        const a=antiAst(node.left,v);
        return a?simplifyAst(B("*",node.right,a)):null;
      }
    }

    if(node.op==="^"&&isVariableNode(node.left,v)&&node.right.type==="number"){
      const exponent=node.right.value;
      if(exponent===-1)return C("ln",C("abs",V(v)));
      return simplifyAst(B("/",B("^",V(v),N(exponent+1)),N(exponent+1)));
    }

    if(node.op==="/"&&node.left.type==="number"&&node.left.value===1&&isVariableNode(node.right,v)){
      return C("ln",C("abs",V(v)));
    }
  }

  if(node.type==="call"&&node.args.length===1&&isVariableNode(node.args[0],v)){
    if(node.name==="sin")return U("-",C("cos",V(v)));
    if(node.name==="cos")return C("sin",V(v));
    if(node.name==="exp")return C("exp",V(v));
  }

  return null;
}

/* ---------------------- calculus / analysis tools ---------------------- */
async function numericArg(node){
  await teachTree(node);
  return evalResearch(node,{});
}

async function ensureSpecial(name){
  const canonical={
    derivative:"diff",anti:"antiderivative",integral:"integrate",
    lim:"limit",prod:"product"
  }[name]||name;
  await ensureConcept(canonical);
  return canonical;
}

async function handleDiff(args){
  await ensureSpecial("diff");

  if(args.length<2||args.length>3||!isVariableNode(args[1])){
    throw new Error(L("diff требует diff(выражение, переменная [, точка])","diff expects diff(expression, variable [, point])"));
  }

  const expr=args[0],v=args[1].name;
  await teachTree(expr);
  think(L(`Пытаюсь продифференцировать по ${v} правилом за правилом.`,`Differentiating with respect to ${v}, rule by rule.`),"research");
  await sleep(750);

  const d=simplifyAst(diffAst(expr,v));

  if(args.length===2){
    if(!d){
      return{kind:"symbolic",text:L("Закрытую символическую производную пока не вывел.","I could not derive a closed symbolic derivative yet.")};
    }

    const text=astString(d);
    setRunProgress(`d/d${v} = ${text}`,`d/d${v} = ${text}`);
    think(L(`Получилась формула: ${text}`,`Derived formula: ${text}`),"learn");
    return{kind:"symbolic",text:`d/d${v} ${astString(expr)} = ${text}`};
  }

  const point=await numericArg(args[2]);
  if(!point.isReal())return{kind:"number",value:new Complex(NaN,NaN)};

  if(d){
    const value=evalResearch(d,{[v]:point});
    think(L(`Подставляю ${v} = ${fmt(point)} в найденную производную.`,`Substituting ${v} = ${fmt(point)} into the derived derivative.`),"research");
    return{kind:"number",value,annotation:`d/d${v} ${astString(expr)} = ${astString(d)}`};
  }

  think(L("Символическое правило не сработало. Перехожу к симметричной разности значений рядом с точкой.","The symbolic rule did not close. Switching to a symmetric difference around the point."),"confuse");

  let h=0.1,last=new Complex(NaN,NaN);
  for(let k=1;k<=8;k++){
    budgetTick(30,L(`численная производная: уточнение ${k}`,`numerical derivative refinement ${k}`));
    const left=evalResearch(expr,{[v]:new Complex(point.re-h,0)});
    const right=evalResearch(expr,{[v]:new Complex(point.re+h,0)});
    last=researchComplexCore("div",researchComplexCore("sub",right,left),new Complex(2*h,0));
    setRunProgress(`производная ≈ ${fmt(last)} при h=${h}`,`derivative ≈ ${fmt(last)} at h=${h}`);
    think(L(`h=${clean(h)} → производная ≈ ${fmt(last)}`,`h=${clean(h)} → derivative ≈ ${fmt(last)}`),"research");
    await sleep(120);
    h=machineDiv(h,2);
  }
  return{kind:"number",value:last};
}

async function handleAntiderivative(args){
  await ensureSpecial("antiderivative");

  if(args.length!==2||!isVariableNode(args[1])){
    throw new Error(L("antiderivative требует antiderivative(выражение, переменная)","antiderivative expects antiderivative(expression, variable)"));
  }

  const expr=args[0],v=args[1].name;
  await teachTree(expr);
  think(L("Иду по обратным правилам производных и ищу форму, которую узнаю.","Walking backward through differentiation rules and looking for a form I recognize."),"research");
  await sleep(850);

  const a=simplifyAst(antiAst(expr,v));

  if(!a){
    think(L("Закрытая форма не нашлась. Это не значит, что интеграла нет — только что моей таблицы правил пока недостаточно.","No closed form matched. That does not mean the integral does not exist; my rulebook is simply insufficient."),"confuse");
    return{
      kind:"symbolic",
      text:L(
        `∫(${astString(expr)}) d${v} — закрытая форма пока не найдена`,
        `∫(${astString(expr)}) d${v} — no closed form found yet`
      )
    };
  }

  const text=astString(a);
  think(L(`Узнал обратный шаблон: ${text} + C`,`Recognized the reverse pattern: ${text} + C`),"learn");
  return{kind:"symbolic",text:`∫(${astString(expr)}) d${v} = ${text} + C`};
}

async function handleIntegrate(args){
  await ensureSpecial("integrate");

  if(args.length!==4||!isVariableNode(args[1])){
    throw new Error(L("integrate требует integrate(f(x),x,a,b)","integrate expects integrate(f(x),x,a,b)"));
  }

  const expr=args[0],v=args[1].name;
  await teachTree(expr);

  const av=await numericArg(args[2]),bv=await numericArg(args[3]);
  if(!av.isReal()||!bv.isReal())return{kind:"number",value:new Complex(NaN,NaN)};

  const a=av.re,b=bv.re,Nsteps=64;
  const h=machineDiv(machineSub(b,a),Nsteps);

  think(L(`Разбиваю [${clean(a)}, ${clean(b)}] на ${Nsteps} маленьких промежутков и применяю правило Симпсона.`,`Splitting [${clean(a)}, ${clean(b)}] into ${Nsteps} small intervals and applying Simpson's rule.`),"research");
  await sleep(700);

  let sum=researchComplexCore("add",evalResearch(expr,{[v]:new Complex(a,0)}),evalResearch(expr,{[v]:new Complex(b,0)}));
  showProgress(true,0,L("собираю площадь из узких полос","assembling area from thin strips"));

  for(let i=1;i<Nsteps;i++){
    budgetTick(18,L(`интеграл: узел ${i} из ${Nsteps}`,`integral: node ${i} of ${Nsteps}`));
    const x=machineAdd(a,machineMul(i,h));
    const y=evalResearch(expr,{[v]:new Complex(x,0)});
    const weight=i%2===0?2:4;
    sum=researchComplexCore("add",sum,researchComplexCore("mul",new Complex(weight,0),y));

    if(i%8===0||i===Nsteps-1){
      showProgress(true,i/Nsteps*100,L(`узел ${i} / ${Nsteps}`,`node ${i} / ${Nsteps}`));
      const partial=researchComplexCore("mul",sum,new Complex(machineDiv(h,3),0));
      setRunProgress(`интеграл ≈ ${fmt(partial)} после ${i} внутренних узлов`,`integral ≈ ${fmt(partial)} after ${i} interior nodes`);
      think(L(`обработано ${i}/${Nsteps}; текущая площадь ≈ ${fmt(partial)}`,`processed ${i}/${Nsteps}; current area ≈ ${fmt(partial)}`),"research");
      await sleep(80);
    }
  }

  showProgress(false);
  return{kind:"number",value:researchComplexCore("mul",sum,new Complex(machineDiv(h,3),0))};
}

async function handleLimit(args){
  await ensureSpecial("limit");

  if(args.length!==3||!isVariableNode(args[1])){
    throw new Error(L("limit требует limit(f(x),x,a)","limit expects limit(f(x),x,a)"));
  }

  const expr=args[0],v=args[1].name;
  await teachTree(expr);

  const point=await numericArg(args[2]);
  if(!point.isReal())return{kind:"number",value:new Complex(NaN,NaN)};

  think(L("Подхожу к точке одновременно слева и справа, каждый раз уменьшая расстояние вдвое.","Approaching the point from both sides and halving the distance each time."),"research");

  let h=1,last=new Complex(NaN,NaN);

  for(let k=1;k<=12;k++){
    budgetTick(25,L(`предел: приближение ${k}`,`limit refinement ${k}`));
    const left=evalResearch(expr,{[v]:new Complex(point.re-h,0)});
    const right=evalResearch(expr,{[v]:new Complex(point.re+h,0)});

    if(left.isFinite()&&right.isFinite()){
      last=researchComplexCore("div",researchComplexCore("add",left,right),new Complex(2,0));
      setRunProgress(`lim ≈ ${fmt(last)} при h=${h}`,`lim ≈ ${fmt(last)} at h=${h}`);
      think(L(`h=${clean(h)}: слева ${fmt(left)}, справа ${fmt(right)} → ${fmt(last)}`,`h=${clean(h)}: left ${fmt(left)}, right ${fmt(right)} → ${fmt(last)}`),"research");
    }

    await sleep(110);
    h=machineDiv(h,2);
  }

  return{kind:"number",value:last};
}

async function integerBounds(aNode,bNode){
  const a=await numericArg(aNode),b=await numericArg(bNode);
  if(!a.isReal()||!b.isReal()||!Number.isSafeInteger(a.re)||!Number.isSafeInteger(b.re))return null;
  return[a.re,b.re];
}

async function handleRangeAggregate(name,args){
  const canonical=await ensureSpecial(name);

  if(args.length!==4||!isVariableNode(args[1])){
    throw new Error(L(`${name} требует ${name}(f(n),n,a,b)`,`${name} expects ${name}(f(n),n,a,b)`));
  }

  const expr=args[0],v=args[1].name;
  await teachTree(expr);
  const bounds=await integerBounds(args[2],args[3]);
  if(!bounds)return{kind:"number",value:new Complex(NaN,NaN)};

  let[a,b]=bounds;
  const step=a<=b?1:-1,count=absN(b-a)+1;
  budgetPreflight(count*20,L(`диапазон содержит ${count} элементов`,`range contains ${count} elements`));

  let acc=canonical==="sum"?new Complex(0,0):new Complex(1,0);

  for(let idx=0,n=a;;idx++,n+=step){
    budgetTick(10,L(`${canonical}: элемент ${idx+1} из ${count}`,`${canonical}: item ${idx+1} of ${count}`));
    const value=evalResearch(expr,{[v]:new Complex(n,0)});
    acc=canonical==="sum"?researchComplexCore("add",acc,value):researchComplexCore("mul",acc,value);

    if(idx<5||idx%Math.max(1,Math.floor(count/8))===0||n===b){
      setRunProgress(`${META[canonical].ru}: ${idx+1}/${count} → ${fmt(acc)}`,`${META[canonical].en}: ${idx+1}/${count} → ${fmt(acc)}`);
      think(L(`шаг ${idx+1}/${count}: накоплено ${fmt(acc)}`,`step ${idx+1}/${count}: accumulated ${fmt(acc)}`),"research");
      await sleep(70);
    }

    if(n===b)break;
  }

  return{kind:"number",value:acc};
}

async function handleSolve(args){
  await ensureSpecial("solve");

  if(args.length!==4||!isVariableNode(args[1])){
    throw new Error(L("solve требует solve(f(x),x,a,b)","solve expects solve(f(x),x,a,b)"));
  }

  const expr=args[0],v=args[1].name;
  await teachTree(expr);

  const av=await numericArg(args[2]),bv=await numericArg(args[3]);
  if(!av.isReal()||!bv.isReal())return{kind:"number",value:new Complex(NaN,NaN)};

  let left=av.re,right=bv.re;
  let fl=evalResearch(expr,{[v]:new Complex(left,0)}),fr=evalResearch(expr,{[v]:new Complex(right,0)});

  if(!fl.isReal()||!fr.isReal())return{kind:"number",value:new Complex(NaN,NaN)};

  think(L("Ищу смену знака и буду стягивать интервал пополам.","Looking for a sign change, then repeatedly shrinking the interval by half."),"research");

  if(fl.re*fr.re>0){
    think(L("На концах знак одинаковый. Быстро просматриваю интервал в поисках зацепки.","The endpoints have the same sign. Scanning the interval for a bracket."),"confuse");
    const pieces=32;
    let prevX=left,prevF=fl.re,found=false;

    for(let i=1;i<=pieces;i++){
      budgetTick(15);
      const x=machineAdd(left,machineMul(machineDiv(i,pieces),machineSub(right,left)));
      const fx=evalResearch(expr,{[v]:new Complex(x,0)});

      if(fx.isReal()&&prevF*fx.re<=0){
        left=prevX;right=x;fl=new Complex(prevF,0);fr=fx;found=true;break;
      }

      prevX=x;prevF=fx.re;
    }

    if(!found)return{kind:"symbolic",text:L("На заданном интервале я не нашёл смены знака.","I could not find a sign change on the requested interval.")};
  }

  let mid=left;
  for(let k=1;k<=36;k++){
    budgetTick(18,L(`бисекция: шаг ${k}`,`bisection: step ${k}`));
    mid=machineDiv(machineAdd(left,right),2);
    const fm=evalResearch(expr,{[v]:new Complex(mid,0)});
    if(!fm.isReal())break;

    setRunProgress(`корень ≈ ${clean(mid)}; интервал [${clean(left)}, ${clean(right)}]`,`root ≈ ${clean(mid)}; interval [${clean(left)}, ${clean(right)}]`);

    if(k<=6||k%6===0||k===36){
      think(L(`шаг ${k}: x ≈ ${clean(mid)}, f(x) ≈ ${fmt(fm)}`,`step ${k}: x ≈ ${clean(mid)}, f(x) ≈ ${fmt(fm)}`),"research");
      await sleep(90);
    }

    if(fl.re*fm.re<=0){right=mid;fr=fm}else{left=mid;fl=fm}
  }

  return{kind:"number",value:new Complex(mid,0)};
}


/* ----------------------------- plotting ----------------------------- */
let lastMathPlot=null;

function switchTab(name){
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.toggle("active",x.dataset.tab===name));
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.id===name));
  if(name==="charts"){renderCharts();drawMathPlot()}
  if(name==="memory")renderMemory();
}

function drawMathPlot(){
  const canvas=$("mathPlotCanvas");
  if(!canvas)return;

  const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#090b0e";
  ctx.fillRect(0,0,w,h);

  if(!lastMathPlot||!lastMathPlot.points.length){
    ctx.fillStyle="#6d7580";
    ctx.font="14px monospace";
    ctx.fillText(tr("plotEmpty"),30,40);
    return;
  }

  const {points,xmin,xmax,expr,varName}=lastMathPlot;
  const finite=points.filter(p=>Number.isFinite(p.y));
  if(!finite.length)return;

  let ymin=Math.min(...finite.map(p=>p.y)),ymax=Math.max(...finite.map(p=>p.y));
  if(ymin===ymax){ymin-=1;ymax+=1}
  const pad=(ymax-ymin)*.08;
  ymin-=pad;ymax+=pad;

  const X=x=>44+(w-64)*(x-xmin)/(xmax-xmin);
  const Y=y=>20+(h-48)*(ymax-y)/(ymax-ymin);

  ctx.strokeStyle="#2d333b";
  ctx.lineWidth=1;

  for(let i=0;i<=8;i++){
    const x=44+(w-64)*i/8;
    ctx.beginPath();ctx.moveTo(x,18);ctx.lineTo(x,h-28);ctx.stroke();
  }

  for(let i=0;i<=6;i++){
    const y=20+(h-48)*i/6;
    ctx.beginPath();ctx.moveTo(44,y);ctx.lineTo(w-20,y);ctx.stroke();
  }

  ctx.strokeStyle="#68717c";

  if(xmin<=0&&xmax>=0){
    const x=X(0);ctx.beginPath();ctx.moveTo(x,18);ctx.lineTo(x,h-28);ctx.stroke();
  }

  if(ymin<=0&&ymax>=0){
    const y=Y(0);ctx.beginPath();ctx.moveTo(44,y);ctx.lineTo(w-20,y);ctx.stroke();
  }

  ctx.strokeStyle="#cbd9a6";
  ctx.lineWidth=2;
  ctx.beginPath();

  let pen=false,lastY=null;

  for(const point of points){
    if(!Number.isFinite(point.y)){pen=false;lastY=null;continue}

    const x=X(point.x),y=Y(point.y);

    if(lastY!==null&&absN(point.y-lastY)>(ymax-ymin)*.7)pen=false;

    if(!pen){ctx.moveTo(x,y);pen=true}
    else ctx.lineTo(x,y);

    lastY=point.y;
  }

  ctx.stroke();

  ctx.fillStyle="#818a95";
  ctx.font="11px monospace";
  ctx.fillText(`${varName}: ${clean(xmin)} … ${clean(xmax)}`,48,h-9);
  ctx.fillText(`y: ${clean(ymin)} … ${clean(ymax)}`,w-205,h-9);

  $("plotInfo").textContent=`${expr} · ${finite.length}/${points.length} ${L("точек","points")}`;
}

async function handlePlot(args,sourceLabel=null){
  await ensureSpecial("plot");

  if(args.length!==4||!isVariableNode(args[1])){
    throw new Error(L("plot требует plot(f(x),x,a,b)","plot expects plot(f(x),x,a,b)"));
  }

  const expr=args[0],v=args[1].name;
  await teachTree(expr);

  const av=await numericArg(args[2]),bv=await numericArg(args[3]);
  if(!av.isReal()||!bv.isReal()||av.re===bv.re){
    return{kind:"symbolic",text:L("Не удалось определить диапазон графика.","Could not determine the plot range.")};
  }

  const xmin=av.re,xmax=bv.re,samples=241,points=[];

  think(L(`Строю ${samples} пробных точек функции по ${v}.`,`Sampling ${samples} points of the function along ${v}.`),"research");
  showProgress(true,0,L("исследую форму функции","researching the function's shape"));

  for(let i=0;i<samples;i++){
    budgetTick(8,L(`график: точка ${i+1} из ${samples}`,`plot: point ${i+1} of ${samples}`));

    const x=machineAdd(
      xmin,
      machineMul(machineDiv(i,samples-1),machineSub(xmax,xmin))
    );

    const y=evalResearch(expr,{[v]:new Complex(x,0)});
    points.push({x,y:y.isReal()&&y.isFinite()?y.re:NaN});

    if(i%24===0||i===samples-1){
      showProgress(true,i/(samples-1)*100,L(`точка ${i+1}/${samples}`,`point ${i+1}/${samples}`));
      setRunProgress(`график: построено ${i+1}/${samples} точек`,`plot: sampled ${i+1}/${samples} points`);
      await sleep(0);
    }
  }

  showProgress(false);

  lastMathPlot={
    points,
    xmin,
    xmax,
    expr:sourceLabel||astString(expr),
    varName:v
  };

  drawMathPlot();
  switchTab("charts");

  logObserver(
    L(
      `Построен график «${lastMathPlot.expr}» на [${clean(xmin)}, ${clean(xmax)}].`,
      `Plotted “${lastMathPlot.expr}” on [${clean(xmin)}, ${clean(xmax)}].`
    ),
    "learn"
  );

  return{
    kind:"plot",
    text:L(
      "График построен во вкладке «Графики».",
      "Plot created in the “Graphs” tab."
    )
  };
}

async function evaluateTop(ast,source){
  if(ast.type==="call"){
    const alias={
      derivative:"diff",
      anti:"antiderivative",
      integral:"integrate",
      lim:"limit",
      prod:"product"
    }[ast.name]||ast.name;

    if(alias==="diff")return await handleDiff(ast.args);
    if(alias==="antiderivative")return await handleAntiderivative(ast.args);
    if(alias==="integrate")return await handleIntegrate(ast.args);
    if(alias==="limit")return await handleLimit(ast.args);
    if(alias==="sum"||alias==="product")return await handleRangeAggregate(alias,ast.args);
    if(alias==="solve")return await handleSolve(ast.args);
    if(alias==="plot")return await handlePlot(ast.args);
  }

  const vars=[...freeVariables(ast)];

  if(vars.length===1){
    const v=vars[0];

    think(
      L(
        `В выражении осталась свободная переменная ${v}. Значит, передо мной функция, а не одно число.`,
        `The expression still contains a free variable ${v}. This is a function, not a single number.`
      ),
      "shock"
    );

    await sleep(800);
    return await handlePlot([ast,V(v),N(-10),N(10)],source);
  }

  if(vars.length>1){
    return{
      kind:"symbolic",
      text:L(
        `Вижу несколько свободных переменных (${vars.join(", ")}). Многомерные поверхности пока не рисую.`,
        `I see several free variables (${vars.join(", ")}). I do not plot multidimensional surfaces yet.`
      )
    };
  }

  return{kind:"number",value:await evalNode(ast)};
}

/* ---------------------------- evaluator ---------------------------- */
async function applyCall(name,args){
  if(!ELEMENTARY_CALLS.has(name))return new Complex(NaN,NaN);

  if(META[name])await ensureConcept(name);
  for(const node of args)await teachTree(node);

  const values=[];
  for(const node of args)values.push(await evalNode(node));

  if(
    ["sqrt","abs","sin","cos","tan","asin","acos","atan","sinh","cosh","tanh","exp","ln","log"].includes(name) &&
    args.length===1
  ){
    return await applyFunction(name,values[0]);
  }

  const c=META[name]?concept(name):null;
  const key=values.map(hashZ).join("|");

  if(c?.episodes?.[key]?.strength>0){
    c.episodes[key].strength=clamp(c.episodes[key].strength+4,0,100);
    saveBrain();
    think(L("Такой набор аргументов уже исследован. Вспоминаю ответ.","I have researched these arguments before. Recalling the answer."),"memory");
    return de(c.episodes[key].value);
  }

  const value=qElementary(name,values);

  if(c){
    c.episodes[key]={
      expression:`${name}(${values.map(fmt).join(", ")})`,
      value:ser(value),
      strength:100,
      createdAt:Date.now()
    };
    saveBrain();
    think(L("Сохраняю новый функциональный эпизод в память.","Saving this new functional episode to memory."),"learn");
  }

  return value;
}

async function evalNode(node){
  if(node.type==="number")return new Complex(node.value,0);

  if(node.type==="variable"){
    throw new Error(L(`свободная переменная ${node.name}`,`free variable ${node.name}`));
  }

  if(node.type==="constant"){
    if(node.name==="i"){await ensureConcept("imag");return new Complex(0,1)}
    if(node.name==="pi")return new Complex(await derivePi(),0);
    if(node.name==="e")return new Complex(await deriveE(),0);
  }

  if(node.type==="unary"){
    const v=await evalNode(node.arg);
    if(node.op==="+")return v;
    await ensureConcept("sub");
    return new Complex(-v.re,-v.im);
  }

  if(node.type==="binary"){
    const a=await evalNode(node.left),b=await evalNode(node.right);
    const id={"+":"add","-":"sub","*":"mul","/":"div","%":"mod","^":"pow"}[node.op];
    return await applyBinary(id,a,b);
  }

  if(node.type==="call")return await applyCall(node.name,node.args);
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
function applyLanguage(){document.documentElement.lang=lang;document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=tr(el.dataset.i18n));document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>el.placeholder=tr(el.dataset.i18nPlaceholder));$("langRu").classList.toggle("active",lang==="ru");$("langEn").classList.toggle("active",lang==="en");if(!$("result").dataset.touched)$("result").textContent=tr("emptyBrain");$("decayIntervalLabel").textContent=`${brain.decayMeanSec} ${lang==="ru"?"с":"s"}`;renderAll();drawMathPlot()}

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
          "Синтаксис разобран. Теперь определяю, что именно от меня хотят: число, формулу, предел, интеграл или функцию.",
          "Syntax parsed. Now deciding what is being requested: a number, formula, limit, integral, or function."
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

    const result=await evaluateTop(ast,source);

    if(result.kind==="number"){
      const value=result.value;

      if(!value?.isFinite()){
        think(
          L(
            "Я дошёл до границы текущей математической модели.",
            "I reached the boundary of my current mathematical model."
          ),
          "bad"
        );
        setResult(`<span class="answer" style="color:var(--bad)">${L("не определено","undefined")}</span>`);
      }else{
        think(L(`Получилось: ${fmt(value)}.`,`I got: ${fmt(value)}.`),"learn");
        const annotation=result.annotation?`<br><small>${escapeHtml(result.annotation)}</small>`:"";
        setResult(`<span class="answer">${escapeHtml(source)} = ${escapeHtml(fmt(value))}</span>${annotation}`);
        logObserver(L(`Решено «${source}» → ${fmt(value)}.`,`Solved “${source}” → ${fmt(value)}.`),"memory");
      }
    }

    if(result.kind==="symbolic"){
      think(L("Ответ получился не одним числом, а математической записью.","The result is a mathematical expression rather than a single number."),"learn");
      setResult(`<span class="answer symbolic-answer">${escapeHtml(result.text)}</span>`);
      logObserver(L(`Символический результат для «${source}».`,`Symbolic result for “${source}”.`),"memory");
    }

    if(result.kind==="plot"){
      setResult(`<span class="answer">${escapeHtml(result.text)}</span>`);
    }

    renderAll();

  }catch(err){
    if(err instanceof ComputationBudgetExceeded){
      showProgress(false);
      saveBrain();

      const partial=activeRun?.lastGood||L(
        "успел только разобрать задачу и начать алгоритм",
        "I only managed to parse the task and begin the algorithm"
      );

      const technical=err.detail?`<br><small>${escapeHtml(err.detail)}</small>`:"";

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
        `<span class="answer" style="color:var(--warn)">${L("Сорян, дальше слишком тяжело.","Sorry, this got too expensive.")}</span><br>`+
        `${L(
          "Я остановил вычисление по защитному лимиту, чтобы сайт не завис и не начал бесконечно жрать ресурсы.",
          "I stopped at the safety budget so the page would not lock up and burn resources indefinitely."
        )}<br><br>`+
        `<b>${L("Вот что я успел получить:","Here is what I managed to obtain:")}</b><br>`+
        `${escapeHtml(partial)}`+technical+
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
    }else{
      console.error(err);
      showProgress(false);
      const message=err?.message||String(err);

      think(
        L(
          `Текущая мысль развалилась: ${message}`,
          `The current thought fell apart: ${message}`
        ),
        "bad"
      );

      setResult(
        `<span class="answer" style="color:var(--bad)">${L("Не смог закончить эту мысль.","I could not finish this thought.")}</span><br>`+
        `${escapeHtml(message)}`
      );
    }
  }finally{
    activeRun=null;
    busy=false;
    $("calculate").disabled=false;
    recordStats(true);
  }
}

/* ------------------------------- events ---------------------------- */
document.querySelectorAll(".tabs button").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.tab)));

$("calculate").addEventListener("click",calculate);
$("expression").addEventListener("keydown",e=>{if(e.key==="Enter")calculate()});

document.querySelectorAll("[data-template]").forEach(btn=>btn.addEventListener("click",()=>{
  const input=$("expression"),text=btn.dataset.template;
  input.value=text;
  input.focus();
  const x=text.indexOf("x");
  if(x>=0)input.setSelectionRange(x,x+1);
}));

$("memoryConcept").addEventListener("change",e=>{
  selectedMemoryKey=e.target.value||null;
  renderMemory();
});

function chooseLanguage(next){
  lang=next;
  localStorage.setItem(LANG_KEY,lang);
  $("languageGate").classList.add("hidden");
  applyLanguage();
}

$("langRu").addEventListener("click",()=>chooseLanguage("ru"));
$("langEn").addEventListener("click",()=>chooseLanguage("en"));
document.querySelectorAll("[data-first-language]").forEach(btn=>btn.addEventListener("click",()=>chooseLanguage(btn.dataset.firstLanguage)));

$("decayInterval").value=brain.decayMeanSec;
$("decayInterval").addEventListener("input",e=>$("decayIntervalLabel").textContent=`${e.target.value} ${lang==="ru"?"с":"s"}`);
$("decayInterval").addEventListener("change",e=>{
  brain.decayMeanSec=Number(e.target.value);
  scheduleDecay();
  saveBrain();
  renderBrain();
});

$("damageBrain").addEventListener("click",damageMemory);
$("resetBrain").addEventListener("click",fullLobotomy);

$("plotButton").addEventListener("click",async()=>{
  const expr=$("plotExpression").value.trim();
  const a=$("plotMin").value.trim();
  const b=$("plotMax").value.trim();
  if(!expr)return;

  $("expression").value=`plot(${expr},x,${a},${b})`;
  switchTab("calculator");
  await calculate();
});

/* -------------------------------- boot ----------------------------- */
if(!HAD_LANGUAGE)$("languageGate").classList.remove("hidden");
else $("languageGate").classList.add("hidden");

if(!observerLog.length){
  logObserver(
    L(
      "Создан новый пустой мозг. Математики внутри нет.",
      "Created a new empty brain. There is no mathematics inside."
    ),
    "discover"
  );
}

recordStats(true);
applyLanguage();
drawMathPlot();

setInterval(()=>{
  if(Date.now()>=brain.nextDecayAt&&!busy)damageMemory();
  else renderBrain();
  recordStats(false);
},1000);

})();
