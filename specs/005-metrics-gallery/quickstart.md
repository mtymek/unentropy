# Quickstart: Metrics Gallery

**Feature**: 005-metrics-gallery  
**Audience**: Developers setting up metrics tracking  
**Time**: 5 minutes

## What is the Metrics Gallery?

The Metrics Gallery provides built-in metrics you can add to your project with a simple reference, instead of writing custom collection commands. Each built-in metric includes:

- Optimized collection command
- Appropriate unit (%, KB, seconds, etc.)
- Sensible defaults for thresholds
- Well-tested implementation

## Basic Usage

### 1. Reference a Built-in Metric

Instead of writing this:

```json
{
  "metrics": [
    {
      "name": "coverage",
      "type": "numeric",
      "command": "bun test --coverage --coverage-reporter=json | jq -r '.total.lines.pct'",
      "unit": "%"
    }
  ]
}
```

Simply write this:

```json
{
  "metrics": [
    {"$ref": "coverage"}
  ]
}
```

### 2. Use Multiple Built-in Metrics

```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "bundle-size"},
    {"$ref": "loc"}
  ]
}
```

### 3. Override Defaults

Customize any property while keeping other defaults:

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "name": "unit-test-coverage"
    },
    {
      "$ref": "bundle-size",
      "command": "du -k dist/main.js | cut -f1"
    }
  ]
}
```

### 4. Mix Built-in and Custom Metrics

```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "loc"},
    {
      "name": "custom-score",
      "type": "numeric",
      "command": "./scripts/calculate-score.sh"
    }
  ]
}
```

## Simplified Commands with CLI Helpers

For standard formats, you can use CLI helpers to simplify metric collection commands:

### Coverage Metrics

**Traditional (complex)**:
```json
{
  "$ref": "coverage",
  "command": "bun test --coverage --coverage-reporter=json 2>/dev/null | jq -r '.total.lines.pct' 2>/dev/null || echo '0'"
}
```

**CLI Helper (simplified)**:
```json
{
  "$ref": "coverage",
  "command": "bun test --coverage && unentropy collect coverage-json ./coverage/coverage.json"
}
```

**Available coverage formats**:
- `coverage-lcov <path>` - Parse LCOV format coverage reports
- `coverage-json <path>` - Parse JSON format coverage reports  
- `coverage-xml <path>` - Parse XML format coverage reports

### Bundle Size Metrics

**Traditional (complex)**:
```json
{
  "$ref": "bundle-size",
  "command": "find dist/ -name '*.js' -type f | xargs wc -c | tail -1 | awk '{print int($1/1024)}'"
}
```

**CLI Helper (simplified)**:
```json
{
  "$ref": "bundle-size",
  "command": "bun run build && unentropy collect size ./dist/"
}
```

**File size example**:
```json
{
  "$ref": "bundle-size",
  "command": "unentropy collect size ./dist/bundle.js"
}
```

### CLI Helper Benefits

- **Simple Commands**: Replace complex jq/awk pipelines with readable commands
- **Standard Formats**: Support industry-standard formats (LCOV, JSON, XML)
- **Tool Agnostic**: Work with any tool outputting standard formats
- **Error Handling**: Built-in error handling and sensible defaults
- **Optional**: You can still use custom commands when needed

## Available Metrics

### Coverage Metrics

| ID | Description | Unit | Threshold |
|----|-------------|------|-----------|
| `coverage` | Overall test coverage | % | No regression |
| `function-coverage` | Function coverage | % | No regression |

### Code Size Metrics

| ID | Description | Unit | Threshold |
|----|-------------|------|-----------|
| `loc` | Lines of code | lines | None |
| `bundle-size` | Production bundle size | KB | Max 5% increase |

### Performance Metrics

| ID | Description | Unit | Threshold |
|----|-------------|------|-----------|
| `build-time` | Build duration | seconds | Max 10% increase |
| `test-time` | Test suite duration | seconds | Max 10% increase |

### Dependency Metrics

| ID | Description | Unit | Threshold |
|----|-------------|------|-----------|
| `dependencies-count` | Direct dependencies | count | None |

## Common Patterns

### Track Code Health

```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "loc"},
    {"$ref": "dependencies-count"}
  ]
}
```

### Monitor Performance

```json
{
  "metrics": [
    {"$ref": "build-time"},
    {"$ref": "test-time"},
    {"$ref": "bundle-size"}
  ]
}
```

### Custom Names for Clarity

```json
{
  "metrics": [
    {
      "$ref": "coverage",
      "name": "frontend-coverage"
    },
    {
      "$ref": "coverage",
      "name": "backend-coverage",
      "command": "cd backend && bun test --coverage --coverage-reporter=json | jq -r '.total.lines.pct'"
    }
  ]
}
```

## With Quality Gates

Combine built-in metrics with quality gate thresholds:

```json
{
  "metrics": [
    {"$ref": "coverage"},
    {"$ref": "bundle-size"}
  ],
  "qualityGate": {
    "mode": "soft",
    "enablePullRequestComment": true,
    "thresholds": [
      {
        "metric": "coverage",
        "mode": "no-regression",
        "tolerance": 0.5
      },
      {
        "metric": "bundle-size",
        "mode": "delta-max-drop",
        "maxDropPercent": 5
      }
    ]
  }
}
```

## Troubleshooting

### "Invalid metric reference" Error

**Problem**: `Invalid metric reference: "$ref: unknown-metric"`

**Solution**: Check available metric IDs. Built-in metrics include:
- coverage
- function-coverage
- loc
- bundle-size
- build-time
- test-time
- dependencies-count

### Command Fails in Your Environment

**Problem**: Gallery command doesn't work for your project structure

**Solution**: Override the command:

```json
{
  "$ref": "loc",
  "command": "find lib/ -name '*.js' | xargs wc -l | tail -1 | awk '{print $1}'"
}
```

### CLI Helper Not Found

**Problem**: `unentropy collect coverage-json` command not found

**Solution**: Ensure you're using the latest version of Unentropy that includes CLI helper support. CLI helpers are available for:
- `coverage-lcov <path>` - LCOV format coverage reports
- `coverage-json <path>` - JSON format coverage reports
- `coverage-xml <path>` - XML format coverage reports
- `size <path>` - File or directory size in KB

### Name Conflicts

**Problem**: `Duplicate metric name "coverage" found`

**Solution**: Override the name to make it unique:

```json
{
  "$ref": "coverage",
  "name": "frontend-coverage"
}
```

## Next Steps

- See [config-schema.md](contracts/config-schema.md) for complete reference
- See [built-in-metrics.md](contracts/built-in-metrics.md) for detailed metric template definitions
- Check existing `unentropy.json` examples in the repository

## Tips

✅ **Do**: Start with built-in metrics and override only what you need  
✅ **Do**: Use built-in metrics for common patterns (coverage, size, performance)  
✅ **Do**: Mix built-in and custom metrics freely  
✅ **Do**: Use CLI helpers for standard formats to simplify commands  

❌ **Don't**: Override `type` - it's inherited from the built-in metric  
❌ **Don't**: Use uppercase or spaces in custom names  
❌ **Don't**: Duplicate metric names after resolution  
❌ **Don't**: Use CLI helpers for non-standard formats - use custom commands instead
