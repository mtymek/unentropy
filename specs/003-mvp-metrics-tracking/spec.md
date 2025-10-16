# Feature Specification: MVP Metrics Tracking System

**Feature Branch**: `003-mvp-metrics-tracking`  
**Created**: Thu Oct 16 2025  
**Status**: Draft  
**Input**: User description: "build the specification for the mvp phase. We need our sqlite database, action to collect data, and a simple html generator that will create reports based on it. As the Unentropy user, I would like to have a configuration file (e.g. unentropy.json), where I can define what metrics/labels I want to track."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define Custom Metrics via Configuration (Priority: P1)

As a developer, I want to define what code metrics I want to track through a simple configuration file, so I can customize Unentropy to monitor metrics relevant to my project without modifying code.

**Why this priority**: This is the foundation of the MVP - without the ability to define custom metrics, the system cannot be used. This enables the core value proposition of flexible, user-defined metric tracking.

**Independent Test**: Can be fully tested by creating a configuration file with metric definitions and verifying the system correctly reads and validates the configuration, delivering immediate value by showing users how to customize their tracking setup.

**Acceptance Scenarios**:

1. **Given** I have a project using Unentropy, **When** I create an `unentropy.json` configuration file with metric definitions, **Then** the system reads and validates my configuration
2. **Given** I have defined metrics in my configuration, **When** I specify metric names, types, and labels, **Then** the system accepts valid configurations and rejects invalid ones with clear error messages
3. **Given** I want to track multiple metrics, **When** I add multiple metric definitions to the configuration file, **Then** the system supports tracking all defined metrics

---

### User Story 2 - Collect Metrics in CI/CD Pipeline (Priority: P2)

As a developer, I want my CI/CD pipeline to automatically collect the metrics I've defined, so I can track code quality trends over time without manual intervention.

**Why this priority**: Automated collection is essential for MVP value, but depends on having metrics defined first. This provides the data foundation for all reporting and analysis.

**Independent Test**: Can be fully tested by running the data collection action in a CI environment with predefined metrics, verifying data is captured and stored correctly, delivering value by showing metric collection in action.

**Acceptance Scenarios**:

1. **Given** I have metrics defined in my configuration, **When** the GitHub Action runs in my CI pipeline, **Then** the system collects all defined metrics and stores them with timestamps
2. **Given** the collection action is running, **When** it encounters an error collecting a metric, **Then** the system logs the error but continues collecting other metrics
3. **Given** I have committed new code, **When** the CI pipeline runs, **Then** the metrics for that commit are associated with the commit SHA and build metadata
4. **Given** multiple pipeline runs occur, **When** metrics are collected, **Then** each run's data is stored independently with proper chronological ordering

---

### User Story 3 - View Metric Trends in HTML Reports (Priority: P3)

As a developer or team lead, I want to view my metrics over time in a simple HTML report, so I can identify trends and make data-driven decisions about code quality without complex tooling.

**Why this priority**: Visualization is the final piece that delivers insights, but requires both configuration and data collection to be working first. This is the user-facing output that justifies the system's existence.

**Independent Test**: Can be fully tested by generating an HTML report from stored metric data, verifying charts and trends display correctly, delivering value by providing actionable insights from collected data.

**Acceptance Scenarios**:

1. **Given** I have collected metric data over multiple builds, **When** I generate an HTML report, **Then** the system creates a report showing metrics trends over time with visual charts
2. **Given** I have multiple metrics configured, **When** viewing the report, **Then** each metric is displayed in its own section with appropriate visualizations
3. **Given** I want to share results with my team, **When** the report is generated, **Then** it is a self-contained HTML file that can be viewed in any browser without external dependencies
4. **Given** I have sparse data (few data points), **When** generating the report, **Then** the system still produces a valid report with available data and indicates where more data would improve insights

---

### Edge Cases

- What happens when the configuration file is missing or malformed?
- What happens when metric collection fails for some but not all metrics?
- What happens when the database file doesn't exist yet (first run)?
- What happens when generating a report with no collected data?
- What happens when the database file is corrupted or locked?
- What happens when attempting to collect metrics with invalid configuration?
- What happens when running multiple pipeline jobs concurrently that write to the same database?

## Requirements *(mandatory)*

### Functional Requirements

#### Configuration Management

- **FR-001**: System MUST read metric definitions from a configuration file named `unentropy.json` in the project root
- **FR-002**: System MUST support defining custom metrics with user-specified names
- **FR-003**: System MUST support metric types including numeric values and categorical labels
- **FR-004**: System MUST validate configuration file structure and provide clear error messages for invalid configurations
- **FR-005**: Configuration MUST allow users to define multiple metrics in a single file

#### Data Collection

- **FR-006**: System MUST provide a GitHub Action that collects defined metrics during CI/CD pipeline execution
- **FR-007**: System MUST store collected metrics with timestamps indicating when they were captured
- **FR-008**: System MUST associate collected metrics with commit SHA and build metadata
- **FR-009**: System MUST store metric data in a SQLite database file that is stored as GH action artifact
- **FR-010**: System MUST handle partial failures gracefully (continue collecting other metrics if one fails)
- **FR-011**: System MUST persist data across multiple pipeline runs without data loss
- **FR-012**: System MUST support concurrent pipeline executions without database corruption

#### Report Generation

- **FR-013**: System MUST generate HTML reports displaying metric trends over time
- **FR-014**: System MUST create visual charts showing how metrics change across builds
- **FR-015**: Generated reports MUST be self-contained single-file HTML documents
- **FR-016**: Reports MUST display each configured metric in a separate section
- **FR-017**: System MUST generate valid reports even with limited data (minimum 1 data point)
- **FR-018**: Charts MUST clearly indicate time progression and metric values

### Key Entities

- **Metric Definition**: Represents a user-defined metric to track, including name, type (numeric/categorical), description, and collection method reference
- **Metric Data Point**: Represents a single collected metric value, including metric identifier, value, timestamp, commit SHA, and build metadata
- **Build Context**: Represents the CI/CD execution context, including commit SHA, branch name, build number, and timestamp
- **Report**: Represents generated HTML output, including all metrics, time range, and visualization data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can define custom metrics through configuration in under 5 minutes without reading detailed documentation
- **SC-002**: Metric collection completes within standard CI pipeline execution time (adds less than 30 seconds overhead)
- **SC-003**: Reports generate from 100 data points in under 10 seconds
- **SC-004**: System handles 50+ concurrent pipeline executions without data corruption or loss
- **SC-005**: 95% of users successfully generate their first report within 15 minutes of initial setup
- **SC-006**: Generated reports are viewable in all major browsers without requiring internet connectivity
- **SC-007**: Configuration errors are resolved within 3 attempts due to clear, actionable error messages

## Assumptions *(mandatory)*

- Projects using Unentropy already have GitHub Actions configured for CI/CD
- Users have basic familiarity with JSON configuration file format
- SQLite database file is stored in the repository or a persistent storage location accessible across pipeline runs
- GitHub Actions environment has write permissions to the database location
- Report generation occurs after data collection, either as part of the same pipeline or a separate scheduled job
- Users view reports locally or via CI artifacts, not through a hosted web service
- Metric collection scripts/commands are provided by the user and referenced in configuration (system invokes them but doesn't define them)
- All pipeline runs occur on a single repository (no multi-repository aggregation in MVP)

## Dependencies *(mandatory)*

- GitHub Actions infrastructure for workflow execution
- SQLite support in the CI environment (standard in most CI runners)
- Chart generation library compatible with static HTML output (e.g., Chart.js, included via CDN in HTML)
- Project must use GitHub for version control and CI/CD

## Scope Boundaries *(mandatory)*

### In Scope (MVP)

- Configuration file parsing and validation
- SQLite database creation and metric storage
- GitHub Action for collecting metrics in CI/CD
- Basic HTML report generation with time-series charts
- Single repository tracking
- Commit-level granularity for metrics
