export const COMMAND_CATALOG = [
  { name:"sqrt", template:"sqrt(x)", category:"functions", ru:"квадратный корень", en:"square root" },
  { name:"root", template:"root(x,n)", category:"functions", ru:"корень n-й степени", en:"nth root" },
  { name:"abs", template:"abs(x)", category:"functions", ru:"модуль", en:"absolute value" },
  { name:"re", template:"re(2+5i)", category:"complex", ru:"действительная часть", en:"real part" },
  { name:"im", template:"im(2+5i)", category:"complex", ru:"мнимая часть", en:"imaginary part" },
  { name:"conj", template:"conj(2+5i)", category:"complex", ru:"комплексное сопряжение", en:"complex conjugate" },
  { name:"arg", template:"arg(1+i)", category:"complex", ru:"аргумент комплексного числа", en:"complex argument" },

  { name:"sin", template:"sin(x)", category:"trigonometry", ru:"синус", en:"sine" },
  { name:"cos", template:"cos(x)", category:"trigonometry", ru:"косинус", en:"cosine" },
  { name:"tan", template:"tan(x)", category:"trigonometry", ru:"тангенс", en:"tangent" },
  { name:"asin", template:"asin(x)", category:"trigonometry", ru:"арксинус", en:"arcsine" },
  { name:"acos", template:"acos(x)", category:"trigonometry", ru:"арккосинус", en:"arccosine" },
  { name:"atan", template:"atan(x)", category:"trigonometry", ru:"арктангенс", en:"arctangent" },
  { name:"sinh", template:"sinh(x)", category:"trigonometry", ru:"гиперболический синус", en:"hyperbolic sine" },
  { name:"cosh", template:"cosh(x)", category:"trigonometry", ru:"гиперболический косинус", en:"hyperbolic cosine" },
  { name:"tanh", template:"tanh(x)", category:"trigonometry", ru:"гиперболический тангенс", en:"hyperbolic tangent" },

  { name:"ln", template:"ln(x)", category:"functions", ru:"натуральный логарифм", en:"natural logarithm" },
  { name:"log", template:"log(x,b)", category:"functions", ru:"логарифм по основанию b", en:"logarithm base b" },
  { name:"exp", template:"exp(x)", category:"functions", ru:"экспонента", en:"exponential" },

  { name:"diff", template:"diff(f(x),x)", category:"calculus", ru:"символическая производная", en:"symbolic derivative" },
  { name:"diff at point", template:"diff(f(x),x,a)", category:"calculus", ru:"производная в точке", en:"derivative at a point" },
  { name:"antiderivative", template:"antiderivative(f(x),x)", category:"calculus", ru:"первообразная", en:"antiderivative" },
  { name:"integrate", template:"integrate(f(x),x,a,b)", category:"calculus", ru:"определённый интеграл", en:"definite integral" },
  { name:"limit", template:"limit(f(x),x,a)", category:"calculus", ru:"предел", en:"limit" },

  { name:"sum", template:"sum(f(n),n,a,b)", category:"analysis", ru:"конечная сумма", en:"finite sum" },
  { name:"product", template:"product(f(n),n,a,b)", category:"analysis", ru:"конечное произведение", en:"finite product" },
  { name:"solve", template:"solve(f(x),x,a,b)", category:"analysis", ru:"найти корень на интервале", en:"find a root on an interval" },
  { name:"plot", template:"plot(f(x),x,-10,10)", category:"analysis", ru:"построить график", en:"plot a function" },

  { name:"gcd", template:"gcd(a,b)", category:"discrete", ru:"НОД", en:"greatest common divisor" },
  { name:"lcm", template:"lcm(a,b)", category:"discrete", ru:"НОК", en:"least common multiple" },
  { name:"ncr", template:"ncr(n,r)", category:"discrete", ru:"число сочетаний", en:"combinations" },
  { name:"npr", template:"npr(n,r)", category:"discrete", ru:"число размещений", en:"permutations" },

  { name:"simplify", template:"simplify(expr)", category:"cas", ru:"упростить выражение", en:"simplify expression" },
  { name:"expand", template:"expand(expr)", category:"cas", ru:"раскрыть скобки", en:"expand expression" },
  { name:"factor", template:"factor(expr,x)", category:"cas", ru:"факторизовать полином", en:"factor polynomial" },
  { name:"subs", template:"subs(expr,x,value)", category:"cas", ru:"подстановка", en:"substitution" },
  { name:"gradient", template:"gradient(expr,x,y)", category:"cas", ru:"градиент", en:"gradient" },
  { name:"degree", template:"degree(expr,x)", category:"cas", ru:"степень полинома", en:"polynomial degree" },
  { name:"collect", template:"collect(expr,x)", category:"cas", ru:"собрать по степеням", en:"collect by powers" },
  { name:"roots", template:"roots(expr,x)", category:"cas", ru:"корни полинома", en:"polynomial roots" }
];

function score(item, query) {
  query = query.toLowerCase().trim();
  if (!query) return 1;

  const hay = `${item.name} ${item.template} ${item.ru} ${item.en} ${item.category}`.toLowerCase();
  if (item.name.toLowerCase() === query) return 100;
  if (item.name.toLowerCase().startsWith(query)) return 80;
  if (item.template.toLowerCase().startsWith(query)) return 70;
  if (hay.includes(query)) return 50;

  let position = 0;
  for (const char of query) {
    position = hay.indexOf(char, position);
    if (position < 0) return 0;
    position++;
  }
  return 15;
}

export function searchCommands(query, limit = 8) {
  return COMMAND_CATALOG
    .map(item => ({ item, score: score(item, query) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map(entry => entry.item);
}

export function activeWord(source, caret = source.length) {
  const left = String(source).slice(0, caret);
  const match = left.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
  return match ? match[1] : "";
}
