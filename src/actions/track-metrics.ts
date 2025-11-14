import { getInput, setFailed, info } from "@actions/core";
import {
  parseActionInputs,
  loadAndMergeConfiguration,
  setActionOutputs,
} from "./track-metrics-inputs";
import { TrackMetricsActionContext } from "../storage/context";
import { StorageFactory } from "../storage/factory";

async function run(): Promise<void> {
  try {
    // Parse inputs
    const inputs = parseActionInputs();

    // Load and merge configuration
    const config = await loadAndMergeConfiguration(inputs);

    // Validate storage configuration
    StorageFactory.validateStorageConfig(config, inputs);

    // Create track-metrics context
    const trackMetricsContext = new TrackMetricsActionContext(config, inputs);

    // Execute workflow
    const result = await trackMetricsContext.execute();

    // Set outputs
    setActionOutputs(result);

    // Handle result
    if (result.success) {
      info(`✅ Track-metrics workflow completed successfully`);
      info(`📊 Storage: ${result.databaseLocation}`);
      info(
        `📈 Metrics collected: ${result.phases.find((p) => p.name === "collect")?.metadata?.metricsCount || 0}`
      );
      if (result.reportUrl) {
        info(`📋 Report: ${result.reportUrl}`);
      }
    } else {
      setFailed(`❌ Workflow failed: ${result.error?.message}`);
    }
  } catch (error) {
    setFailed(`❌ Action failed: ${(error as Error).message}`);
  }
}

if (require.main === module) {
  run();
}
