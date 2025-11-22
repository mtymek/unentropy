# GitHub Action Interface: Metrics Quality Gate

**Feature**: 004-metrics-quality-gate  
**Date**: 2025-11-19  
**Purpose**: Define the GitHub Action interface changes required to support the Metrics Quality Gate and pull request comment behaviour in the `track-metrics` workflow.

## Action Definition

The quality gate feature builds on the existing `track-metrics` action interface defined in previous specs. This document focuses on new or extended inputs and outputs that control gate evaluation and pull request feedback.

### Action Metadata (unchanged)

```yaml
name: 'Unentropy Track Metrics'
description: 'End-to-end metrics workflow with optional quality gate and pull request feedback'
author: 'Unentropy'
branding:
  icon: 'bar-chart'
  color: 'blue'
```

### New and Extended Input Parameters

```yaml
inputs:
  # Existing inputs (storage, config-file, database, report, etc.) remain as defined
  # in the core and storage-related specs. Only new/changed inputs are listed here.

  quality-gate-mode:
    description: >-
      Quality gate behaviour: 'off' (no gate), 'soft' (informational only),
      or 'hard' (may fail the job when thresholds are violated). When omitted,
      the value from unentropy.json qualityGate.mode is used.
    required: false

  quality-gate-config-file:
    description: >-
      Optional path to an override configuration file for quality gate settings
      (thresholds, mode, baseline window). When provided, this file is merged
      on top of unentropy.json for gate-related fields only.
    required: false

  enable-pr-comment:
    description: >-
      Whether to post or update a pull request comment with metric deltas and
      gate status when running in a pull_request context. When omitted, the
      value from unentropy.json qualityGate.enablePullRequestComment is used.
    required: false
    default: true 

  max-pr-comment-metrics:
    description: >-
      Maximum number of metrics to show explicitly in the pull request comment.
      Excess metrics are summarised. Defaults to the qualityGate.maxCommentMetrics
      value from configuration when omitted.
    required: false
    default: 10

  pr-comment-marker:
    description: >-
      Custom HTML marker used to identify the canonical Unentropy metrics
      comment on a pull request (e.g., '<!-- unentropy-metrics-quality-gate -->').
      When omitted, a sensible default marker is used.
    required: false

  quality-gate-timeout-seconds:
    description: >-
      Optional timeout in seconds for the quality gate evaluation and PR comment
      update. If exceeded, the gate degrades to an 'unknown' soft result and
      the job continues.
    required: false
```

### New Output Parameters

```yaml
outputs:
  # Existing outputs (success, storage-type, database-location, etc.) remain
  # as defined in previous specs. Only new outputs are listed here.

  quality-gate-status:
    description: >-
      Overall quality gate status for this run: 'pass', 'fail', or 'unknown'.
      'unknown' indicates that the gate was disabled, not fully configured,
      or could not be evaluated (for example, missing baseline data).

  quality-gate-failing-metrics:
    description: >-
      Comma-separated list of metric names that failed blocking thresholds
      in this run. Empty when the gate passed or was not configured.

  quality-gate-comment-url:
    description: >-
      URL of the pull request comment that contains the metrics summary and
      gate status, when enable-pr-comment is true and the action runs in a
      pull_request context.
```

## Behavioural Contract

### Gate Evaluation

- When `quality-gate-mode` (from inputs or configuration) is `off`, the action:
  - Skips threshold evaluation.
  - Sets `quality-gate-status` to `unknown`.
  - Does not affect the job result, even if thresholds are present.

- When mode is `soft`:
  - Thresholds are evaluated and `quality-gate-status` is `pass` or `fail`.
  - The job does **not** fail solely because the gate failed.
  - Failing metrics are still exposed via `quality-gate-failing-metrics` and
    any pull request comment or job summary.

- When mode is `hard`:
  - Thresholds are evaluated as above.
  - If any blocking metric fails its threshold, `quality-gate-status` is `fail`
    and the action is allowed to fail the job according to repository policies
    (for example, by setting a non-zero exit code or marking the check as failed).
  - Missing baselines, configuration errors, or timeouts should result in an
    `unknown` status rather than failing the job outright.

### Pull Request Comment Behaviour

- The action posts or updates a pull request comment **only** when:
  - The workflow is running in a pull_request context, and
  - `enable-pr-comment` is explicitly `true` (or the configuration enables it).

- A single canonical comment is maintained per pull request:
  - The action locates an existing comment using the configured `pr-comment-marker`
    (or its default marker) and updates it in place.
  - If no such comment exists, the action creates one.
  - Comment update failures (for example, due to permissions) must not cause
    the gate to hard-fail; results remain available in the job summary.

- The comment content MUST:
  - Include a clear overall status line (pass/fail/unknown) and gate mode.
  - Show a compact table of key metrics (up to `max-pr-comment-metrics`),
    including baseline value, pull request value, delta, and pass/fail state.
  - Summarise additional metrics beyond the display limit and, when possible,
    link to a full HTML report or artifact generated by the workflow.

## Security Considerations

- The action continues to rely on `GITHUB_TOKEN` and existing credentials
  described in previous specs; the quality gate feature MUST NOT introduce
  new secret types or log sensitive values.
- Pull request comments and logs MUST contain only metric names, values,
  and gate-related messages; no secrets or raw configuration content.
- When interacting with forks, the action must follow GitHub recommendations
  for safe use of `GITHUB_TOKEN` and avoid executing untrusted code with
  elevated permissions.

## Compatibility Notes

- Repositories that do not configure `qualityGate` or related action inputs
  continue to use the existing track-metrics behaviour with no gate.
- Existing workflows can adopt the quality gate incrementally by:
  - Defining thresholds in `unentropy.json`.
  - Enabling `quality-gate-mode: 'soft'` and, optionally, `enable-pr-comment`.
  - Later switching to `quality-gate-mode: 'hard'` on protected branches once
    thresholds are stable and teams are comfortable with the behaviour.
