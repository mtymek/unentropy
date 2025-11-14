import { getInput, setOutput, setFailed, info, warning } from "@actions/core";
import { S3Storage } from "./s3";
import {
  MergedConfiguration,
  validateMergedConfig,
  mergeConfiguration,
} from "../config/storage-schema";
import { loadConfig } from "../config/loader";
import { StorageFactory } from "./factory";
import { WorkflowEngine } from "./workflow";

export interface WorkflowPhase {
  name: "download" | "collect" | "upload" | "report";
  status: "pending" | "running" | "completed" | "failed";
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: WorkflowError;
  metadata?: Record<string, any>;
}

export interface WorkflowError {
  type: "storage" | "collection" | "report" | "validation";
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  phases: WorkflowPhase[];
  reportUrl?: string;
  databaseLocation: string;
  duration: number;
  error?: WorkflowError;
}

export interface ActionInputs {
  storageType: "artifact" | "s3";
  s3Endpoint?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3SessionToken?: string;
  configFile?: string;
  databaseKey?: string;
  reportName?: string;
  timeout?: number;
  retryAttempts?: number;
  verbose?: boolean;
}

/**
 * Main context object for the track-metrics action execution.
 */
export class TrackMetricsActionContext {
  private storage?: S3Storage;
  private config: MergedConfiguration;
  private parameters: ActionInputs;
  private workflowEngine: WorkflowEngine = new WorkflowEngine();

  constructor(config: MergedConfiguration, parameters: ActionInputs) {
    this.config = config;
    this.parameters = parameters;

    // Log storage configuration
    info(`🔧 Storage type: ${config.storage.type}`);

    if (config.storage.type === "s3") {
      info(`🪣 S3 endpoint: ${config.storage.s3?.endpoint}`);
      info(`🪣 S3 bucket: ${config.storage.s3?.bucket}`);
      info(`🌍 S3 region: ${config.storage.s3?.region}`);
      info(`🔐 S3 credentials: provided via action inputs`);

      // Initialize S3 storage
      this.storage = StorageFactory.createStorage(config, parameters) as S3Storage;
    } else {
      info(`📦 Using GitHub Artifacts storage`);
    }

    info(`💾 Database key: ${config.database.key}`);
    info(`📋 Report name: ${config.report.name}`);
  }

  /**
   * Execute the complete workflow
   */
  async execute(): Promise<ActionResult> {
    const startTime = new Date();

    try {
      // Execute workflow phases using the workflow engine
      await this.workflowEngine.executeSequence([
        {
          name: "download",
          operation: () => this.downloadDatabase(),
          options: { retries: this.parameters.retryAttempts },
        },
        {
          name: "collect",
          operation: () => this.collectMetrics(),
          options: { retries: this.parameters.retryAttempts },
        },
        {
          name: "upload",
          operation: () => this.uploadDatabase(),
          options: { retries: this.parameters.retryAttempts },
        },
        {
          name: "report",
          operation: () => this.generateReport(),
          options: { retries: 0 }, // Don't retry report generation
        },
      ]);

      return {
        success: true,
        phases: this.workflowEngine.getPhases(),
        databaseLocation: this.getDatabaseLocation(),
        duration: Date.now() - startTime.getTime(),
      };
    } catch (error) {
      const workflowError: WorkflowError = {
        type: "storage",
        code: "WORKFLOW_FAILED",
        message: (error as Error).message,
        retryable: false,
      };

      return {
        success: false,
        phases: this.workflowEngine.getPhases(),
        databaseLocation: this.getDatabaseLocation(),
        duration: Date.now() - startTime.getTime(),
        error: workflowError,
      };
    }
  }

  /**
   * Download database from storage
   */
  private async downloadDatabase(): Promise<void> {
    const phase = this.startPhase("download");

    try {
      if (this.config.storage.type === "s3" && this.storage) {
        const exists = await this.storage.exists(this.config.database.key);

        if (exists) {
          info(`📥 Downloading database from S3: ${this.config.database.key}`);

          // Download existing database
          const databaseData = await (this.storage as S3Storage).downloadDatabase(
            this.config.database.key
          );

          // Write to local file system
          await Bun.write(this.config.database.key, databaseData);

          this.completePhase(phase, {
            fileSize: databaseData.length,
          });
        } else {
          info(`🆕 No existing database found, will create new one`);

          // Create new empty database
          await this.createNewDatabase();

          this.completePhase(phase, {
            fileSize: 0, // New database
          });
        }
      } else {
        info(`🆕 No storage backend configured, creating local database`);
        await this.createNewDatabase();
        this.completePhase(phase, {
          fileSize: 0,
        });
      }
    } catch (error) {
      this.failPhase(phase, {
        type: "storage",
        code: "DOWNLOAD_FAILED",
        message: (error as Error).message,
        retryable: true,
      });
      throw error;
    }
  }

  /**
   * Create new empty database
   */
  private async createNewDatabase(): Promise<void> {
    // Create empty SQLite database
    const { DatabaseClient } = await import("../database/client");
    const db = new DatabaseClient({ path: this.config.database.key });

    // Initialize database schema
    await db.initialize();

    info(`✅ Created new database: ${this.config.database.key}`);
  }

  /**
   * Collect metrics using existing collector
   */
  private async collectMetrics(): Promise<void> {
    const phase = this.startPhase("collect");

    try {
      info(`📊 Collecting metrics...`);

      // Simple metric collection simulation
      // In real implementation, this would use the existing collector modules
      const metricsCount = Math.floor(Math.random() * 10) + 1; // Simulate 1-10 metrics

      this.completePhase(phase, {
        metricsCount,
      });
    } catch (error) {
      this.failPhase(phase, {
        type: "collection",
        code: "COLLECTION_FAILED",
        message: (error as Error).message,
        retryable: true,
      });
      throw error;
    }
  }

  /**
   * Upload database to storage
   */
  private async uploadDatabase(): Promise<void> {
    const phase = this.startPhase("upload");

    try {
      if (this.config.storage.type === "s3" && this.storage) {
        info(`📤 Uploading database to S3: ${this.config.database.key}`);
        // TODO: Upload updated database
      }

      this.completePhase(phase, {
        fileSize: 0, // Would be actual file size
      });
    } catch (error) {
      this.failPhase(phase, {
        type: "storage",
        code: "UPLOAD_FAILED",
        message: (error as Error).message,
        retryable: true,
      });
      throw error;
    }
  }

  /**
   * Generate HTML report
   */
  private async generateReport(): Promise<void> {
    const phase = this.startPhase("report");

    try {
      info(`📋 Generating report: ${this.config.report.name}`);

      // Simple report generation simulation
      // In real implementation, this would use the existing reporter modules
      const reportPath = `./${this.config.report.name}`;

      // Create a simple HTML report
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><title>Unentropy Metrics Report</title></head>
        <body>
          <h1>Unentropy Metrics Report</h1>
          <p>Generated on: ${new Date().toISOString()}</p>
          <p>Storage: ${this.config.storage.type}</p>
        </body>
        </html>
      `;

      // Write report to file system
      await Bun.write(reportPath, htmlContent);

      this.completePhase(phase, {
        reportPath,
      });
    } catch (error) {
      this.failPhase(phase, {
        type: "report",
        code: "REPORT_FAILED",
        message: (error as Error).message,
        retryable: false,
      });
      throw error;
    }
  }
}
