# Tests

The project intentionally has no npm dependency tree.

Run the smoke suite directly with Node.js:

```text
node tests/smoke.mjs
```

Check the production JavaScript syntax with:

```text
node --check app.js
```

## How the smoke test works

The test reads the real `app.js`, evaluates the mathematical portion in a small Node
`vm` context, and exposes selected internals only inside that temporary test runtime.

This avoids maintaining a second copy of the calculator implementation.

The browser boot code is not executed by the smoke test.

## Covered regressions

Current checks include:

- implicit multiplication parsing;
- unary-minus / power precedence;
- approximations of `pi` and `e`;
- logarithms across large ranges;
- `atan(1)` and `atan(-1)`;
- principal complex roots for negative real inputs;
- preservation of the partial `e` approximation when the next factorial term exceeds
  the computation budget.

When a mathematical bug is found, add a minimal regression case here before or
together with the fix.
