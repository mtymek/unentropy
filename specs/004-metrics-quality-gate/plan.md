# Implementation Plan: Metrics Quality Gate

**Branch**: `004-metrics-quality-gate` | **Date**: 2025-11-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-metrics-quality-gate/spec.md`

## Summary

This feature adds a "metrics quality gate" on top of the existing Unentropy metrics tracking workflow. Repository maintainers will be able to configure per-metric thresholds and have pull requests automatically evaluated against those thresholds, using the main branch (or configured reference) as the baseline. When running in a pull request context, the `track-metrics` workflow can optionally post or update a single pull request comment summarising metric deltas versus the reference branch and clearly flagging any threshold violations.

At a high level, the implementation will:
- Use existing storage and reporting components to read baseline metrics from the reference branch and current metrics for the pull request and surface metric deltas in a single pull request comment.
- Extend configuration to express optional threshold rules for numeric metrics and enable/disable the quality gate behaviour independently of the comment.
- Add evaluation logic that computes pass/fail status per metric and an overall quality gate result based on configured thresholds and baselines.
- Integrate with the track-metrics GitHub Action to surface gate results via action outputs and, when enabled, enrich the existing pull request comment with gate status.

## Technical Context

**Language/Version**: Bun runtime with TypeScript (aligned with existing Unentropy codebase).  
**Primary Dependencies**: Bun runtime, TypeScript, SQLite (metrics store), GitHub Actions runtime, GitHub REST API client for pull request comments, Chart.js for existing visual reports.  
**Storage**: Existing SQLite database managed via the storage provider abstraction (local, artifact, or S3-compatible backends).  
**Testing**: `bun test` for unit, integration, and contract tests; `bun run lint` and `bun run typecheck` in CI; new tests added alongside existing collector, action, storage, and reporter tests.  
**Target Platform**: GitHub Actions runners on Linux (CI workflows triggered by push and pull_request events).  
**Project Type**: Single project repository with CLI-style GitHub Actions implemented in TypeScript under `src/`.
**Performance Goals**: Quality gate evaluation and comment posting MUST keep end-to-end feedback within the specification limit of at most 10% additional latency compared with the existing metrics tracking workflow without the quality gate, with a practical target of 1–2 seconds total for small repositories and 3–4 seconds for medium repositories, and hard caps of 5 seconds and 10 seconds respectively.  
**Constraints**: All behaviour must remain serverless within GitHub Actions, avoid introducing persistent services, and respect security guidance (no logging of secrets and minimal external surface area). The gate will read from a bounded recent history window per metric (defaulting to the last 20 successful reference-branch builds, with a minimum of 5 and a maximum age around 90 days), enforce a per-run metric count cap (typically 2,000 metrics, with an upper bound around 5,000), and keep pull request comments compact (at most ~30 metrics visible and ~8,000 characters total, linking to full HTML reports when more detail is needed).  
**Scale/Scope**: Designed for small-to-medium repositories (roughly 20–500 metrics and thousands of builds per repository), while comfortably supporting up to ~1,000 metrics per repository and on the order of 20,000 builds and 10,000 pull requests without special scaling, with configuration safeguards (metric caps, retention settings, and optional sharding of gates by subsystem) recommended for very large monorepos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Based on `.specify/memory/constitution.md`, this feature must satisfy the following gates:

1. **Serverless Architecture**  
   - Gate: All new functionality must run entirely inside GitHub Actions workflows with no long-lived servers or external orchestration services.  
   - Plan: Implement quality gate evaluation and pull request comments as part of the existing Bun-based GitHub Actions (primarily the `track-metrics` action), reusing current storage and reporter components without introducing new hosted services.  
   - Status: PASS (no serverful components planned).

2. **Technology Stack Consistency**  
   - Gate: Use Bun with TypeScript, SQLite for storage, and Chart.js for reporting; avoid introducing divergent runtimes or databases.  
   - Plan: Extend existing TypeScript modules under `src/` and reuse the established SQLite schema and storage providers; visual changes (if any) will reuse current Chart.js-based reporting. No new runtime or database technologies are introduced.  
   - Status: PASS (stack remains consistent).

3. **Code Quality Standards**  
   - Gate: Maintain strict TypeScript, Prettier formatting, and minimal comments while following existing conventions.  
   - Plan: Implement quality gate logic with strict types (including explicit types for thresholds and evaluation results), keep modules small and coherent, and rely on existing linting and formatting tooling.  
   - Status: PASS (no deviations required).

4. **Security Best Practices**  
   - Gate: Never log or expose secrets; keep error messages and outputs free of sensitive data.  
   - Plan: When interacting with GitHub APIs or environment variables, avoid logging raw tokens or payloads; ensure pull request comments and logs only contain metric values and high-level status, never secrets.  
   - Status: PASS (no security exceptions planned).

5. **Testing Discipline**  
   - Gate: Add or update unit, integration, and contract tests; ensure build, lint, typecheck, and tests run in CI.  
   - Plan: Extend existing tests for `track-metrics`, storage queries, and reporter logic, and add new contract tests for the action inputs/outputs and quality gate behaviour.  
   - Status: PASS (test coverage planned as part of implementation).

No constitution violations are currently anticipated, so the Complexity Tracking section remains informational only. If later design choices would violate any gate, they must be documented and justified there before implementation.

## Project Structure

### Documentation (this feature)

```text
specs/004-metrics-quality-gate/
├── spec.md              # Feature specification (already written)
├── plan.md              # This implementation plan (/speckit.plan output)
├── research.md          # Phase 0 research decisions (/speckit.plan output)
├── data-model.md        # Phase 1 data model (/speckit.plan output)
├── quickstart.md        # Phase 1 implementation quickstart (/speckit.plan output)
├── contracts/           # Phase 1 contracts (/speckit.plan output)
│   ├── action-interface.md    # GitHub Action interface for quality gate
│   └── config-schema.md       # Config schema extension for thresholds/gate
└── checklists/
    └── requirements.md  # Specification quality checklist (existing)
    # tasks.md will be created later by /speckit.tasks, not by /speckit.plan
```

### Source Code (repository root)

```text
src/
├── actions/
│   ├── collect.ts        # Existing metrics collection entrypoint
│   ├── track-metrics.ts  # Orchestrates end-to-end tracking (quality gate integration point)
│   ├── find-database.ts  # Database discovery for reporting workflows
│   └── report.ts         # Report generation entrypoint
├── collector/
│   ├── collector.ts      # Metric collection orchestration
│   ├── context.ts        # Build context extraction
│   └── runner.ts         # Command execution for metrics
├── config/
│   ├── loader.ts         # unentropy.json loading and validation
│   └── schema.ts         # Core configuration schema (extended for thresholds/gate)
├── reporter/
│   ├── generator.ts      # HTML report generation
│   ├── charts.ts         # Chart configuration helpers
│   └── templates/...     # HTML/React templates for reports
└── storage/
    ├── storage.ts        # Storage orchestration and provider selection
    ├── queries.ts        # Database queries for metrics/history
    └── providers/...

tests/
├── contract/
│   └── track-metrics-config.test.ts   # Config contract (extended for thresholds/gate)
├── integration/
│   ├── track-metrics.test.ts          # End-to-end metrics workflow (extended for gate)
│   ├── collection.test.ts
│   ├── reporting.test.ts
│   └── storage-selection.test.ts
└── unit/
    ├── collector/
    ├── config/
    ├── reporter/
    └── storage/
```

**Structure Decision**: Reuse the existing single-project structure under `src/` and `tests/`, adding quality gate evaluation and pull request comment logic primarily to `src/actions/track-metrics.ts`, configuration extensions in `src/config/schema.ts`, and any necessary query helpers in `src/storage/queries.ts`. No new top-level packages or projects are introduced; documentation and contracts for this feature live exclusively under `specs/004-metrics-quality-gate/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| *(none)* | No constitution violations are currently planned for this feature. | N/A |
