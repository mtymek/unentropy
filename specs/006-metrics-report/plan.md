# Implementation Plan: Metrics Report

**Branch**: `006-metrics-report` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-metrics-report/spec.md`

## Summary

Enhance the existing HTML report template to support normalized build history across all metric charts, add a preview data toggle for sparse datasets (<10 builds), and improve handling of missing data points. This builds on the MVP report infrastructure (Preact components, Chart.js visualization, Tailwind CSS styling) to deliver a more polished and useful metrics visualization experience.

## Technical Context

**Language/Version**: TypeScript 5.9+ with Bun runtime  
**Primary Dependencies**: Preact (server-side rendering), Chart.js 4.x (visualization), Tailwind CSS (styling via CDN), serialize-javascript  
**Storage**: SQLite via existing storage/repository abstraction  
**Testing**: Bun test runner, visual review fixtures in `tests/fixtures/visual-review/`  
**Target Platform**: Static HTML files viewable in modern browsers (Chrome 90+, Firefox 88+, Safari 14+)  
**Project Type**: Single project - extends existing `src/reporter/` module  
**Performance Goals**: Charts render within 2 seconds, toggle responds within 100ms  
**Constraints**: Self-contained HTML (CDN resources only), offline-viewable after initial load  
**Scale/Scope**: Reports with 1-100+ metrics, 1-1000+ builds

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Serverless Architecture | PASS | HTML reports are static files generated within GitHub Actions; no external servers |
| II. Technology Stack Consistency | PASS | Uses existing stack: Bun, TypeScript, SQLite, Chart.js, Preact |
| III. Code Quality Standards | PASS | Will follow strict TypeScript, Prettier formatting, minimal comments |
| IV. Security Best Practices | PASS | No secrets involved; HTML escaping already implemented for XSS prevention |
| V. Testing Discipline | PASS | Visual test fixtures cover all scenarios; will extend existing fixtures |

**Additional Constraints Check**:
- Lightweight and self-contained: PASS (single HTML file output)
- Runs within GitHub Actions: PASS (report generation is a workflow step)
- No persistent servers: PASS (static file generation only)

### Post-Design Check (Phase 1)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Serverless Architecture | PASS | No changes - synthetic data generated at report generation time, not runtime |
| II. Technology Stack Consistency | PASS | Added serialize-javascript (already a dependency), no new frameworks |
| III. Code Quality Standards | PASS | Data model uses strict TypeScript interfaces |
| IV. Security Best Practices | PASS | No new attack surfaces; toggle is client-side only |
| V. Testing Discipline | PASS | research.md includes test cases; quickstart.md has checklist |

**Design Review**:
- New files: 1 (PreviewToggle.tsx component)
- Modified files: 6 (generator.ts, types.ts, charts.ts, Header.tsx, HtmlDocument.tsx, ChartScripts.tsx)
- No external service integrations added
- All client-side state is ephemeral (resets on page reload)

## Project Structure

### Documentation (this feature)

```text
specs/006-metrics-report/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── config-schema.md # Toggle/display configuration options
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── reporter/
│   ├── charts.ts                    # Chart.js config builders (MODIFY)
│   ├── generator.ts                 # Report generation (MODIFY)
│   ├── types.ts                     # Report data types (MODIFY)
│   └── templates/
│       └── default/
│           └── components/
│               ├── Header.tsx       # Add toggle component (MODIFY)
│               ├── HtmlDocument.tsx # Pass build count context (MODIFY)
│               ├── ChartScripts.tsx # Add toggle logic, synthetic data (MODIFY)
│               ├── PreviewToggle.tsx # NEW: Toggle switch component
│               └── index.ts         # Export new component (MODIFY)

tests/
├── fixtures/
│   └── visual-review/
│       ├── minimal/           # 5 builds - toggle visible
│       ├── full-featured/     # 25 builds - toggle hidden
│       ├── sparse-data/       # 3 builds - toggle visible
│       └── edge-cases/        # Various edge cases
├── unit/
│   └── reporter/
│       ├── charts.test.ts     # Test normalized axis, gaps
│       └── generator.test.ts  # Test toggle threshold logic
└── integration/
    └── reporting.test.ts      # End-to-end report generation
```

**Structure Decision**: Extends existing single-project structure. All changes contained within `src/reporter/` module and `tests/` directories.

## Complexity Tracking

> No violations - all requirements align with existing architecture and technology stack.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
