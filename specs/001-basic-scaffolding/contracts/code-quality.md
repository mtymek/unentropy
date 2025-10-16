# Code Quality Contract

**Entity**: ESLint + Prettier Configuration  
**Version**: 1.0  
**Date**: 2025-10-16

## Purpose

Defines the contract for code quality enforcement via linting (ESLint) and formatting (Prettier), ensuring consistency and adherence to FR-005, FR-007, and Constitution III.

## ESLint Configuration Contract

### Configuration File Structure
```typescript
// eslint.config.js (ESLint 9 flat config)
interface ESLintConfig {
  extends: string[];                      // Base configurations
  rules: Record<string, RuleConfig>;      // Custom rule overrides
  languageOptions: {
    parser: string;                       // TypeScript parser
    parserOptions: ParserOptions;
  };
  files?: string[];                       // File patterns to lint
  ignores?: string[];                     // File patterns to ignore
}
```

### Required Base Configurations
```typescript
interface RequiredConfigs {
  strict: "typescript-eslint/strict";           // REQUIRED: Strict TypeScript rules
  stylistic: "typescript-eslint/stylistic";     // REQUIRED: Style consistency
  prettier: "eslint-config-prettier";           // REQUIRED: Prettier compatibility
}
```

### Example ESLint Configuration
```javascript
// eslint.config.js
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  prettier,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // Project-specific overrides here
    },
  },
  {
    ignores: ["dist/", "node_modules/", "*.config.js"],
  }
);
```

### ESLint Command Interface
```typescript
interface ESLintCommands {
  check: "eslint .";                      // Check all files for violations
  fix: "eslint . --fix";                  // Auto-fix violations where possible
  specific: "eslint <path>";              // Check specific file/directory
}
```

## Prettier Configuration Contract

### Configuration File Structure
```typescript
// .prettierrc (JSON format)
interface PrettierConfig {
  semi: boolean;                          // REQUIRED: Semicolon usage
  trailingComma: "none" | "es5" | "all";  // REQUIRED: Trailing comma style
  singleQuote: boolean;                   // REQUIRED: Quote style
  printWidth: number;                     // REQUIRED: Line width (80-120)
  tabWidth: number;                       // REQUIRED: Indentation size (2 or 4)
  arrowParens: "avoid" | "always";        // REQUIRED: Arrow function parens
}
```

### Required Configuration Values
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### Prettier Command Interface
```typescript
interface PrettierCommands {
  format: "prettier --write .";           // Format all files in place
  check: "prettier --check .";            // Check formatting without changes
  specific: "prettier --write <path>";    // Format specific file/directory
}
```

### File Coverage
```typescript
interface FilePatterns {
  include: ["**/*.ts", "**/*.js", "**/*.json", "**/*.md"];
  ignore: ["node_modules/", "dist/", "bun.lockb"];
}
```

## Validation Rules

### 1. ESLint Rules (FR-005)
- Must extend `typescript-eslint/strict` for type-safe linting
- Must extend `typescript-eslint/stylistic` for consistency
- Must include `eslint-config-prettier` to prevent rule conflicts
- Must lint all `.ts` files in `src/` and `tests/`
- Must fail build on violations (SC-004: 100% passing)

### 2. Prettier Rules (FR-007)
- Must format all TypeScript, JavaScript, JSON, and Markdown files
- Must not conflict with ESLint rules
- Must use consistent configuration across all files
- Must fail CI build if formatting violations found

### 3. Integration Rules
- ESLint must not enforce formatting rules (delegated to Prettier)
- Prettier must run independently of ESLint
- Both tools must be executable via package.json scripts

### 4. Performance Requirements
- Linting must complete in reasonable time (<10s for small projects)
- Formatting must complete in reasonable time (<5s for small projects)

## Exit Codes

```typescript
interface ExitCodes {
  success: 0;                             // No violations found
  violations: 1;                          // Violations found
  error: 2;                               // Tool execution error
}
```

## Output Contract

### ESLint Output Format
```
src/index.ts
  10:5  error  'foo' is defined but never used  @typescript-eslint/no-unused-vars
  15:3  error  Missing return type on function   @typescript-eslint/explicit-function-return-type

✖ 2 problems (2 errors, 0 warnings)
```

### Prettier Output Format (Check Mode)
```
Checking formatting...
[warn] src/index.ts
[warn] Code style issues found in the above file(s). Run Prettier to fix.
```

## Success Criteria

✅ 100% of code passes linting (SC-004)  
✅ All code formatted consistently (FR-007)  
✅ No ESLint/Prettier rule conflicts  
✅ Auto-fix available for common violations  
✅ CI/CD enforces quality checks (SC-005)

## Example Violations & Fixes

### ❌ ESLint Violation: Unused Variable
```typescript
// ❌ INVALID
const unused = 42;
export const value = 10;
```

```typescript
// ✅ VALID (fixed)
export const value = 10;
```

### ❌ Prettier Violation: Inconsistent Spacing
```typescript
// ❌ INVALID (before prettier)
const  obj  =  {  foo : "bar"  } ;
```

```typescript
// ✅ VALID (after prettier)
const obj = { foo: "bar" };
```

### ❌ TypeScript Violation: Implicit Any
```typescript
// ❌ INVALID (strict mode)
function add(a, b) {
  return a + b;
}
```

```typescript
// ✅ VALID (explicit types)
function add(a: number, b: number): number {
  return a + b;
}
```

## Enforcement

- **Development**: 
  - IDEs show real-time linting errors
  - Format-on-save can be configured in IDE settings
- **Pre-commit** (optional):
  - Git hooks can run `lint` and `format:check` before commit
- **CI/CD** (required):
  - GitHub Actions runs both `lint` and `format:check`
  - Build fails if violations found (SC-004)

## Integration with TypeScript

ESLint with typescript-eslint provides **type-aware linting**:

```javascript
// eslint.config.js
export default tseslint.config({
  languageOptions: {
    parserOptions: {
      project: "./tsconfig.json",  // Enables type-aware rules
    },
  },
  rules: {
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
  },
});
```

## GitHub Actions Integration

```yaml
- name: Lint
  run: bun run lint

- name: Format Check
  run: bun run format:check
```

Both commands must exit with code 0 for CI to pass.

## Related Requirements

- FR-005: Code quality enforcement through linting
- FR-007: Consistent code formatting configuration
- SC-004: 100% of committed code passes linting
- SC-005: CI/CD validates quality checks
- Constitution III: Code Quality Standards (strict TypeScript, Prettier)
- User Story 2, Scenario 3: Linter reports violations
