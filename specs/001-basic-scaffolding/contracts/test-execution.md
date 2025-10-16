# Test Execution Contract

**Entity**: Bun Test Runner  
**Version**: 1.0  
**Date**: 2025-10-16

## Purpose

Defines the contract for test execution using Bun's built-in test runner, ensuring test discovery, execution, and reporting meet requirements FR-004, FR-008, and SC-003.

## Test File Structure

### File Naming Convention
```typescript
interface TestFilePattern {
  pattern: "**/*.test.ts";           // REQUIRED: All test files must match
  location: "tests/**/*.test.ts";    // REQUIRED: Must be in tests/ directory
  subdirectories: [
    "tests/unit/",                   // Unit tests
    "tests/integration/",            // Integration tests
    "tests/contract/"                // Contract tests
  ];
}
```

### Test File Template
```typescript
// tests/unit/example.test.ts
import { test, expect, describe, beforeEach, afterEach } from "bun:test";

describe("Feature Name", () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  test("should perform expected behavior", () => {
    const result = someFunction();
    expect(result).toBe(expectedValue);
  });

  test("should handle edge case", () => {
    expect(() => errorFunction()).toThrow();
  });
});
```

## API Contract

### Required Test Functions
```typescript
// Imported from "bun:test"
interface TestAPI {
  test(name: string, fn: () => void | Promise<void>): void;
  describe(name: string, fn: () => void): void;
  beforeEach(fn: () => void | Promise<void>): void;
  afterEach(fn: () => void | Promise<void>): void;
  beforeAll(fn: () => void | Promise<void>): void;
  afterAll(fn: () => void | Promise<void>): void;
}
```

### Required Assertion Functions
```typescript
// Imported from "bun:test"
interface ExpectAPI {
  expect(actual: any): Matchers;
}

interface Matchers {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toThrow(error?: string | RegExp): void;
  toContain(item: any): void;
  toHaveLength(length: number): void;
  // ... additional Jest-compatible matchers
}
```

## Execution Contract

### Command Interface
```typescript
interface TestCommands {
  run: "bun test";                          // Execute all tests once
  watch: "bun test --watch";                // Watch mode (re-run on changes)
  single: "bun test <path>";                // Run specific test file
  pattern: "bun test --test-name-pattern"; // Run tests matching pattern
}
```

### Performance Requirements (SC-003)
```typescript
interface PerformanceContract {
  maxExecutionTime: 2000;                   // 2 seconds for full test suite
  unit: "milliseconds";
  enforcement: "CI/CD pipeline failure if exceeded";
}
```

### Exit Codes
```typescript
interface ExitCodes {
  success: 0;                               // All tests passed
  failure: 1;                               // One or more tests failed
  error: 2;                                 // Test execution error
}
```

## Output Contract

### Console Output Format
```
bun test v1.3

tests/unit/example.test.ts:
✓ Feature Name > should perform expected behavior [0.12ms]
✓ Feature Name > should handle edge case [0.08ms]

 2 pass
 0 fail
 2 expect() calls
Ran 2 tests across 1 files. [45.00ms]
```

### GitHub Actions Integration
```typescript
interface GitHubActionsOutput {
  annotations: true;                        // Automatic error annotations
  format: "GitHub Actions";                 // Native format support
  failedTests: {
    file: string;
    line: number;
    message: string;
  }[];
}
```

### JUnit XML Output (Optional)
```bash
bun test --reporter=junit > test-results.xml
```

## Validation Rules

### 1. Test Discovery
- Must discover all `*.test.ts` files in `tests/` directory
- Must respect subdirectory structure (unit, integration, contract)
- Must not execute non-test files

### 2. Test Execution
- All tests must execute sequentially or concurrently as appropriate
- Failed tests must not prevent other tests from running
- Async tests must be properly awaited

### 3. Performance
- Full test suite must complete in <2 seconds (SC-003)
- Individual test timeouts can be configured if needed

### 4. Error Reporting
- Failed assertions must show actual vs expected values
- Stack traces must include file path and line number
- Error messages must be clear and actionable

## Success Criteria

✅ All tests discovered automatically (FR-004)  
✅ Sample tests provided (FR-008)  
✅ Test suite completes in <2s (SC-003)  
✅ Zero failures on clean build  
✅ GitHub Actions integration works (SC-005)

## Example Test Scenarios

### Unit Test Example
```typescript
// tests/unit/math.test.ts
import { test, expect } from "bun:test";
import { add } from "@/lib/math";

test("add() should sum two numbers", () => {
  expect(add(2, 3)).toBe(5);
});

test("add() should handle negative numbers", () => {
  expect(add(-2, -3)).toBe(-5);
});
```

### Integration Test Example
```typescript
// tests/integration/workflow.test.ts
import { test, expect, describe } from "bun:test";

describe("Workflow Integration", () => {
  test("should complete end-to-end flow", async () => {
    const result = await runWorkflow();
    expect(result.success).toBe(true);
  });
});
```

### Contract Test Example
```typescript
// tests/contract/api.test.ts
import { test, expect } from "bun:test";

test("API response should match contract", () => {
  const response = { status: 200, data: {} };
  expect(response).toHaveProperty("status");
  expect(response).toHaveProperty("data");
});
```

## Enforcement

- **Development**: `bun test --watch` for immediate feedback
- **Pre-commit**: Optional git hook to run tests before commit
- **CI/CD**: GitHub Actions runs `bun test` and fails build on test failures
- **Performance**: CI monitors test execution time against 2s threshold

## Related Requirements

- FR-004: Automated testing capabilities
- FR-008: Sample test files demonstrating patterns
- SC-003: Test suite executes in <2s
- SC-005: CI/CD environment runs tests successfully
- Constitution V: Testing Discipline
- User Story 2, Scenario 2: Watch mode for iterative development
