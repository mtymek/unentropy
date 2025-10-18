# Quickstart Guide: Basic Project Scaffolding

**Feature**: 001-basic-scaffolding  
**Date**: 2025-10-16  
**Target Audience**: Developers setting up the Unentropy project

## Overview

This guide walks you through setting up the Unentropy project with TypeScript, Bun, and all required development tools. After completing these steps, you'll have a fully functional development environment with type checking, testing, linting, and build capabilities.

**Time to complete**: ~5 minutes (per SC-001)

---

## Prerequisites

### System Requirements
- **Operating System**: Linux, macOS, or Windows (with WSL2)
- **Git**: Version 2.x or higher
- **Bun**: Version 1.3 or higher

### Install Bun

If you don't have Bun installed:

```bash
# Linux/macOS
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

Verify installation:
```bash
bun --version
# Expected: 1.2.x or higher
```

---

## Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url> unentropy
cd unentropy
```

### 2. Install Dependencies

```bash
bun install
```

**Expected output**:
```
bun install v1.2.x

+ typescript@5.9.3
+ eslint@9.x
+ prettier@3.x
[...dependencies installed]

Done in 1.2s
```

### 3. Verify TypeScript Configuration

Check that TypeScript is configured correctly:

```bash
bun run typecheck
```

**Expected output**:
```
✓ No type errors found
```

**Performance requirement**: Must complete in <5s (SC-002)

### 4. Run Tests

Execute the test suite:

```bash
bun test
```

**Expected output**:
```
bun test v1.3

tests/unit/example.test.ts:
✓ example test [0.12ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.45s]
```

**Performance requirement**: Must complete in <2s (SC-003)

### 5. Check Code Quality

Run linting and formatting checks:

```bash
# Lint code
bun run lint

# Check formatting
bun run format:check
```

**Expected output** (both commands):
```
✓ No violations found
```

**Success criteria**: 100% pass rate (SC-004)

### 6. Build the Project

Compile TypeScript to JavaScript:

```bash
bun run build
```

**Expected output**:
```
[dist] Build complete: dist/index.js
```

**Verification**:
```bash
ls dist/
# Expected: index.js, index.d.ts, index.js.map, index.d.ts.map
```

---

## Available Commands

All commands are defined in `package.json` scripts:

| Command | Description | Performance Goal |
|---------|-------------|------------------|
| `bun run build` | Compile TypeScript to dist/ | <5s |
| `bun test` | Run all tests | <2s (SC-003) |
| `bun test --watch` | Run tests in watch mode | N/A |
| `bun run typecheck` | Check TypeScript types | <5s (SC-002) |
| `bun run lint` | Check code quality | <10s |
| `bun run lint:fix` | Auto-fix linting issues | <10s |
| `bun run format` | Format all code | <5s |
| `bun run format:check` | Check formatting | <5s |

---

## Project Structure

```
unentropy/
├── src/                    # Application source code
│   ├── index.ts           # Main entry point
│   └── lib/               # Utility functions
├── tests/                 # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── contract/          # Contract tests
├── dist/                  # Build output (generated)
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
├── eslint.config.js       # ESLint configuration
├── .prettierrc            # Prettier configuration
├── bun.lockb              # Bun lockfile (binary)
└── README.md              # Project documentation
```

---

## Development Workflow

### 1. Make Code Changes
Edit files in `src/` directory using your preferred IDE.

**IDE Setup**:
- TypeScript support: Automatic (uses tsconfig.json)
- Auto-format on save: Configure IDE to use Prettier
- Real-time linting: Configure IDE to use ESLint

### 2. Run Tests in Watch Mode (Optional)
```bash
bun test --watch
```
Tests automatically re-run when files change.

### 3. Check Types During Development
```bash
bun run typecheck
```
Catch type errors early before committing.

### 4. Auto-fix Issues
```bash
# Fix linting issues
bun run lint:fix

# Format code
bun run format
```

### 5. Before Committing
Run all quality checks:
```bash
bun run typecheck && bun run lint && bun run format:check && bun test && bun run build
```

All commands must pass before pushing code.

---

## Troubleshooting

### Issue: `bun: command not found`
**Solution**: Install Bun (see Prerequisites section)

### Issue: Type errors in IDE
**Solution**: 
1. Restart TypeScript server in IDE
2. Run `bun install` to ensure dependencies are installed
3. Check `tsconfig.json` is present

### Issue: Tests failing
**Solution**:
1. Check test file syntax: `bun test <file>`
2. Review error messages for specific failures
3. Verify test matches expected behavior

### Issue: Linting errors
**Solution**:
1. Run `bun run lint:fix` to auto-fix
2. For remaining issues, manually fix based on error messages
3. See `contracts/code-quality.md` for ESLint rule details

### Issue: Build fails
**Solution**:
1. Ensure `bun run typecheck` passes first
2. Check for syntax errors in source files
3. Verify `tsconfig.json` configuration

### Issue: Slow performance
**Solution**:
1. Type check: Should be <5s (SC-002)
2. Test suite: Should be <2s (SC-003)
3. If exceeding, investigate specific bottlenecks

---

## Next Steps

### Adding New Features

1. **Create source file**: Add `.ts` file in `src/`
2. **Write tests**: Add `*.test.ts` file in `tests/unit/`
3. **Implement feature**: Write code with strict TypeScript
4. **Run checks**: Type check → lint → test → build
5. **Commit**: All quality checks must pass

### Writing Tests

```typescript
// tests/unit/my-feature.test.ts
import { test, expect } from "bun:test";
import { myFunction } from "@/lib/my-feature";

test("myFunction should work correctly", () => {
  const result = myFunction(input);
  expect(result).toBe(expected);
});
```

See `contracts/test-execution.md` for test API details.

### Configuring IDE

**VS Code** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.enable": true,
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

**WebStorm/IntelliJ**:
- Enable Prettier: Settings → Languages → Prettier → "On save"
- Enable ESLint: Settings → Languages → ESLint → "Automatic"

---

## CI/CD Integration

GitHub Actions automatically runs all quality checks on:
- **Push to main branch**
- **Pull requests**

**CI Pipeline steps**:
1. Install dependencies
2. Type check (must pass)
3. Lint (must pass)
4. Format check (must pass)
5. Test (must pass)
6. Build (must pass)

See `.github/workflows/ci.yml` for pipeline configuration.

---

## Success Criteria Checklist

After completing this guide, verify:

- ✅ Clone repository and run all commands in <5 minutes (SC-001)
- ✅ Type checking completes in <5s (SC-002)
- ✅ Test suite runs in <2s with zero failures (SC-003)
- ✅ All code passes linting (SC-004)
- ✅ CI/CD pipeline passes (SC-005)
- ✅ Understand all commands and project structure (SC-006)

---

## Additional Resources

- **TypeScript Configuration**: `contracts/typescript-config.md`
- **Test Writing Guide**: `contracts/test-execution.md`
- **Code Quality Standards**: `contracts/code-quality.md`
- **CI/CD Pipeline**: `contracts/ci-cd-pipeline.md`
- **Bun Documentation**: https://bun.sh/docs

---

## Getting Help

- **Documentation**: See `README.md` for project overview
- **Contracts**: Check `specs/001-basic-scaffolding/contracts/` for detailed specs
- **Constitution**: See `.specify/memory/constitution.md` for project principles

---

**Congratulations!** 🎉  
Your development environment is ready. You can now start building Unentropy features with confidence that type safety, testing, and code quality are enforced at every step.
