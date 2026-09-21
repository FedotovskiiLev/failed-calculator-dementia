# FAILED Calculator

[**English**](README.md) · [Русский](README.ru.md)

> A calculator that starts without mathematics, discovers it while solving problems, builds memory, and then gradually forgets what it learned.

FAILED Calculator is a browser-only mathematical experiment inspired by the exploratory feel of graphing systems and computer-algebra tools, but with one intentionally terrible property: **dementia**.

The project treats mathematics as knowledge the calculator has to acquire. The first time it encounters an operation, function, constant, or calculus idea, it reacts to the discovery, constructs a procedure, stores what it learned, and becomes faster on familiar work. Memory damage then weakens or removes parts of that knowledge.

## Highlights

- full Russian / English UI;
- full-screen language choice on the first visit;
- free-form mathematical input rather than a fixed operation selector;
- complex numbers such as `2+5i`, including `re`, `im`, `conj`, and `arg`;
- explicit learned tables for small integer arithmetic;
- step-by-step algorithms for constants and elementary functions;
- symbolic differentiation for a useful subset of elementary expressions;
- symbolic antiderivatives for common forms;
- numerical definite integration and limits;
- finite sums and products;
- equation root finding by interval search and bisection;
- mathematical function plotting;
- separate charts for the calculator's cognitive history;
- progressive memory degradation rather than a single hard reset;
- per-tab brain state stored in `sessionStorage`;
- calculation history with one-click reruns and keyboard navigation;
- brain snapshot export/import for moving or preserving a session;
- plot PNG export and range presets;
- no framework, backend, package manager, or build step.

## Expression language

### Arithmetic

```text
a+b
a-b
a*b
a/b
a%b
a^b
n!
2(3+4)
```

Implicit multiplication is supported in forms such as `2i`, `2pi`, and `2(x+1)`.

### Constants and complex numbers

```text
pi
e
i
2+5i
(2+3i)*(4-i)
```

### Elementary functions

```text
sqrt(x)
root(x,n)
abs(x)
re(z)
im(z)
conj(z)
arg(z)

sin(x)
cos(x)
tan(x)

asin(x)
acos(x)
atan(x)

sinh(x)
cosh(x)
tanh(x)

ln(x)
log(x)
log(x,b)
exp(x)
```

### Calculus

Symbolic derivative:

```text
diff(x^3 + sin(x), x)
```

Derivative at a point:

```text
diff(x^3 + sin(x), x, 2)
```

Symbolic antiderivative for supported forms:

```text
antiderivative(x^3 + sin(x), x)
```

Definite integral:

```text
integrate(sin(x), x, 0, pi)
```

Limit:

```text
limit(sin(x)/x, x, 0)
```

### Discrete analysis and equation solving

```text
sum(1/n^2, n, 1, 100)
product(n, n, 1, 8)

solve(x^2-2, x, 0, 2)

gcd(84,30)
lcm(12,18)
ncr(10,3)
npr(10,3)
min(5,8)
max(5,8)
```

### Graphs

Explicit plot command:

```text
plot(sin(x)+x/4, x, -10, 10)
```

A free expression containing exactly one variable is also treated as a function and plotted automatically:

```text
sin(x)+x/4
```

The **Graphs** tab contains both the mathematical plotter and the external observer's charts of memory health, stored knowledge, concept count, and dementia episodes.

## Session tools

Build 1.2.0 adds a browser-side feature layer without introducing a framework or backend.

- successful and failed calculation attempts appear in a compact session history;
- click a history entry to restore and rerun the expression;
- use Arrow Up / Arrow Down in the expression field to walk through recent input;
- export the current mathematical brain, observer log, chart history, language, and expression history to a JSON snapshot;
- import a snapshot later to restore that session state;
- export the current mathematical plot as PNG;
- use quick plot-range presets such as `[-pi, pi]` and `[0, 2pi]`.

Snapshots are local files. The application still has no backend and does not upload the brain anywhere.

## How the mathematical engine works

The browser's `Number` type is still the physical substrate, but the evaluator does not hand complete expressions to `eval()` or a hidden general-purpose calculator.

The intended model is deliberately inefficient:

- integer addition uses successor/predecessor stepping;
- multiplication is derived from repeated addition;
- division uses repeated subtraction / long division;
- powers and factorials are derived from multiplication;
- `pi` is approximated with the Nilakantha series;
- `e` is built from reciprocal factorials;
- square and nth roots use Newton iterations;
- `sin`, `cos`, and `exp` use series;
- logarithms use an explicit convergent series with range reduction;
- inverse trigonometric functions use identities and an arctangent series;
- definite integration uses Simpson's rule;
- limits are approached from both sides;
- equation solving uses bracketing and bisection;
- plotting samples the learned evaluator across an interval.

Inside calculus and plotting, the UI suppresses repetitive inner-monologue spam while still using the same explicit numerical procedures.

## Symbolic mathematics

FAILED Calculator includes a small symbolic layer.

Differentiation currently understands common combinations of:

- constants and variables;
- sums and differences;
- products and quotients;
- powers;
- `sin`, `cos`, `tan`;
- `sinh`, `cosh`, `tanh`;
- `exp`, `ln`, `log`, `sqrt`.

The antiderivative engine intentionally has a smaller rulebook. It recognizes common polynomial forms, sums, constant multiples, `1/x`, `sin(x)`, `cos(x)`, and `exp(x)`.

When a symbolic closed form is outside the current rulebook, the calculator says so instead of fabricating one.

## Dementia model

Forgetting is progressive.

A dementia episode may:

- reduce confidence in a concept;
- weaken random table cells;
- delete individual arithmetic memories;
- erase episodic function results;
- eventually erase the concept itself.

A weak concept may be vaguely recognized and reconstructed later. A fully lost concept is experienced as a new mathematical discovery again.

The **Observer Log** lives outside the brain, so it survives memory loss.

## Computation safety

The project is intentionally inefficient, but it should not freeze a browser tab indefinitely.

Every expression runs inside a cooperative work budget. Expensive algorithms record their latest meaningful checkpoint. If the next step would require unreasonable tight-loop work, the current computation stops, everything learned so far is preserved, and the UI reports the best partial result reached.

The safety system is not a fallback calculator: unfinished work is never replaced with a hidden native answer.

When an individual iterative subroutine already has a meaningful numerical approximation, it can stop locally at the last safe checkpoint and return that approximation to the surrounding expression. For example, if the next factorial term while deriving `e` becomes too expensive, the calculator keeps the approximation it actually derived and can still finish an outer expression such as `e + 1`.

## State and privacy

There is no backend.

- mathematical memory: `sessionStorage`;
- observer history: `sessionStorage`;
- cognitive chart history: `sessionStorage`;
- language choice: `localStorage`.

A new browser session starts with a fresh mathematical brain. Different visitors do not share memories.

## Project structure

```text
index.html
style.css
features.css
app.js
js/
  features.js
  history.js
  brain-transfer.js
  plot-tools.js
  ui-utils.js
tests/
.github/
README.md
README.ru.md
.nojekyll
```

## Local development

Any static HTTP server is enough:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Scope

FAILED Calculator is not a complete computer algebra system. The direction is deliberately closer to a **Wolfram/Desmos-like playground with a deteriorating learned memory** than to a conventional calculator: more notation, more symbolic rules, more numerical methods, richer plots, and increasingly strange behavior as knowledge decays.
