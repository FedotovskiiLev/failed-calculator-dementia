# Mathematical Workbench

FAILED Calculator 1.5 adds a separate workbench for linear algebra, vectors, systems,
Taylor series, and richer result presentation.

Ordinary expressions still run through the original dementia-aware calculator.
Workbench functionality is activated only by explicit commands.

## Matrices

```text
det([[1,2],[3,4]])
inverse([[1,2],[3,4]])
transpose([[1,2,3],[4,5,6]])
matmul([[1,2],[3,4]],[[5,6],[7,8]])
rank([[1,2],[2,4]])
trace([[1,2],[3,4]])
eigen2([[2,1],[1,2]])
```

Matrices use JSON-like bracket syntax.

## Vectors

```text
dot([1,2,3],[4,5,6])
cross([1,0,0],[0,1,0])
norm([3,4])
```

## Linear systems

```text
linsolve([[2,1],[1,-1]],[5,1],[x,y])
```

represents

```text
2x + y = 5
 x - y = 1
```

and returns named solutions.

## Taylor series

```text
taylor(sin(x),x,0,7)
taylor(exp(x),x,0,6)
```

Taylor coefficients come from repeated symbolic differentiation plus an explicit
quiet numerical evaluator. The numerical helper uses local series/Newton algorithms
rather than dispatching the whole expression to `eval()` or a general-purpose CAS.

## Plot interaction

The existing function plot now supports:

- mouse-wheel zoom;
- drag-to-pan along the x-axis;
- x-coordinate readout under the cursor.

The original plotting engine still performs the actual function evaluation.
