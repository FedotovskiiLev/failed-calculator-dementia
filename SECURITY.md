# Security

FAILED Calculator is a static browser-only project with no backend and no account system.

## Reporting a security issue

Please avoid publishing a working exploit in a public issue before the problem can be
understood.

For ordinary bugs that do not expose users or data, use the repository's bug-report
template.

## Security boundaries

The application intentionally:

- does not send mathematical memory to a server;
- stores mathematical state in `sessionStorage`;
- stores only the language preference in `localStorage`;
- does not execute user expressions through JavaScript `eval()`;
- does not require third-party runtime scripts.

The GitHub Pages deployment should remain usable without a backend or secrets.

## Out of scope

The calculator is not intended to be a security sandbox for arbitrary JavaScript.
Its expression language must remain a restricted mathematical grammar rather than an
interface for executing source code.
