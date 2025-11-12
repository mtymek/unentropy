# Plan: Package Actions Using Bun Runtime

**Date**: 2025-11-12  
**Status**: Planning  
**Reference**: https://github.com/jcbhmr/hello-world-bun-action

## Overview

Migrate unentropy GitHub Actions from Node.js composite runtime to native Bun runtime (`bun1`) for simplified deployment and improved performance.

## Current State

- Actions use `composite` runtime with Node.js execution
- Each action has `dist/` folder with bundled JavaScript (Node.js target)
- Build script uses `bun build` targeting Node.js runtime
- Complex setup with output file handling for composite actions
- Shell script wrapper executes Node.js bundles

## Target State

- Actions use `bun1` runtime (native Bun execution)
- Simplified action structure with direct TypeScript execution
- No need for Node.js compatibility layer
- Cleaner code without composite action workarounds
- TypeScript runs natively without transpilation

## Benefits

1. **No compilation step in user workflows** - TypeScript runs natively via Bun
2. **Faster execution** - Bun's performance advantages over Node.js
3. **Simpler code** - No composite action shell script wrapping needed
4. **Auto-install** - Can use npm packages without node_modules
5. **Better developer experience** - Direct TypeScript without transpilation dance
6. **Smaller action size** - Optional unbundled dependencies with auto-install

## Changes Required

### 1. Update action.yml Files (3 files)

**Before** (composite):
```yaml
runs:
  using: "composite"
  steps:
    - name: Run metrics collection
      shell: bash
      run: |
        OUTPUT_FILE=$(mktemp)
        node "${{ github.action_path }}/dist/collect.js" "$OUTPUT_FILE"
        # ... output handling ...
```

**After** (bun1):
```yaml
runs:
  using: bun1
  main: dist/collect.js
```

**Files to update**:
- `.github/actions/collect-metrics/action.yml`
- `.github/actions/find-database/action.yml`
- `.github/actions/generate-report/action.yml`

### 2. Simplify Action Entry Points (3 files)

**Remove Node.js workarounds**:
- Remove `OUTPUT_FILE` temp file handling
- Remove `process.argv[2]` output file logic
- Remove composite action output capture code
- Use `core.setOutput()` directly (Bun runtime handles this)
- Simplify `main()` function - Bun handles execution context
- Keep `@actions/core` for proper GitHub Actions integration

**Files to update**:
- `src/actions/collect.ts`
- `src/actions/find-database.ts`
- `src/actions/report.ts`

### 3. Update Build Script

**File**: `scripts/build-actions.ts`

**Changes**:
- Change `target: "node"` to `target: "bun"`
- Output to `.github/actions/*/dist/` folders
- Consider bundling strategy:
  - **Option A**: Full bundle (hermetic, no auto-install needed)
  - **Option B**: External dependencies (use Bun's auto-install)
- Remove Node.js-specific plugin workarounds if needed

**Example**:
```typescript
await build({
  entrypoints: [entrypoint],
  outdir,
  target: "bun",  // Changed from "node"
  naming: outfile,
  // Optional: external deps for auto-install
  // external: ["better-sqlite3", "@actions/*"],
});
```

### 4. Update .gitignore

**Decision needed**: Should we commit bundled actions?

**Option A** (Recommended - follows hello-world-bun-action pattern):
- Commit `dist/` folders to repository
- Users get immediate action availability
- No build step required for action consumers
- Simpler release process

**Option B**:
- Gitignore `dist/` folders
- Build and commit only on release
- Requires CI workflow to publish

**Recommended**: Option A (commit dist/)

### 5. CI/CD Integration

**New workflow or update existing** `.github/workflows/ci.yml`:

```yaml
- name: Build actions
  run: bun run build:actions

- name: Verify actions built
  run: |
    test -f .github/actions/collect-metrics/dist/collect.js
    test -f .github/actions/find-database/dist/find-database.js
    test -f .github/actions/generate-report/dist/report.js

# On release:
- name: Commit built actions
  if: github.event_name == 'release'
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add .github/actions/*/dist/
    git commit -m "Build actions for release ${{ github.ref_name }}" || true
    git push
```

### 6. Package.json Updates

**Current**:
```json
"scripts": {
  "build:actions": "bun run scripts/build-actions.ts"
}
```

**No changes needed** - script already exists, just needs internal updates

### 7. Documentation Updates

**Files to update**:
- `README.md` - Update usage examples if needed
- `AGENTS.md` - Note Bun runtime requirement
- Spec contract docs if action interface changes

## Implementation Order

1. ✅ **Analyze structure** (completed)
2. **Update action.yml files** for all 3 actions
3. **Refactor action entry points** to remove Node.js workarounds
4. **Update build-actions.ts** script
5. **Test locally** with bun runtime
6. **Update .gitignore** appropriately
7. **Add CI workflow** for automated building
8. **Update documentation** (README, AGENTS.md)
9. **Test in real GitHub Actions workflow**

## Testing Strategy

- **Unit tests**: Remain unchanged (testing logic, not runtime)
- **Contract tests**: Verify action interface matches spec
- **Integration tests**: May need updates for Bun runtime
- **Manual testing**: Create test workflow in `.github/workflows/test-actions.yml`
- **Real-world test**: Test in actual repository workflow

## Risk Assessment

### Low Risk
- Bun runtime is stable and production-ready
- Actions interface remains unchanged (inputs/outputs)
- Code simplification reduces complexity
- Easy rollback (revert commits)

### Medium Risk
- Bun runtime availability in GitHub Actions (check runner support)
- Better-sqlite3 native module compatibility with Bun
- Dependency auto-install behavior differences

### Mitigations
- Test thoroughly before release
- Keep Node.js version as fallback branch
- Document Bun runtime requirement clearly
- Monitor GitHub Actions Bun runtime updates

## Dependencies

**Runtime**:
- Bun 1.x (specified via `using: bun1`)
- GitHub Actions runner with Bun support

**Build-time**:
- Bun for building (already required)
- No additional dependencies

## Success Criteria

- [ ] All 3 actions use `bun1` runtime
- [ ] Actions execute successfully in GitHub Actions
- [ ] All tests pass
- [ ] Code simplified (removed workarounds)
- [ ] Documentation updated
- [ ] CI builds actions automatically
- [ ] Release process includes action building

## Implementation Notes

### Hello World Bun Action Pattern

From the reference repository:

```yaml
# action.yml
name: "Hello World Bun Action"
runs:
  using: bun1
  main: main.ts
```

```typescript
// main.ts
import * as core from "@actions/core";
console.log(`Hello ${core.getInput("name")}!`);
core.setOutput("time", new Date().toLocaleTimeString());
```

Key takeaways:
- Direct TypeScript execution (no compilation)
- Simple, clean structure
- Uses `@actions/core` directly
- No composite action complexity

### Auto-install Feature

Bun supports auto-installing npm packages without node_modules:
```typescript
import * as core from "@actions/core"; // Auto-installed
```

Can optionally prebundle everything:
```bash
bun build src/main.ts --outdir=out --target=bun
```

### Bun vs Node.js Differences

- Bun has native SQLite support (`bun:sqlite`)
- Better-sqlite3 should work but test compatibility
- Faster startup and execution
- Native TypeScript support
- Built-in bundler and runtime

## References

- Example: https://github.com/jcbhmr/hello-world-bun-action
- Bun GitHub Actions: https://bun.sh/docs/runtime/bun-run#github-actions
- GitHub Actions metadata: https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#runsmain
- Bun build API: https://bun.sh/docs/bundler
