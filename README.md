# FAILED Calculator — dementia build

[**English**](README.md) · [Русский](README.ru.md)

> A calculator that begins with no mathematics, discovers rules by using them, builds its own tables and procedures, and then gradually forgets what it learned.

FAILED Calculator is a deliberately overengineered browser experiment about learning, memory, and computational absurdity. It is not designed to be the fastest calculator possible. The entire point is that the calculator has to acquire mathematical knowledge before it can use it reliably.

## What it does

A fresh browser session starts with an empty mathematical brain. There is no operation picker: the user writes an expression directly.

```text
2 + 2
7 * 8
2 + 5i
sqrt(-1)
sin(pi/2)
(2+3i)*(4-i)
12!
```

The first encounter with an unfamiliar concept is intentionally slow and visible. The calculator reacts, forms a hypothesis about the operation, constructs a rule, and stores the resulting knowledge.

Small integer arithmetic is learned as explicit tables. More general cases are handled by learned procedures and episodic memories. Repeating something that is already well remembered is faster than learning it for the first time.

Then memory starts to decay.

## Progressive dementia

Memory loss is gradual rather than a single periodic reset.

A decay episode can:

- weaken confidence in a mathematical concept;
- damage individual cells in learned arithmetic tables;
- completely erase some table cells;
- weaken or remove episodic examples;
- eventually erase the concept of an operation itself.

The **Memory** view exposes that process directly. Healthy cells remain bright, damaged cells fade, and forgotten cells become holes.

A partially forgotten operation can be reconstructed when it appears again. A completely forgotten operation is experienced as a new discovery.

The external **Observer Log** and **Charts** are deliberately outside the calculator's brain, so they survive its memory loss and show the full learning/decay cycle.

## Mathematics model

The expression evaluator does not use `eval()` and does not simply map parsed expressions to native transcendental functions.

The project intentionally derives results through learned methods:

| Concept | Method |
| --- | --- |
| Addition | successor / predecessor recurrence and explicit tables |
| Subtraction | inverse addition |
| Multiplication | repeated addition and learned tables |
| Division | repeated subtraction / long-division style reconstruction |
| Remainder | repeated subtraction |
| Integer powers | repeated multiplication |
| Factorial | repeated multiplication |
| Square root | Newton iteration |
| `exp` | Taylor series |
| `sin`, `cos` | Taylor series |
| `tan` | learned sine/cosine plus division |
| `ln` | logarithmic series |
| `pi` | Nilakantha-series approximation |
| `e` | reciprocal-factorial series |
| Complex arithmetic | decomposition into learned real operations |

JavaScript numbers still provide the browser's lowest-level numeric substrate. The important distinction is architectural: the evaluator does not have a hidden "just calculate the requested expression" path. New mathematical behaviour is routed through explicit learning procedures, stored knowledge, and visible derivations.

## Supported syntax

```text
+  -  *  /  %  ^  !
( )

2i
2pi
2(3+4)

pi
e
i

sqrt(x)
abs(x)
sin(x)
cos(x)
tan(x)
ln(x)
log(x)
exp(x)
```

Complex numbers are first-class input. `2+5i` is not treated as malformed input: the calculator has to discover the imaginary unit and expand its number model.

The system is intentionally finite. Some domains, especially general complex logarithms and arbitrary non-integer powers, are outside the current model and are reported as boundaries of its mathematical knowledge rather than silently delegated to a native math engine.

## Bilingual interface

The full interface is available in Russian and English. The language switch affects static UI, dynamic internal monologue, memory descriptions, dementia messages, and observer output.

The selected interface language is kept in `localStorage`. Mathematical memory itself remains session-scoped.

## State model

The calculator brain lives in `sessionStorage`.

That gives the project the intended behaviour:

- a new visitor starts with an empty brain;
- a reload in the same tab keeps the current brain;
- different visitors do not share mathematical memories;
- closing the browser session discards that calculator's personality;
- observer statistics are local to the same session and never leave the browser.

There is no backend, account system, analytics service, or network API.

## Charts

The Charts section records the calculator's cognitive history over time:

- memory integrity;
- amount of stored knowledge;
- number of known concepts;
- cumulative dementia episodes.

Charts are rendered directly to `<canvas>` without a charting dependency.

## Project structure

```text
index.html       UI structure
style.css        workstation-style interface
app.js           parser, learning engine, memory, dementia, charts, i18n
README.md        English documentation
README.ru.md     Russian documentation
.nojekyll        static-host compatibility marker
```

The project intentionally has no framework, package manager, build step, database, or runtime dependency.

## Local development

Any static file server is enough. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

For quick syntax validation of the JavaScript:

```bash
node --check app.js
```

## Design principles

1. **Learning must be visible.** New mathematics should take noticeable time and produce an internal monologue.
2. **Memory must be inspectable.** Learned tables and damaged cells are part of the UI, not hidden implementation details.
3. **Forgetting must have consequences.** Dementia changes future computation rather than merely changing a progress bar.
4. **No fake complex-number rejection.** Strange input should trigger discovery when it is inside the supported mathematical model.
5. **No hidden instant-calculator path.** The evaluator should prefer learned tables, derivations, and explicit numerical methods.
6. **The joke should remain technically interesting.** The absurdity works better when the underlying system is real.

## Known limitations

- The model is an educational/artistic simulation of mathematical learning, not a computer algebra system.
- JavaScript floating-point limitations still apply to approximate real-valued calculations.
- General symbolic algebra is not implemented.
- General complex logarithms and arbitrary complex powers are intentionally incomplete.
- Large learned tables are capped to keep the browser responsive; larger cases become algorithmic/episodic knowledge instead.
- The dementia model is fictional software behaviour and is not intended as a medical model of human dementia.

## Contributing

Issues and pull requests are welcome. Useful directions include new derivation strategies, better memory-decay behaviour, additional mathematical concepts, accessibility improvements, parser tests, and better visualization of learned knowledge.

When adding a mathematical feature, prefer an explicit derivation or learning process over a direct native-function shortcut.
