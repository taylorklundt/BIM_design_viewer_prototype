# ADR 0001
# Choose React + TypeScript + Vite + Tailwind

## Status
Accepted

## Context
This project needs to quickly produce a highly modular front-end prototype with strong layout fidelity, low setup friction, and good maintainability. The current phase is primarily UI chrome and documentation, not backend or full application architecture.

## Decision
Use:
- React
- TypeScript
- Vite
- Tailwind CSS

## Rationale

### React
Well-suited for decomposing the viewer chrome into small independent components.

### TypeScript
Improves maintainability and future integration safety, especially when introducing a viewer adapter contract.

### Vite
Fast local startup and iteration, ideal for prototyping.

### Tailwind CSS
Speeds layout and UI shell work while keeping styling close to components.

## Consequences

### Positive
- fast iteration
- easy component decomposition
- good support for AI-assisted code generation
- straightforward typing for future viewer contract

### Negative
- Tailwind utility usage must remain disciplined
- if the broader product later standardizes on another app shell, migration may be needed

## Notes
This decision can be revisited if a stronger requirement emerges during integration with the existing 3D viewer repo.
