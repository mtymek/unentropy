# GitHub Action Interface Contract: Find Database

**Feature**: 002-find-database  
**Action Version**: 1.0.0  
**Last Updated**: Wed Nov 12 2025

## Overview

This document defines the interface contract for the `find-database` GitHub Action provided by Unentropy. This action finds and downloads the latest database artifact from previous successful workflow runs.

---

## Action: find-database

### Purpose

Search for and download the latest database artifact from previous successful workflow runs.

### Action Metadata

**Location**: `.github/actions/find-database/action.yml`

```yaml
name: 'Unentropy Find Database'
description: 'Find and download the latest metrics database artifact'
author: 'Unentropy Team'
branding:
  icon: 'download'
  color: 'orange'
```

### Inputs

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `database-artifact` | string | No | `unentropy-metrics` | Name of artifact to search for |
| `database-path` | string | No | `./unentropy-metrics.db` | Local path where database should be placed |
| `branch-filter` | string | No | `${{ github.ref_name }}` | Branch to search for previous runs |

**Input Specifications**:

#### `database-artifact`
- **Type**: Artifact name string
- **Validation**: Must match pattern `^[a-zA-Z0-9_-]+$`
- **Examples**:
  - `unentropy-metrics` (default)
  - `my-project-metrics`

#### `database-path`
- **Type**: File path string
- **Validation**: Must be a valid file path
- **Notes**: Directory created automatically if doesn't exist
- **Examples**:
  - `./unentropy-metrics.db` (default)
  - `./metrics/data.db`

#### `branch-filter`
- **Type**: Branch name string
- **Validation**: Valid Git branch name
- **Behavior**: Only searches for runs on specified branch
- **Examples**:
  - `${{ github.ref_name }}` (default)
  - `main`
  - `develop`

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `database-found` | boolean | Whether a previous database was found and downloaded |
| `database-path` | string | Path to the database file (may not exist if not found) |
| `source-run-id` | string | ID of the workflow run where database was found |

**Output Specifications**:

#### `database-found`
- **Type**: Boolean (as string)
- **Values**: `"true"` or `"false"`
- **Example**: `"true"`

#### `database-path`
- **Type**: File path string
- **Example**: `"./unentropy-metrics.db"`

#### `source-run-id`
- **Type**: Integer (as string)
- **Example**: `"123456789"`

### Usage Example

```yaml
name: Generate Report
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Find latest database
        id: find-db
        uses: ./.github/actions/find-database
        with:
          database-artifact: 'my-metrics'
          database-path: './my-metrics.db'
      
      - name: Check if database found
        if: steps.find-db.outputs.database-found == 'true'
        run: |
          echo "Database found from run ${{ steps.find-db.outputs.source-run-id }}"
          echo "Database path: ${{ steps.find-db.outputs.database-path }}"
      
      - name: Handle no database scenario
        if: steps.find-db.outputs.database-found == 'false'
        run: |
          echo "No database found - run collect action first"
          exit 1
```

### Error Handling

#### API Errors
- **GitHub API failure**: Action fails with clear error message
- **Rate limiting**: Action fails with retry suggestion
- **Insufficient permissions**: Action fails with permission requirements

#### Search Errors
- **No previous runs**: Sets `database-found=false`, continues successfully
- **No artifact found**: Sets `database-found=false`, continues successfully
- **Download failure**: Action fails with network error details

#### File System Errors
- **Invalid path**: Action fails with path validation error
- **Permission denied**: Action fails with file system error
- **Disk space**: Action fails with disk space error

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (database found and downloaded) |
| 0 | Success (no database found, first run scenario) |
| 1 | API failure |
| 1 | File system error |
| 1 | Invalid input |

---

## Versioning and Compatibility

### Action Versioning

Actions follow semantic versioning:
- `v1.0.0` - Initial release
- `v1.x.x` - Backward compatible updates
- `v2.0.0` - Breaking changes

### Usage in Workflows

```yaml
# Pin to major version (recommended)
- uses: ./.github/actions/find-database@v1

# Pin to minor version (more stable)
- uses: ./.github/actions/find-database@v1.0

# Pin to exact version (most stable)
- uses: ./.github/actions/find-database@v1.0.0
```

---

## Testing Contracts

### Unit Test Requirements

1. All inputs are validated
2. Default values are applied correctly
3. Outputs are set with correct values
4. Error messages are clear and actionable

### Integration Test Requirements

1. Action works in actual GitHub Actions environment
2. Artifacts are searched and downloaded correctly
3. No database scenario is handled gracefully
4. Concurrent runs don't interfere with each other

---

## Security Considerations

### Permissions

The action requires:
- `contents: read` - Read repository files
- `actions: read` - List and download artifacts

No additional permissions needed (no secrets, no network access except GitHub API).

### Input Validation

- All file paths are validated to prevent path traversal
- Artifact names are validated to prevent injection
- Branch names are validated to prevent command injection

---

## Deprecation Policy

Deprecated features will be supported for at least 6 months:
1. Announcement in release notes
2. Warning logs when deprecated feature is used
3. Documentation update with migration guide
4. Removal in next major version
