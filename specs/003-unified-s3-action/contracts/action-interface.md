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
    description: 'Storage backend type (artifact or s3)'
    required: true
    default: 'artifact'
  
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
    default: 'unentropy.db'
  
  # Report Configuration
  report-name:
    description: 'Generated report file name'
    required: false
    default: 'unentropy-report.html'
  
  # Advanced Options
  timeout:
    description: 'Action timeout in seconds'
    required: false
    default: '300'
  retry-attempts:
    description: 'Number of retry attempts for storage operations'
    required: false
    default: '3'
  verbose:
    description: 'Enable verbose logging'
    required: false
    default: 'false'
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
   
  report-url:
    description: 'URL to generated report (if available)'
    value: ${{ steps.track-metrics.outputs.report-url }}
   
  metrics-collected:
    description: 'Number of metrics collected'
    value: ${{ steps.track-metrics.outputs.metrics-collected }}
   
  duration:
    description: 'Total workflow duration in milliseconds'
    value: ${{ steps.track-metrics.outputs.duration }}
   
  error-code:
    description: 'Error code (if failed)'
    value: ${{ steps.track-metrics.outputs.error-code }}
   
  error-message:
    description: 'Error message (if failed)'
    value: ${{ steps.track-metrics.outputs.error-message }}
```

## Action Implementation

### Action Entry Point

```typescript
// src/actions/track-metrics.ts
import { getInput, setOutput, setFailed, info, warning } from '@actions/core';
import { context } from '@actions/github';
import { TrackMetricsActionContext } from '../storage/context';
import { StorageConfiguration } from '../config/schema';

async function run(): Promise<void> {
  try {
    // Parse inputs
    const inputs = parseActionInputs();
    
    // Load configuration from file
    const fileConfig = await loadConfiguration(inputs.configFile);
    
    // Merge configuration with precedence: Inputs > File
    const mergedConfig = mergeConfiguration(fileConfig, inputs);
    
    // Validate merged configuration
    validateMergedConfig(mergedConfig, inputs);
    
    // Create track-metrics context
    const trackMetricsContext = new TrackMetricsActionContext(
      mergedConfig,
      inputs,
      process.env.GITHUB_TOKEN!
    );
    
    // Execute workflow
    const result = await trackMetricsContext.execute();
    
    // Set outputs
    setActionOutputs(result);
    
    // Handle result
    if (result.success) {
      info(`✅ Track-metrics workflow completed successfully`);
      info(`📊 Storage: ${result.databaseLocation}`);
      info(`📈 Metrics collected: ${result.phases.find(p => p.name === 'collect')?.metadata?.metricsCount || 0}`);
      if (result.reportUrl) {
        info(`📋 Report: ${result.reportUrl}`);
      }
    } else {
      setFailed(`❌ Workflow failed: ${result.error?.message}`);
    }
    
  } catch (error) {
    setFailed(`❌ Action failed: ${error.message}`);
  }
}

function parseActionInputs(): ActionInputs {
  return {
    storageType: getInput('storage-type', { required: true }) as 'artifact' | 's3',
    s3Endpoint: getInput('s3-endpoint'),
    s3Bucket: getInput('s3-bucket'),
    s3Region: getInput('s3-region'),
    s3AccessKeyId: getInput('s3-access-key-id'),
    s3SecretAccessKey: getInput('s3-secret-access-key'),
    configFile: getInput('config-file') || 'unentropy.json',
    databaseKey: getInput('database-key') || 'unentropy.db',
    reportName: getInput('report-name') || 'unentropy-report.html',
    timeout: parseInt(getInput('timeout') || '300') * 1000,
    retryAttempts: parseInt(getInput('retry-attempts') || '3'),
    verbose: getInput('verbose') === 'true'
  };
}

function mergeConfiguration(configFile: StorageConfiguration, inputs: ActionInputs): MergedConfiguration {
  // Configuration precedence: Action Inputs > Environment Variables > Config File
  const merged: MergedConfiguration = {
    storage: {
      type: inputs.storageType || configFile.storage?.type || 'artifact'
    },
    database: {
      key: inputs.databaseKey || configFile.database?.key || 'unentropy.db'
    },
    report: {
      name: inputs.reportName || configFile.report?.name || 'unentropy-report.html'
    }
  };

  // Merge S3 configuration with precedence
  if (merged.storage.type === 's3') {
    merged.storage.s3 = {
      endpoint: inputs.s3Endpoint || configFile.storage?.s3?.endpoint,
      bucket: inputs.s3Bucket || configFile.storage?.s3?.bucket,
      region: inputs.s3Region || configFile.storage?.s3?.region
    };
  }

  return merged;
}

function setActionOutputs(result: ActionResult): void {
  setOutput('success', result.success);
  setOutput('storage-type', result.databaseLocation.startsWith('s3://') ? 's3' : 'artifact');
  setOutput('database-location', result.databaseLocation);
  setOutput('database-size', result.phases.find(p => p.name === 'upload')?.metadata?.fileSize || 0);
  setOutput('report-url', result.reportUrl || '');
  setOutput('metrics-collected', result.phases.find(p => p.name === 'collect')?.metadata?.metricsCount || 0);
  setOutput('duration', result.duration);
  setOutput('error-code', result.error?.code || '');
  setOutput('error-message', result.error?.message || '');
}

if (require.main === module) {
  run();
}
```

### Input Validation

```typescript
interface ActionInputs {
  storageType: 'artifact' | 's3';
  s3Endpoint?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  configFile: string;
  databaseKey: string;
  reportName: string;
  timeout: number;
  retryAttempts: number;
  verbose: boolean;
}

interface MergedConfiguration {
  storage: {
    type: 'artifact' | 's3';
    s3?: {
      endpoint?: string;
      bucket?: string;
      region?: string;
    };
  };
  database: {
    key: string;
  };
  report: {
    name: string;
  };
}

function validateMergedConfig(config: MergedConfiguration, inputs: ActionInputs): void {
  // Validate storage type
  if (!['artifact', 's3'].includes(config.storage.type)) {
    throw new Error(`Invalid storage-type: ${config.storage.type}. Must be 'artifact' or 's3'`);
  }
  
  // Validate S3 configuration when S3 storage is selected
  if (config.storage.type === 's3') {
    // Credentials must come from action inputs (security requirement)
    if (!inputs.s3AccessKeyId || !inputs.s3SecretAccessKey) {
      throw new Error(`S3 credentials (access-key-id, secret-access-key) must be provided as action inputs from GitHub Secrets`);
    }
    
    // S3 settings can come from inputs or config file
    const s3Config = config.storage.s3!;
    if (!s3Config.endpoint || !s3Config.bucket || !s3Config.region) {
      const missing = [];
      if (!s3Config.endpoint) missing.push('endpoint');
      if (!s3Config.bucket) missing.push('bucket');
      if (!s3Config.region) missing.push('region');
      throw new Error(`Missing required S3 configuration: ${missing.join(', ')}. Provide via action inputs or unentropy.json`);
    }
    
    // Validate S3 endpoint URL
    try {
      new URL(s3Config.endpoint!);
    } catch {
      throw new Error(`Invalid S3 endpoint URL: ${s3Config.endpoint}`);
    }
  }
  
  // Validate timeout
  if (inputs.timeout < 30000) { // Minimum 30 seconds
    throw new Error(`Timeout must be at least 30 seconds`);
  }
  
  // Validate retry attempts
  if (inputs.retryAttempts < 0 || inputs.retryAttempts > 10) {
    throw new Error(`Retry attempts must be between 0 and 10`);
  }
}
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
    storage-type: 's3'
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
          storage-type: 'artifact'
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
          storage-type: 's3'
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
          storage-type: 's3'
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
           # Use S3 for main branch, artifacts for others
           storage-type: ${{ github.ref == 'refs/heads/main' && 's3' || 'artifact' }}
           # Only provide S3 credentials when using S3
           s3-access-key-id: ${{ github.ref == 'refs/heads/main' && secrets.S3_ACCESS_KEY_ID || '' }}
           s3-secret-access-key: ${{ github.ref == 'refs/heads/main' && secrets.S3_SECRET_ACCESS_KEY || '' }}
           # Other settings come from unentropy.json
```

## Error Handling

### Error Codes

| Error Code | Description | Retryable | User Action |
|------------|-------------|------------|--------------|
| `CONFIG_INVALID` | Invalid configuration file | No | Fix configuration |
| `STORAGE_CONNECTION` | Cannot connect to storage | Yes | Check credentials/network |
| `STORAGE_PERMISSION` | Insufficient storage permissions | No | Update permissions |
| `DATABASE_CORRUPTED` | Database file is corrupted | No | Recreate database |
| `METRIC_COLLECTION_FAILED` | Metric collection failed | Yes | Check metric commands |
| `REPORT_GENERATION_FAILED` | Report generation failed | No | Check report configuration |
| `TIMEOUT` | Workflow exceeded timeout | No | Increase timeout value |

### Error Message Format

```typescript
interface ActionError {
  code: string;
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
}

// Example error output
{
  "code": "STORAGE_CONNECTION",
  "message": "Failed to connect to S3 endpoint",
  "details": {
    "endpoint": "https://s3.amazonaws.com",
    "region": "us-east-1",
    "error": "Network timeout"
  },
  "suggestions": [
    "Verify S3 endpoint URL is correct",
    "Check network connectivity",
    "Validate AWS credentials"
  ]
}
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
