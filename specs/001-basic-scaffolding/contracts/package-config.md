# Package Configuration Contract

**Entity**: Project Configuration (`package.json`)  
**Version**: 1.0  
**Date**: 2025-10-16

## Purpose

Defines the contract for `package.json` structure, ensuring all required fields, scripts, and dependencies are present for the scaffolding feature.

## Required Fields

### Metadata
```typescript
interface PackageMetadata {
  name: string;              // Must match: /^[a-z0-9-]+$/
  version: string;           // Must match SemVer: /^\d+\.\d+\.\d+$/
  type: "module";            // Literal: must be "module" for ESM
  description?: string;      // Optional project description
  license?: string;          // Optional license identifier
}
```

### Module Configuration
```typescript
interface ModuleConfig {
  module: string;            // Must be valid path: "./dist/index.js"
  types: string;             // Must be valid path: "./dist/index.d.ts"
  exports: {
    ".": {
      types: string;         // Must match 'types' field
      import: string;        // Must match 'module' field
    };
  };
}
```

### Scripts (FR-003)
```typescript
interface Scripts {
  build: string;             // Must compile TypeScript to output directory
  test: string;              // Must execute Bun test runner
  lint: string;              // Must execute ESLint
  typecheck: string;         // Must execute TypeScript type checking
  format: string;            // Must execute Prettier write mode
  "format:check": string;    // Must execute Prettier check mode
  "test:watch"?: string;     // Optional: watch mode for tests
  "lint:fix"?: string;       // Optional: auto-fix linting issues
}
```

**Required Script Commands**:
- `build`: `"bun build ./src/index.ts --outdir ./dist --target node"`
- `test`: `"bun test"`
- `lint`: `"eslint ."`
- `typecheck`: `"tsc --noEmit"`
- `format`: `"prettier --write ."`
- `format:check`: `"prettier --check ."`

### Dependencies
```typescript
interface Dependencies {
  devDependencies: {
    "@types/bun": string;              // Bun type definitions
    "typescript": string;              // TypeScript compiler (5.9.3+)
    "eslint": string;                  // ESLint (9.x)
    "typescript-eslint": string;       // TypeScript ESLint plugin (8.x)
    "prettier": string;                // Prettier formatter (3.x)
    "eslint-config-prettier": string;  // ESLint-Prettier integration (9.x)
  };
}
```

## Validation Rules

### 1. Metadata Validation
- `name` must be lowercase alphanumeric with hyphens only
- `version` must follow semantic versioning (MAJOR.MINOR.PATCH)
- `type` must be exactly `"module"` (ESM requirement)

### 2. Module Configuration Validation
- `module` and `types` paths must exist after build
- `exports["."].types` must match `types` field
- `exports["."].import` must match `module` field

### 3. Scripts Validation
- All required scripts (build, test, lint, typecheck, format, format:check) must be present
- Script commands must use Bun-compatible syntax
- Scripts must exit with code 0 on success, non-zero on failure

### 4. Dependencies Validation
- All required devDependencies must be present
- Version ranges should use `^` for minor version flexibility
- Exact versions acceptable for critical dependencies

## Example Contract

```json
{
  "name": "unentropy",
  "version": "1.0.0",
  "type": "module",
  "description": "Serverless tool for tracking custom code metrics in CI/CD pipelines",
  "license": "MIT",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target node",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.9.3",
    "eslint": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "eslint-config-prettier": "^9.0.0"
  }
}
```

## Success Criteria

✅ All required fields present  
✅ Scripts execute successfully (FR-003)  
✅ Dependencies install without errors (FR-001)  
✅ Module exports resolve correctly (FR-010)  
✅ ESM configuration valid (`type: "module"`)

## Enforcement

- **Build time**: TypeScript compiler validates module resolution
- **Runtime**: Bun validates package structure during script execution
- **CI/CD**: GitHub Actions validates by executing all scripts
- **Development**: IDEs validate using package configuration

## Related Requirements

- FR-001: Package configuration file declaring dependencies
- FR-003: Executable commands for build, test, lint, typecheck
- FR-010: Modern module syntax with proper import/export
- SC-001: Developers can run all commands successfully
