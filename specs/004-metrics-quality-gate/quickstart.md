# Quickstart Guide: Metrics Quality Gate

**Feature**: 004-metrics-quality-gate  
**Audience**: Developers implementing this feature  
**Last Updated**: 2025-11-19

## Overview

This guide outlines the concrete steps to implement the Metrics Quality Gate feature in the existing Unentropy codebase. It assumes the core metrics collection, storage, and reporting features are already in place.

We will deliver this feature incrementally:
- **Phase 1**: Add a pull request comment that shows how metrics have changed compared with the reference branch (diff-only, no thresholds or gate decisions).
- **Later phases**: Introduce the `qualityGate` configuration block, evaluation logic, and optional hard/soft gate behaviour that can block or warn on pull requests.

## Phase 1: Pull Request Comment with Metric Diffs (No Gate)

**Goal**: When running on a pull request with comments enabled, post or update a single compact comment that summarises how each metric has changed compared with the reference branch, without making any pass/fail decisions.

**Components**:
1. `src/storage/repository.ts` – Add domain methods to:
   - Fetch the latest successful metrics snapshot for the reference branch (for example, main) from the existing SQLite database.
   - Fetch the current metrics for the pull request build.
   - Example: `getMetricComparison(name, baseCommit, currentCommit)`
2. `src/actions/track-metrics.ts` – Implement logic to:
   - Detect pull_request context and the reference branch.
   - Use repository methods to compute per-metric deltas between baseline and pull request values.
   - Build a compact comment payload (heading, summary line, and table of metric diffs).
   - Use the configured marker (or default) to find or create the canonical comment and update it in place.
3. `tests/integration/track-metrics.test.ts` – Add scenarios that:
   - Simulate a pull_request run with changed metrics and verify that the diff payload is constructed correctly.
   - Ensure no comment is posted when the workflow is not running in a pull_request context or comments are disabled.

**Implementation Hints**:
- Focus Phase 1 on **diff-only** output: show baseline value, pull request value, and delta (absolute and/or percent) for each relevant metric; do not reference thresholds or gate status yet.
- Reuse existing build context helpers to determine branch names and commit SHAs.
- Keep the comment small and skimmable by default (for example, highlight the most changed metrics first and summarise the rest).
- Ensure comment failures (for example, permission errors) do not fail the job; log and continue.

## Phase 2: Configuration and Schema for Quality Gate

**Goal**: Represent and validate the optional `qualityGate` block in `unentropy.json`, without yet enforcing it in CI behaviour.

**Components**:
1. `src/config/schema.ts` – Extend the existing configuration schema with `qualityGate`, `baseline`, and `thresholds` fields.
2. `src/config/loader.ts` – Ensure the loader returns a typed configuration that includes the `qualityGate` block when present.
3. `tests/unit/config/` – Add tests for valid and invalid quality gate configurations.

**Implementation Hints**:
- Mirror the structures defined in `specs/004-metrics-quality-gate/contracts/config-schema.md`.
- Enforce that thresholds reference existing metric names and numeric metrics only.
- Provide sensible defaults for optional values (for example, `mode: 'soft'`, `maxCommentMetrics: 30`, `baseline.maxBuilds: 20`).
- Keep the system behaviour unchanged when `qualityGate` is omitted; Phase 1’s comment continues to work independently.

## Phase 3: Evaluation Logic (Soft Gate)

**Goal**: Evaluate metric thresholds given the current pull request run and baseline data from the reference branch, producing a `QualityGateResult` that can be reported but does not yet have to block merges.

**Components**:
1. `src/storage/repository.ts` – Add or extend domain methods to:
   - Fetch recent successful builds for the reference branch within the configured baseline window.
   - Retrieve numeric metric values for those builds and for the current build.
   - Example: `getMetricHistory(name, options)` with filtering by branch and time window
2. `src/actions/track-metrics.ts` (or a dedicated helper module) – Implement:
   - Construction of `MetricSample` and `MetricEvaluationResult` objects using repository.
   - Aggregation into a `QualityGateResult` as described in `data-model.md`.
3. `tests/unit/storage/` and `tests/unit/collector/` – Add unit tests for the new repository methods and evaluation helpers.
4. `tests/integration/track-metrics.test.ts` – Extend integration tests to cover gate evaluation for simple scenarios (all pass, some fail, missing baselines).

**Implementation Hints**:
- Keep evaluation O(number of metrics) using batched queries over a limited history window (no full-table scans).
- Treat missing baseline data as `unknown` for that metric and avoid hard-failing the job at this phase.
- Align behaviour with the decisions recorded in `research.md` for baseline windows and aggregation.

## Phase 4: GitHub Action Integration and Optional Hard Gate

**Goal**: Wire the quality gate into the `track-metrics` GitHub Action so that gate results are exposed via inputs/outputs and, optionally, can influence job success or failure.

**Components**:
1. `.github/actions/track-metrics/action.yml` – Add or confirm the inputs and outputs defined in `contracts/action-interface.md` (gate mode, comment enable flag, gate status outputs, failing metrics list, comment URL).
2. `src/actions/track-metrics.ts` –
   - Read gate-related inputs and merge them with configuration.
   - Invoke the evaluation logic after metrics have been collected.
   - Set outputs such as `quality-gate-status`, `quality-gate-mode`, and `quality-gate-failing-metrics`.
   - Decide whether to fail the job when `mode` is `hard` and blocking thresholds are violated.
3. `tests/contract/track-metrics-config.test.ts` – Extend contract tests to assert that inputs and outputs behave as specified.

**Implementation Hints**:
- Keep the main action entrypoint focused on orchestration; consider extracting gate evaluation into a small helper module to keep files readable.
- Ensure that existing behaviour is preserved when `qualityGate` is not configured or when `mode` is `off`.
- Respect the `mode` (`off`, `soft`, `hard`) when deciding whether to fail the job.
- Reuse the Phase 1 comment so that, when comments are enabled, the gate status is simply added to the existing diff summary.

## Testing Strategy

- **Unit tests**:
  - Comment diff calculation and payload formatting for Phase 1.
  - Config schema and loader changes for the `qualityGate` block (Phase 2).
  - Evaluation logic for each threshold mode and edge cases (missing baseline, missing PR value) (Phase 3).
- **Integration tests**:
  - End-to-end runs of `track-metrics` in PR mode with comments enabled (diff-only and with gate status once implemented).
  - Behaviour when thresholds are missing, when all metrics pass, and when at least one metric fails.
- **Contract tests**:
  - Inputs and outputs for the `track-metrics` GitHub Action, including gate-related values and comment-related flags.

## Build and CI Notes

- Ensure existing build and test commands continue to run successfully:
  - `bun check`
  - `bun test`
- Add or update CI workflows as needed so that new tests are executed on every pull request.

## Reference Documents

- [Feature Specification](./spec.md)
- [Technical Plan](./plan.md)
- [Research & Decisions](./research.md)
- [Data Model](./data-model.md)
- [Contracts](./contracts/)
  - [Action Interface](./contracts/action-interface.md)
  - [Config Schema](./contracts/config-schema.md)
