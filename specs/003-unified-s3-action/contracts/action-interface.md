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
  
  # S3 Configuration (required when storage-type='s3')
  s3-endpoint:
    description: 'S3-compatible endpoint URL'
    required: false
  s3-bucket:
    description: 'S3 bucket name'
    required: false
  s3-region:
    description: 'S3 region'
    required: false
  s3-access-key-id:
    description: 'S3 access key ID'
    required: false
  s3-secret-access-key:
    description: 'S3 secret access key'
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
    
    // Load configuration
    const config = await loadConfiguration(inputs.configFile);
    
    // Create track-metrics context
    const trackMetricsContext = new TrackMetricsActionContext(
      config.storage,
      inputs,
      process.env.GITHUB_TOKEN!
    );
    
    // Execute workflow
    const result = await trackMetricsContext.execute();
    
    // Set outputs
    setActionOutputs(result);
    
    // Handle result
    if (result.success) {
      info(`✅ Unified metrics workflow completed successfully`);
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

function validateInputs(inputs: ActionInputs): void {
  // Validate storage type
  if (!['artifact', 's3'].includes(inputs.storageType)) {
    throw new Error(`Invalid storage-type: ${inputs.storageType}. Must be 'artifact' or 's3'`);
  }
  
  // Validate S3 parameters when S3 storage is selected
  if (inputs.storageType === 's3') {
    const requiredS3Params = ['s3Endpoint', 's3Bucket', 's3Region', 's3AccessKeyId', 's3SecretAccessKey'];
    const missingParams = requiredS3Params.filter(param => !inputs[param as keyof ActionInputs]);
    
    if (missingParams.length > 0) {
      throw new Error(`Missing required S3 parameters: ${missingParams.join(', ')}`);
    }
    
    // Validate S3 endpoint URL
    try {
      new URL(inputs.s3Endpoint!);
    } catch {
      throw new Error(`Invalid S3 endpoint URL: ${inputs.s3Endpoint}`);
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

### S3 Storage Usage

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
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
```

### Advanced Configuration

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
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
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

### Conditional Storage Selection

```yaml
name: Conditional Storage Metrics
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
           storage-type: ${{ github.ref == 'refs/heads/main' && 's3' || 'artifact' }}
          s3-endpoint: ${{ secrets.S3_ENDPOINT }}
          s3-bucket: ${{ secrets.S3_BUCKET }}
          s3-region: ${{ secrets.S3_REGION }}
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
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