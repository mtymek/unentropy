# Research: Basic Project Scaffolding

**Date**: 2025-10-16  
**Feature**: 001-basic-scaffolding  
**Purpose**: Resolve technical unknowns from Technical Context and establish technology decisions

## TypeScript Version

**Decision**: TypeScript 5.9.3 (Latest Stable)

**Rationale**:
- TypeScript follows stable versioning without separate LTS releases
- Current stable production release with excellent backward compatibility
- Minor versions ship predictably every 3 months with manageable upgrade paths
- Provides latest type system improvements and bug fixes

**Alternatives Considered**:
- TypeScript 5.8.x (previous stable): Functional but missing recent improvements in 5.9
- Beta/RC versions: Not suitable for production use

**Configuration**:
```json
{
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

---

## Bun Runtime Version

**Decision**: Bun v1.3 (Latest Stable)

**Rationale**:
- Latest stable release with significant performance improvements
- Excellent GitHub Actions support via official `oven-sh/setup-bun` action v2
- Strong Node.js API compatibility (~95%+)
- Native TypeScript execution without transpilation step
- 30x faster package installation than npm

**Alternatives Considered**:
- Bun 1.2.x: Stable but missing latest features
- Node.js: More mature but significantly slower runtime performance
- Deno: Good TypeScript support but different ecosystem and less Node.js compatibility

**GitHub Actions Integration**:
```yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest
```

**Constraints Met**:
- ✅ Linux runner support (primary GitHub Actions platform)
- ✅ Caching built into setup action
- ✅ No external service dependencies (serverless compatible)

---

## Test Framework

**Decision**: Bun's Built-in Test Runner

**Rationale**:
- **Zero Configuration**: Native integration with Bun runtime
- **Performance**: 10-30x faster than Jest, easily meets <2s requirement (SC-003)
- **Jest-Compatible API**: Uses familiar `describe()`, `test()`, `expect()` syntax
- **GitHub Actions Integration**: Automatic GitHub annotations without plugins
- **Built-in Features**: Watch mode, snapshot testing, concurrent execution, code coverage
- **TypeScript Support**: Native execution without transpilation

**Alternatives Considered**:
- **Jest**: Industry standard but 18-20x slower than Bun, requires SWC/Babel for TypeScript
- **Vitest**: Modern and fast (~5x slower than Bun), good for Vite projects
- **Node:test**: Fast but limited feature set compared to Bun test

**Configuration**:
```typescript
// tests/unit/example.test.ts
import { test, expect } from "bun:test";

test("example", () => {
  expect(2 + 2).toBe(4);
});
```

```json
// package.json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch"
  }
}
```

---

## Linter Selection

**Decision**: ESLint 9.x with typescript-eslint 8.x

**Rationale**:
- **Industry Standard**: De-facto linting standard for TypeScript projects
- **TypeScript Support**: typescript-eslint provides comprehensive type-aware linting rules
- **Strict Type Checking**: Supports enforcement of strict mode (FR-002, Constitution III)
- **Bun Compatible**: Works perfectly with Bun runtime
- **Ecosystem**: Large plugin ecosystem for future extensibility

**Alternatives Considered**:
- **Biome**: Fast Rust-based alternative, but less mature ecosystem and tooling
- **Deno Lint**: Fast but limited to Deno conventions
- **TSLint**: Deprecated, replaced by ESLint + typescript-eslint

**Configuration**:
```javascript
// eslint.config.js (ESLint 9 flat config)
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    rules: {
      // Project-specific overrides
    }
  }
);
```

```json
// package.json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "devDependencies": {
    "eslint": "^9.x",
    "typescript-eslint": "^8.x"
  }
}
```

---

## Code Formatter

**Decision**: Prettier 3.x

**Rationale**:
- **Opinionated**: Minimal configuration required (FR-007)
- **TypeScript Support**: First-class support out of the box
- **ESLint Integration**: Seamless via `eslint-config-prettier` to avoid conflicts
- **Consistency**: Industry standard for JavaScript/TypeScript formatting
- **Zero Debate**: Enforces consistent style across team

**Alternatives Considered**:
- **Biome**: Fast alternative but less mature
- **ESLint formatting rules**: Conflicts with linting concerns, slower

**Configuration**:
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

```json
// package.json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "prettier": "^3.x",
    "eslint-config-prettier": "^9.x"
  }
}
```

---

## Package Configuration

**Decision**: ESM with `type: "module"` and Bun-optimized settings

**Rationale**:
- **Modern Standard**: ESM is the standard module format for modern JavaScript
- **Bun Native Support**: Bun natively supports both ESM and CommonJS
- **FR-010 Compliance**: Supports modern module syntax with proper import/export
- **Binary Lockfile**: Bun uses `bun.lockb` for faster dependency resolution

**Configuration**:
```json
// package.json
{
  "name": "unentropy",
  "version": "1.0.0",
  "type": "module",
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
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write ."
  }
}
```

---

## TypeScript Configuration

**Decision**: Strict mode with Bun-optimized settings

**Rationale**:
- **Constitutional Requirement**: Strict type checking enforced (Constitution III, FR-002)
- **Bun Optimization**: `moduleResolution: "bundler"` optimized for Bun runtime
- **ESM Support**: Modern module system for FR-010
- **Source Maps**: Debugging support in IDEs
- **Type Safety**: All strict checks enabled for maximum safety

**Configuration**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "lib": ["ESNext"],
    
    "types": ["bun-types"],
    
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key Settings**:
- `strict: true`: Enables all strict type checks
- `moduleResolution: "bundler"`: Optimized for modern bundlers/runtimes like Bun
- `types: ["bun-types"]`: Include Bun's global type definitions
- `sourceMap: true`: Enable debugging in IDEs

---

## GitHub Actions CI/CD

**Decision**: Official `oven-sh/setup-bun@v2` action

**Rationale**:
- **Official Support**: Maintained by Bun team
- **Cross-Platform**: Works on Linux, macOS, Windows runners
- **Built-in Caching**: Automatic dependency caching
- **Simple Setup**: Minimal configuration required
- **Fast Installs**: Bun's 30x faster installs reduce CI time

**Configuration**:
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
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

**Features**:
- ✅ Automatic GitHub annotations from Bun test runner
- ✅ Fast dependency installation (30x faster than npm)
- ✅ `--frozen-lockfile` ensures reproducible builds
- ✅ Meets SC-005 requirement for successful CI completion

---

## Summary: Technology Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Runtime** | Bun | 1.3 | Fast, TypeScript-native, GitHub Actions support |
| **Language** | TypeScript | 5.9.3 | Latest stable, strict type safety |
| **Test Framework** | Bun Test | Built-in | 10-30x faster, zero config, Jest-compatible |
| **Linter** | ESLint + typescript-eslint | 9.x / 8.x | Industry standard, type-aware rules |
| **Formatter** | Prettier | 3.x | Opinionated, consistent style |
| **Package Manager** | Bun | Built-in | 30x faster than npm |
| **CI/CD** | GitHub Actions | `oven-sh/setup-bun@v2` | Official support, automatic caching |

**Success Criteria Alignment**:
- ✅ SC-001: Fast setup (<5 minutes with Bun's install speed)
- ✅ SC-002: Type checking <5s (Bun-optimized TypeScript)
- ✅ SC-003: Test suite <2s (Bun test runner performance)
- ✅ SC-004: 100% linting via ESLint strict rules
- ✅ SC-005: Full CI/CD pipeline with GitHub Actions
- ✅ SC-006: Documentation via README and quickstart guide

**Constitutional Compliance**:
- ✅ Serverless Architecture (I): GitHub Actions compatible
- ✅ Technology Stack Consistency (II): TypeScript enforced
- ✅ Code Quality Standards (III): Strict types, Prettier formatting
- ✅ Security Best Practices (IV): No secrets in scaffolding
- ✅ Testing Discipline (V): Comprehensive test framework with CI integration

All "NEEDS CLARIFICATION" items from Technical Context are now resolved with production-ready technology choices.
