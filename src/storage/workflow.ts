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

/**
 * Workflow phase execution engine
 */
export class WorkflowEngine {
  private phases: WorkflowPhase[] = [];
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second base delay

  /**
   * Execute a phase with retry logic
   */
  async executePhase<T>(
    name: WorkflowPhase["name"],
    operation: () => Promise<T>,
    options: {
      retries?: number;
      retryable?: (error: Error) => boolean;
      onProgress?: (message: string) => void;
    } = {}
  ): Promise<T> {
    const maxRetries = options.retries ?? this.maxRetries;
    const isRetryable =
      options.retryable ??
      ((error: Error) => error.message.includes("timeout") || error.message.includes("network"));

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (options.onProgress && attempt > 0) {
          options.onProgress(`Retrying ${name} (attempt ${attempt + 1}/${maxRetries + 1})`);
        }

        const result = await operation();

        // Complete phase successfully
        const phase: WorkflowPhase = {
          name,
          status: "completed",
          startTime: new Date(),
          endTime: new Date(),
          duration: 0, // Will be set below
        };
        phase.duration = phase.endTime.getTime() - phase.startTime.getTime();

        this.phases.push(phase);
        return result;
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !isRetryable(error)) {
          // Final attempt failed or error is not retryable
          const phase: WorkflowPhase = {
            name,
            status: "failed",
            startTime: new Date(),
            endTime: new Date(),
            duration: 0,
            error: {
              type: this.categorizeError(name, error),
              code: this.extractErrorCode(error),
              message: error.message,
              retryable: isRetryable(error) && attempt < maxRetries,
            },
          };
          phase.duration = phase.endTime.getTime() - phase.startTime.getTime();

          this.phases.push(phase);
          throw error;
        }

        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute multiple phases in sequence
   */
  async executeSequence<T>(
    phases: Array<{
      name: WorkflowPhase["name"];
      operation: () => Promise<T>;
      options?: {
        retries?: number;
        retryable?: (error: Error) => boolean;
        onProgress?: (message: string) => void;
      };
    }>
  ): Promise<T[]> {
    const results: T[] = [];

    for (const phase of phases) {
      try {
        const result = await this.executePhase(phase.name, phase.operation, phase.options);
        results.push(result);
      } catch (error) {
        // Stop sequence on phase failure
        throw error;
      }
    }

    return results;
  }

  /**
   * Execute phases with parallel execution where safe
   */
  async executeParallel<T>(
    phases: Array<{
      name: WorkflowPhase["name"];
      operation: () => Promise<T>;
      options?: {
        retries?: number;
        retryable?: (error: Error) => boolean;
        onProgress?: (message: string) => void;
      };
    }>
  ): Promise<T[]> {
    const promises = phases.map(async (phase) => {
      try {
        const result = await this.executePhase(phase.name, phase.operation, phase.options);
        return { success: true, result, phase: phase.name };
      } catch (error) {
        return { success: false, error: error as Error, phase: phase.name };
      }
    });

    const results = await Promise.allSettled(promises);

    // Check for failures
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      const firstFailure = failures[0];
      throw firstFailure.reason;
    }

    return results.map((r) => (r.status === "fulfilled" ? (r as any).result : undefined));
  }

  /**
   * Get all executed phases
   */
  getPhases(): WorkflowPhase[] {
    return this.phases;
  }

  /**
   * Get phase by name
   */
  getPhase(name: WorkflowPhase["name"]): WorkflowPhase | undefined {
    return this.phases.find((phase) => phase.name === name);
  }

  /**
   * Check if all phases completed successfully
   */
  allCompleted(): boolean {
    return this.phases.every((phase) => phase.status === "completed");
  }

  /**
   * Get total workflow duration
   */
  getTotalDuration(): number {
    if (this.phases.length === 0) return 0;

    const start = this.phases[0].startTime.getTime();
    const end = this.phases[this.phases.length - 1].endTime?.getTime() || Date.now();
    return end - start;
  }

  /**
   * Get workflow summary
   */
  getSummary(): {
    totalPhases: number;
    completedPhases: number;
    failedPhases: number;
    totalDuration: number;
    phases: WorkflowPhase[];
  } {
    const completed = this.phases.filter((p) => p.status === "completed").length;
    const failed = this.phases.filter((p) => p.status === "failed").length;

    return {
      totalPhases: this.phases.length,
      completedPhases: completed,
      failedPhases: failed,
      totalDuration: this.getTotalDuration(),
      phases: this.phases,
    };
  }

  /**
   * Reset workflow state
   */
  reset(): void {
    this.phases = [];
  }

  /**
   * Delay for retry with exponential backoff
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Categorize error type
   */
  private categorizeError(phase: string, error: Error): WorkflowError["type"] {
    if (phase === "download" || phase === "upload") {
      return "storage";
    } else if (phase === "collect") {
      return "collection";
    } else if (phase === "report") {
      return "report";
    }
    return "validation";
  }

  /**
   * Extract error code from error message
   */
  private extractErrorCode(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes("timeout")) return "TIMEOUT";
    if (message.includes("network") || message.includes("connection")) return "NETWORK_ERROR";
    if (message.includes("permission") || message.includes("403")) return "STORAGE_PERMISSION";
    if (message.includes("not found") || message.includes("404")) return "OBJECT_NOT_FOUND";
    if (message.includes("invalid")) return "VALIDATION_ERROR";

    return "UNKNOWN_ERROR";
  }
}

/**
 * Workflow phase tracking utilities (deprecated, use WorkflowEngine instead)
 */
export class WorkflowTracker {
  private phases: WorkflowPhase[] = [];

  /**
   * Start a new workflow phase
   */
  startPhase(name: WorkflowPhase["name"]): WorkflowPhase {
    const phase: WorkflowPhase = {
      name,
      status: "running",
      startTime: new Date(),
    };

    this.phases.push(phase);
    return phase;
  }

  /**
   * Complete a phase successfully
   */
  completePhase(phase: WorkflowPhase, metadata?: Record<string, any>): void {
    phase.status = "completed";
    phase.endTime = new Date();
    phase.duration = phase.endTime.getTime() - phase.startTime.getTime();
    if (metadata) {
      phase.metadata = metadata;
    }
  }

  /**
   * Fail a phase with error
   */
  failPhase(phase: WorkflowPhase, error: WorkflowError): void {
    phase.status = "failed";
    phase.endTime = new Date();
    phase.duration = phase.endTime.getTime() - phase.startTime.getTime();
    phase.error = error;
  }

  /**
   * Get all phases
   */
  getPhases(): WorkflowPhase[] {
    return this.phases;
  }

  /**
   * Get phase by name
   */
  getPhase(name: WorkflowPhase["name"]): WorkflowPhase | undefined {
    return this.phases.find((phase) => phase.name === name);
  }

  /**
   * Check if all phases completed successfully
   */
  allCompleted(): boolean {
    return this.phases.every((phase) => phase.status === "completed");
  }

  /**
   * Get total workflow duration
   */
  getTotalDuration(): number {
    if (this.phases.length === 0) return 0;

    const start = this.phases[0].startTime.getTime();
    const end = this.phases[this.phases.length - 1].endTime?.getTime() || Date.now();
    return end - start;
  }
}
