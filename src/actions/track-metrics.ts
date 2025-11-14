import { getInput, setFailed, info } from "@actions/core";
import { TrackMetricsActionContext } from "../storage/context";
import { StorageFactory } from "../storage/factory";
import { loadConfig } from "../config/loader";
import {
    StorageConfigurationSchema,
    mergeConfiguration,
    validateMergedConfig,
    type MergedConfiguration,
    type ActionInputs,
} from "../config/storage-schema";

/**
 * Parse action inputs from GitHub Actions
 */
function parseActionInputs(): ActionInputs {
    return {
        storageType: getInput("storage-type", { required: true }) as "artifact" | "s3",
        s3Endpoint: getInput("s3-endpoint"),
        s3Bucket: getInput("s3-bucket"),
        s3Region: getInput("s3-region"),
        s3AccessKeyId: getInput("s3-access-key-id"),
        s3SecretAccessKey: getInput("s3-secret-access-key"),
        s3SessionToken: getInput("s3-session-token"),
        configFile: getInput("config-file") || "unentropy.json",
        databaseKey: getInput("database-key") || "unentropy.db",
        reportName: getInput("report-name") || "unentropy-report.html",
        timeout: parseInt(getInput("timeout") || "300") * 1000,
        retryAttempts: parseInt(getInput("retry-attempts") || "3"),
        verbose: getInput("verbose") === "true",
    };
}

/**
 * Load and merge configuration from file and inputs
 */
export async function loadAndMergeConfiguration(
    inputs: ActionInputs
): Promise<MergedConfiguration> {
    // Load configuration from file
    let fileConfig;
    try {
        fileConfig = StorageConfigurationSchema.parse(await loadConfig(inputs.configFile));
    } catch (error) {
        // If file doesn't exist or is invalid, use inputs only
        fileConfig = undefined;
    }

    // Merge configuration with precedence: Inputs > File
    const mergedConfig = mergeConfiguration(fileConfig, inputs);

    // Validate merged configuration
    validateMergedConfig(mergedConfig, inputs);

    return mergedConfig;
}

/**
 * Set action outputs
 */
export function setActionOutputs(result: any): void {
    const { setOutput } = require("@actions/core");

    setOutput("success", result.success);
    setOutput("storage-type", result.databaseLocation?.startsWith("s3://") ? "s3" : "artifact");
    setOutput("database-location", result.databaseLocation || "");
    setOutput(
        "database-size",
        result.phases?.find((p: any) => p.name === "upload")?.metadata?.fileSize || 0
    );
    setOutput("report-url", result.reportUrl || "");
    setOutput(
        "metrics-collected",
        result.phases?.find((p: any) => p.name === "collect")?.metadata?.metricsCount || 0
    );
    setOutput("duration", result.duration || 0);
    setOutput("error-code", result.error?.code || "");
    setOutput("error-message", result.error?.message || "");
}

async function run(): Promise<void> {
    const inputs = parseActionInputs();
    const config = await loadAndMergeConfiguration(inputs);

    StorageFactory.validateStorageConfig(config, inputs);

    // Create track-metrics context
    const trackMetricsContext = new TrackMetricsActionContext(config, inputs);

    // Execute workflow
    const result = await trackMetricsContext.execute();

    // Set outputs
    setActionOutputs(result);

    // Handle result
    if (!result.success) {
        setFailed(`❌ Workflow failed: ${result.error?.message}`);
    }
    info(`✅ Track-metrics workflow completed successfully`);
    info(`📊 Storage: ${result.databaseLocation}`);
    info(
        `📈 Metrics collected: ${result.phases.find((p) => p.name === "collect")?.metadata?.metricsCount || 0}`
    );
    if (result.reportUrl) {
        info(`📋 Report: ${result.reportUrl}`);
    }
}
run().catch(err =>
    setFailed(`Failed to track metrics: ${err.message}`)
)
