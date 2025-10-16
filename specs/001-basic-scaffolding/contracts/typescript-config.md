# TypeScript Configuration Contract

**Entity**: Language Configuration (`tsconfig.json`)  
**Version**: 1.0  
**Date**: 2025-10-16

## Purpose

Defines the contract for TypeScript configuration, enforcing strict type checking, Bun-optimized module resolution, and ESM compatibility per FR-002 and Constitution III.

## Required Compiler Options

### Strict Type Checking (FR-002, Constitution III)
```typescript
interface StrictOptions {
  strict: true;                           // REQUIRED: Enables all strict checks
  noUncheckedIndexedAccess: true;         // REQUIRED: Array/object access safety
  noImplicitOverride: true;               // REQUIRED: Explicit override keyword
  noFallthroughCasesInSwitch: true;       // REQUIRED: Prevents switch fallthrough bugs
}
```

### Module System (FR-010)
```typescript
interface ModuleOptions {
  module: "ESNext";                       // REQUIRED: Latest module syntax
  moduleResolution: "bundler";            // REQUIRED: Bun-optimized resolution
  target: "ESNext";                       // REQUIRED: Latest JavaScript features
  lib: ["ESNext"];                        // REQUIRED: Latest standard library
}
```

### Bun Integration
```typescript
interface BunOptions {
  types: ["bun-types"];                   // REQUIRED: Bun global type definitions
}
```

### Build Output
```typescript
interface OutputOptions {
  outDir: string;                         // REQUIRED: Must be "./dist"
  declaration: true;                      // REQUIRED: Generate .d.ts files
  declarationMap: true;                   // REQUIRED: Source maps for types
  sourceMap: true;                        // REQUIRED: JavaScript source maps
  removeComments: false;                  // OPTIONAL: Preserve JSDoc
}
```

### Interoperability
```typescript
interface InteropOptions {
  esModuleInterop: true;                  // REQUIRED: CommonJS/ESM compatibility
  allowSyntheticDefaultImports: true;     // REQUIRED: Import default compatibility
  isolatedModules: true;                  // REQUIRED: Fast transpilation
  resolveJsonModule: true;                // REQUIRED: Import JSON files
  skipLibCheck: true;                     // REQUIRED: Skip external type checks
  forceConsistentCasingInFileNames: true; // REQUIRED: Cross-platform consistency
}
```

## Required Top-Level Options

```typescript
interface TopLevel {
  compilerOptions: CompilerOptions;       // All options above
  include: string[];                      // Must be ["src/**/*"]
  exclude: string[];                      // Must include ["node_modules", "dist"]
}
```

## Validation Rules

### 1. Strict Mode Enforcement (FR-002)
- `strict` must be `true` (non-negotiable per Constitution III)
- All additional strict flags must be enabled:
  - `noUncheckedIndexedAccess`
  - `noImplicitOverride`
  - `noFallthroughCasesInSwitch`

### 2. Module Configuration
- `module` must be `"ESNext"` (no CommonJS)
- `moduleResolution` must be `"bundler"` (Bun optimization)
- `target` must be `"ESNext"` (modern JavaScript)

### 3. Bun Compatibility
- `types` array must include `"bun-types"`
- Must not conflict with Node.js types

### 4. Output Configuration
- `outDir` must point to `./dist`
- Source maps must be enabled for debugging
- Declaration files must be generated for library usage

### 5. File Inclusion
- `include` must cover all source files: `["src/**/*"]`
- `exclude` must prevent compilation of dependencies: `["node_modules", "dist"]`

## Example Contract

```json
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

## Success Criteria

✅ Type checking completes in <5s (SC-002)  
✅ All strict checks enabled (FR-002)  
✅ IDE autocomplete and validation work (User Story 1, Scenario 3)  
✅ Build outputs declaration files and source maps  
✅ No implicit `any` types allowed

## Enforcement

- **Development**: IDEs use config for real-time type checking
- **CI/CD**: `tsc --noEmit` validates types without emitting files
- **Build**: `tsc` or `bun build` generates output based on config
- **Pre-commit**: Type check can be automated via git hooks

## Error Examples

### ❌ Violation: Strict mode disabled
```json
{
  "compilerOptions": {
    "strict": false  // ❌ INVALID: Must be true
  }
}
```

### ❌ Violation: Wrong module resolution
```json
{
  "compilerOptions": {
    "moduleResolution": "node"  // ❌ INVALID: Must be "bundler" for Bun
  }
}
```

### ❌ Violation: Missing Bun types
```json
{
  "compilerOptions": {
    "types": []  // ❌ INVALID: Must include "bun-types"
  }
}
```

## Related Requirements

- FR-002: Strict type checking configuration
- FR-010: Modern module syntax support
- SC-002: Type checking completes in <5s
- Constitution III: Code Quality Standards (strict TypeScript)
- User Story 1, Scenario 3: IDE type checking and autocomplete
