const COMMAND_GROUPS = {
  algebra: new Set(["simplify","expand","factor","subs","gradient","degree","collect","roots"]),
  calculus: new Set(["diff","antiderivative","integrate","limit","taylor"]),
  plot: new Set(["plot","multiplot","table"]),
  matrix: new Set(["det","inverse","transpose","matmul","rank","trace","eigen2","linsolve"]),
  data: new Set(["mean","median","variance","stdev","quantile","summary","linreg"]),
  numerical: new Set(["nsolve","minimize"]),
  discrete: new Set(["gcd","lcm","ncr","npr","sum","product"])
};

function firstCommand(source) {
  return String(source).trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(/)?.[1]?.toLowerCase() || null;
}

function firstVariable(source) {
  const names = String(source).match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
  const ignored = new Set([
    "pi","e","i","sin","cos","tan","asin","acos","atan","sinh","cosh","tanh",
    "sqrt","abs","ln","log","exp","diff","integrate","limit","plot","sum","product"
  ]);
  return names.find(name => !ignored.has(name.toLowerCase())) || null;
}

export function detectIntent(source) {
  source = String(source || "").trim();
  if (!source) return { type:"empty", confidence:1, variable:null };

  const command = firstCommand(source);

  if (command) {
    for (const [type, commands] of Object.entries(COMMAND_GROUPS)) {
      if (commands.has(command)) {
        return { type, command, confidence:1, variable:firstVariable(source) };
      }
    }
  }

  if (/=/.test(source) && !/==/.test(source)) {
    return {
      type:"equation",
      confidence:.98,
      variable:firstVariable(source) || "x"
    };
  }

  if (/^\s*\[\s*\[/.test(source)) {
    return { type:"matrix", confidence:.95, variable:null };
  }

  if (/^\s*\[[^\[]/.test(source)) {
    return { type:"data", confidence:.85, variable:null };
  }

  const variable = firstVariable(source);

  if (variable) {
    return {
      type:"function",
      confidence:.82,
      variable
    };
  }

  return {
    type:"calculation",
    confidence:.9,
    variable:null
  };
}

export function suggestedActions(source) {
  const intent = detectIntent(source);
  const variable = intent.variable || "x";

  if (intent.type === "equation") {
    return [
      { key:"solve", ru:"РЕШИТЬ", en:"SOLVE", template:null },
      { key:"plot", ru:"ГРАФИК", en:"PLOT", template:`plot(${source.replace(/=.*/, "")},${variable},-10,10)` }
    ];
  }

  if (intent.type === "function") {
    return [
      { key:"plot", ru:"ГРАФИК", en:"PLOT", template:`plot(${source},${variable},-10,10)` },
      { key:"diff", ru:"ПРОИЗВОДНАЯ", en:"DERIVATIVE", template:`diff(${source},${variable})` },
      { key:"table", ru:"ТАБЛИЦА", en:"TABLE", template:`table(${source},${variable},-5,5,1)` }
    ];
  }

  if (intent.type === "matrix") {
    return [
      { key:"det", ru:"ОПРЕДЕЛИТЕЛЬ", en:"DETERMINANT", template:`det(${source})` },
      { key:"inverse", ru:"ОБРАТНАЯ", en:"INVERSE", template:`inverse(${source})` },
      { key:"rank", ru:"РАНГ", en:"RANK", template:`rank(${source})` }
    ];
  }

  if (intent.type === "data") {
    return [
      { key:"summary", ru:"СВОДКА", en:"SUMMARY", template:`summary(${source})` },
      { key:"mean", ru:"СРЕДНЕЕ", en:"MEAN", template:`mean(${source})` },
      { key:"median", ru:"МЕДИАНА", en:"MEDIAN", template:`median(${source})` }
    ];
  }

  return [];
}
