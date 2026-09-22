# Workspace UX

FAILED Calculator 1.7 changes the calculator from a documentation-first screen into a
query-first mathematical workspace.

## Main flow

The primary screen is now intentionally ordered as:

1. query;
2. answer;
3. follow-up actions;
4. optional reasoning trace;
5. optional syntax reference.

The mathematical memory sidebar and calculation history are still available, but they
no longer occupy permanent space beside every calculation.

## Friendly input

A small router recognizes several common ways people naturally phrase tasks.

Examples:

```text
x^2 - 5x + 6 = 0
sin x
производная x^3 + sin(x)
график sin(x)
упрости x+x+0
```

These are translated into the project's public command language before the existing
legacy/CAS/Workbench handlers run.

The translated command is shown to the user so the behavior is visible rather than
hidden.

## Task starters

The calculator surface contains six compact starters:

- calculate;
- solve equation;
- plot;
- derivative;
- matrix;
- data.

They populate the main input instead of navigating to another mode.

## Progressive disclosure

The following sections are hidden until they are useful:

- full syntax reference;
- learned-concept panel;
- session history;
- full reasoning trace.

This keeps the experiment's internal brain visible without forcing it into the main
path for every calculation.

## Keyboard

Existing shortcuts remain available:

- `Ctrl/Cmd+K`: command palette;
- `Ctrl/Cmd+Enter`: calculate;
- `Ctrl/Cmd+L`: select query;
- `/`: focus the query field when not already typing.
