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
});
