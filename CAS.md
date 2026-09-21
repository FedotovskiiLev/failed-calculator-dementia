# Symbolic CAS commands

FAILED Calculator 1.3 adds a separate symbolic algebra layer under `js/cas/`.

These commands are intercepted before the ordinary numerical evaluator. Existing
calculator expressions continue to use the original learned/dementia-aware engine.

## Commands

### Simplify

```text
simplify(x+x+2x+0)
```

Performs conservative algebraic simplification and combines simple like terms.

### Expand

```text
expand((x+1)^3)
```

Uses repeated multiplication and distributivity. Integer powers up to 8 are expanded.

### Factor

```text
factor(x^2-5x+6,x)
```

Factors supported one-variable polynomials. The current implementation handles
integer linear/quadratic factors and common integer coefficient factors.

### Substitute

```text
subs(x^2+y,x,3)
```

Performs structural substitution and simplifies the result.

### Gradient

```text
gradient(x^2+y^2,x,y)
```

Builds a vector of symbolic partial derivatives.

### Degree

```text
degree(3x^4+2x,x)
```

Returns the polynomial degree in the requested variable.

### Collect

```text
collect((x+1)^3,x)
```

Expands and rebuilds an expression ordered by powers of the selected variable.

### Roots

```text
roots(x^2-5x+6,x)
```

Solves supported first- and second-degree polynomials, including complex roots for a
negative discriminant.

## Deliberate limitations

The CAS layer is intentionally conservative. It does not pretend that every expression
has been simplified or factored when no rule is known.

Future work should extend the same AST rather than replacing it with string rewriting.
