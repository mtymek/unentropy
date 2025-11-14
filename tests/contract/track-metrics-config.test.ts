import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TrackMetricsActionContext } from '../../src/storage/context';
import { StorageErrors } from '../../src/storage/errors';
import { ActionInputs } from '../../src/actions/track-metrics-inputs';

describe('Track-Metrics Action - S3 Configuration Validation', () => {
  let context: TrackMetricsActionContext;

  beforeEach(() => {
    // Mock GitHub Actions core functions
    globalThis.process = {
      env: {},
      get: (name: string) => globalThis.process?.env?.[name] || '',
    } as any;
    
    globalThis.require = (id: string) => {
      if (id === '@actions/core') {
        return {
          getInput: (name: string) => globalThis.process?.env?.[`INPUT_${name.toUpperCase()}`] || '',
          setOutput: (name: string, value: string) => {
            console.log(`[MOCK] setOutput: ${name}=${value}`);
          },
          setFailed: (message: string) => {
            console.log(`[MOCK] setFailed: ${message}`);
          }
        };
      }
      }
      return undefined;
    } as any;
  };

  afterEach(() => {
    // Reset mocks
    globalThis.process = undefined;
    globalThis.require = undefined;
  });

  describe('Storage Configuration Validation', () => {
    it('should accept valid S3 configuration', async () => {
      const inputs: ActionInputs = {
        storageType: 's3',
        s3Endpoint: 'https://s3.amazonaws.com',
        s3Bucket: 'test-bucket',
        s3Region: 'us-east-1',
        s3AccessKeyId: 'test-key-id',
        s3SecretAccessKey: 'test-secret-key',
        configFile: 'unentropy.json'
      };

      // Mock successful config loading
      globalThis.require = (id: string) => {
        if (id === '../../src/config/loader') {
          return {
            loadConfig: () => Promise.resolve({
              storage: {
                type: 's3',
                s3: {
                  endpoint: 'https://s3.amazonaws.com',
                  bucket: 'test-bucket',
                  region: 'us-east-1'
                }
              }
            })
          };
        }
        return undefined;
      } as any;

      context = new TrackMetricsActionContext(
        {
          storage: {
            type: 's3',
            s3: {
              endpoint: 'https://s3.amazonaws.com',
              bucket: 'test-bucket',
              region: 'us-east-1'
            }
          },
          database: { key: 'unentropy.db' },
          report: { name: 'unentropy-report.html' }
        },
        inputs
      );

      expect(context).toBeDefined();
    });

    it('should reject missing S3 credentials', async () => {
      const inputs: ActionInputs = {
        storageType: 's3',
        s3Endpoint: 'https://s3.amazonaws.com',
        s3Bucket: 'test-bucket',
        s3Region: 'us-east-1',
        // Missing credentials
        configFile: 'unentropy.json'
      };

      expect(() => {
        new TrackMetricsActionContext(
          {
            storage: { type: 's3' },
            database: { key: 'unentropy.db' },
            report: { name: 'unentropy-report.html' }
          },
          inputs
        );
      }).toThrow(StorageErrors.authenticationFailure(
        'S3 credentials (access-key-id, secret-access-key) must be provided as action inputs from GitHub Secrets'
      ));
    });

    it('should reject invalid S3 endpoint URL', async () => {
      const inputs: ActionInputs = {
        storageType: 's3',
        s3Endpoint: 'invalid-url',
        s3Bucket: 'test-bucket',
        s3Region: 'us-east-1',
        s3AccessKeyId: 'test-key-id',
        s3SecretAccessKey: 'test-secret-key',
        configFile: 'unentropy.json'
      };

      expect(() => {
        new TrackMetricsActionContext(
          {
            storage: { type: 's3' },
            database: { key: 'unentropy.db' },
            report: { name: 'unentropy-report.html' }
          },
          inputs
        );
      }).toThrow(StorageErrors.validationError(
        'Invalid S3 endpoint URL: invalid-url'
      ));
    });

    it('should reject missing S3 bucket', async () => {
      const inputs: ActionInputs = {
        storageType: 's3',
        s3Endpoint: 'https://s3.amazonaws.com',
        // Missing bucket
        s3Region: 'us-east-1',
        s3AccessKeyId: 'test-key-id',
        s3SecretAccessKey: 'test-secret-key',
        configFile: 'unentropy.json'
      };

      expect(() => {
        new TrackMetricsActionContext(
          {
            storage: { type: 's3' },
            database: { key: 'unentropy.db' },
            report: { name: 'unentropy-report.html' }
          },
          inputs
        );
      }).toThrow(StorageErrors.validationError(
        'Missing required S3 configuration: bucket. Provide via action inputs or unentropy.json'
      ));
    });

    it('should reject missing S3 region', async () => {
      const inputs: ActionInputs = {
        storageType: 's3',
        s3Endpoint: 'https://s3.amazonaws.com',
        s3Bucket: 'test-bucket',
        // Missing region
        s3AccessKeyId: 'test-key-id',
        s3SecretAccessKey: 'test-secret-key',
        configFile: 'unentropy.json'
      };

      expect(() => {
        new TrackMetricsActionContext(
          {
            storage: { type: 's3' },
            database: { key: 'unentropy.db' },
            report: { name: 'unentropy-report.html' }
          },
          inputs
        );
      }).toThrow(StorageErrors.validationError(
        'Missing required S3 configuration: region. Provide via action inputs or unentropy.json'
      ));
    });

    it('should accept artifact storage configuration', async () => {
      const inputs: ActionInputs = {
        storageType: 'artifact',
        configFile: 'unentropy.json'
      };

      expect(() => {
        new TrackMetricsActionContext(
          {
            storage: { type: 'artifact' },
            database: { key: 'unentropy.db' },
            report: { name: 'unentropy-report.html' }
          },
          inputs
        );
      }).toBeDefined();
    });

    it('should handle configuration file loading errors gracefully', async () => {
      const inputs: ActionInputs = {
        storageType: 's3',
        s3Endpoint: 'https://s3.amazonaws.com',
        s3Bucket: 'test-bucket',
        s3Region: 'us-east-1',
        s3AccessKeyId: 'test-key-id',
        s3SecretAccessKey: 'test-secret-key',
        configFile: 'unentropy.json'
      };

      // Mock config loading failure
      globalThis.require = (id: string) => {
        if (id === '../../src/config/loader') {
          return {
            loadConfig: () => Promise.reject(new Error('Config file not found'))
          };
        }
        return undefined;
      } as any;

      expect(() => {
        new TrackMetricsActionContext(
          {
            storage: { type: 's3' },
            database: { key: 'unentropy.db' },
            report: { name: 'unentropy-report.html' }
          },
          inputs
        );
      }).toThrow(StorageErrors.validationError(
        'Invalid configuration file'
      ));
    });
  });
});