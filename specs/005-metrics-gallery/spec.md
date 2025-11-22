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

1. **Given** a repository with metrics tracking enabled, **When** a user adds `{"$ref": "coverage"}` to their metrics configuration, **Then** the system automatically collects test coverage using the appropriate command and displays results with percentage units.
2. **Given** a user references a built-in metric by ID, **When** metrics are collected and quality gates are evaluated, **Then** the system applies sensible default threshold rules (e.g., no-regression for coverage, delta-max-drop for bundle size).
3. **Given** multiple built-in metrics are referenced in configuration, **When** the system resolves them, **Then** each metric is expanded with its full definition including name, type, command, unit, and default threshold behavior.

---

### User Story 2 - Override built-in metric defaults (Priority: P2)

Development teams using built-in metrics need to customize certain aspects like the metric name, collection command, or threshold settings to match their specific project requirements. They can reference a built-in metric and override individual properties, keeping the convenience of pre-defined defaults while adapting to project-specific needs.

**Why this priority**: Flexibility is important but secondary to the basic functionality, as most users will benefit from defaults first.

**Independent Test**: Reference a built-in metric and override its name or command, verify that the custom values are used while other defaults are preserved.

**Acceptance Scenarios**:

1. **Given** a user references `{"$ref": "coverage", "name": "custom-coverage-name"}`, **When** metrics are collected, **Then** the metric uses the custom name but retains all other built-in defaults.
2. **Given** a user references `{"$ref": "bundle-size", "command": "custom bundle measurement script"}`, **When** metrics are collected, **Then** the custom command is executed while unit and threshold defaults are applied.
3. **Given** a user overrides multiple properties of a built-in metric, **When** the configuration is validated, **Then** the system merges user overrides with built-in defaults correctly.

---

### Built-in Metrics

The following metrics will be shipped by default. Each metric includes sensible defaults for collection commands, units, and threshold behavior.

#### Coverage Metrics

1. **`coverage`** - Test Coverage Percentage
   - **Description**: Overall test coverage percentage across the codebase
   - **Type**: numeric
   - **Unit**: %
   - **Default Threshold**: no-regression (tolerance: 0.5%)
   - **Use Case**: Ensure test coverage doesn't decline with new changes

2. **`function-coverage`** - Function Coverage
   - **Description**: Percentage of functions covered by tests
   - **Type**: numeric
   - **Unit**: %
   - **Default Threshold**: no-regression (tolerance: 0.5%)
   - **Use Case**: Ensure functions have test coverage

#### Code Size Metrics

3. **`loc`** - Lines of Code
   - **Description**: Total lines of code in the codebase
   - **Type**: numeric
   - **Unit**: lines
   - **Default Threshold**: none (can increase or decrease naturally)
   - **Use Case**: Track codebase size trends over time

4. **`bundle-size`** - Production Bundle Size
   - **Description**: Total size of production build artifacts
   - **Type**: numeric
   - **Unit**: KB
   - **Default Threshold**: delta-max-drop (5% maximum increase)
   - **Use Case**: Prevent bundle size bloat

#### Performance Metrics
5. **`build-time`** - Build Duration
    - **Description**: Time taken to complete the build
    - **Type**: numeric
    - **Unit**: seconds
    - **Default Threshold**: delta-max-drop (10% maximum increase)
    - **Use Case**: Track and limit build time increases
6. **`test-time`** - Test Suite Duration
    - **Description**: Time taken to run all tests
    - **Type**: numeric
    - **Unit**: seconds
    - **Default Threshold**: delta-max-drop (10% maximum increase)
    - **Use Case**: Keep test suite execution fast

#### Dependency Metrics
7. **`dependencies-count`** - Dependency Count
    - **Description**: Total number of direct dependencies
    - **Type**: numeric
    - **Unit**: count
    - **Default Threshold**: none (monitoring only)
    - **Use Case**: Monitor dependency footprint

---

### Edge Cases

- What happens when a user references a built-in metric ID that doesn't exist? The system should fail configuration validation with a clear error message listing available built-in metric IDs.
- How does the system handle conflicts between built-in defaults and user-provided configuration? User-provided values should always take precedence over built-in defaults.
- What happens if a built-in metric's default command fails in a particular project environment? Users should be able to override the command with a project-specific alternative while keeping other defaults.
- How does the system behave when both `$ref` and full metric properties are provided? The system should treat `$ref` as a base template and merge/override with explicit properties.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a library of built-in metric definitions that users can reference by a unique identifier (e.g., `coverage`, `bundle-size`, `loc`).
- **FR-002**: Each built-in metric MUST include at minimum: unique ID, human-readable name, description, metric type (numeric or label), default collection command, and optional unit.
- **FR-003**: The system MUST allow users to reference built-in metrics in their configuration using a special `$ref` property with the metric ID.
- **FR-004**: When a built-in metric is referenced, the system MUST resolve the reference to a complete metric configuration before metric collection begins.
- **FR-005**: Users MUST be able to override any property of a referenced built-in metric by explicitly specifying that property alongside the `$ref`.
- **FR-006**: The system MUST fail configuration validation with a clear error message when a user references a non-existent built-in metric ID.
- **FR-007**: Built-in metrics MUST include sensible defaults for threshold behavior based on metric type (e.g., coverage should default to no-regression, bundle size to delta-max-drop).
- **FR-008**: The initial release MUST include the 7 built-in metrics specified in the "Built-in Metrics" section, covering coverage, code size, performance, and dependency tracking.
- **FR-009**: The system MUST support mixing built-in metric references and custom metric definitions in the same configuration.
- **FR-010**: When resolving built-in metrics, the system MUST preserve backward compatibility with existing custom metric configurations.
- **FR-011**: Built-in metrics MUST be organized into logical categories (coverage, code size, quality, security, performance, dependencies) to aid discovery and understanding.

### Key Entities

- **Built-in Metric Template**: A pre-defined metric template stored in the system's registry, including ID, name, description, type, default command, unit, and recommended threshold behavior.
- **Metric Reference**: A configuration entry using `$ref` to reference a built-in metric template by ID, optionally including property overrides.
- **Resolved Metric**: The final metric configuration after resolving a built-in metric template reference and applying any user overrides, ready for collection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a commonly-tracked metric (coverage, bundle size, or LOC) to their project in under 30 seconds by using a built-in metric reference instead of writing custom commands.
- **SC-002**: At least 80% of new metrics tracking setups use at least one built-in metric reference, demonstrating the feature's value in reducing configuration effort.
- **SC-003**: Configuration validation provides clear, actionable error messages for invalid built-in metric references, with users able to correct errors within 1 minute based on error message alone.
- **SC-004**: Built-in metrics work correctly across different project structures without modification in at least 70% of typical projects (recognizing some customization may be needed for unusual setups).

## Assumptions

- The built-in metrics will focus on metrics commonly used in web and software development projects (coverage, size, complexity, security).
- Built-in metric commands will use standard Unix/Linux utilities available in GitHub Actions environments.
- Users understand basic JSON configuration syntax for referencing and overriding properties.
- The built-in metrics will be shipped with the system initially, with extensibility for custom plugins deferred to a future iteration.
- Default threshold behaviors align with the existing quality gate feature (004-metrics-quality-gate) and its supported threshold modes.

## Dependencies

- The configuration system must support the `$ref` syntax for referencing built-in metrics.
- The metric collection system must resolve references before attempting to execute commands.
- The quality gate feature (004) provides the threshold framework that built-in metrics default behaviors are based on.
- Configuration validation must be enhanced to check built-in metric references and user overrides.
