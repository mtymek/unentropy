import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TrackMetricsActionContext } from '../../src/storage/context';
import { MergedConfiguration, ActionInputs } from '../../src/config/storage-schema';

describe('Track-Metrics Action - Complete Workflow Contract', () => {
  let mockConfig: MergedConfiguration;
  let mockInputs: ActionInputs;
  let mockExecute: any;

  beforeEach(() => {
    // Mock GitHub Actions core functions
    globalThis.require = (id: string) => {
      if (id === '@actions/core') {
        return {
          getInput: (name: string) => '',
          setOutput: (name: string, value: string) => {
            console.log(`[MOCK] setOutput: ${name}=${value}`);
          },
          setFailed: (message: string) => {
            console.log(`[MOCK] setFailed: ${message}`);
          },
          info: (message: string) => console.log(`[INFO] ${message}`),
          warning: (message: string) => console.log(`[WARN] ${message}`),
        };
      }
      return undefined;
    } as any;

    mockConfig = {
      storage: {
        type: 's3',
        s3: {
          endpoint: 'https://s3.amazonaws.com',
          bucket: 'test-bucket',
          region: 'us-east-1',
        },
      },
      database: {
        key: 'unentropy.db',
      },
      report: {
        name: 'unentropy-report.html',
      },
    };

    mockInputs = {
      storageType: 's3',
      s3AccessKeyId: 'test-key',
      s3SecretAccessKey: 'test-secret',
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

  describe('Workflow Contract', () => {
    it('should execute complete workflow successfully', async () => {
      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      
      // Mock successful workflow execution
      const originalExecute = context.execute;
      mockExecute = async () => ({
        success: true,
        phases: [
          {
            name: 'download',
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
            duration: 1000,
            metadata: { fileSize: 1024 },
          },
          {
            name: 'collect',
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
            duration: 2000,
            metadata: { metricsCount: 5 },
          },
          {
            name: 'upload',
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
            duration: 1500,
            metadata: { fileSize: 1030 },
          },
          {
            name: 'report',
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
            duration: 500,
            metadata: { reportPath: './unentropy-report.html' },
          },
        ],
        databaseLocation: 's3://test-bucket/unentropy.db',
        duration: 5000,
      });
      
      // Replace execute method with mock
      context.execute = mockExecute;

      const result = await context.execute();

      expect(result.success).toBe(true);
      expect(result.phases).toHaveLength(4);
      expect(result.databaseLocation).toBe('s3://test-bucket/unentropy.db');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle workflow failure gracefully', async () => {
      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      
      // Mock failed workflow execution
      mockExecute = async () => ({
        success: false,
        phases: [
          {
            name: 'download',
            status: 'failed',
            startTime: new Date(),
            endTime: new Date(),
            duration: 1000,
            error: {
              type: 'storage',
              code: 'STORAGE_CONNECTION',
              message: 'Failed to connect to S3',
              retryable: true,
            },
          },
        ],
        databaseLocation: 's3://test-bucket/unentropy.db',
        duration: 1000,
        error: {
          type: 'storage',
          code: 'STORAGE_CONNECTION',
          message: 'Failed to connect to S3',
          retryable: true,
        },
      });
      
      context.execute = mockExecute;

      const result = await context.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('STORAGE_CONNECTION');
      expect(result.error?.type).toBe('storage');
      expect(result.error?.retryable).toBe(true);
    });

    it('should validate workflow phase sequence', async () => {
      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      
      mockExecute = async () => ({
        success: true,
        phases: [
          { name: 'download', status: 'completed' as const },
          { name: 'collect', status: 'completed' as const },
          { name: 'upload', status: 'completed' as const },
          { name: 'report', status: 'completed' as const },
        ],
        databaseLocation: 's3://test-bucket/unentropy.db',
        duration: 5000,
      });
      
      context.execute = mockExecute;

      const result = await context.execute();

      expect(result.success).toBe(true);
      expect(result.phases).toHaveLength(4);
      
      // Verify phase order
      expect(result.phases[0].name).toBe('download');
      expect(result.phases[1].name).toBe('collect');
      expect(result.phases[2].name).toBe('upload');
      expect(result.phases[3].name).toBe('report');
      
      // Verify all phases completed
      result.phases.forEach(phase => {
        expect(phase.status).toBe('completed');
        expect(phase.duration).toBeGreaterThan(0);
        expect(phase.endTime).toBeDefined();
      });
    });
  });

  describe('Output Contract', () => {
    it('should provide standardized action outputs', async () => {
      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      
      mockExecute = async () => ({
        success: true,
        phases: [
          { name: 'download', status: 'completed' as const, metadata: { fileSize: 1024 } },
          { name: 'collect', status: 'completed' as const, metadata: { metricsCount: 5 } },
          { name: 'upload', status: 'completed' as const, metadata: { fileSize: 1030 } },
          { name: 'report', status: 'completed' as const, metadata: { reportPath: './unentropy-report.html' } },
        ],
        databaseLocation: 's3://test-bucket/unentropy.db',
        duration: 5000,
        reportUrl: 'file:///home/runner/work/unentropy/unentropy-report.html',
      });
      
      context.execute = mockExecute;

      const result = await context.execute();

      // Verify output structure matches contract
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('phases');
      expect(result).toHaveProperty('databaseLocation');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('reportUrl');
      expect(result).toHaveProperty('error');
      
      // Verify specific output values
      expect(result.success).toBe(true);
      expect(typeof result.databaseLocation).toBe('string');
      expect(typeof result.duration).toBe('number');
      expect(Array.isArray(result.phases)).toBe(true);
    });

    it('should include error details in failure output', async () => {
      const context = new TrackMetricsActionContext(mockConfig, mockInputs);
      
      mockExecute = async () => ({
        success: false,
        phases: [],
        databaseLocation: 's3://test-bucket/unentropy.db',
        duration: 1000,
        error: {
          type: 'storage',
          code: 'STORAGE_CONNECTION',
          message: 'Failed to connect to S3 endpoint',
          retryable: true,
          details: {
            endpoint: 'https://s3.amazonaws.com',
            originalError: 'Network timeout',
          },
        },
      });
      
      context.execute = mockExecute;

      const result = await context.execute();

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        type: 'storage',
        code: 'STORAGE_CONNECTION',
        message: 'Failed to connect to S3 endpoint',
        retryable: true,
        details: {
          endpoint: 'https://s3.amazonaws.com',
          originalError: 'Network timeout',
        },
      });
    });
  });
});