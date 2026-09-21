# Contributing

FAILED Calculator is a deliberately unusual calculator, but changes to it should still
be easy to review and reproduce.

## Project constraints

Please preserve these properties unless a change explicitly discusses replacing one:

- static browser application;
- no backend;
- no framework;
- no package manager requirement;
- no bundler or build step;
- GitHub Pages compatible;
- mathematical procedures remain visible rather than being replaced by hidden native
  calculator calls.

## Before changing mathematical behavior

Add or extend a regression check in `tests/smoke.mjs` whenever practical.

Particularly important areas are:

- parser precedence;
- computation-budget handling;
- complex roots;
- logarithm range reduction;
- inverse trigonometry;
- symbolic rules;
- integration and root finding.

## Basic validation

The CI workflow runs:

```text
node --check app.js
node tests/smoke.mjs
```

If Node.js is available locally, run the same two commands before committing.

No `npm install` step is required.

## Commit scope

Prefer small commits with one purpose.

Good examples:

```text
fix: preserve partial math results under computation limits
test: add smoke tests and GitHub Actions CI
refactor: extract expression parser
fix: handle removable singularity in numerical limit
docs: document runtime architecture
```

Avoid mixing a large mechanical refactor with unrelated numerical changes. A bug
introduced by a file move should be distinguishable from a bug introduced by changing
an algorithm.

## Mathematical changes

Do not silently replace an explicit algorithm with `Math.*` merely to improve the
answer.

Using native JavaScript numbers as storage is expected. Using native functions in
tests to obtain reference values is also fine.

The runtime itself should continue to derive the answer through the project's explicit
procedures.

## UI changes

Keep both Russian and English interfaces working.

When adding an interactive control:

- provide an accessible name;
- ensure it is keyboard usable;
- preserve the current dark interface unless the change intentionally redesigns it;
- do not make the calculator dependent on JavaScript libraries or external services.

## Dementia behavior

Memory damage is part of the application model, not only a visual effect.

Changes to concepts, tables, episodic memory, or reconstruction should preserve the
distinction between:

- internal mathematical memory;
- observer history outside the brain;
- language preference outside the mathematical brain.
