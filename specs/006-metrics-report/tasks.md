# Tasks: Metrics Report

**Input**: Design documents from `/specs/006-metrics-report/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/config-schema.md

**Tests**: Visual review fixtures serve as the primary validation mechanism for this UI-focused feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create new module structure and update type definitions

- [ ] T001 Create synthetic data generator module at src/reporter/synthetic.ts with seeded PRNG functions (createSeededRng, hashString)
- [ ] T002 [P] Add PreviewDataSet interface to src/reporter/types.ts (metricId, values, stats fields)
- [ ] T003 [P] Extend ReportData interface in src/reporter/types.ts with showToggle and previewData fields
- [ ] T004 [P] Extend GenerateReportOptions interface in src/reporter/types.ts with enablePreviewToggle and previewThreshold fields

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for normalized build data that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add getAllBuildContexts() wrapper function in src/reporter/generator.ts to retrieve complete build history
- [x] T006 Create normalizeMetricToBuilds() helper function in src/reporter/generator.ts that maps metric data to full build range using null for gaps
- [x] T007 Update buildChartConfig() in src/reporter/charts.ts to accept normalized data arrays with null values
- [x] T008 Ensure Chart.js configuration in src/reporter/charts.ts sets spanGaps: false for line charts

**Checkpoint**: Foundation ready - normalized build data infrastructure complete

---

## Phase 3: User Story 1 - View Metric Trends in Report (Priority: P1)

**Goal**: Each metric displays in its own section with chart, statistics, and normalized X-axis across all builds

**Independent Test**: Generate report with multiple metrics and verify each has its own card with chart showing all builds on X-axis, statistics (latest, min, max, trend), and description

### Implementation for User Story 1

- [x] T009 [US1] Update generateReport() in src/reporter/generator.ts to use normalized build data for all metrics
- [ ] T010 [US1] Modify chart label generation in src/reporter/charts.ts to use full build timestamp array
- [ ] T011 [US1] Update MetricCard component in src/reporter/templates/default/components/MetricCard.tsx to add data-metric-id attribute for stats updates
- [ ] T012 [US1] Verify existing StatsGrid component in src/reporter/templates/default/components/StatsGrid.tsx displays Latest/Min/Max/Trend correctly
- [ ] T013 [US1] Update sparse data threshold check in src/reporter/generator.ts to use dataPointCount (non-null values) instead of array length

**Checkpoint**: User Story 1 complete - all metrics show normalized X-axis with proper statistics

---

## Phase 4: User Story 2 - Toggle Between Real and Dummy Data (Priority: P2)

**Goal**: Reports with <10 builds show a toggle to switch between real and synthetic preview data

**Independent Test**: Generate report with 5 builds, verify toggle appears in header, clicking switches all charts to 20-point synthetic data, statistics update accordingly

### Implementation for User Story 2

- [ ] T014 [P] [US2] Implement generateSyntheticData() function in src/reporter/synthetic.ts using mean-reverting algorithm with Gaussian noise
- [ ] T015 [P] [US2] Implement calculateSyntheticStats() function in src/reporter/synthetic.ts to compute stats for synthetic data
- [ ] T016 [US2] Create PreviewToggle.tsx component at src/reporter/templates/default/components/PreviewToggle.tsx with accessible checkbox toggle
- [ ] T017 [US2] Export PreviewToggle from src/reporter/templates/default/components/index.ts
- [ ] T018 [US2] Update Header.tsx in src/reporter/templates/default/components/Header.tsx to accept showToggle prop and render PreviewToggle
- [ ] T019 [US2] Update HtmlDocument.tsx in src/reporter/templates/default/components/HtmlDocument.tsx to pass showToggle and previewData to Header and ChartScripts
- [ ] T020 [US2] Update generateReport() in src/reporter/generator.ts to compute showToggle based on buildCount < previewThreshold
- [ ] T021 [US2] Update generateReport() in src/reporter/generator.ts to generate previewData array when showToggle is true
- [ ] T022 [US2] Update ChartScripts.tsx in src/reporter/templates/default/components/ChartScripts.tsx to embed realData and previewData in chartsData array
- [ ] T023 [US2] Add toggle event handler script in src/reporter/templates/default/components/ChartScripts.tsx that updates chart.data.datasets[0].data and calls chart.update('none')
- [ ] T024 [US2] Add stats DOM update logic in ChartScripts.tsx toggle handler to update Latest/Min/Max/Trend display elements

**Checkpoint**: User Story 2 complete - toggle appears for sparse reports and switches data/stats

---

## Phase 5: User Story 3 - View Consistent Build History Across Metrics (Priority: P3)

**Goal**: All charts show same X-axis range; missing data points display as gaps with appropriate tooltip

**Independent Test**: Generate report where Metric A has data for all builds but Metric B only has data for some builds; verify both charts show same X-axis range and Metric B shows gaps

### Implementation for User Story 3

- [x] T025 [US3] Update buildNumericChartConfig() in src/reporter/charts.ts to preserve null values in data array instead of converting to 0
- [x] T026 [US3] Add custom tooltip callback in src/reporter/charts.ts to show "No data recorded for this build" when hovering over null data point region
- [x] T027 [US3] Configure tooltip interaction mode in src/reporter/charts.ts with intersect: false to allow tooltips at X positions without data points
- [x] T028 [US3] Update ChartScripts.tsx in src/reporter/templates/default/components/ChartScripts.tsx to include tooltip callback configuration in serialized chart config
- [x] T029 [US3] Add metric with data gaps to tests/fixtures/visual-review/full-featured/ fixture to demonstrate consistent X-axis with missing data points alongside existing metrics

**Checkpoint**: User Story 3 complete - gaps visible with informative tooltips

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Visual validation, edge cases, and accessibility

- [ ] T030 [P] Update minimal fixture in tests/fixtures/visual-review/minimal/ to have exactly 5 builds (toggle visible)
- [ ] T031 [P] Update sparse-data fixture in tests/fixtures/visual-review/sparse-data/ to have 3 builds with gaps in metric data
- [ ] T032 [P] Verify full-featured fixture in tests/fixtures/visual-review/full-featured/ has 25 builds (toggle hidden)
- [ ] T033 [P] Update edge-cases fixture in tests/fixtures/visual-review/edge-cases/ to include metric with single data point and flatline data
- [ ] T034 Run bun run visual-review to generate fixtures and manually verify all acceptance scenarios
- [ ] T035 Verify toggle keyboard accessibility (Tab navigation, Space/Enter activation, focus ring visibility)
- [ ] T036 Verify ARIA attributes on toggle (role="switch") and charts (aria-label)
- [ ] T037 Run bun run typecheck to ensure no TypeScript errors
- [ ] T038 Run bun run lint to ensure code style compliance
- [ ] T039 Run bun test to verify existing tests still pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on T001-T004 (types must exist)
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) completion
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 - Uses stats from US1 but independently testable
- **User Story 3 (P3)**: Can start after Phase 2 - Enhances charts from US1 but independently testable

### Within Each User Story

- Type definitions before implementation
- Generator logic before components
- Components before client-side scripts
- Core implementation before edge case handling

### Parallel Opportunities

**Phase 1 (Setup)**:
```bash
# T002, T003, T004 can run in parallel (different sections of types.ts or separate concerns)
```

**Phase 2 (Foundational)**:
```bash
# T007, T008 can run in parallel (different functions in charts.ts)
```

**Phase 4 (US2)**:
```bash
# T014, T015 can run in parallel (different functions in synthetic.ts)
```

**Phase 6 (Polish)**:
```bash
# T030, T031, T032, T033 can run in parallel (different fixture directories)
```

---

## Parallel Example: User Story 2

```bash
# Launch synthetic data functions together:
Task: "Implement generateSyntheticData() function in src/reporter/synthetic.ts"
Task: "Implement calculateSyntheticStats() function in src/reporter/synthetic.ts"

# Then sequentially: component → integration → client script
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T008)
3. Complete Phase 3: User Story 1 (T009-T013)
4. **STOP and VALIDATE**: Run visual-review, verify normalized X-axis works
5. Can demo/deploy MVP with improved chart consistency

### Incremental Delivery

1. **MVP**: Setup + Foundational + US1 → Normalized build history (core value)
2. **+Preview**: Add US2 → Toggle for sparse data preview
3. **+Gaps**: Add US3 → Missing data gap handling
4. **Polish**: Visual validation and accessibility compliance

### Recommended Single-Developer Order

Since most files are shared across stories, sequential execution is recommended:

1. T001-T004 (Setup)
2. T005-T008 (Foundational)
3. T009-T013 (US1) → Validate
4. T014-T024 (US2) → Validate
5. T025-T029 (US3) → Validate
6. T030-T039 (Polish)

---

## Notes

- All tasks modify existing files except T001 (new synthetic.ts) and T016 (new PreviewToggle.tsx)
- Visual review (`bun run visual-review`) is the primary validation method
- No unit tests explicitly requested; visual fixtures serve as acceptance tests
- Commit after each phase completion for easy rollback
- T034 is manual verification - open generated HTML files in browser
