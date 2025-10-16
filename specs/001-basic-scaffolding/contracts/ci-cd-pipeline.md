# CI/CD Pipeline Contract

**Entity**: GitHub Actions Workflow (`.github/workflows/ci.yml`)  
**Version**: 1.0  
**Date**: 2025-10-16

## Purpose

Defines the contract for GitHub Actions CI/CD pipeline, ensuring automated build, test, lint, and typecheck execution per FR-003, SC-005, and Constitution principles.

## Workflow Structure

### Trigger Configuration
```yaml
on:
  push:
    branches: [main]                      # Run on pushes to main
  pull_request:                           # Run on all pull requests
```

### Job Configuration
```typescript
interface Job {
  name: string;                           // Job identifier
  "runs-on": "ubuntu-latest";             // REQUIRED: Linux runner
  steps: Step[];                          // Pipeline steps
}
```

### Required Steps
```typescript
interface RequiredSteps {
  checkout: "actions/checkout@v4";                    // REQUIRED: Checkout code
  setupBun: "oven-sh/setup-bun@v2";                   // REQUIRED: Install Bun
  install: "bun install --frozen-lockfile";           // REQUIRED: Install deps
  typecheck: "bun run typecheck";                     // REQUIRED: Type checking
  lint: "bun run lint";                               // REQUIRED: Linting
  formatCheck: "bun run format:check";                // REQUIRED: Format check
  test: "bun test";                                   // REQUIRED: Test execution
  build: "bun run build";                             // REQUIRED: Build project
}
```

## Complete Workflow Contract

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.2"
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Type check
        run: bun run typecheck
      
      - name: Lint
        run: bun run lint
      
      - name: Format check
        run: bun run format:check
      
      - name: Test
        run: bun test
      
      - name: Build
        run: bun run build
```

## Step Execution Contract

### 1. Checkout Code
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

**Purpose**: Clone repository code to runner  
**Exit Code**: Must be 0  
**Failure Impact**: Pipeline cannot proceed

### 2. Setup Bun Runtime
```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest
```

**Purpose**: Install Bun runtime (v1.3+)  
**Exit Code**: Must be 0  
**Caching**: Automatic via action  
**Failure Impact**: Pipeline cannot proceed

### 3. Install Dependencies
```yaml
- name: Install dependencies
  run: bun install --frozen-lockfile
```

**Purpose**: Install npm packages from lockfile (FR-001)  
**Flags**: `--frozen-lockfile` ensures reproducible builds  
**Exit Code**: Must be 0  
**Failure Impact**: Pipeline cannot proceed  
**Performance**: ~30x faster than npm install

### 4. Type Check
```yaml
- name: Type check
  run: bun run typecheck
```

**Purpose**: Validate TypeScript types (FR-002)  
**Command**: `tsc --noEmit`  
**Exit Code**: 0 (pass), 1 (type errors)  
**Performance**: Must complete in <5s (SC-002)  
**Failure Impact**: Build marked as failed

### 5. Lint
```yaml
- name: Lint
  run: bun run lint
```

**Purpose**: Enforce code quality standards (FR-005)  
**Command**: `eslint .`  
**Exit Code**: 0 (pass), 1 (violations)  
**Requirement**: 100% pass rate (SC-004)  
**Failure Impact**: Build marked as failed

### 6. Format Check
```yaml
- name: Format check
  run: bun run format:check
```

**Purpose**: Validate code formatting (FR-007)  
**Command**: `prettier --check .`  
**Exit Code**: 0 (formatted), 1 (violations)  
**Failure Impact**: Build marked as failed

### 7. Test
```yaml
- name: Test
  run: bun test
```

**Purpose**: Execute test suite (FR-004, FR-008)  
**Exit Code**: 0 (all pass), 1 (failures)  
**Performance**: Must complete in <2s (SC-003)  
**Output**: Automatic GitHub annotations  
**Failure Impact**: Build marked as failed

### 8. Build
```yaml
- name: Build
  run: bun run build
```

**Purpose**: Compile TypeScript to JavaScript  
**Command**: `bun build ./src/index.ts --outdir ./dist --target node`  
**Exit Code**: Must be 0  
**Outputs**: `dist/` directory with compiled code  
**Failure Impact**: Build marked as failed

## Validation Rules

### 1. Pipeline Success Criteria (SC-005)
- All steps must exit with code 0
- No step failures or errors allowed
- Pipeline must complete in reasonable time (<2 minutes for scaffolding)

### 2. Step Ordering
- Dependencies must be installed before any checks
- Type checking, linting, and formatting can run in parallel (future optimization)
- Tests must run after code quality checks
- Build must run last (final validation)

### 3. Failure Handling
```typescript
interface FailureHandling {
  strategy: "fail-fast";                  // Stop on first failure
  annotation: "automatic";                // GitHub annotations for errors
  notification: "PR comments";            // Failed checks visible in PR
}
```

### 4. Reproducibility
- Must use `--frozen-lockfile` for dependency installation
- Must pin action versions (e.g., `@v4`, not `@main`)
- Must use stable Bun version (or pin to specific version)

## Performance Contract

| Step | Max Duration | Requirement Reference |
|------|--------------|----------------------|
| Checkout | <10s | N/A |
| Setup Bun | <20s | N/A |
| Install deps | <30s | Fast Bun installs |
| Type check | <5s | SC-002 |
| Lint | <10s | Reasonable for small projects |
| Format check | <5s | Reasonable for small projects |
| Test | <2s | SC-003 |
| Build | <5s | Reasonable for small projects |
| **Total** | **<90s** | SC-005 (reasonable completion time) |

## Output Contract

### Success Output
```
✅ Checkout code
✅ Setup Bun
✅ Install dependencies
✅ Type check
✅ Lint
✅ Format check
✅ Test
✅ Build

CI Passed ✓
```

### Failure Output (Example: Type Error)
```
✅ Checkout code
✅ Setup Bun
✅ Install dependencies
❌ Type check
   src/index.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.
   
CI Failed ✗
```

### GitHub Annotations
- Failed tests automatically annotated in PR files view
- Type errors shown inline at error location
- Linting violations highlighted in code review

## Success Criteria

✅ All commands execute successfully (SC-005)  
✅ Pipeline completes in <2 minutes  
✅ Automatic GitHub annotations on failures  
✅ Compatible with ubuntu-latest runner  
✅ No external service dependencies (serverless)

## Enforcement

- **Required Status Check**: Mark CI as required in GitHub branch protection
- **PR Blocking**: PRs cannot merge until CI passes
- **Main Branch Protection**: Direct pushes to main trigger CI

## Constitutional Compliance

### I. Serverless Architecture
✅ Runs entirely in GitHub Actions (no external servers)

### II. Technology Stack Consistency
✅ Uses TypeScript, enforces strict checking

### III. Code Quality Standards
✅ Enforces linting and formatting

### IV. Security Best Practices
✅ No secrets exposed in logs (none used in scaffolding)

### V. Testing Discipline
✅ Runs full test suite on every commit

## Future Enhancements (Not in Scope)

- Parallel step execution (typecheck + lint + format)
- Code coverage reporting
- Artifact uploads (build outputs)
- Matrix testing (multiple Bun versions)
- Scheduled runs for dependency audits

## Related Requirements

- FR-003: Executable commands for CI/CD
- SC-001: Commands work within 5 minutes of clone
- SC-002: Type checking <5s
- SC-003: Test suite <2s
- SC-004: 100% linting pass rate
- SC-005: CI/CD environment success
- Constitution I: Serverless (GitHub Actions only)
- Constitution V: Testing in CI pipeline
