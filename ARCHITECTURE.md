# Architecture

FAILED Calculator is intentionally a static browser application. There is no backend,
package manager, bundler, framework, or build step.

The current runtime is centered around `app.js`. This document describes both the
current boundaries inside that file and the target module layout used for future
refactoring.

## Runtime model

The application has four broad layers:

1. **Expression language**
   - tokenization;
   - parsing into an AST;
   - implicit multiplication;
   - recognition of elementary and special calls.

2. **Mathematical engine**
   - learned integer arithmetic;
   - complex arithmetic;
   - constants and elementary functions;
   - numerical calculus and analysis;
   - symbolic differentiation and antiderivatives;
   - computation-budget protection.

3. **Cognitive state**
   - learned concepts and tables;
   - episodic memories;
   - dementia damage;
   - observer history;
   - session persistence.

4. **Browser UI**
   - calculator interaction;
   - thinking log;
   - memory visualization;
   - plotting;
   - cognitive charts;
   - language switching.

## State

The calculator intentionally stores its mathematical brain per browser tab/session.

- `sessionStorage`
  - mathematical memory;
  - observer log;
  - chart history.
- `localStorage`
  - language choice only.

There is no server-side state.

## Computation safety

A calculation runs inside a cooperative work budget.

Algorithms that have no meaningful partial answer allow
`ComputationBudgetExceeded` to reach the top-level safety handler.

Algorithms that already have a meaningful approximation may stop locally at the last
safe checkpoint and return that approximation to the surrounding expression. The
important example is the derivation of `e`: if the next factorial term becomes too
expensive, the current approximation is retained and an outer expression such as
`e + 1` can still finish.

The safety layer must never replace unfinished work with a hidden native calculator
answer.

## Numerical policy

JavaScript `Number` is the physical numeric substrate, but complete user expressions
must not be delegated to `eval()`, `Function()`, or another general-purpose calculator.

The project deliberately exposes its algorithms:

- integer addition: successor / predecessor;
- multiplication: repeated addition;
- division: repeated subtraction / long division;
- powers and factorials: repeated multiplication;
- `pi`: Nilakantha series;
- `e`: reciprocal-factorial series;
- roots: Newton iteration;
- trigonometric and exponential functions: explicit series;
- logarithms: range reduction plus an explicit convergent series;
- inverse trigonometry: identities plus arctangent series;
- integration: Simpson's rule;
- equation solving: bracketing and bisection.

## Test strategy

`tests/smoke.mjs` executes the actual internals from `app.js` in a small Node VM. It
does not contain a second implementation of the mathematical algorithms.

The smoke suite currently protects:

- parser precedence and implicit multiplication;
- `pi` and `e` approximations;
- logarithm range reduction;
- arctangent convergence near 1;
- complex nth roots of negative reals;
- local computation-budget bailout while deriving `e`.

GitHub Actions runs both:

```text
node --check app.js
node tests/smoke.mjs
```

on pushes to `main` and on pull requests.

## Target module layout

The monolithic `app.js` is being reduced incrementally. The intended target is:

```text
js/
  core/
    budget.js
    complex.js
    arithmetic.js
    numerics.js
  language/
    parser.js
    symbolic.js
  brain/
    state.js
    dementia.js
  ui/
    render.js
    plots.js
    events.js
  app.js
```

This is a direction, not a requirement to perform one giant rewrite.

Refactors should be small enough that the existing smoke tests can protect each
migration step.

## Refactoring rules

When extracting code from `app.js`:

1. preserve behavior first;
2. move one cohesive subsystem at a time;
3. do not mix mathematical behavior changes with mechanical file moves;
4. keep the static-site/no-build-step property;
5. run the smoke suite after every extraction;
6. add a regression test before fixing a newly discovered mathematical bug.

The repository should remain usable by opening it through any static HTTP server and
should continue to deploy directly on GitHub Pages.
