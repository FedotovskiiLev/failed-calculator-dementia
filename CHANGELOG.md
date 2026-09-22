# Changelog

Notable repository milestones are tracked here.

## Unreleased

## 1.5.0

### Mathematical Workbench

- Added matrix determinant, inverse, transpose, multiplication, rank, and trace.
- Added 2×2 eigenvalue calculation.
- Added vector dot product, cross product, and norm.
- Added Gaussian-elimination linear-system solving with named variables.
- Added Taylor-series generation using the existing symbolic derivative engine plus an explicit numerical coefficient evaluator.
- Added structured matrix/vector/system result cards.
- Added interactive x-axis plot zoom, pan, and cursor-coordinate readout.
- Added Workbench commands to autocomplete and the Ctrl/Cmd+K command palette.
- Added Taylor as a contextual follow-up action for expressions in `x`.

### Architecture

- Workbench code lives in `js/workbench/`; ordinary expressions still use the dementia-aware runtime.
- Linear algebra, numerical coefficient evaluation, command parsing, result rendering, and plot interaction are separated into focused modules.

## 1.4.0

### UX

- Added searchable autocomplete for mathematical functions and CAS commands.
- Added a Ctrl/Cmd+K command palette with descriptions and ready-to-edit templates.
- Added context-sensitive result actions for simplification, derivatives, plots, expansion, factorization, and polynomial roots.
- Added friendly syntax diagnostics for common input mistakes.
- Added a compact/expanded reasoning-trace toggle; compact mode is the default.
- Added a persistent dementia on/off switch.

### Dementia controls

- When dementia is paused, automatic decay is continuously rescheduled before it can fire.
- Manual brain-damage controls are disabled while dementia is paused.
- Existing learned memory is preserved and normal decay resumes when the switch is turned back on.
- Dementia and reasoning-view preferences are included in exported brain snapshots.

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
