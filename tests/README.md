# Tests

FAILED Calculator intentionally has no npm dependency tree.

## Run everything

```text
node --test tests/*.test.mjs
```

Check production JavaScript syntax separately with:

```text
node --check app.js
```

## Test layout

- `runtime-harness.mjs`
  - loads the real `app.js` into a small Node VM;
  - exposes selected internals only inside the test runtime;
  - does not maintain a second calculator implementation.
- `parser.test.mjs`
  - grammar, precedence, implicit multiplication, variables.
- `numerics.test.mjs`
  - constants, logs, atan, roots, factorial/combinatorics, budget recovery.
- `symbolic.test.mjs`
  - derivatives, antiderivatives, simplification, symbolic evaluation.
- `static.test.mjs`
  - DOM-id integrity, duplicate ids, build-version consistency, no `eval()` path.

## Philosophy

Regression tests should use the same implementation that ships in the browser.

Native `Math.*` calls are acceptable in tests as reference values. They should not
replace the explicit runtime algorithms in production code.

When a mathematical bug is found, add the smallest test that reproduces it before or
together with the fix.
