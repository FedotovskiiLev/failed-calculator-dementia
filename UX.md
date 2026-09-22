# UX layer

FAILED Calculator should be powerful without requiring users to memorize its syntax.

## Command discovery

Press `Ctrl+K` / `Cmd+K` to open the command palette.

The palette searches function names, templates, categories, and Russian/English
descriptions.

Typing a function prefix directly into the calculator also opens inline autocomplete.
Use Arrow Up / Arrow Down to move and Tab to insert a suggestion.

## Result actions

After a calculation, the interface can offer relevant follow-up actions.

For an expression containing `x`, this may include:

- derivative;
- plot;
- simplify;
- expand;
- factor;
- polynomial roots.

These actions rewrite the expression using the public calculator syntax and run it
through the normal engine/CAS layer.

## Dementia switch

The Dementia tab contains a persistent enable/disable switch.

When disabled:

- automatic memory decay is kept scheduled in the future so it never fires;
- the manual damage button is disabled;
- the current learned brain is preserved;
- full lobotomy/reset remains available separately.

Re-enabling dementia restores ordinary scheduling from that moment.

## Reasoning trace

The internal monologue remains available, but compact mode is the default so the
answer and controls occupy more of the page. It can be expanded with one button.

## Snapshots

Brain JSON snapshots include the dementia switch and reasoning-trace preference in
addition to the mathematical state and session history.
