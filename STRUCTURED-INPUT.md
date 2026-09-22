# Structured Math Input

FAILED Calculator 2.0 makes Math Input an actual editing mode instead of only a
symbol toolbar.

## Autotransformations

When Math Input mode is open:

- `/` turns the selected text or preceding atom into a fraction template;
- `^` creates an exponent template;
- `Tab` moves to the next empty `□` slot;
- `Shift+Tab` moves to the previous slot.

Examples:

```text
x /
```

becomes conceptually

```text
 x
───
 □
```

and

```text
x ^
```

creates an exponent slot.

Calculation is blocked while any `□` slots remain unfilled.

## Structured preview

The preview below the raw query renders common structures in a more textbook-like
form:

- stacked fractions;
- superscripts;
- square roots;
- pi;
- visible unfilled slots.

The raw textual syntax is still the source of truth, preserving compatibility with
the existing parser and all older saved/shared queries.

## Input Interpretation

Every successful calculation now gets an Input Interpretation pod above the primary
answer. If friendly input rewrote the query, both the user's original request and the
formal command are visible.

## Result pod states

Related result pods now support:

- per-pod Copy;
- More / Less for secondary pods;
- a direct Steps control that opens the step-by-step transformation pod.

This follows the same usability principle as computational result systems with
independent pod states: the primary answer stays stable while related output can be
expanded or acted on separately.
