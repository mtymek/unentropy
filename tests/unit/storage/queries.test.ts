import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Storage } from "../../../src/storage/storage";
import { initializeSchema } from "../../../src/storage/migrations";
import { DatabaseQueries } from "../../../src/storage/queries";
import { rm } from "fs/promises";

describe("DatabaseQueries", () => {
  const testDbPath = "./test-queries.db";
  let client: Storage;
  let queries: DatabaseQueries;

  beforeEach(async () => {
    client = new Storage({
      type: "sqlite-local",
      path: testDbPath,
    });
    await client.ready();
    initializeSchema(client);
    queries = new DatabaseQueries(client);
  });

  afterEach(async () => {
    await client.close();
    await rm(testDbPath, { force: true });
    await rm(`${testDbPath}-shm`, { force: true });
    await rm(`${testDbPath}-wal`, { force: true });
  });

  describe("insertBuildContext", () => {
    it("inserts a build context and returns id", () => {
      const id = queries.insertBuildContext({
        commit_sha: "a".repeat(40),
        branch: "main",
        run_id: "12345",
        run_number: 1,
        timestamp: new Date().toISOString(),
      });

      expect(id).toBeGreaterThan(0);
    });

    it("inserts build context with optional fields", () => {
      const id = queries.insertBuildContext({
        commit_sha: "b".repeat(40),
        branch: "feature",
        run_id: "12346",
        run_number: 2,
        actor: "test-user",
        event_name: "push",
        timestamp: new Date().toISOString(),
      });

      const result = queries.getBuildContext(id);
      expect(result?.actor).toBe("test-user");
      expect(result?.event_name).toBe("push");
    });
  });

  describe("upsertMetricDefinition", () => {
    it("inserts a new metric definition", () => {
      const metric = queries.upsertMetricDefinition({
        name: "test-coverage",
        type: "numeric",
        unit: "%",
        description: "Code coverage percentage",
      });

      expect(metric.id).toBeGreaterThan(0);
      expect(metric.name).toBe("test-coverage");
      expect(metric.type).toBe("numeric");
      expect(metric.unit).toBe("%");
      expect(metric.description).toBe("Code coverage percentage");
    });

    it("updates existing metric definition on conflict", () => {
      const metric1 = queries.upsertMetricDefinition({
        name: "bundle-size",
        type: "numeric",
        unit: "KB",
      });

      const metric2 = queries.upsertMetricDefinition({
        name: "bundle-size",
        type: "numeric",
        unit: "MB",
        description: "Updated description",
      });

      expect(metric2.id).toBe(metric1.id);
      expect(metric2.unit).toBe("MB");
      expect(metric2.description).toBe("Updated description");
    });

    it("inserts label type metric", () => {
      const metric = queries.upsertMetricDefinition({
        name: "build-status",
        type: "label",
      });

      expect(metric.type).toBe("label");
      expect(metric.unit).toBeNull();
    });
  });

  describe("insertMetricValue", () => {
    it("inserts numeric metric value", () => {
      const buildId = queries.insertBuildContext({
        commit_sha: "c".repeat(40),
        branch: "main",
        run_id: "12347",
        run_number: 3,
        timestamp: new Date().toISOString(),
      });

      const metric = queries.upsertMetricDefinition({
        name: "test-metric",
        type: "numeric",
      });

      const valueId = queries.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 42.5,
        collected_at: new Date().toISOString(),
      });

      expect(valueId).toBeGreaterThan(0);

      const value = queries.getMetricValues(metric.id, buildId);
      expect(value?.value_numeric).toBe(42.5);
      expect(value?.value_label).toBeNull();
    });

    it("inserts label metric value", () => {
      const buildId = queries.insertBuildContext({
        commit_sha: "d".repeat(40),
        branch: "main",
        run_id: "12348",
        run_number: 4,
        timestamp: new Date().toISOString(),
      });

      const metric = queries.upsertMetricDefinition({
        name: "status-metric",
        type: "label",
      });

      const valueId = queries.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_label: "passing",
        collected_at: new Date().toISOString(),
      });

      expect(valueId).toBeGreaterThan(0);

      const value = queries.getMetricValues(metric.id, buildId);
      expect(value?.value_label).toBe("passing");
      expect(value?.value_numeric).toBeNull();
    });

    it("updates metric value on conflict", () => {
      const buildId = queries.insertBuildContext({
        commit_sha: "e".repeat(40),
        branch: "main",
        run_id: "12349",
        run_number: 5,
        timestamp: new Date().toISOString(),
      });

      const metric = queries.upsertMetricDefinition({
        name: "update-test",
        type: "numeric",
      });

      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 10,
        collected_at: new Date().toISOString(),
      });

      const newTime = new Date().toISOString();
      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 20,
        collected_at: newTime,
      });

      const value = queries.getMetricValues(metric.id, buildId);
      expect(value?.value_numeric).toBe(20);
    });

    it("stores collection duration", () => {
      const buildId = queries.insertBuildContext({
        commit_sha: "f".repeat(40),
        branch: "main",
        run_id: "12350",
        run_number: 6,
        timestamp: new Date().toISOString(),
      });

      const metric = queries.upsertMetricDefinition({
        name: "duration-test",
        type: "numeric",
      });

      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: buildId,
        value_numeric: 100,
        collected_at: new Date().toISOString(),
        collection_duration_ms: 1500,
      });

      const value = queries.getMetricValues(metric.id, buildId);
      expect(value?.collection_duration_ms).toBe(1500);
    });
  });

  describe("getMetricDefinition", () => {
    it("retrieves metric by name", () => {
      queries.upsertMetricDefinition({
        name: "lookup-test",
        type: "numeric",
      });

      const metric = queries.getMetricDefinition("lookup-test");
      expect(metric?.name).toBe("lookup-test");
    });

    it("returns undefined for non-existent metric", () => {
      const metric = queries.getMetricDefinition("non-existent");
      expect(metric).toBeUndefined();
    });
  });

  describe("getAllMetricDefinitions", () => {
    it("returns all metrics sorted by name", () => {
      queries.upsertMetricDefinition({ name: "zebra", type: "numeric" });
      queries.upsertMetricDefinition({ name: "alpha", type: "label" });
      queries.upsertMetricDefinition({ name: "beta", type: "numeric" });

      const metrics = queries.getAllMetricDefinitions();
      expect(metrics).toHaveLength(3);
      expect(metrics[0]?.name).toBe("alpha");
      expect(metrics[1]?.name).toBe("beta");
      expect(metrics[2]?.name).toBe("zebra");
    });

    it("returns empty array when no metrics exist", () => {
      const metrics = queries.getAllMetricDefinitions();
      expect(metrics).toHaveLength(0);
    });
  });

  describe("getBaselineMetricValues", () => {
    it("returns baseline values for metric from reference branch", () => {
      // Create reference branch builds
      const refBuild1 = queries.insertBuildContext({
        commit_sha: "ref1".repeat(40),
        branch: "main",
        run_id: "ref1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      });

      const refBuild2 = queries.insertBuildContext({
        commit_sha: "ref2".repeat(40),
        branch: "main",
        run_id: "ref2",
        run_number: 2,
        event_name: "push",
        timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
      });

      const metric = queries.upsertMetricDefinition({
        name: "test-metric",
        type: "numeric",
      });

      // Insert baseline values
      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: refBuild1,
        value_numeric: 85.5,
        collected_at: new Date().toISOString(),
      });

      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: refBuild2,
        value_numeric: 87.2,
        collected_at: new Date().toISOString(),
      });

      const baselineValues = queries.getBaselineMetricValues("test-metric", "main");

      expect(baselineValues).toHaveLength(2);
      expect(baselineValues[0]?.value_numeric).toBe(87.2); // Most recent first
      expect(baselineValues[1]?.value_numeric).toBe(85.5);
    });

    it("filters by reference branch", () => {
      const mainBuild = queries.insertBuildContext({
        commit_sha: "main1".repeat(40),
        branch: "main",
        run_id: "main1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date().toISOString(),
      });

      const featureBuild = queries.insertBuildContext({
        commit_sha: "feat1".repeat(40),
        branch: "feature",
        run_id: "feat1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date().toISOString(),
      });

      const metric = queries.upsertMetricDefinition({
        name: "branch-test",
        type: "numeric",
      });

      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: mainBuild,
        value_numeric: 100,
        collected_at: new Date().toISOString(),
      });

      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: featureBuild,
        value_numeric: 200,
        collected_at: new Date().toISOString(),
      });

      const baselineValues = queries.getBaselineMetricValues("branch-test", "main");

      expect(baselineValues).toHaveLength(1);
      expect(baselineValues[0]?.value_numeric).toBe(100);
    });

    it("excludes non-push events and old builds", () => {
      const oldBuild = queries.insertBuildContext({
        commit_sha: "old1".repeat(40),
        branch: "main",
        run_id: "old1",
        run_number: 1,
        event_name: "push",
        timestamp: new Date(Date.now() - 86400000 * 100).toISOString(), // 100 days ago
      });

      const prBuild = queries.insertBuildContext({
        commit_sha: "pr1".repeat(40),
        branch: "main",
        run_id: "pr1",
        run_number: 1,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      });

      const metric = queries.upsertMetricDefinition({
        name: "filter-test",
        type: "numeric",
      });

      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: oldBuild,
        value_numeric: 50,
        collected_at: new Date().toISOString(),
      });

      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_numeric: 75,
        collected_at: new Date().toISOString(),
      });

      const baselineValues = queries.getBaselineMetricValues("filter-test", "main", 20, 90);

      expect(baselineValues).toHaveLength(0); // Both filtered out
    });

    it("respects maxBuilds limit", () => {
      const metric = queries.upsertMetricDefinition({
        name: "limit-test",
        type: "numeric",
      });

      // Create 5 builds on main branch
      for (let i = 0; i < 5; i++) {
        const buildId = queries.insertBuildContext({
          commit_sha: `build${i}`.repeat(40),
          branch: "main",
          run_id: `build${i}`,
          run_number: i + 1,
          event_name: "push",
          timestamp: new Date().toISOString(),
        });

        queries.insertMetricValue({
          metric_id: metric.id,
          build_id: buildId,
          value_numeric: i * 10,
          collected_at: new Date().toISOString(),
        });
      }

      const baselineValues = queries.getBaselineMetricValues("limit-test", "main", 3, 90);

      expect(baselineValues).toHaveLength(3); // Limited to 3
    });
  });

  describe("getPullRequestMetricValue", () => {
    it("returns metric value for specific PR build", () => {
      const prBuild = queries.insertBuildContext({
        commit_sha: "pr1".repeat(40),
        branch: "feature/test",
        run_id: "pr1",
        run_number: 1,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      });

      const metric = queries.upsertMetricDefinition({
        name: "pr-test",
        type: "numeric",
      });

      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_numeric: 42.5,
        collected_at: new Date().toISOString(),
      });

      const value = queries.getPullRequestMetricValue("pr-test", prBuild);

      expect(value?.value_numeric).toBe(42.5);
    });

    it("returns undefined for non-existent metric", () => {
      const prBuild = queries.insertBuildContext({
        commit_sha: "pr2".repeat(40),
        branch: "feature/test",
        run_id: "pr2",
        run_number: 1,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      });

      const value = queries.getPullRequestMetricValue("non-existent", prBuild);

      expect(value).toBeUndefined();
    });

    it("returns undefined for null values", () => {
      const prBuild = queries.insertBuildContext({
        commit_sha: "pr3".repeat(40),
        branch: "feature/test",
        run_id: "pr3",
        run_number: 1,
        event_name: "pull_request",
        timestamp: new Date().toISOString(),
      });

      const metric = queries.upsertMetricDefinition({
        name: "null-test",
        type: "numeric",
      });

      queries.insertMetricValue({
        metric_id: metric.id,
        build_id: prBuild,
        value_label: "some-label", // No numeric value
        collected_at: new Date().toISOString(),
      });

      const value = queries.getPullRequestMetricValue("null-test", prBuild);

      expect(value).toBeUndefined();
    });
  });
});
