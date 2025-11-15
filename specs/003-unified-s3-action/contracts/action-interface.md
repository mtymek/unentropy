# GitHub Action Interface: Track-Metrics S3-Compatible Storage Action

**Date**: Thu Nov 13 2025  
**Purpose**: Define the GitHub Action interface for track-metrics workflow

## Action Definition

### Action Metadata

```yaml
name: 'Unentropy Track Metrics'
description: 'Complete metrics workflow with S3-compatible storage support'
author: 'Unentropy'
branding:
  icon: 'bar-chart'
  color: 'blue'
```

### Input Parameters

```yaml
inputs:
  # Storage Configuration
  storage-type:
    description: 'Storage backend type (sqlite-local, sqlite-artifact, or sqlite-s3)'
    required: true
    default: 'sqlite-local'
  
  # S3 Configuration (overrides unentropy.json, required for credentials)
  s3-endpoint:
    description: 'S3-compatible endpoint URL (overrides config file)'
    required: false
  s3-bucket:
    description: 'S3 bucket name (overrides config file)'
    required: false
  s3-region:
    description: 'S3 region (overrides config file)'
    required: false
  s3-access-key-id:
    description: 'S3 access key ID (from GitHub Secrets, required for S3)'
    required: false
  s3-secret-access-key:
    description: 'S3 secret access key (from GitHub Secrets, required for S3)'
    required: false
  
  # Configuration File
  config-file:
    description: 'Path to unentropy.json configuration file'
    required: false
    default: 'unentropy.json'
  
  # Database Configuration
  database-key:
    description: 'Database file key in storage'
    required: false
    default: 'unentropy-metrics.db'
  
  # Report Configuration
  report-name:
    description: 'Generated report file name'
    required: false
    default: 'unentropy-report.html'
```

### Output Parameters

```yaml
outputs:
  success:
    description: 'Whether the workflow completed successfully'
    value: ${{ steps.track-metrics.outputs.success }}
   
  storage-type:
    description: 'Storage backend type used'
    value: ${{ steps.track-metrics.outputs.storage-type }}
   
  database-location:
    description: 'Database storage location identifier'
    value: ${{ steps.track-metrics.outputs.database-location }}
   
  database-size:
    description: 'Database file size in bytes'
    value: ${{ steps.track-metrics.outputs.database-size }}
   
  metrics-collected:
    description: 'Number of metrics collected'
    value: ${{ steps.track-metrics.outputs.metrics-collected }}
   
  duration:
    description: 'Total workflow duration in milliseconds'
    value: ${{ steps.track-metrics.outputs.duration }}
```

## Configuration Precedence

The track-metrics action uses a hierarchical configuration system with the following precedence (highest to lowest):

1. **Action Inputs** (highest priority)
   - Override all other configuration sources
   - Used for secrets and runtime-specific values
   - Environment variables automatically expanded by GitHub Actions
   - Example: `s3-bucket: ${{ secrets.S3_BUCKET }}`

2. **Configuration File** (lowest priority)
   - Provides defaults and documentation
   - Contains non-sensitive configuration
   - Example: `unentropy.json`

### Configuration Split Strategy

**Sensitive Data (Action Inputs from GitHub Secrets):**
- S3 credentials (`s3-access-key-id`, `s3-secret-access-key`)
- Runtime overrides for different environments

**Non-Sensitive Data (Configuration File):**
- Default S3 settings (`endpoint`, `region`, `bucket`)
- Database configuration (`key`)
- Report settings (`name`)
- Metric collection rules

### Example Configuration Flow

```yaml
# unentropy.json (defaults, non-sensitive)
{
  "storage": {
    "type": "s3",
    "s3": {
      "endpoint": "https://s3.amazonaws.com",
      "region": "us-east-1",
      "bucket": "my-default-bucket"
    }
  },
  "database": {
    "key": "unentropy.db"
  }
}

```yaml
# GitHub Action (secrets + overrides)
- uses: ./actions/track-metrics
  with:
    storage-type: 'sqlite-s3'
    s3-bucket: ${{ secrets.S3_BUCKET }}  # Overrides config file
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    # endpoint, region come from config file
```

## Usage Examples

### Basic Usage (GitHub Artifacts)

```yaml
name: Metrics Collection
on:
  push:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Collect Metrics
      uses: ./actions/track-metrics
      with:
        storage-type: 'sqlite-artifact'
        config-file: 'unentropy.json'
```

### S3 Storage Usage (Hybrid Configuration)

```yaml
name: Metrics Collection with S3
on:
  push:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Collect Metrics
      uses: ./actions/track-metrics
      with:
        storage-type: 'sqlite-s3'
           # S3 credentials from secrets (override config file)
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
          # Optional: Override specific S3 settings from config file
          s3-bucket: ${{ secrets.S3_BUCKET }}
          # endpoint, region come from unentropy.json unless overridden here
```

### Advanced Configuration (Full Override)

```yaml
name: Advanced Metrics Collection
on:
  push:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      
        - name: Collect Metrics
         uses: ./actions/track-metrics
         id: metrics
        with:
          storage-type: 'sqlite-s3'
          # All S3 settings from secrets (complete override)
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
          # Runtime overrides
          database-key: 'production/unentropy.db'
          report-name: 'metrics-report-${{ github.sha }}.html'
          timeout: '600'
          retry-attempts: '5'
          verbose: 'true'
      
      - name: Upload Report
        if: steps.metrics.outputs.success == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: metrics-report
          path: ${{ steps.metrics.outputs.report-url }}
```

### Environment-Based Configuration

```yaml
name: Environment-Based Metrics
on:
  push:
    branches: [ main ]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Collect Metrics
        uses: ./actions/track-metrics
        with:
          # Only provide S3 credentials when using S3
          s3-access-key-id: ${{ github.ref == 'refs/heads/main' && secrets.S3_ACCESS_KEY_ID || '' }}
          s3-secret-access-key: ${{ github.ref == 'refs/heads/main' && secrets.S3_SECRET_ACCESS_KEY || '' }}
          # Other settings come from unentropy.json
```

## Security Considerations

### Credential Protection

- All S3 credentials are passed as action inputs from GitHub Secrets
- Credentials are never logged or exposed in error messages
- Input validation prevents credential injection
- Temporary credential storage in memory only

### Data Protection

- Database files are validated for integrity
- Temporary files are cleaned up after processing
- No sensitive data is included in action outputs
- Error messages are sanitized to remove secrets

### Access Control

- Action respects GitHub repository permissions
- S3 access is limited to specified bucket and operations
- No cross-repository data access
- Audit logging for storage operations

## Performance Considerations

### Timeout Handling

- Default timeout: 5 minutes
- Configurable timeout per workflow needs
- Phase-specific timeouts for long operations
- Graceful degradation on timeout

### Retry Logic

- Exponential backoff for retryable errors
- Maximum retry attempts configurable
- Non-retryable errors fail immediately
- Retry status logging for debugging

### Resource Usage

- Memory usage optimized for large database files
- Streaming operations for file transfers
- Concurrent operations where safe
- Cleanup of temporary resources

## Migration Support

### Automatic Migration

When switching from GitHub Artifacts to S3 storage:

1. Action detects S3 configuration
2. Downloads existing database from Artifacts
3. Uploads database to S3 storage
4. Continues workflow with S3 backend
5. Logs migration completion

### Migration Validation

- Verify database integrity after migration
- Confirm S3 upload success
- Validate S3 download capability
- Report migration status in outputs
