# Visual Workbench

FAILED Calculator 1.9 reduces the need to remember syntax before calculation.

## Intent preview

While the user types, the workspace classifies the query as a calculation, function,
equation, matrix, data task, calculus task, or another known command family.

Relevant actions appear before calculation. For example, a function can immediately
offer Plot, Derivative, and Table.

## Visual tools

The top workspace toolbar now opens a Visual Tools dialog with three builders.

### Matrix builder

Choose a 2x2, 3x3, or 4x4 matrix, fill cells, select an operation, and run it without
writing bracket syntax manually.

Supported operations include determinant, inverse, transpose, rank, trace, and 2x2
eigenvalues.

### Linear-system builder

Choose 2-4 variables, fill the coefficient matrix and right-hand side, optionally
rename variables, and run the generated `linsolve(...)` query.

### Data builder

Paste numeric values separated by commas, spaces, or semicolons and run Summary, Mean,
or Linear Regression without manually constructing array syntax.

## Step-by-step pod

For algebraic expressions the result area can now expose a compact transformation
sequence: input, simplification, expansion, factorization, derivative, and roots when
those stages are available.

This is intended as a transparent transformation trace, not as a claim of a complete
formal proof for every expression.
