# FAILED Calculator — dementia build

[**English**](README.md) · [Русский](README.ru.md)

> A calculator that does not *know* mathematics.  
> It discovers it, builds memories, becomes educated — and then slowly forgets everything.

**Live demo:** add your GitHub Pages URL here after publishing.

## What is this?

FAILED Calculator is a deliberately overengineered static web experiment.

A new browser session starts with an empty mathematical brain. The calculator does not present a fixed menu of operations to the user: you simply type an expression such as:

```text
2 + 2
7 * 8
2 + 5i
sqrt(-1)
sin(pi/2)
(2+3i)*(4-i)
12!
```

When it encounters something it has never seen before, it reacts to the discovery, pauses, tries to understand it, and creates a new internal memory.

Small integer operations are stored as literal result tables. Complex, fractional, functional, or otherwise unusual cases are stored as episodic memories.

Then dementia starts.

## Dementia model

Forgetting is progressive rather than a single reset timer.

During a memory-loss episode the calculator may:

- weaken its confidence in a mathematical concept;
- damage random cells in an addition/multiplication/etc. table;
- completely lose individual table cells;
- forget episodic examples;
- eventually forget the meaning of an operation itself.

A weak memory is visible in the **Memory** tab: damaged cells fade and deleted cells become holes.

If a half-forgotten operation appears again, the calculator may recognize it vaguely and reconstruct it. If the concept is completely gone, it experiences the discovery again.

The **Observer Log** lives outside the calculator's brain, so it survives memory loss and records the whole cycle.

## Supported expression syntax

The parser is intentionally calculator-like and does **not** use JavaScript `eval()`.

Supported:

```text
+  -  *  /  %  ^  !
( )
implicit multiplication: 2i, 2pi, 2(3+4)
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

Complex arithmetic is supported. `2+5i` is not treated as invalid input — the calculator has an existential crisis about the imaginary unit and then continues.

## Privacy / state

There is no backend.

The brain is stored in browser `sessionStorage`, which means:

- each new visitor starts with an empty calculator;
- a reload in the same browser tab keeps the current brain;
- visitors do not share memories with one another;
- GitHub Pages is enough to host the whole project.

## Project structure

```text
index.html
style.css
app.js
README.md
README.ru.md
.nojekyll
```

No framework, build step, package manager, database, or server is required.

## Run locally

You can open `index.html` directly, or run a tiny local static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy to GitHub Pages

Create a repository such as:

```text
failed-calculator
```

Upload the files from this project into the repository root.

Then open:

```text
Settings → Pages → Deploy from a branch → main → / (root)
```

For a repository named `failed-calculator`, the site will normally be available at:

```text
https://YOUR_USERNAME.github.io/failed-calculator/
```

## Why?

Because implementing `2 + 2` with a gradually degrading synthetic memory is clearly better than using `+`.
