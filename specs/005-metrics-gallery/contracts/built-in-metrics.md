# Built-in Metrics Registry Contract

**Feature**: 005-metrics-gallery  
**Version**: 1.0.0  
**Last Updated**: 2025-11-22

## Overview

This contract defines the built-in metrics available in the Metrics Gallery. Each metric provides metadata (name, description, type, unit) but does NOT include commands. Commands must always be specified in the user's `unentropy.json` configuration to support different project technologies and tooling setups.

## Registry Structure

```typescript
interface MetricTemplate {
  id: string;           // Unique identifier for $ref
  name: string;         // Default metric name
  description: string;  // What the metric measures
  type: 'numeric' | 'label';
  unit?: string;        // Display unit
}
```

## Built-in Metrics

### Coverage Metrics

#### 1. coverage

```typescript
{
  id: 'coverage',
  name: 'coverage',
  description: 'Overall test coverage percentage across the codebase',
  type: 'numeric',
  unit: '%'
}
```

**Recommended Threshold**: `no-regression` with tolerance 0.5%

**Common Command Examples**:

**Traditional (complex)**:
- Bun: `bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r ".total.lines.pct" 2>/dev/null || echo "0"`
- Jest: `npm test -- --coverage --json | jq -r ".coverageMap.total.lines.pct"`
- Pytest: `pytest --cov --cov-report=json | jq -r ".totals.percent_covered"`

**CLI Helper (simplified)**:
- Bun: `bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json`
- Jest: `npm test -- --coverage && unentropy collect coverage-json ./coverage/coverage.json`
- Pytest: `pytest --cov --cov-report=json && unentropy collect coverage-json ./coverage.json`
- LCOV format: `unentropy collect coverage-lcov ./coverage/lcov.info`
- XML format: `unentropy collect coverage-xml ./coverage/coverage.xml`

---

#### 2. function-coverage

```typescript
{
  id: 'function-coverage',
  name: 'function-coverage',
  description: 'Percentage of functions covered by tests',
  type: 'numeric',
  unit: '%'
}
```

**Recommended Threshold**: `no-regression` with tolerance 0.5%

**Common Command Examples**:

**Traditional (complex)**:
- Bun: `bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r ".total.functions.pct" 2>/dev/null || echo "0"`
- Jest: `npm test -- --coverage --json | jq -r ".coverageMap.total.functions.pct"`

**CLI Helper (simplified)**:
- Bun: `bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json`
- Jest: `npm test -- --coverage && unentropy collect coverage-json ./coverage/coverage.json`
- LCOV format: `unentropy collect coverage-lcov ./coverage/lcov.info`
- XML format: `unentropy collect coverage-xml ./coverage/coverage.xml`

---

### Code Size Metrics

#### 3. loc

```typescript
{
  id: 'loc',
  name: 'loc',
  description: 'Total lines of code in the codebase (excluding blanks and comments)',
  type: 'numeric',
  unit: 'lines'
}
```

**Recommended Threshold**: None (informational metric)

**Common Command Examples**:

**SCC-based (recommended)**:
- Basic: `unentropy collect loc ./src/`
- Exclude directories: `unentropy collect loc ./src/ --exclude dist node_modules .git`
- TypeScript only: `unentropy collect loc ./ --language TypeScript`
- Combined: `unentropy collect loc ./src/ --exclude dist node_modules --language TypeScript`

**Traditional (shell-based, no external tool)**:
- TypeScript: `find src/ -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0"`
- JavaScript: `find src/ -name "*.js" -o -name "*.jsx" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0"`
- Python: `find src/ -name "*.py" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0"`

**SCC JSON parsing (for advanced use cases)**:
- Manual: `scc --format json ./src/ | jq -r '.[] | select(.Name == "Total") | .Code'`

---

#### 4. bundle-size

```typescript
{
  id: 'bundle-size',
  name: 'bundle-size',
  description: 'Total size of production build artifacts',
  type: 'numeric',
  unit: 'KB'
}
```

**Recommended Threshold**: `delta-max-drop` with 5% maximum increase

**Common Command Examples**:

**Traditional (complex)**:
- JavaScript: `find dist/ -name "*.js" -type f 2>/dev/null | xargs wc -c 2>/dev/null | tail -1 | awk '{print int($1/1024)}' || echo "0"`
- Webpack: `du -sk dist/ | cut -f1`
- Specific file: `du -k dist/bundle.js | cut -f1`

**CLI Helper (simplified)**:
- Build directory: `bun run build && unentropy collect size ./dist/`
- Specific file: `unentropy collect size ./dist/bundle.js`
- Multiple files: `unentropy collect size ./dist/*.js`
- Webpack output: `npm run build && unentropy collect size ./build/`

---

### Performance Metrics

#### 5. build-time

```typescript
{
  id: 'build-time',
  name: 'build-time',
  description: 'Time taken to complete the build',
  type: 'numeric',
  unit: 'seconds'
}
```

**Recommended Threshold**: `delta-max-drop` with 10% maximum increase

**Common Command Examples**:

**Traditional (complex)**:
- Bun: `(time bun run build) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "0"`
- npm: `(time npm run build) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "0"`
- Custom: Use project-specific build command with `time` wrapper

**CLI Helper (simplified)**:
- Bun: `time bun run build` (output parsed automatically by shell)
- npm: `time npm run build` (output parsed automatically by shell)
- Note: CLI helpers don't currently support timing - use traditional approach or custom script

---

#### 6. test-time

```typescript
{
  id: 'test-time',
  name: 'test-time',
  description: 'Time taken to run all tests',
  type: 'numeric',
  unit: 'seconds'
}
```

**Recommended Threshold**: `delta-max-drop` with 10% maximum increase

**Common Command Examples**:

**Traditional (complex)**:
- Bun: `(time bun test) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "0"`
- Jest: `(time npm test) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "0"`
- Pytest: `(time pytest) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "0"`

**CLI Helper (simplified)**:
- Bun: `time bun test` (output parsed automatically by shell)
- Jest: `time npm test` (output parsed automatically by shell)
- Note: CLI helpers don't currently support timing - use traditional approach or custom script

---

### Dependency Metrics

#### 7. dependencies-count

```typescript
{
  id: 'dependencies-count',
  name: 'dependencies-count',
  description: 'Total number of direct dependencies',
  type: 'numeric',
  unit: 'count'
}
```

**Recommended Threshold**: None (monitoring only)

**Common Command Examples**:

**Traditional (complex)**:
- Node.js: `cat package.json | jq ".dependencies | length" 2>/dev/null || echo "0"`
- Python: `cat requirements.txt | wc -l`
- Go: `go list -m all | wc -l`

**CLI Helper (simplified)**:
- Node.js: `cat package.json | jq ".dependencies | length"`
- Python: `wc -l requirements.txt`
- Go: `go list -m all | wc -l`
- Note: CLI helpers don't currently support dependency counting - use traditional approach or custom script

---

## CLI Helpers

Unentropy provides CLI helpers to simplify metric collection for standard formats. CLI helpers are optional - you can still use traditional commands when needed.

### Available CLI Helpers

| CLI Helper | Description | Supported Formats | Example Usage |
|------------|-------------|-------------------|--------------|
| `loc <path>` | Count lines of code using SCC | Any directory | `unentropy collect loc ./src/` |
| `loc <path> --exclude <patterns>` | Count LOC excluding directories | Any directory with exclusions | `unentropy collect loc ./src/ --exclude dist node_modules` |
| `loc <path> --language <lang>` | Count LOC for specific language | Any directory with language filter | `unentropy collect loc ./ --language TypeScript` |
| `coverage-lcov <path>` | Parse LCOV coverage reports | LCOV format | `unentropy collect coverage-lcov ./coverage/lcov.info` |
| `coverage-json <path>` | Parse JSON coverage reports | JSON format | `unentropy collect coverage-json ./coverage/coverage.json` |
| `coverage-xml <path>` | Parse XML coverage reports | XML format | `unentropy collect coverage-xml ./coverage/coverage.xml` |
| `size <path>` | Calculate file/directory size | Files and directories | `unentropy collect size ./dist/` |

### CLI Helper Benefits

- **Simplified Commands**: Replace complex jq/awk pipelines with readable commands
- **Standard Formats**: Support industry-standard formats (LCOV, JSON, XML)
- **Tool Agnostic**: Work with any tool outputting standard formats
- **Error Handling**: Built-in error handling and sensible defaults
- **Optional**: You can still use custom commands when needed

### CLI Helper Limitations

CLI helpers currently support:
- ✅ Lines of code counting (via SCC with exclusions and language filtering)
- ✅ Coverage reports (LCOV, JSON, XML formats)
- ✅ File/directory size calculations
- ❌ Timing measurements (use traditional approach)
- ❌ Dependency counting (use traditional approach)

For unsupported metrics, continue using traditional command examples or create custom scripts.

## Usage Notes

**Important**: Built-in metrics are metadata templates only. The `command` field must always be provided in your `unentropy.json` configuration. This design allows Unentropy to support different programming languages, testing frameworks, and build tools.

### SCC Requirement for LOC Metric

The `loc` metric uses SCC (Sloc Cloc and Code) for fast and accurate code counting. SCC is not installed by default and must be available in your environment:

**Installation**:
- **macOS**: `brew install scc`
- **Linux**: Download from https://github.com/boyter/scc/releases
- **GitHub Actions**: Add download step in your workflow (see quickstart guide)

If SCC is not available, you can use the traditional shell-based commands (see Traditional command examples above), though they will be slower and less accurate.

### Why Commands Are Required

1. **Technology Agnostic**: Your project may use Bun, Node.js, Python, Go, or any other technology
2. **Tooling Flexibility**: Different projects use different test runners, coverage tools, and build systems
3. **Custom Paths**: Your source code and build output directories may have different names
4. **Project-Specific Setup**: Some projects need environment setup or specific flags

### Command Examples vs Requirements

The "Common Command Examples" provided for each metric are illustrative only. You should:
- Adapt commands to match your project's structure and tooling
- Test commands locally before adding to configuration
- Ensure commands work in GitHub Actions environment
- Follow your project's conventions for directory names and file patterns

## Override Examples

### Using Built-in Metric with Custom Command

```json
{
  "$ref": "coverage",
  "command": "npm run test:coverage -- --json | jq -r '.coverage.total'"
}
```

### Using Built-in Metric with Different Source Directory

```json
{
  "$ref": "loc",
  "command": "unentropy collect loc ./lib/"
}
```

### Using Built-in Metric with Exclusions

```json
{
  "$ref": "loc",
  "command": "unentropy collect loc ./src/ --exclude dist node_modules .git"
}
```

### Using Built-in Metric with Language Filter

```json
{
  "$ref": "loc",
  "command": "unentropy collect loc ./ --language TypeScript"
}
```

### Using Built-in Metric for Different Technology

```json
{
  "$ref": "coverage",
  "command": "pytest --cov --cov-report=json | jq -r '.totals.percent_covered'"
}
```

## Validation Requirements

### Metric Definition Validation

Built-in metric templates must:
1. Have a unique `id` following lowercase-with-hyphens convention
2. Include a clear `description` explaining what the metric measures
3. Specify correct `type` (numeric or label)
4. Include appropriate `unit` for numeric metrics
5. Be grouped into logical categories

### User Configuration Validation

When users reference built-in metrics:
1. The `$ref` must match an existing built-in metric ID
2. A `command` field MUST always be provided (not inherited from template)
3. Command output must match the metric type (numeric value for numeric metrics)
4. All standard MetricConfig validation rules apply

## Extensibility

### Future Metrics

New built-in metrics may be added in future versions following these guidelines:

1. **ID Convention**: lowercase-with-hyphens
2. **Category Grouping**: coverage, size, quality, security, performance, dependencies
3. **Clear Description**: Explain what the metric measures and why it's useful
4. **Documentation**: Include recommended thresholds and common command examples for popular technologies
5. **Backward Compatibility**: New metrics don't affect existing IDs

### Technology-Specific Examples

Future documentation may include comprehensive command examples for different ecosystems:
- JavaScript/TypeScript (Bun, Node.js, Deno)
- Python (pytest, unittest, coverage.py)
- Go (go test, go vet)
- Java (Maven, Gradle, JaCoCo)
- Ruby (RSpec, SimpleCov)
- Rust (cargo test, tarpaulin)

Currently, each built-in metric includes common examples for popular tools.

## Testing Requirements

Each built-in metric should have:

1. **Unit Test**: Verify metric definition is valid
2. **Command Test**: Execute command in test environment, verify output format
3. **Integration Test**: Resolve metric from registry, collect value, store in DB

## Version History

**1.0.0** (2025-11-22):
- Initial registry with 7 built-in metrics
- Coverage: coverage, function-coverage
- Size: loc, bundle-size
- Performance: build-time, test-time
- Dependencies: dependencies-count
