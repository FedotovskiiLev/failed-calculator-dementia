(() => {
"use strict";

/* ============================================================
   FAILED CALCULATOR — dementia build
   No eval(), no math library, no framework.
   ============================================================ */

const BRAIN_KEY = "failed-calculator-brain-v2";
const LOG_KEY = "failed-calculator-observer-log-v2";
const TABLE_LIMIT = 18;
const TABLE_VIEW_LIMIT = 17;

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));

/* -------------------------- Complex -------------------------- */

class Complex {
  constructor(re=0, im=0) {
    this.re = Number(re);
    this.im = Number(im);
  }
  static from(v) {
    if (v instanceof Complex) return v;
    return new Complex(Number(v), 0);
  }
  add(v) { v=Complex.from(v); return new Complex(this.re+v.re, this.im+v.im); }
  sub(v) { v=Complex.from(v); return new Complex(this.re-v.re, this.im-v.im); }
  neg() { return new Complex(-this.re, -this.im); }
  mul(v) {
    v=Complex.from(v);
    return new Complex(this.re*v.re-this.im*v.im, this.re*v.im+this.im*v.re);
  }
  div(v) {
    v=Complex.from(v);
    const d=v.re*v.re+v.im*v.im;
    if (d === 0) return new Complex(NaN,NaN);
    return new Complex((this.re*v.re+this.im*v.im)/d,(this.im*v.re-this.re*v.im)/d);
  }
  abs() { return Math.hypot(this.re,this.im); }
  arg() { return Math.atan2(this.im,this.re); }
  log() {
    return new Complex(Math.log(this.abs()), this.arg());
  }
  exp() {
    const e=Math.exp(this.re);
    return new Complex(e*Math.cos(this.im), e*Math.sin(this.im));
  }
  pow(v) {
    v=Complex.from(v);
    if (this.re===0 && this.im===0 && v.im===0 && v.re>0) return new Complex(0,0);
    return this.log().mul(v).exp();
  }
  sqrt() {
    if (this.im === 0 && this.re >= 0) return new Complex(Math.sqrt(this.re),0);
    const r=this.abs();
    const re=Math.sqrt((r+this.re)/2);
    const im=Math.sign(this.im || 1)*Math.sqrt((r-this.re)/2);
    return new Complex(re,im);
  }
  sin() {
    return new Complex(
      Math.sin(this.re)*Math.cosh(this.im),
      Math.cos(this.re)*Math.sinh(this.im)
    );
  }
  cos() {
    return new Complex(
      Math.cos(this.re)*Math.cosh(this.im),
      -Math.sin(this.re)*Math.sinh(this.im)
    );
  }
  tan() { return this.sin().div(this.cos()); }
  isReal(eps=1e-11) { return Math.abs(this.im) < eps; }
  isFinite() { return Number.isFinite(this.re) && Number.isFinite(this.im); }
}

function serializeComplex(z) {
  z=Complex.from(z);
  return {re:z.re, im:z.im};
}
function deserializeComplex(v) {
  return new Complex(v.re,v.im);
}
function roundClean(n) {
  if (Math.abs(n) < 1e-12) return 0;
  const rounded = Number(n.toPrecision(12));
  return Object.is(rounded,-0) ? 0 : rounded;
}
function fmt(z) {
  z=Complex.from(z);
  const re=roundClean(z.re);
  const im=roundClean(z.im);

  if (!Number.isFinite(re) || !Number.isFinite(im)) return "не определено";
  if (Math.abs(im) < 1e-11) return String(re);
  if (Math.abs(re) < 1e-11) {
    if (im===1) return "i";
    if (im===-1) return "-i";
    return `${im}i`;
  }

  const sign=im>=0?"+":"−";
  const mag=Math.abs(im);
  const imText=mag===1?"i":`${mag}i`;
  return `${re} ${sign} ${imText}`;
}
function complexHash(z) {
  z=Complex.from(z);
  return `${roundClean(z.re)}:${roundClean(z.im)}`;
}

/* --------------------------- Parser -------------------------- */

const FUNCTIONS = new Set(["sqrt","abs","sin","cos","tan","ln","log","exp"]);
const CONSTANTS = new Set(["pi","e","i"]);

function normalizeExpression(s) {
  return s
    .replaceAll("π","pi")
    .replaceAll("×","*")
    .replaceAll("·","*")
    .replaceAll("÷","/")
    .replaceAll("−","-")
    .replaceAll("**","^")
    .trim();
}

function tokenize(source) {
  source=normalizeExpression(source);
  const raw=[];
  let i=0;

  while (i<source.length) {
    const c=source[i];

    if (/\s/.test(c)) { i++; continue; }

    const number=source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      raw.push({type:"number",value:number[0]});
      i+=number[0].length;
      continue;
    }

    const ident=source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (ident) {
      raw.push({type:"ident",value:ident[0].toLowerCase()});
      i+=ident[0].length;
      continue;
    }

    if ("+-*/%^!(),".includes(c)) {
      raw.push({type:c,value:c});
      i++;
      continue;
    }

    throw new Error(`не понимаю символ «${c}»`);
  }

  // Implicit multiplication: 2i, 2pi, 2(3+4), (1+i)(1-i), 3sin(pi).
  const out=[];
  for (let j=0;j<raw.length;j++) {
    const cur=raw[j];
    const prev=out[out.length-1];

    if (prev && needsImplicitMultiplication(prev,cur)) {
      out.push({type:"*",value:"*",implicit:true});
    }
    out.push(cur);
  }

  out.push({type:"EOF",value:"EOF"});
  return out;
}

function canEndAtom(t) {
  return t.type==="number" || t.type==="ident" || t.type===")" || t.type==="!";
}
function canStartAtom(t) {
  return t.type==="number" || t.type==="ident" || t.type==="(";
}
function needsImplicitMultiplication(prev,cur) {
  if (!canEndAtom(prev) || !canStartAtom(cur)) return false;
  if (prev.type==="ident" && FUNCTIONS.has(prev.value) && cur.type==="(") return false;
  return true;
}

class Parser {
  constructor(tokens) { this.tokens=tokens; this.pos=0; }
  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }
  match(type) {
    if (this.peek().type===type) { this.pos++; return true; }
    return false;
  }
  expect(type) {
    const t=this.next();
    if (t.type!==type) throw new Error(`ожидал «${type}», но увидел «${t.value}»`);
    return t;
  }
  parse() {
    const node=this.parseAdd();
    if (this.peek().type!=="EOF") throw new Error(`лишнее после выражения: «${this.peek().value}»`);
    return node;
  }
  parseAdd() {
    let node=this.parseMul();
    while (this.peek().type==="+" || this.peek().type==="-") {
      const op=this.next().type;
      node={type:"binary",op,left:node,right:this.parseMul()};
    }
    return node;
  }
  parseMul() {
    let node=this.parseUnary();
    while (["*","/","%"].includes(this.peek().type)) {
      const op=this.next().type;
      node={type:"binary",op,left:node,right:this.parseUnary()};
    }
    return node;
  }
  parseUnary() {
    if (this.match("+")) return {type:"unary",op:"+",arg:this.parseUnary()};
    if (this.match("-")) return {type:"unary",op:"-",arg:this.parseUnary()};
    return this.parsePower();
  }
  parsePower() {
    let node=this.parsePostfix();
    if (this.match("^")) {
      node={type:"binary",op:"^",left:node,right:this.parseUnary()};
    }
    return node;
  }
  parsePostfix() {
    let node=this.parsePrimary();
    while (this.match("!")) node={type:"postfix",op:"!",arg:node};
    return node;
  }
  parsePrimary() {
    const t=this.peek();

    if (t.type==="number") {
      this.next();
      return {type:"number",value:Number(t.value),raw:t.value};
    }

    if (t.type==="ident") {
      this.next();
      const name=t.value;

      if (CONSTANTS.has(name)) return {type:"constant",name};

      if (FUNCTIONS.has(name)) {
        this.expect("(");
        const arg=this.parseAdd();
        this.expect(")");
        return {type:"function",name,arg};
      }

      throw new Error(`не знаю имени «${name}»`);
    }

    if (this.match("(")) {
      const node=this.parseAdd();
      this.expect(")");
      return node;
    }

    throw new Error(`ожидал число, константу или скобку, но увидел «${t.value}»`);
  }
}

/* ------------------------- Brain state ----------------------- */

function randomDecayDelay(meanSec) {
  return Math.round(meanSec * (0.65 + Math.random()*0.7) * 1000);
}
function freshBrain(decayMeanSec=28) {
  const delay=randomDecayDelay(decayMeanSec);
  return {
    version:2,
    createdAt:Date.now(),
    decayMeanSec,
    nextDecayAt:Date.now()+delay,
    concepts:{}
  };
}
function loadBrain() {
  try {
    const raw=sessionStorage.getItem(BRAIN_KEY);
    if (!raw) return freshBrain();
    const b=JSON.parse(raw);
    if (!b || b.version!==2) return freshBrain();
    return b;
  } catch {
    return freshBrain();
  }
}
function saveBrain() {
  sessionStorage.setItem(BRAIN_KEY,JSON.stringify(brain));
}
function loadLog() {
  try { return JSON.parse(sessionStorage.getItem(LOG_KEY)||"[]"); }
  catch { return []; }
}
function saveLog() {
  sessionStorage.setItem(LOG_KEY,JSON.stringify(observerLog.slice(-500)));
}

let brain=loadBrain();
let observerLog=loadLog();
let selectedMemoryKey=null;
let busy=false;

function conceptKey(kind,name) { return `${kind}:${name}`; }

function getConcept(kind,name) {
  return brain.concepts[conceptKey(kind,name)] || null;
}

function newConcept(kind,name,label,symbol) {
  return {
    kind,name,label,symbol,
    strength:100,
    discoveredAt:Date.now(),
    lastSeen:Date.now(),
    table:null,
    episodes:{}
  };
}

function rememberConcept(c) {
  c.lastSeen=Date.now();
  c.strength=clamp(c.strength+4,0,100);
}

function logObserver(message,type="memory") {
  observerLog.push({at:Date.now(),message,type});
  saveLog();
  renderObserver();
}

function displayConceptName(c) {
  return c.label || c.name;
}

/* ----------------------- Thinking UI ------------------------ */

function clearThinking() {
  $("thinking").innerHTML="";
}
function nowTime() {
  return new Date().toLocaleTimeString("ru-RU",{hour12:false});
}
function think(text,cls="") {
  const line=document.createElement("div");
  line.className=`think-line ${cls}`;
  line.innerHTML=`<span class="time">${nowTime()}</span>${escapeHtml(text)}`;
  $("thinking").appendChild(line);
  $("thinking").scrollTop=$("thinking").scrollHeight;
}
function setResult(html) { $("result").innerHTML=html; }
function showProgress(show,pct=0,label="") {
  $("progressWrap").classList.toggle("show",show);
  $("progressBar").style.width=`${clamp(pct,0,100)}%`;
  $("progressLabel").textContent=label;
}
function toast(text) {
  const el=$("toast");
  el.textContent=text;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>el.classList.remove("show"),4500);
}

async function dramatic(lines) {
  for (const item of lines) {
    think(item.text,item.cls||"shock");
    await sleep(item.wait ?? 700);
  }
}

async function discoverConcept(kind,name,label,symbol,flavour="normal") {
  const key=conceptKey(kind,name);
  let c=brain.concepts[key];

  if (c) {
    if (c.strength < 27) {
      await dramatic([
        {text:`Стоп. «${label}»... Я это слово где-то видел.`,cls:"confuse",wait:850},
        {text:"В памяти дыра. Пытаюсь восстановить смысл по остаткам.",cls:"confuse",wait:850},
        {text:"Кажется... да. Что-то возвращается.",cls:"learn",wait:600},
      ]);
      c.strength=clamp(c.strength+38,0,100);
      saveBrain();
      logObserver(`Понятие «${label}» частично восстановлено после провала памяти.`,"learn");
    } else {
      rememberConcept(c);
      saveBrain();
    }
    return c;
  }

  c=newConcept(kind,name,label,symbol);
  brain.concepts[key]=c;
  saveBrain();

  if (flavour==="complex") {
    await dramatic([
      {text:"Подождите.",cls:"shock",wait:900},
      {text:"Я вижу здесь букву i.",cls:"shock",wait:1000},
      {text:"Но... числа же должны лежать на числовой прямой.",cls:"shock",wait:1100},
      {text:"Почему квадрат этого существа равен −1?",cls:"shock",wait:1050},
      {text:"...",cls:"confuse",wait:850},
      {text:"Ладно. Похоже, одной прямой недостаточно. Записываю: комплексная плоскость.",cls:"learn",wait:950},
    ]);
  } else if (flavour==="function") {
    await dramatic([
      {text:`Что такое «${label}»? Это уже не просто знак между двумя числами.`,cls:"shock",wait:850},
      {text:"Похоже, число можно целиком отдать какой-то машине и получить другое число.",cls:"confuse",wait:900},
      {text:`Записываю новое преобразование: ${label}.`,cls:"learn",wait:650},
    ]);
  } else if (flavour==="factorial") {
    await dramatic([
      {text:"Почему после числа стоит восклицательный знак?",cls:"shock",wait:900},
      {text:"Это не эмоция. Это... операция.",cls:"confuse",wait:900},
      {text:"Число умножается на все предыдущие целые. Звучит расточительно. Мне нравится.",cls:"learn",wait:800},
    ]);
  } else if (flavour==="constant") {
    await dramatic([
      {text:`Что ещё за постоянное число «${label}»?`,cls:"shock",wait:850},
      {text:"То есть некоторые числа настолько важные, что им дали имя.",cls:"confuse",wait:850},
      {text:`Запоминаю ${label}.`,cls:"learn",wait:600},
    ]);
  } else {
    await dramatic([
      {text:`НИФИГА СЕБЕ. Новый математический знак: «${symbol}».`,cls:"shock",wait:1050},
      {text:`Похоже, это называется «${label}».`,cls:"shock",wait:900},
      {text:"Я этого раньше не умел. Дайте посмотреть, как оно ведёт себя на целых числах.",cls:"confuse",wait:900},
      {text:`Создаю в голове раздел «${label}».`,cls:"learn",wait:750},
    ]);
  }

  logObserver(`Открыто новое понятие: «${label}».`,"discover");
  renderAll();
  return c;
}

/* ------------------- Arithmetic experiment ------------------ */

const OP_META = {
  "+":{label:"сложение",symbol:"+"},
  "-":{label:"вычитание",symbol:"−"},
  "*":{label:"умножение",symbol:"×"},
  "/":{label:"деление",symbol:"÷"},
  "%":{label:"остаток от деления",symbol:"%"},
  "^":{label:"возведение в степень",symbol:"^"},
};

function rawBinary(op,a,b) {
  a=Complex.from(a); b=Complex.from(b);
  switch(op) {
    case "+": return a.add(b);
    case "-": return a.sub(b);
    case "*": return a.mul(b);
    case "/": return a.div(b);
    case "^": return a.pow(b);
    case "%":
      if (!a.isReal() || !b.isReal() || b.re===0) return new Complex(NaN,NaN);
      return new Complex(a.re % b.re,0);
    default: return new Complex(NaN,NaN);
  }
}

function rawFunction(name,z) {
  z=Complex.from(z);
  switch(name) {
    case "sqrt": return z.sqrt();
    case "abs": return new Complex(z.abs(),0);
    case "sin": return z.sin();
    case "cos": return z.cos();
    case "tan": return z.tan();
    case "ln": return z.log();
    case "log": return z.log().div(new Complex(Math.log(10),0));
    case "exp": return z.exp();
    default: return new Complex(NaN,NaN);
  }
}

function factorialComplex(z) {
  z=Complex.from(z);
  if (!z.isReal() || !Number.isSafeInteger(z.re) || z.re<0 || z.re>170) {
    return new Complex(NaN,NaN);
  }
  let out=1;
  for (let i=2;i<=z.re;i++) out*=i;
  return new Complex(out,0);
}

function isSmallInteger(z) {
  z=Complex.from(z);
  return z.isReal() && Number.isSafeInteger(z.re) && Math.abs(z.re)<=TABLE_LIMIT;
}

function episodeKey(parts) { return parts.join("|"); }

async function buildTable(concept,op,newMin,newMax) {
  if (!concept.table) concept.table={min:newMin,max:newMax,cells:{}};
  const oldMin=concept.table.min;
  const oldMax=concept.table.max;
  concept.table.min=Math.min(oldMin,newMin);
  concept.table.max=Math.max(oldMax,newMax);

  const min=concept.table.min;
  const max=concept.table.max;
  const total=(max-min+1)**2;
  let done=0;

  think(`Строю таблицу «${concept.label}» для диапазона ${min}…${max}.`, "learn");
  showProgress(true,0,`таблица ${concept.label}: ${min}…${max}`);

  for (let a=min;a<=max;a++) {
    for (let b=min;b<=max;b++) {
      const key=`${a},${b}`;
      if (!concept.table.cells[key]) {
        const value=rawBinary(op,new Complex(a,0),new Complex(b,0));
        concept.table.cells[key]={
          value:serializeComplex(value),
          strength:100
        };
      }
      done++;
    }

    const pct=done/total*100;
    showProgress(true,pct,`запоминаю строку ${a}: ${done.toLocaleString("ru-RU")} / ${total.toLocaleString("ru-RU")}`);
    saveBrain();
    if (selectedMemoryKey===conceptKey("op",op)) renderMemory();
    await sleep((max-min)>22?8:22);
  }

  showProgress(false);
  think(`Готово. В таблице теперь ${Object.keys(concept.table.cells).length.toLocaleString("ru-RU")} явных воспоминаний.`, "learn");
  logObserver(`Построена/расширена таблица «${concept.label}» для ${min}…${max}.`,"learn");
}

async function applyBinary(op,a,b) {
  const meta=OP_META[op];
  const concept=await discoverConcept("op",op,meta.label,meta.symbol,"normal");
  rememberConcept(concept);

  const exactEpisode=episodeKey([complexHash(a),complexHash(b)]);
  const episode=concept.episodes[exactEpisode];

  if (episode && episode.strength>0) {
    episode.strength=clamp(episode.strength+3,0,100);
    think(`Вспомнил отдельный пример: ${fmt(a)} ${meta.symbol} ${fmt(b)}.`, "memory");
    saveBrain();
    return deserializeComplex(episode.value);
  }

  if (isSmallInteger(a) && isSmallInteger(b)) {
    const ai=Math.trunc(a.re), bi=Math.trunc(b.re);
    const min=Math.min(0,ai,bi);
    const max=Math.max(0,ai,bi);

    if (!concept.table || min<concept.table.min || max>concept.table.max) {
      await buildTable(concept,op,min,max);
    }

    const cell=concept.table.cells[`${ai},${bi}`];

    if (cell && cell.strength>0) {
      cell.strength=clamp(cell.strength+4,0,100);
      think(`Нашёл нужную ячейку в таблице «${meta.label}».`, "memory");
      saveBrain();
      return deserializeComplex(cell.value);
    }

    think(`Ячейка ${ai} ${meta.symbol} ${bi} вырвана из памяти. Восстанавливаю её экспериментом.`, "confuse");
    await sleep(650);

    const value=rawBinary(op,a,b);
    concept.table.cells[`${ai},${bi}`]={value:serializeComplex(value),strength:100};
    saveBrain();
    return value;
  }

  think(`Такой случай в таблицу нормально не помещается: ${fmt(a)} ${meta.symbol} ${fmt(b)}.`, "confuse");
  await sleep(500);
  think("Провожу единичный эксперимент и сохраняю его как эпизодическое воспоминание.", "learn");
  await sleep(550);

  const value=rawBinary(op,a,b);
  concept.episodes[exactEpisode]={
    expression:`${fmt(a)} ${meta.symbol} ${fmt(b)}`,
    value:serializeComplex(value),
    strength:100,
    createdAt:Date.now()
  };
  saveBrain();
  return value;
}

async function applyFunction(name,arg) {
  const labels={
    sqrt:"квадратный корень",abs:"модуль",sin:"синус",cos:"косинус",
    tan:"тангенс",ln:"натуральный логарифм",log:"десятичный логарифм",exp:"экспонента"
  };
  const concept=await discoverConcept("fn",name,labels[name],`${name}(x)`,"function");
  rememberConcept(concept);

  const key=episodeKey([complexHash(arg)]);
  const episode=concept.episodes[key];

  if (episode && episode.strength>0) {
    think(`Вспомнил, что уже пробовал ${name}(${fmt(arg)}).`, "memory");
    episode.strength=clamp(episode.strength+4,0,100);
    saveBrain();
    return deserializeComplex(episode.value);
  }

  think(`Экспериментирую с ${name}(${fmt(arg)}).`, "learn");
  await sleep(500);
  const value=rawFunction(name,arg);

  concept.episodes[key]={
    expression:`${name}(${fmt(arg)})`,
    value:serializeComplex(value),
    strength:100,
    createdAt:Date.now()
  };
  saveBrain();
  return value;
}

async function applyFactorial(arg) {
  const concept=await discoverConcept("postfix","!","факториал","!","factorial");
  rememberConcept(concept);

  const key=complexHash(arg);
  const episode=concept.episodes[key];

  if (episode && episode.strength>0) {
    think(`Факториал ${fmt(arg)} уже был выучен.`, "memory");
    return deserializeComplex(episode.value);
  }

  if (!arg.isReal() || !Number.isSafeInteger(arg.re) || arg.re<0) {
    think("Факториал здесь требует знаний, которых у меня пока нет.", "bad");
    return new Complex(NaN,NaN);
  }

  think(`Старательно перемножаю все целые от 1 до ${arg.re}.`, "learn");
  const steps=Math.min(arg.re,20);
  for (let i=2;i<=steps;i++) {
    if (i<=8 || i===steps) {
      think(`... дошёл до × ${i}`, "memory");
      await sleep(100);
    }
  }

  const value=factorialComplex(arg);
  concept.episodes[key]={
    expression:`${fmt(arg)}!`,
    value:serializeComplex(value),
    strength:100,
    createdAt:Date.now()
  };
  saveBrain();
  return value;
}

async function evalNode(node) {
  switch(node.type) {
    case "number":
      return new Complex(node.value,0);

    case "constant":
      if (node.name==="i") {
        await discoverConcept("const","i","мнимая единица i","i","complex");
        return new Complex(0,1);
      }
      if (node.name==="pi") {
        await discoverConcept("const","pi","число π","π","constant");
        return new Complex(Math.PI,0);
      }
      if (node.name==="e") {
        await discoverConcept("const","e","число e","e","constant");
        return new Complex(Math.E,0);
      }
      return new Complex(NaN,NaN);

    case "unary": {
      const v=await evalNode(node.arg);
      if (node.op==="+") return v;
      await discoverConcept("unary","-","отрицательное число","−","normal");
      return v.neg();
    }

    case "binary": {
      const left=await evalNode(node.left);
      const right=await evalNode(node.right);
      return await applyBinary(node.op,left,right);
    }

    case "function": {
      const arg=await evalNode(node.arg);
      return await applyFunction(node.name,arg);
    }

    case "postfix": {
      const arg=await evalNode(node.arg);
      return await applyFactorial(arg);
    }
  }

  return new Complex(NaN,NaN);
}

/* --------------------------- Dementia ------------------------ */

function allConcepts() {
  return Object.values(brain.concepts);
}

function memoryHealth() {
  const concepts=allConcepts();
  if (!concepts.length) return 100;

  let score=0, weights=0;

  for (const c of concepts) {
    score+=c.strength*3;
    weights+=3;

    if (c.table) {
      for (const cell of Object.values(c.table.cells)) {
        score+=cell.strength;
        weights++;
      }
    }

    for (const ep of Object.values(c.episodes)) {
      score+=ep.strength;
      weights++;
    }
  }

  return weights?clamp(score/weights,0,100):100;
}

function damageSomeMemory(manual=false) {
  const concepts=allConcepts();

  if (!concepts.length) {
    scheduleNextDecay();
    logObserver("Приступ деменции произошёл, но забывать было ещё нечего.","decay");
    toast("Приступ прошёл впустую: мозг и так пуст.");
    return;
  }

  const hits=Math.min(concepts.length,1+Math.floor(Math.random()*Math.min(3,concepts.length)));
  const shuffled=[...concepts].sort(()=>Math.random()-.5);
  const reports=[];

  for (const c of shuffled.slice(0,hits)) {
    const loss=8+Math.floor(Math.random()*18);
    c.strength=clamp(c.strength-loss,0,100);

    let cellsDamaged=0;
    let cellsForgotten=0;

    if (c.table) {
      const keys=Object.keys(c.table.cells).sort(()=>Math.random()-.5);
      const fraction=c.strength<30?.24:c.strength<55?.13:.07;
      const n=Math.max(1,Math.floor(keys.length*fraction));

      for (const key of keys.slice(0,n)) {
        const cell=c.table.cells[key];
        cell.strength=clamp(cell.strength-(18+Math.random()*45),0,100);
        cellsDamaged++;
        if (cell.strength<=2) {
          delete c.table.cells[key];
          cellsForgotten++;
        }
      }
    }

    const epKeys=Object.keys(c.episodes).sort(()=>Math.random()-.5);
    const epN=Math.min(epKeys.length,Math.max(0,Math.floor(epKeys.length*(c.strength<40?.25:.08))));

    for (const key of epKeys.slice(0,epN)) {
      c.episodes[key].strength=clamp(c.episodes[key].strength-(25+Math.random()*45),0,100);
      if (c.episodes[key].strength<=2) delete c.episodes[key];
    }

    if (c.strength<=1) {
      delete brain.concepts[conceptKey(c.kind,c.name)];
      reports.push(`полностью забыл понятие «${c.label}»`);
    } else if (cellsForgotten) {
      reports.push(`«${c.label}»: потеряно ${cellsForgotten} ячеек, ещё ${cellsDamaged-cellsForgotten} повреждено`);
    } else if (cellsDamaged) {
      reports.push(`«${c.label}»: повреждено ${cellsDamaged} ячеек`);
    } else {
      reports.push(`«${c.label}»: уверенность упала до ${Math.round(c.strength)}%`);
    }
  }

  scheduleNextDecay();
  saveBrain();

  const message=reports.join("; ");
  logObserver(`Приступ деменции: ${message}.`,"decay");
  toast(`Память дала сбой: ${reports[0]}.`);

  if (!busy) {
    think(`[ПАМЯТЬ ДАЛА СБОЙ] ${message}.`,"bad");
  }

  renderAll();
}

function scheduleNextDecay() {
  brain.nextDecayAt=Date.now()+randomDecayDelay(brain.decayMeanSec);
}

function fullLobotomy() {
  const mean=brain.decayMeanSec;
  brain=freshBrain(mean);
  saveBrain();
  logObserver("Полная лоботомия: уничтожены все внутренние математические знания.","decay");
  clearThinking();
  think("Я... кто?", "bad");
  think("Что такое число?", "confuse");
  setResult("МОЗГ ПУСТ.\nВсе математические знания уничтожены.");
  toast("Полная лоботомия завершена.");
  renderAll();
}

function stageInfo(health) {
  if (health>=82) return ["почти ясное сознание","Большая часть приобретённых знаний ещё держится."];
  if (health>=62) return ["лёгкая забывчивость","Отдельные ячейки таблиц начинают тускнеть и выпадать."];
  if (health>=40) return ["фрагментация памяти","Некоторые операции узнаются не сразу; таблицы становятся дырявыми."];
  if (health>=18) return ["тяжёлая деградация","Сохранились обрывки правил и отдельные эпизоды. Знакомые знаки иногда кажутся новыми."];
  return ["почти полная амнезия","Остатки математики держатся на нескольких случайных воспоминаниях."];
}

/* --------------------------- Render -------------------------- */

function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function renderConcepts() {
  const list=$("conceptList");
  const concepts=allConcepts().sort((a,b)=>b.lastSeen-a.lastSeen);

  if (!concepts.length) {
    list.innerHTML='<div class="empty-state">пока ничего</div>';
    return;
  }

  list.innerHTML=concepts.map(c=>{
    let details="эпизодические воспоминания";
    if (c.table) details=`таблица ${c.table.min}…${c.table.max}`;
    const count=(c.table?Object.keys(c.table.cells).length:0)+Object.keys(c.episodes).length;

    return `<div class="concept">
      <strong>${escapeHtml(c.symbol || c.name)} — ${escapeHtml(c.label)}</strong>
      <span class="strength">${Math.round(c.strength)}%</span>
      <small>${escapeHtml(details)} · ${count} записей</small>
      <small>${c.strength<30?"путается":c.strength<60?"помнит неуверенно":"помнит"}</small>
      <div class="minihealth"><i style="width:${c.strength}%"></i></div>
    </div>`;
  }).join("");
}

function renderMemorySelect() {
  const select=$("memoryConcept");
  const concepts=allConcepts();

  if (!concepts.length) {
    select.innerHTML='<option value="">память пуста</option>';
    selectedMemoryKey=null;
    return;
  }

  if (!selectedMemoryKey || !brain.concepts[selectedMemoryKey]) {
    selectedMemoryKey=conceptKey(concepts[0].kind,concepts[0].name);
  }

  select.innerHTML=concepts
    .map(c=>{
      const key=conceptKey(c.kind,c.name);
      return `<option value="${escapeHtml(key)}" ${key===selectedMemoryKey?"selected":""}>${escapeHtml(c.symbol || c.name)} — ${escapeHtml(c.label)}</option>`;
    }).join("");
}

function memoryRange(table) {
  if (!table) return [];
  let min=table.min,max=table.max;

  if (max-min+1>TABLE_VIEW_LIMIT) {
    if (min<=0 && max>=0) {
      min=Math.max(min,-6);
      max=Math.min(max,10);
    } else {
      max=Math.min(max,min+TABLE_VIEW_LIMIT-1);
    }
  }
  return Array.from({length:max-min+1},(_,i)=>min+i);
}

function renderMemory() {
  renderMemorySelect();

  const summary=$("memorySummary");
  const wrap=$("memoryTableWrap");
  const episodes=$("episodeList");

  if (!selectedMemoryKey || !brain.concepts[selectedMemoryKey]) {
    summary.textContent="Внутри пока нет ни одного математического понятия.";
    wrap.innerHTML='<div class="empty-state">таблиц нет</div>';
    episodes.innerHTML="";
    return;
  }

  const c=brain.concepts[selectedMemoryKey];
  const table=c.table;
  const epList=Object.values(c.episodes).sort((a,b)=>b.createdAt-a.createdAt);

  summary.textContent=
    `«${c.label}»: целостность понятия ${Math.round(c.strength)}%. ` +
    `${table ? `В таблице осталось ${Object.keys(table.cells).length.toLocaleString("ru-RU")} ячеек.` : "Полной таблицы нет."} ` +
    `${epList.length} отдельных эпизодов.`;

  if (!table) {
    wrap.innerHTML='<div class="empty-state">Это знание хранится не таблицей, а отдельными эпизодами.</div>';
  } else {
    const range=memoryRange(table);
    let html='<table class="memory-table"><thead><tr><th>a \\ b</th>';
    for (const b of range) html+=`<th>${b}</th>`;
    html+='</tr></thead><tbody>';

    for (const a of range) {
      html+=`<tr><td>${a}</td>`;
      for (const b of range) {
        const cell=table.cells[`${a},${b}`];
        if (!cell) {
          html+='<td class="memory-cell dead">·</td>';
        } else {
          const strength=clamp(cell.strength,0,100);
          html+=`<td class="memory-cell" style="opacity:${0.18+0.82*strength/100}" title="целостность ${Math.round(strength)}%">${escapeHtml(fmt(deserializeComplex(cell.value)))}</td>`;
        }
      }
      html+='</tr>';
    }
    html+='</tbody></table>';
    wrap.innerHTML=html;
  }

  episodes.innerHTML=epList.length
    ? `<h3>Эпизодические воспоминания</h3>`+
      epList.slice(0,60).map(ep=>`
        <div class="episode" style="opacity:${0.25+0.75*ep.strength/100}">
          <span>${escapeHtml(ep.expression)} = ${escapeHtml(fmt(deserializeComplex(ep.value)))}</span>
          <span>${Math.round(ep.strength)}%</span>
        </div>`).join("")
    : "";
}

function renderObserver() {
  const box=$("observerLog");
  if (!box) return;

  box.innerHTML=observerLog.length
    ? observerLog.slice().reverse().map(e=>`
      <div class="${e.type || ""}">
        <time>${new Date(e.at).toLocaleTimeString("ru-RU",{hour12:false})}</time>
        — ${escapeHtml(e.message)}
      </div>`).join("")
    : "<div>Журнал пока пуст.</div>";
}

function renderBrainStatus() {
  const health=memoryHealth();
  const concepts=allConcepts();
  const [stage,desc]=stageInfo(health);

  $("brainHealth").textContent=`${Math.round(health)}%`;
  $("knownConcepts").textContent=String(concepts.length);
  $("brainState").textContent=concepts.length===0?"ПУСТ":stage.toUpperCase();
  $("stageName").textContent=stage;
  $("stageDescription").textContent=desc;

  const fill=$("healthFill");
  fill.style.width=`${health}%`;
  fill.style.background=health>60?"var(--good)":health>30?"var(--warn)":"var(--bad)";

  const left=Math.max(0,brain.nextDecayAt-Date.now());
  const sec=Math.ceil(left/1000);
  $("decayCountdown").textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`;
}

function renderAll() {
  renderConcepts();
  renderMemory();
  renderObserver();
  renderBrainStatus();
}

/* ------------------------- Main action ----------------------- */

async function calculate() {
  if (busy) return;

  const source=$("expression").value.trim();
  if (!source) return;

  busy=true;
  $("calculate").disabled=true;
  clearThinking();
  showProgress(false);
  setResult("ДУМАЮ...");

  try {
    think(`Получено выражение: ${source}`, "memory");

    let ast;
    try {
      ast=new Parser(tokenize(source)).parse();
      think("Синтаксис разобран. Начинаю идти по выражению изнутри наружу.", "memory");
    } catch (err) {
      think(`Я не смог разобрать запись: ${err.message}`, "bad");
      setResult(`<span class="answer" style="color:var(--bad)">Не понял запись.</span><br>${escapeHtml(err.message)}`);
      return;
    }

    const value=await evalNode(ast);

    if (!value.isFinite()) {
      think("Результат вышел за границы тех знаний, которые я умею представлять.", "bad");
      setResult(`<span class="answer" style="color:var(--bad)">не определено</span>`);
    } else {
      think(`Кажется, ответ у меня есть: ${fmt(value)}.`, "learn");
      setResult(`<span class="answer">${escapeHtml(source)} = ${escapeHtml(fmt(value))}</span>`);
      logObserver(`Решено выражение «${source}» → ${fmt(value)}.`,"memory");
    }

    renderAll();

  } finally {
    busy=false;
    $("calculate").disabled=false;
  }
}

/* -------------------------- Events --------------------------- */

document.querySelectorAll(".tabs button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab==="memory") renderMemory();
  });
});

$("calculate").addEventListener("click",calculate);
$("expression").addEventListener("keydown",e=>{
  if (e.key==="Enter") calculate();
});

document.querySelectorAll("[data-expr]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    $("expression").value=btn.dataset.expr;
    $("expression").focus();
  });
});

$("memoryConcept").addEventListener("change",e=>{
  selectedMemoryKey=e.target.value || null;
  renderMemory();
});

$("decayInterval").value=brain.decayMeanSec;
$("decayIntervalLabel").textContent=`${brain.decayMeanSec} с`;

$("decayInterval").addEventListener("input",e=>{
  $("decayIntervalLabel").textContent=`${e.target.value} с`;
});

$("decayInterval").addEventListener("change",e=>{
  brain.decayMeanSec=Number(e.target.value);
  scheduleNextDecay();
  saveBrain();
  logObserver(`Средний интервал между приступами изменён на ${brain.decayMeanSec} секунд.`,"memory");
  renderBrainStatus();
});

$("damageBrain").addEventListener("click",()=>damageSomeMemory(true));
$("resetBrain").addEventListener("click",fullLobotomy);

/* --------------------------- Boot ---------------------------- */

if (!observerLog.length) {
  logObserver("Создан новый пустой мозг. Математических понятий пока нет.","discover");
}

renderAll();

setInterval(()=>{
  if (Date.now()>=brain.nextDecayAt && !busy) {
    damageSomeMemory(false);
  } else {
    renderBrainStatus();
  }
},500);

})();
