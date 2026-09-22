# Wolfram-style usability pass

FAILED Calculator 1.8 focuses on the interaction patterns that make a computational
knowledge tool convenient rather than merely powerful.

## Result pods

A plain expression in one or more variables can now produce related result pods
automatically.

Depending on the expression, the workspace may show:

- simplified / expanded / factored forms;
- polynomial roots;
- a symbolic derivative;
- a small graph preview;
- sample values.

The original calculator result remains the primary answer. Pods add useful context
without requiring separate manual commands.

## Assumptions

When an expression contains variables, the result area shows which variable is being
treated as the main variable.

If multiple variables are present, the user can switch the main variable directly in
the assumptions bar. The choice is remembered for the tab.

## Math Input

The main query field now has an optional compact mathematical keypad.

It provides quick insertion for:

- pi, e, i;
- powers;
- square roots and fractions;
- absolute value;
- trigonometric and logarithmic functions;
- derivatives;
- integrals;
- sums;
- matrix literals.

A live preview converts common text notation to a more readable form and warns about
mismatched brackets.

## Shareable queries

Successful queries are written to the page URL as `?q=...`.

Opening such a link restores and runs the query. The workspace also provides a Share
button that copies the current query link.

## Design rule

FAILED Calculator should not require the user to know which internal engine handles a
task.

The UI should accept a question first, then expose interpretation, assumptions,
primary result, related pods, and optional reasoning.
