# Data Model: Basic Project Scaffolding

**Feature**: 001-basic-scaffolding  
**Date**: 2025-10-16  
**Purpose**: Define configuration entities and relationships for project scaffolding

## Overview

This feature focuses on **configuration entities** rather than runtime data models. The scaffolding establishes project structure, tooling configuration, and development workflows. No persistent data storage or runtime entities are required for this feature.

## Configuration Entities

### 1. Project Configuration

**Entity**: Package Manifest (`package.json`)

**Purpose**: Declares project metadata, dependencies, and executable commands (FR-001, FR-003)

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | Yes | Alphanumeric + hyphens | Project identifier |
| `version` | string | Yes | SemVer format | Project version |
| `type` | string | Yes | Must be "module" | ESM module system |
| `module` | string | Yes | Valid path | Entry point for ESM builds |
| `types` | string | Yes | Valid path | TypeScript type definitions |
| `exports` | object | Yes | Valid export map | Package exports configuration |
| `scripts` | object | Yes | Command definitions | Executable commands (build, test, lint, typecheck) |
| `devDependencies` | object | Yes | Package@version map | Development tooling dependencies |

**Relationships**:
- References TypeScript configuration for build settings
- Referenced by Bun runtime for script execution
- Used by GitHub Actions for CI/CD automation

**State Transitions**: N/A (static configuration)

**Example**:
```json
{
  "name": "unentropy",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target node",
    "test": "bun test",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

---

### 2. TypeScript Configuration

**Entity**: Language Configuration (`tsconfig.json`)

**Purpose**: Enforces strict type checking, module resolution, and compilation settings (FR-002, FR-010)

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `compilerOptions.strict` | boolean | Yes | Must be true | Enables all strict type checks |
| `compilerOptions.module` | string | Yes | Must be "ESNext" | Module system (ESM) |
| `compilerOptions.moduleResolution` | string | Yes | Must be "bundler" | Bun-optimized resolution |
| `compilerOptions.target` | string | Yes | Must be "ESNext" | Compilation target |
| `compilerOptions.outDir` | string | Yes | Valid directory path | Build output directory |
| `compilerOptions.types` | array | Yes | Must include "bun-types" | Type definitions |
| `include` | array | Yes | Valid glob patterns | Source files to compile |
| `exclude` | array | Yes | Valid glob patterns | Files to exclude |

**Relationships**:
- Used by TypeScript compiler for type checking
- Referenced by IDEs for autocomplete and validation
- Enforced by CI/CD pipeline

**Validation Rules**:
- `strict` must be `true` (Constitution III)
- Must include source maps for debugging
- Must exclude `node_modules` and `dist`

**State Transitions**: N/A (static configuration)

**Example**:
```json
{
  "compilerOptions": {
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext"
  }
}
```

---

### 3. Linter Configuration

**Entity**: ESLint Configuration (`eslint.config.js`)

**Purpose**: Enforces code quality standards and style consistency (FR-005)

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `extends` | array | Yes | Valid config names | Base configurations (typescript-eslint) |
| `rules` | object | No | Valid ESLint rules | Project-specific overrides |
| `languageOptions.parser` | string | Yes | Valid parser | TypeScript parser |

**Relationships**:
- Integrated with Prettier for formatting compatibility
- Enforced by CI/CD pipeline
- Used by IDEs for real-time linting

**Validation Rules**:
- Must extend `typescript-eslint` strict configs
- Must include `eslint-config-prettier` to avoid conflicts
- Must apply to all `.ts` files in `src/` and `tests/`

**State Transitions**: N/A (static configuration)

---

### 4. Formatter Configuration

**Entity**: Prettier Configuration (`.prettierrc`)

**Purpose**: Enforces consistent code formatting (FR-007)

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `semi` | boolean | Yes | true/false | Semicolon usage |
| `singleQuote` | boolean | Yes | true/false | Quote style |
| `printWidth` | number | Yes | 80-120 recommended | Line width limit |
| `tabWidth` | number | Yes | 2 or 4 | Indentation size |
| `trailingComma` | string | Yes | "none"/"es5"/"all" | Trailing comma style |

**Relationships**:
- Integrated with ESLint via `eslint-config-prettier`
- Applied by format script and pre-commit hooks
- Enforced by CI/CD pipeline

**Validation Rules**:
- Settings must not conflict with ESLint rules
- Must format all `.ts`, `.js`, `.json`, `.md` files

**State Transitions**: N/A (static configuration)

---

### 5. Test Configuration

**Entity**: Bun Test Configuration (built-in, no separate file)

**Purpose**: Enables test discovery, execution, and coverage reporting (FR-004, FR-008)

**Fields** (via CLI flags or inline configuration):
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| Test file patterns | glob | Yes | `**/*.test.ts` | Test discovery pattern |
| Watch mode | boolean | No | N/A | Auto re-run on changes |
| Coverage | boolean | No | N/A | Code coverage reporting |

**Relationships**:
- Executes tests in `tests/` directory structure
- Outputs results to GitHub Actions annotations
- Uses TypeScript configuration for module resolution

**Validation Rules**:
- All tests must pass before merge (SC-003)
- Test files must match `*.test.ts` pattern
- Must support unit, integration, and contract test subdirectories

**State Transitions**: N/A (runtime execution)

---

### 6. GitHub Actions Configuration

**Entity**: CI Workflow Configuration (`.github/workflows/ci.yml`)

**Purpose**: Automates build, test, lint, and typecheck on CI/CD (FR-003, SC-005)

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `on` | object | Yes | Valid event triggers | Workflow triggers (push, PR) |
| `jobs` | object | Yes | Valid job definitions | CI job definitions |
| `jobs.test.steps` | array | Yes | Valid action steps | CI pipeline steps |

**Relationships**:
- Uses `oven-sh/setup-bun@v2` for Bun installation
- Executes scripts defined in `package.json`
- Enforces success criteria (SC-005)

**Validation Rules**:
- Must run on `ubuntu-latest` (primary platform)
- Must execute: install, typecheck, lint, format check, test, build
- All steps must pass for successful build

**State Transitions**:
```
Triggered → Running → (Pass/Fail)
```

---

## Directory Structure Entity

**Entity**: Source Code Organization

**Purpose**: Logical separation of source code and tests (FR-006)

**Structure**:
```
src/               # Application source code
├── index.ts       # Main entry point
└── lib/           # Utility functions

tests/             # Test files
├── unit/          # Unit tests
├── integration/   # Integration tests
└── contract/      # Contract tests
```

**Validation Rules**:
- `src/` contains only application code
- `tests/` contains only test files matching `*.test.ts`
- Each test subdirectory serves a specific testing level
- No tests in `src/`, no application code in `tests/`

**Relationships**:
- `src/` compiled by TypeScript to `dist/`
- `tests/` executed by Bun test runner
- Both linted by ESLint, formatted by Prettier

---

## Dependencies Graph

```
package.json
    ├─→ tsconfig.json (referenced by "typecheck" script)
    ├─→ eslint.config.js (referenced by "lint" script)
    ├─→ .prettierrc (referenced by "format" script)
    ├─→ Bun test runner (referenced by "test" script)
    └─→ Bun build (referenced by "build" script)

tsconfig.json
    ├─→ src/ (included files)
    └─→ bun-types (type definitions)

eslint.config.js
    ├─→ typescript-eslint (base config)
    └─→ eslint-config-prettier (integration)

.github/workflows/ci.yml
    ├─→ package.json (runs all scripts)
    └─→ oven-sh/setup-bun@v2 (Bun installation)
```

---

## Validation Summary

| Entity | Key Validation Rules |
|--------|---------------------|
| `package.json` | Must include all required scripts (build, test, lint, typecheck, format); must use ESM (`type: "module"`) |
| `tsconfig.json` | `strict: true` required; must include Bun types; must target ESNext |
| `eslint.config.js` | Must extend typescript-eslint strict configs; must include Prettier compatibility |
| `.prettierrc` | Must not conflict with ESLint; must format TypeScript files |
| Test configuration | Must discover `*.test.ts` files; must execute in <2s |
| CI workflow | Must run all quality checks; all steps must pass |

---

## Summary

This scaffolding feature defines **configuration entities** that establish the project's development infrastructure. No runtime data models or persistent storage are required. All entities are static configuration files that:

1. Declare dependencies and commands (package.json)
2. Enforce type safety (tsconfig.json)
3. Maintain code quality (eslint.config.js, .prettierrc)
4. Enable testing (Bun test runner)
5. Automate CI/CD (.github/workflows/ci.yml)

These configurations satisfy all functional requirements (FR-001 through FR-010) and success criteria (SC-001 through SC-006) while maintaining constitutional compliance.
