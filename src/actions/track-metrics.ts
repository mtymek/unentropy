import { getInput, setFailed, info } from "@actions/core";
import {
  parseActionInputs,
  loadAndMergeConfiguration,
  setActionOutputs,
} from "./track-metrics-inputs";
import { TrackMetricsActionContext } from "../storage/context";
import { StorageFactory } from "../storage/factory";

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

}
run().catch(err =>
    setFailed(`Failed to track metrics: ${err.message}`)
)
