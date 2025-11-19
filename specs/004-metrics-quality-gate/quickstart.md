# Quickstart Guide: Metrics Quality Gate

**Feature**: 004-metrics-quality-gate  
**Audience**: Developers implementing this feature  
**Last Updated**: 2025-11-19

## Overview

This guide outlines the concrete steps to implement the Metrics Quality Gate feature in the existing Unentropy codebase. It assumes the core metrics collection, storage, and reporting features are already in place.

At a high level, implementation will:
- Extend configuration and validation to support a `qualityGate` block with thresholds and mode.
- Add evaluation logic that reads baseline data from the existing SQLite database and compares pull request metrics against configured thresholds.
- Integrate gate evaluation into the `track-metrics` action and expose results via outputs and an optional pull request comment.
- Add tests (unit, integration, and contract) to cover configuration, evaluation, and action behaviour.

## Phase 1: Configuration and Schema

**Goal**: Represent and validate the `qualityGate` block in `unentropy.json`.

**Components**:
1. `src/config/schema.ts` – Extend the existing configuration schema with `qualityGate`, `baseline`, and `thresholds` fields.
2. `src/config/loader.ts` – Ensure the loader returns a typed configuration that includes the `qualityGate` block when present.
3. `tests/unit/config/` – Add tests for valid and invalid quality gate configurations.

**Implementation Hints**:
- Mirror the structures defined in `specs/004-metrics-quality-gate/contracts/config-schema.md`.
- Enforce that thresholds reference existing metric names and numeric metrics only.
- Provide sensible defaults for optional values (for example, `mode: 'soft'`, `maxCommentMetrics: 30`, `baseline.maxBuilds: 20`).

## Phase 2: Evaluation Logic

**Goal**: Evaluate metric thresholds given the current pull request run and baseline data from the reference branch.

**Components**:
1. `src/storage/queries.ts` – Add helper queries to:
   - Fetch recent successful builds for the reference branch within the baseline window.
   - Retrieve numeric metric values for those builds and for the current build.
2. `src/actions/track-metrics.ts` (or a dedicated helper module) – Implement:
   - Construction of `MetricSample` and `MetricEvaluationResult` objects.
   - Aggregation into a `QualityGateResult` as described in `data-model.md`.
3. `tests/unit/storage/` and `tests/unit/collector/` – Add unit tests for the new queries and evaluation helpers.
4. `tests/integration/track-metrics.test.ts` – Extend integration tests to cover gate evaluation for simple scenarios (all pass, some fail, missing baselines).

**Implementation Hints**:
- Keep evaluation O(number of metrics) using batched queries over a limited history window (no full-table scans).
- Treat missing baseline data as `unknown` for that metric and avoid hard-failing the job.
- Reuse existing build context information to determine whether the current run is against a pull request and which branch is the reference.

## Phase 3: GitHub Action Integration and Outputs

**Goal**: Wire the quality gate into the `track-metrics` GitHub Action and expose results.

**Components**:
1. `.github/actions/track-metrics/action.yml` – Add the new inputs and outputs defined in `contracts/action-interface.md`.
2. `src/actions/track-metrics.ts` –
   - Read gate-related inputs and merge them with configuration.
   - Invoke the evaluation logic after metrics have been collected.
   - Set outputs such as `quality-gate-status`, `quality-gate-mode`, and `quality-gate-failing-metrics`.
3. `tests/contract/track-metrics-config.test.ts` – Extend contract tests to assert that inputs and outputs behave as specified.

**Implementation Hints**:
- Keep the main action entrypoint focused on orchestration; consider extracting gate evaluation into a small helper module to keep files readable.
- Ensure that existing behaviour is preserved when `qualityGate` is not configured.
- Respect the `mode` (`off`, `soft`, `hard`) when deciding whether to fail the job.

## Phase 4: Pull Request Comment Generation

**Goal**: Generate and maintain a single, compact pull request comment that summarises metrics and gate status.

**Components**:
1. `src/actions/track-metrics.ts` or a new helper under `src/reporter/` – Implement comment payload construction based on `PullRequestFeedbackPayload` from `data-model.md`.
2. A thin GitHub API integration layer (reusing existing patterns) to:
   - Find or create the canonical Unentropy metrics comment using a marker.
   - Update the comment with the latest payload.
3. `tests/integration/track-metrics.test.ts` – Add scenarios that simulate pull_request runs and verify that the comment payload is built correctly (even if real API calls are mocked).

**Implementation Hints**:
- Keep the comment under the configured size and metric-count limits; summarise the rest.
- Design the comment body as Markdown with a short heading, one-line summary, and a small table of metrics.
- Ensure comment failures (for example, permission errors) do not cause the job to fail.

## Testing Strategy

- **Unit tests**:
  - Config schema and loader changes for the `qualityGate` block.
  - Evaluation logic for each threshold mode and edge cases (missing baseline, missing PR value).
  - Comment payload formatting and truncation rules.
- **Integration tests**:
  - End-to-end runs of `track-metrics` in soft and hard modes.
  - Behaviour when thresholds are missing, when all metrics pass, and when at least one metric fails.
- **Contract tests**:
  - Inputs and outputs for the `track-metrics` GitHub Action, including gate-related values.

## Build and CI Notes

- Ensure existing build and test commands continue to run successfully:
  - `bun run build`
  - `bun run typecheck`
  - `bun run lint`
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
