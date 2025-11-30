# Feature Specification: Metrics Gallery

**Feature Branch**: `005-metrics-gallery`  
**Created**: 2025-11-22  
**Status**: Draft  
**Input**: User description: "Plan simple (no external plugins just yet) metrics gallery as per above plan."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick setup with pre-defined metrics (Priority: P1)

Development teams want to track common code metrics like test coverage, bundle size, and lines of code without researching shell commands or metric collection methods. They can reference built-in metrics by using a simple identifier in their configuration, and the system automatically provides the correct collection command and sensible defaults for units and health evaluation.

**Why this priority**: This is the core value of the feature - reducing setup friction by providing ready-to-use metrics that follow best practices.

**Independent Test**: Add a built-in metric reference to configuration (e.g., `{"$ref": "coverage"}`), run metrics collection, and verify that the metric is collected with appropriate unit and default threshold behavior without requiring any custom command.

**Acceptance Scenarios**:

1. **Given** a repository with metrics tracking enabled, **When** a user adds `{"$ref": "coverage", "command": "..."}` to their metrics configuration, **Then** the system automatically provides metadata (name, type, unit) while using the user's command for collection.
2. **Given** a user references a built-in metric by ID with a project-specific command, **When** metrics are collected, **Then** the system uses the built-in metadata (name, type, unit) and the user's command.
3. **Given** multiple built-in metrics are referenced in configuration with commands, **When** the system resolves them, **Then** each metric is expanded with metadata from the built-in template and the command from user configuration.

---

### User Story 2 - Override built-in metric defaults (Priority: P2)

Development teams using built-in metrics need to customize aspects like the metric name or unit to match their specific project requirements. They can reference a built-in metric and override individual properties while benefiting from the convenience of pre-defined metadata.

**Why this priority**: Flexibility is important but secondary to the basic functionality, as most users will benefit from defaults first.

**Independent Test**: Reference a built-in metric and override its name or unit, verify that the custom values are used while other defaults are preserved.

**Acceptance Scenarios**:

1. **Given** a user references `{"$ref": "coverage", "name": "custom-coverage-name", "command": "..."}`, **When** metrics are collected, **Then** the metric uses the custom name but retains other built-in defaults.
2. **Given** a user references `{"$ref": "bundle-size", "unit": "MB", "command": "..."}`, **When** metrics are displayed, **Then** the custom unit is shown while other defaults are applied.
3. **Given** a user overrides multiple properties of a built-in metric, **When** the configuration is validated, **Then** the system merges user overrides with built-in defaults correctly.

---

### Built-in Metrics

The following metrics will be shipped by default. Each metric provides metadata (name, description, type, unit, recommended threshold) but NOT commands. Users must always provide commands appropriate for their project's technology stack.

#### Unit Types

Units are semantic types that determine how metric values are formatted consistently across HTML reports and PR comments:

| UnitType | Display Example | Use Case |
|----------|-----------------|----------|
| `percent` | `85.5%` | Coverage metrics |
| `integer` | `1,234` | LOC, counts |
| `bytes` | `1.5 MB` | Bundle size (auto-scales B → KB → MB → GB) |
| `duration` | `1m 30s` | Build/test time (auto-scales ms → s → m → h) |
| `decimal` | `3.14` | Generic numeric |

#### Coverage Metrics

1. **`coverage`** - Test Coverage Percentage
   - **Description**: Overall test coverage percentage across the codebase
   - **Type**: numeric
   - **Unit**: `percent`
   - **Default Threshold**: no-regression
   - **Use Case**: Ensure test coverage doesn't decline with new changes
   - **Example Commands**: See built-in-metrics.md for Bun, Jest, Pytest examples

2. **`function-coverage`** - Function Coverage
   - **Description**: Percentage of functions covered by tests
   - **Type**: numeric
   - **Unit**: `percent`
   - **Default Threshold**: no-regression
   - **Use Case**: Ensure functions have test coverage
   - **Example Commands**: See built-in-metrics.md for framework-specific examples

#### Code Size Metrics

3. **`loc`** - Lines of Code
   - **Description**: Total lines of code in the codebase
   - **Type**: numeric
   - **Unit**: `integer`
   - **Default Threshold**: none (can increase or decrease naturally)
   - **Use Case**: Track codebase size trends over time
   - **Example Commands**: Adaptable to any language's file extensions

4. **`bundle-size`** - Production Bundle Size
   - **Description**: Total size of production build artifacts
   - **Type**: numeric
   - **Unit**: `bytes`
   - **Default Threshold**: delta-max-drop (5% maximum increase)
   - **Use Case**: Prevent bundle size bloat
   - **Example Commands**: Adaptable to any build output directory

#### Performance Metrics
5. **`build-time`** - Build Duration
    - **Description**: Time taken to complete the build
    - **Type**: numeric
    - **Unit**: `duration`
    - **Default Threshold**: delta-max-drop (10% maximum increase)
    - **Use Case**: Track and limit build time increases
    - **Example Commands**: Works with any build command using time wrapper
6. **`test-time`** - Test Suite Duration
    - **Description**: Time taken to run all tests
    - **Type**: numeric
    - **Unit**: `duration`
    - **Default Threshold**: delta-max-drop (10% maximum increase)
    - **Use Case**: Keep test suite execution fast
    - **Example Commands**: Works with any test runner using time wrapper

#### Dependency Metrics
7. **`dependencies-count`** - Dependency Count
    - **Description**: Total number of direct dependencies
    - **Type**: numeric
    - **Unit**: `integer`
    - **Default Threshold**: none (monitoring only)
    - **Use Case**: Monitor dependency footprint
    - **Example Commands**: Adaptable to package.json, requirements.txt, go.mod, etc.

---

### Edge Cases

- What happens when a user references a built-in metric ID that doesn't exist? The system should fail configuration validation with a clear error message listing available built-in metric IDs.
- What happens when a user references a built-in metric without providing a command? The system should fail validation with a clear error message explaining that commands are always required.
- How does the system handle conflicts between built-in defaults and user-provided configuration? User-provided values should always take precedence over built-in defaults.
- How does the system behave when both `$ref` and full metric properties are provided? The system should treat `$ref` as a base template and merge/override with explicit properties.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a library of built-in metric definitions that users can reference by a unique identifier (e.g., `coverage`, `bundle-size`, `loc`).
- **FR-002**: Each built-in metric MUST include at minimum: unique ID, human-readable name, description, metric type (numeric or label), and optional unit type (`percent`, `integer`, `bytes`, `duration`, or `decimal`). Built-in metrics do NOT include commands.
- **FR-003**: The system MUST allow users to reference built-in metrics in their configuration using a special `$ref` property with the metric ID.
- **FR-004**: When a built-in metric is referenced, the system MUST resolve the reference to a complete metric configuration by combining built-in metadata with the user-provided command before metric collection begins.
- **FR-005**: Users MUST provide a `command` field for every metric, including those that reference built-in metrics via `$ref`. Commands are never inherited from built-in metrics.
- **FR-006**: Users MUST be able to override metadata properties (name, description, unit) of a referenced built-in metric by explicitly specifying those properties alongside the `$ref`.
- **FR-007**: The system MUST fail configuration validation with a clear error message when a user references a non-existent built-in metric ID.
- **FR-008**: The system MUST fail configuration validation with a clear error message when a user references a built-in metric without providing a `command` field.
- **FR-009**: The initial release MUST include the 7 built-in metrics specified in the "Built-in Metrics" section, covering coverage, code size, performance, and dependency tracking.
- **FR-010**: The system MUST support mixing built-in metric references and custom metric definitions in the same configuration.
- **FR-011**: When resolving built-in metrics, the system MUST preserve backward compatibility with existing custom metric configurations.
- **FR-012**: Built-in metrics MUST be organized into logical categories (coverage, code size, quality, security, performance, dependencies) to aid discovery and understanding.
- **FR-013**: The system MAY provide CLI helpers for parsing standard metric formats (LCOV, JSON coverage, XML coverage, file sizes) to simplify metric collection commands while maintaining tool agnosticism.

### Key Entities

- **Built-in Metric Template**: A pre-defined metric template stored in the system's registry, including ID, name, description, type, unit type (semantic formatting type), and recommended threshold behavior. Does NOT include command.
- **Metric Reference**: A configuration entry using `$ref` to reference a built-in metric template by ID, MUST include a `command` field, and optionally includes property overrides.
- **Resolved Metric**: The final metric configuration after resolving a built-in metric template reference, applying user-provided command, and merging any user overrides, ready for collection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a commonly-tracked metric (coverage, bundle size, or LOC) to their project in under 1 minute by using a built-in metric reference with a project-appropriate command instead of researching metric metadata.
- **SC-002**: At least 80% of new metrics tracking setups use at least one built-in metric reference, demonstrating the feature's value in reducing configuration effort.
- **SC-003**: Configuration validation provides clear, actionable error messages for invalid built-in metric references and missing commands, with users able to correct errors within 1 minute based on error message alone.
- **SC-004**: Built-in metric metadata (name, type, unit) works correctly across different project technologies without modification in 100% of cases, with users only needing to adapt commands to their specific tooling.
- **SC-005**: At least 60% of new metrics tracking setups use CLI helpers for standard format parsing when available, demonstrating reduced configuration complexity.

## Assumptions

- The built-in metrics will focus on metrics commonly used in web and software development projects (coverage, size, complexity, security).
- Built-in metrics provide metadata templates only; users provide commands appropriate for their technology stack (Bun, Node.js, Python, Go, etc.).
- Users understand basic JSON configuration syntax for referencing built-in metrics and providing commands.
- The built-in metrics will be shipped with the system initially, with extensibility for custom plugins deferred to a future iteration.
- Default threshold behaviors align with the existing quality gate feature (004-metrics-quality-gate) and its supported threshold modes.
- The built-in-metrics.md contract will include both traditional command examples and simplified CLI helper examples for popular technologies to aid users in configuring their metrics.
- CLI helpers support industry-standard formats (LCOV, JSON coverage, XML coverage, file sizes) to reduce command complexity while maintaining tool agnosticism.

## Dependencies

- The configuration system must support the `$ref` syntax for referencing built-in metrics.
- The metric collection system must resolve references before attempting to execute commands.
- The quality gate feature (004) provides the threshold framework that built-in metrics default behaviors are based on.
- Configuration validation must be enhanced to check built-in metric references and user overrides.
