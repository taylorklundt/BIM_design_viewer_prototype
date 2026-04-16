# Merge-to-Main Test Gate

Tests run **once, when merging to main** — not on every push.
Pushing to a feature branch is unrestricted.

---

## For the LLM agent (Claude / any AI agent)

Before running `gh pr merge` (or any equivalent merge-to-main command):

1. Identify which files changed on this branch vs `main`:
   ```
   git diff --name-only origin/main...HEAD
   ```

2. Map changed paths to test suites using the table below.

3. Run the targeted tests. `regression.spec.js` always runs as a smoke baseline.

4. **If all pass** → proceed with the merge.

5. **If any fail**:
   - Attempt to auto-fix once.
   - Re-run the same targeted tests.
   - If now passing → **stop and ask the user to verify the app before merging**. Do not merge until confirmed.
   - If still failing → **stop, do not merge, report which tests are failing, ask the user to intervene.**

---

## Feature → Test suite mapping

| Changed path | Tests to run |
|---|---|
| `src/chrome/features/left-toolbar/` | `evals/tests/left-sidebar.spec.js` |
| `src/chrome/features/items-panel/` | `evals/tests/chrome-object-tree.spec.js` |
| `src/chrome/features/search-sets/` | `evals/tests/chrome-search-sets-panel.spec.js` + `evals/tests/search-sets.spec.js` |
| `src/chrome/features/viewer-adapter/` | `evals/tests/chrome-compatibility.spec.js` |
| `src/chrome/` (any other) | `evals/tests/chrome-ifc-loading.spec.js` + `evals/tests/chrome-compatibility.spec.js` |
| `src/features/Selection.js` | `evals/tests/selection.spec.js` |
| `src/features/SearchSets.js` | `evals/tests/search-sets.spec.js` |
| `src/features/` or `src/services/` (any) | `evals/tests/ifc-loading.spec.js` |
| `src/core/`, `demo/`, `vite.config.js`, `src/index.*` | `npm test` (full suite — cross-cutting change) |
| Docs, config, `.githooks/` only | `evals/tests/regression.spec.js` (smoke only) |

`evals/tests/regression.spec.js` is always included regardless of what changed.

---

## For humans

Run the targeted tests manually before merging:

```sh
# Identify changed files
git diff --name-only origin/main...HEAD

# Run smoke baseline (always)
npx playwright test evals/tests/regression.spec.js

# Add feature-specific suites from the table above as needed
npx playwright test evals/tests/<feature>.spec.js
```

Or run the full suite if unsure:
```sh
npm test
```
