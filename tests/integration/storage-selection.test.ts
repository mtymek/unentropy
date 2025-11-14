import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TrackMetricsActionContext } from '../../src/storage/context';
import { S3Storage } from '../../src/storage/s3';
import { MergedConfiguration, ActionInputs } from '../../src/config/storage-schema';

describe('Storage Backend Selection Integration', () => {
  let mockConfig: MergedConfiguration;
  let mockInputs: ActionInputs;

  beforeEach(() => {
    // Mock GitHub Actions core functions
    globalThis.require = (id: string) => {
      if (id === '@actions/core') {
        return {
          getInput: (name: string) => '',
          setOutput: (name: string, value: string) => {},
          setFailed: (message: string) => {},
          info: (message: string) => console.log(`[INFO] ${message}`),
          warning: (message: string) => console.log(`[WARN] ${message}`),
        };
      }
      return undefined;
    } as any;

    mockConfig = {
      storage: {
        type: 'artifact',
      },
      database: {
        key: 'unentropy.db',
      },
      report: {
        name: 'unentropy-report.html',
      },
    };

    mockInputs = {
      storageType: 'artifact',
      configFile: 'unentropy.json',
      databaseKey: 'unentropy.db',
      reportName: 'unentropy-report.html',
      timeout: 300000,
      retryAttempts: 3,
      verbose: false,
    };
  });

  afterEach(() => {
    // Reset mocks
    globalThis.require = undefined;
  });

  describe('Storage Type Detection', () => {
    it('should select artifact storage when type is artifact', () => {
      mockConfig.storage.type = 'artifact';
      mockInputs.storageType = 'artifact';

      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      expect(context).toBeDefined();
    });

    it('should select S3 storage when type is s3 with valid configuration', () => {
      mockConfig.storage = {
        type: 's3',
        s3: {
          endpoint: 'https://s3.amazonaws.com',
          bucket: 'test-bucket',
          region: 'us-east-1',
        },
      };
      mockInputs = {
        ...mockInputs,
        storageType: 's3',
        s3AccessKeyId: 'test-key',
        s3SecretAccessKey: 'test-secret',
      };

      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      expect(context).toBeDefined();
    });

    it('should handle configuration precedence correctly', () => {
      // File config has S3 settings
      mockConfig.storage = {
        type: 's3',
        s3: {
          endpoint: 'https://s3.amazonaws.com',
          bucket: 'file-bucket',
          region: 'us-west-2',
        },
      };

      // Inputs override bucket
      mockInputs = {
        ...mockInputs,
        storageType: 's3',
        s3Bucket: 'input-bucket', // Override
        s3AccessKeyId: 'test-key',
        s3SecretAccessKey: 'test-secret',
      };

      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      expect(context).toBeDefined();
      
      // The merged config should have input bucket
      const mergedConfig = (context as any).config;
      expect(mergedConfig.storage.s3?.bucket).toBe('input-bucket');
      expect(mergedConfig.storage.s3?.endpoint).toBe('https://s3.amazonaws.com');
      expect(mergedConfig.storage.s3?.region).toBe('us-west-2');
    });

    it('should use defaults when configuration is minimal', () => {
      const minimalConfig = {
        storage: {
          type: 'artifact' as const,
        },
        database: {
          key: 'unentropy.db',
        },
        report: {
          name: 'unentropy-report.html',
        },
      };

      const minimalInputs = {
        storageType: 'artifact' as const,
        configFile: 'unentropy.json',
        databaseKey: 'unentropy.db',
        reportName: 'unentropy-report.html',
        timeout: 300000,
        retryAttempts: 3,
        verbose: false,
      };

      const context = new TrackMetricsActionContext(minimalConfig, minimalInputs);
      expect(context).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate S3 configuration requirements', () => {
      mockConfig.storage = {
        type: 's3',
        s3: {
          endpoint: 'https://s3.amazonaws.com',
          bucket: 'test-bucket',
          region: 'us-east-1',
        },
      };

      // Missing credentials should throw error
      mockInputs = {
        ...mockInputs,
        storageType: 's3',
        // Missing s3AccessKeyId and s3SecretAccessKey
      };

      expect(() => {
        new TrackMetricsActionContext(mockConfig, mockInputs);
      }).toThrow('S3 credentials (access-key-id, secret-access-key) must be provided as action inputs from GitHub Secrets');
    });

    it('should validate S3 endpoint format', () => {
      mockConfig.storage = {
        type: 's3',
        s3: {
          endpoint: 'invalid-url',
          bucket: 'test-bucket',
          region: 'us-east-1',
        },
      };

      mockInputs = {
        ...mockInputs,
        storageType: 's3',
        s3AccessKeyId: 'test-key',
        s3SecretAccessKey: 'test-secret',
      };

      expect(() => {
        new TrackMetricsActionContext(mockConfig, mockInputs);
      }).toThrow('Invalid S3 endpoint URL: invalid-url');
    });

    it('should validate required S3 fields', () => {
      mockConfig.storage = {
        type: 's3',
        s3: {
          endpoint: 'https://s3.amazonaws.com',
          // Missing bucket and region
        },
      };

      mockInputs = {
        ...mockInputs,
        storageType: 's3',
        s3AccessKeyId: 'test-key',
        s3SecretAccessKey: 'test-secret',
      };

      expect(() => {
        new TrackMetricsActionContext(mockConfig, mockInputs);
      }).toThrow('Missing required S3 configuration: bucket, region');
    });
  });

  describe('Storage Backend Behavior', () => {
    it('should handle artifact storage without S3 client', () => {
      mockConfig.storage.type = 'artifact';
      mockInputs.storageType = 'artifact';

      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      
      // Should not initialize S3 storage for artifact type
      expect(context).toBeDefined();
    });

    it('should initialize S3 storage for S3 type', () => {
      mockConfig.storage = {
        type: 's3',
        s3: {
          endpoint: 'https://s3.amazonaws.com',
          bucket: 'test-bucket',
          region: 'us-east-1',
        },
      };

      mockInputs = {
        ...mockInputs,
        storageType: 's3',
        s3AccessKeyId: 'test-key',
        s3SecretAccessKey: 'test-secret',
      };

      // Mock Bun S3Client
      globalThis.require = (id: string) => {
        if (id === 'bun') {
          return {
            S3Client: class MockS3Client {
              constructor(config: any) {
                expect(config.accessKeyId).toBe('test-key');
                expect(config.secretAccessKey).toBe('test-secret');
                expect(config.bucket).toBe('test-bucket');
                expect(config.region).toBe('us-east-1');
                expect(config.endpoint).toBe('https://s3.amazonaws.com');
              }
            },
          };
        }
        if (id === '@actions/core') {
          return {
            getInput: (name: string) => '',
            setOutput: (name: string, value: string) => {},
            setFailed: (message: string) => {},
            info: (message: string) => console.log(`[INFO] ${message}`),
            warning: (message: string) => console.log(`[WARN] ${message}`),
          };
        }
        return undefined;
      } as any;

      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      expect(context).toBeDefined();
    });
  });

  describe('Database Location Resolution', () => {
    it('should resolve S3 database location correctly', () => {
      mockConfig.storage = {
        type: 's3',
        s3: {
          endpoint: 'https://s3.amazonaws.com',
          bucket: 'test-bucket',
          region: 'us-east-1',
        },
      };

      mockInputs = {
        ...mockInputs,
        storageType: 's3',
        s3AccessKeyId: 'test-key',
        s3SecretAccessKey: 'test-secret',
      };

      globalThis.require = (id: string) => {
        if (id === 'bun') {
          return {
            S3Client: class MockS3Client {},
          };
        }
        if (id === '@actions/core') {
          return {
            getInput: (name: string) => '',
            setOutput: (name: string, value: string) => {},
            setFailed: (message: string) => {},
            info: (message: string) => console.log(`[INFO] ${message}`),
            warning: (message: string) => console.log(`[WARN] ${message}`),
          };
        }
        return undefined;
      } as any;

      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      
      // Test private method through type assertion
      const databaseLocation = (context as any).getDatabaseLocation();
      expect(databaseLocation).toBe('s3://test-bucket/unentropy.db');
    });

    it('should resolve artifact database location correctly', () => {
      mockConfig.storage.type = 'artifact';
      mockInputs.storageType = 'artifact';

      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      
      // Test private method through type assertion
      const databaseLocation = (context as any).getDatabaseLocation();
      expect(databaseLocation).toBe('artifact://unentropy.db');
    });
  });
});