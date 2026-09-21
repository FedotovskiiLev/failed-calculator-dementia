# Changelog

Notable repository milestones are tracked here.

## Unreleased

## 1.3.0

### Added

- Separate symbolic CAS subsystem under `js/cas/`.
- `simplify(expr)` with conservative algebraic simplification and simple like-term collection.
- `expand(expr)` for distributive polynomial expansion.
- `factor(expr, variable)` for supported integer linear/quadratic polynomial factorization.
- `subs(expr, variable, replacement)` for structural substitution.
- `gradient(expr, x, y, ...)` for symbolic partial-derivative vectors.
- `degree(expr, variable)` and `collect(expr, variable)` for polynomial inspection.
- `roots(expr, variable)` for first- and second-degree polynomial roots, including complex roots.
- Dedicated CAS regression tests and documentation.

### Architecture

- New expression AST/parser/algebra/command modules live independently of the legacy `app.js` monolith.
- Existing calculator input remains routed to the original dementia-aware numerical engine unless a CAS command is recognized.

## 1.2.0

### Added

- Session calculation history with one-click rerun and Arrow Up / Arrow Down input navigation.
- Local brain snapshot export/import covering mathematical memory, observer log, chart history, language, and calculation history.
- Plot PNG export and quick range presets.
- Complex-number inspection functions: `re(z)`, `im(z)`, `conj(z)`, and `arg(z)`.
- Modular browser feature layer under `js/`.

### Architecture

- `app.js` now emits stable result/run events for external feature modules.
- Feature code is separated from the mathematical runtime without adding npm, a bundler, or a backend.

### Engineering

- Added GitHub Actions CI.
- Added regression tests for parser behavior, numerical functions, complex roots,
  symbolic calculus, computation-budget recovery, and repository structure.
- Added architecture and contribution documentation.
- Added issue and pull-request templates.

## 1.1.1

### Fixed

- Local computation-budget exhaustion while deriving `e` now preserves the last
  meaningful approximation so surrounding expressions such as `e + 1` can continue.
- Even nth roots of negative real values now return a principal complex root rather
  than an incorrect purely imaginary shortcut.
- Interactive logarithms now use range reduction.
- Arctangent convergence around `x = 1` was improved.

### Project

- Added `.nojekyll` for GitHub Pages.
- Updated the visible build number to `1.1.1`.

## 1.1.0

- Baseline public version before the correctness and CI passes.
