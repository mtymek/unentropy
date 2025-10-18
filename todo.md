# GitHub Actions Toolkit Simplification Analysis

## Current State Analysis

The project already uses several toolkit packages (`@actions/core`, `@actions/github`, `@actions/artifact`), but there are significant opportunities to leverage them more effectively.

## Key Simplification Opportunities

### 1. **Eliminate Manual Output File Handling**

**Current**: Each action writes outputs to temp files, then bash scripts read them back
**Toolkit Solution**: Use `@actions/core` outputs directly

- Remove all temp file creation/reading logic
- Use `core.setOutput()` directly (already partially implemented)
- Eliminate the complex bash wrapper scripts

### 2. **Replace Manual GitHub API Calls with @actions/github**

**Current**: `find-database.ts` makes manual `fetch()` calls to GitHub REST API
**Toolkit Solution**: Use the authenticated Octokit client from `@actions/github`

- Replace manual fetch calls with `github.rest.actions.listWorkflowRuns()`
- Built-in authentication and error handling
- Automatic rate limit handling

### 3. **Use @actions/artifact for Artifact Operations**

**Current**: Manual artifact download with `fetch()` + `unzip` commands
**Toolkit Solution**: Use `@actions/artifact` package

- Replace manual download/extraction with `artifact.downloadArtifact()`
- Built-in retry logic and error handling
- No external `unzip` dependency

### 4. **Simplify Input Handling**

**Current**: Mixed input handling between `core.getInput()` and `process.env`
**Toolkit Solution**: Standardize on `core.getInput()` everywhere

- Remove environment variable fallbacks
- Consistent validation across all actions

### 5. **Consolidate Action Entry Points**

**Current**: Separate `.ts` and `.node.ts` files for each action
**Toolkit Solution**: Single entry point per action

- Use `@actions/core` execution context detection
- Eliminate wrapper files

## Specific Code Reductions

### find-database.ts (312 lines → ~150 lines)

- Replace 80+ lines of manual GitHub API calls with 20 lines using `@actions/github`
- Replace 60+ lines of manual artifact download with 15 lines using `@actions/artifact`
- Remove temp file handling (~30 lines)

### collect.ts & report.ts

- Remove output file writing (~20 lines each)
- Simplify input parsing (~15 lines each)
- Consolidate with .node.ts versions

### action.yml files

- Simplify bash scripts from 15+ lines to 3-5 lines
- Remove temp file creation/cleanup

## Benefits

1. **Reduced Code**: ~40% reduction in action code
2. **Better Error Handling**: Toolkit provides built-in error handling and retries
3. **Improved Reliability**: Authenticated API calls, automatic rate limiting
4. **Easier Testing**: Toolkit functions are easily mockable
5. **Better Maintenance**: Less custom code to maintain

## Implementation Strategy

1. **Phase 1**: Replace manual GitHub API calls in `find-database.ts`
2. **Phase 2**: Replace artifact download with `@actions/artifact`
3. **Phase 3**: Remove temp file handling across all actions
4. **Phase 4**: Consolidate `.ts` and `.node.ts` files
5. **Phase 5**: Simplify action.yml bash scripts

## Files to Modify

- `src/actions/find-database.ts` - Major refactoring
- `src/actions/find-database.node.ts` - Remove
- `src/actions/collect.ts` - Simplify outputs
- `src/actions/collect.node.ts` - Remove
- `src/actions/report.ts` - Simplify outputs
- `src/actions/report.node.ts` - Remove
- `.github/actions/*/action.yml` - Simplify bash scripts
- `scripts/build-actions.ts` - Update build process

## Notes

The toolkit provides all of the necessary functionality to significantly simplify the current implementation while improving reliability and maintainability.
