# Changelog

Notable repository milestones are tracked here.

## Unreleased

## 1.7.0

### Workspace UX

- Reordered the calculator around query → answer → follow-up actions.
- Moved the reasoning trace below the result and collapsed it by default.
- Collapsed the full syntax encyclopedia behind an explicit Reference control.
- Removed the learned-concept sidebar from the permanent calculator layout; it is now an on-demand panel.
- Made calculation history an on-demand panel instead of a permanent large card.
- Added six task starters for calculation, equations, plots, derivatives, matrices, and data.
- Added friendly input routing for common Russian/English task phrases and polynomial equations using `=`.
- Added `/` as a focus-the-query shortcut.
- Compacted the hero and calculator chrome on desktop and mobile.
- Added a visible “interpreted as” line whenever friendly input is translated to formal syntax.

### Fixed

- Removed an accidental duplicate `let drawing = false` declaration in the 1.6 multi-plot renderer.

## 1.6.0

- Function exploration and data analysis.
