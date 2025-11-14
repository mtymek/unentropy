export interface WorkflowError {
  type: "storage" | "collection" | "report" | "validation";
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, any>;
}

export class StorageError extends Error {
  public readonly type: WorkflowError["type"];
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    type: WorkflowError["type"],
    code: string,
    message: string,
    retryable: boolean,
    details?: Record<string, any>
  ) {
    super(message);
    this.type = type;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }

  toJSON() {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

/**
 * Create standardized storage errors
 */
export class StorageErrors {
  static authenticationFailure(message: string, details?: Record<string, any>): StorageError {
    return new StorageError("storage", "STORAGE_AUTH_FAILED", message, false, details);
  }

  static connectionFailure(message: string, details?: Record<string, any>): StorageError {
    return new StorageError("storage", "STORAGE_CONNECTION", message, true, details);
  }

  static permissionDenied(message: string, details?: Record<string, any>): StorageError {
    return new StorageError("storage", "STORAGE_PERMISSION", message, false, details);
  }

  static bucketNotFound(bucket: string, details?: Record<string, any>): StorageError {
    return new StorageError(
      "storage",
      "BUCKET_NOT_FOUND",
      `Bucket '${bucket}' not found or inaccessible`,
      false,
      details
    );
  }

  static objectNotFound(key: string, details?: Record<string, any>): StorageError {
    return new StorageError(
      "storage",
      "OBJECT_NOT_FOUND",
      `Object '${key}' not found`,
      false,
      details
    );
  }

  static timeout(
    operation: string,
    timeoutMs: number,
    details?: Record<string, any>
  ): StorageError {
    return new StorageError(
      "storage",
      "TIMEOUT",
      `${operation} timed out after ${timeoutMs}ms`,
      true,
      details
    );
  }

  static validationError(message: string, details?: Record<string, any>): StorageError {
    return new StorageError("validation", "VALIDATION_ERROR", message, false, details);
  }

  static corruptedDatabase(message: string, details?: Record<string, any>): StorageError {
    return new StorageError("storage", "DATABASE_CORRUPTED", message, false, details);
  }

  static networkError(message: string, details?: Record<string, any>): StorageError {
    return new StorageError("storage", "NETWORK_ERROR", message, true, details);
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof StorageError) {
    return error.retryable;
  }

  // Network-related errors are typically retryable
  const retryablePatterns = [/timeout/i, /network/i, /connection/i, /ECONNRESET/i, /ETIMEDOUT/i];

  return retryablePatterns.some((pattern) => pattern.test(error.message));
}

/**
 * Create configuration error with user-friendly message
 */
export function createConfigurationError(
  field: string,
  value: string,
  requirement: string
): StorageError {
  return new StorageError(
    "validation",
    "CONFIG_ERROR",
    `Invalid ${field}: "${value}". ${requirement}`,
    false,
    { field, value, requirement }
  );
}

/**
 * Create storage connection error with diagnostic info
 */
export function createConnectionError(endpoint: string, originalError: Error): StorageError {
  return new StorageError(
    "storage",
    "STORAGE_CONNECTION",
    `Failed to connect to storage endpoint: ${endpoint}`,
    true,
    {
      endpoint,
      originalError: originalError.message,
      suggestions: [
        "Verify the endpoint URL is correct",
        "Check network connectivity to the storage provider",
        "Validate credentials and permissions",
        "Ensure the storage service is available",
      ],
    }
  );
}

/**
 * Create credential error with security guidance
 */
export function createCredentialError(
  credentialType: string,
  suggestions: string[] = []
): StorageError {
  const defaultSuggestions = [
    "Check that credentials are provided as GitHub Action inputs from GitHub Secrets",
    "Verify the access key ID and secret access key are correct",
    "Ensure credentials have not expired",
    "Check IAM permissions for the target bucket and operations",
  ];

  return new StorageError(
    "storage",
    "STORAGE_AUTH_FAILED",
    `${credentialType} authentication failed`,
    false,
    {
      credentialType,
      suggestions: [...defaultSuggestions, ...suggestions],
    }
  );
}

/**
 * Create bucket access error with specific guidance
 */
export function createBucketAccessError(
  bucket: string,
  operation: string,
  originalError: Error
): StorageError {
  return new StorageError(
    "storage",
    "STORAGE_PERMISSION",
    `Cannot ${operation} bucket: ${bucket}`,
    false,
    {
      bucket,
      operation,
      originalError: originalError.message,
      suggestions: [
        "Verify the bucket name is correct",
        "Check IAM permissions for the bucket",
        "Ensure the bucket exists in the specified region",
        "Validate that credentials have the required permissions",
      ],
    }
  );
}

/**
 * Extract error code from error
 */
export function extractErrorCode(error: Error): string {
  if (error instanceof StorageError) {
    return error.code;
  }

  // Extract from common error patterns
  if (error.message.includes("403")) return "STORAGE_PERMISSION";
  if (error.message.includes("404")) return "OBJECT_NOT_FOUND";
  if (error.message.includes("timeout")) return "TIMEOUT";
  if (error.message.includes("network")) return "NETWORK_ERROR";

  return "UNKNOWN_ERROR";
}
