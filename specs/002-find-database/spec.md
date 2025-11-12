# Feature Specification: Find Metrics Database in GitHub Artifacts

**Feature Branch**: `002-find-database`  
**Created**: Wed Nov 12 2025  
**Status**: Draft  
**Input**: User description: "Extract the 'find metrics db in GH artifacts' specification from specs/001-mvp-metrics-tracking/spec.md. The original spec has grown too large, I want to split it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Locate Latest Database Artifact (Priority: P1)

As a developer running the report generation action, I want the system to automatically find the most recent metrics database artifact from previous pipeline runs, so I can generate reports without manually specifying artifact locations.

**Why this priority**: This is the core functionality that enables report generation to work seamlessly with the collected data. Without automatic database discovery, users would need to manually manage artifact paths, defeating the purpose of automation.

**Independent Test**: Can be fully tested by running the find-database action in a workflow that has previous collect actions with uploaded artifacts, verifying it returns the correct artifact name and download URL, delivering immediate value by automating database location.

**Acceptance Scenarios**:

1. **Given** I have previous pipeline runs that collected metrics and uploaded database artifacts, **When** I run the find-database action, **Then** the system locates the most recent database artifact
2. **Given** multiple database artifacts exist from different pipeline runs, **When** I run the find-database action, **Then** the system returns the artifact with the most recent timestamp
3. **Given** I need to generate a report, **When** the find-database action completes successfully, **Then** it outputs the artifact name and download information for subsequent steps

---

### User Story 2 - Download Database for Report Generation (Priority: P2)

As a developer running report generation, I want the system to download the located database artifact, so the report generator has access to the metrics data.

**Why this priority**: Finding the database is only useful if we can retrieve it. This completes the bridge between data collection and report generation, but depends on first locating the artifact.

**Independent Test**: Can be fully tested by providing an artifact name to the action and verifying it downloads to the expected location with correct permissions, delivering value by making the data accessible for processing.

**Acceptance Scenarios**:

1. **Given** the find-database action has located a database artifact, **When** I trigger the download process, **Then** the database file is downloaded to a known location
2. **Given** a database artifact is downloaded, **When** subsequent actions need to access it, **Then** the file is readable and has the correct SQLite format
3. **Given** the download completes, **When** I check the action outputs, **Then** the database file path is provided for use by other workflow steps

---

### User Story 3 - Handle Missing or No Artifacts (Priority: P3)

As a developer running the find-database action on a fresh repository or branch, I want clear feedback when no database artifacts exist yet, so I understand what needs to happen next rather than seeing cryptic errors.

**Why this priority**: This improves the user experience for first-time setup and error scenarios, but isn't critical for the core workflow once data collection is established.

**Independent Test**: Can be fully tested by running the find-database action in a repository with no prior artifacts, verifying it provides clear messaging and appropriate exit codes, delivering value through better error handling.

**Acceptance Scenarios**:

1. **Given** I run the find-database action in a repository with no previous database artifacts, **When** the action executes, **Then** it provides a clear message indicating no artifacts were found
2. **Given** no database artifacts exist, **When** the action completes, **Then** it exits with an appropriate status code that allows the workflow to handle this gracefully
3. **Given** I'm setting up Unentropy for the first time, **When** I see the "no artifacts found" message, **Then** it includes guidance on running the collect action first

---

### Edge Cases

- What happens when multiple workflows run concurrently and upload artifacts simultaneously?
- What happens when an artifact exists but is corrupted or incomplete?
- What happens when the GitHub API is temporarily unavailable?
- What happens when the artifact is too large to download in reasonable time?
- What happens when workflow permissions don't allow artifact access?
- What happens when searching across many artifacts (performance concerns)?
- What happens when artifact retention policy has expired old artifacts?
- What happens when running in a forked repository with different artifact access rules?

## Requirements *(mandatory)*

### Functional Requirements

#### Artifact Discovery

- **FR-001**: System MUST search for database artifacts uploaded by previous workflow runs in the same repository
- **FR-002**: System MUST identify artifacts by a consistent naming pattern that distinguishes database artifacts from other workflow artifacts
- **FR-003**: System MUST retrieve artifact metadata including upload timestamp, size, and workflow run information
- **FR-004**: System MUST select the most recent artifact based on upload timestamp when multiple database artifacts exist
- **FR-005**: System MUST provide artifact name and identifier as outputs for subsequent workflow steps

#### Artifact Download

- **FR-006**: System MUST download the located database artifact to a predictable file system location
- **FR-007**: System MUST verify the downloaded file is a valid SQLite database before marking the action as successful
- **FR-008**: System MUST provide the downloaded database file path as an output for use by report generation
- **FR-009**: System MUST handle download failures gracefully with clear error messages

#### Error Handling

- **FR-010**: System MUST provide clear error messages when no database artifacts are found
- **FR-011**: System MUST distinguish between "no artifacts exist" and "artifacts exist but couldn't be accessed" scenarios
- **FR-012**: System MUST provide actionable guidance in error messages (e.g., "Run the collect action first")
- **FR-013**: System MUST exit with appropriate status codes that allow workflow conditionals to handle missing artifacts

#### GitHub Actions Integration

- **FR-014**: Action MUST work within GitHub Actions workflow environment using standard GitHub API authentication
- **FR-015**: Action MUST respect GitHub Actions artifact retention policies
- **FR-016**: Action MUST use GitHub API token from workflow context for artifact access
- **FR-017**: Action MUST output structured data (artifact name, download path, metadata) for workflow integration

### Key Entities

- **Database Artifact**: Represents a SQLite database file uploaded as a GitHub Actions artifact, including metadata (name, upload timestamp, size, workflow run ID, artifact ID)
- **Artifact Metadata**: Represents information about an artifact without downloading it (creation time, expiration, size, creator workflow)
- **Download Location**: Represents the file system path where the database is downloaded for access by subsequent workflow steps

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System locates the correct database artifact in under 10 seconds for repositories with up to 100 workflow runs
- **SC-002**: Download completes within 30 seconds for database files up to 10MB
- **SC-003**: Error messages clearly indicate root cause and next steps in 95% of failure scenarios
- **SC-004**: Action succeeds in finding and downloading artifacts in 99% of cases where artifacts exist and are accessible
- **SC-005**: Action correctly handles the "no artifacts" scenario without failing the entire workflow (allows conditional continuation)
- **SC-006**: Users can integrate the action into their workflows without reading detailed documentation (follows GitHub Actions conventions)

## Assumptions *(mandatory)*

- Database artifacts are uploaded with a consistent, predictable naming pattern (e.g., "unentropy-db-{timestamp}" or "unentropy-metrics-database")
- The collect action uploads database artifacts using GitHub Actions artifact upload action
- The find-database action runs in the same repository where the collect action ran
- GitHub Actions workflow has default permissions to access artifacts from the same repository
- Artifact retention policies allow artifacts to persist long enough for report generation
- The action runs in a standard GitHub Actions runner environment with network access to GitHub API
- Only one database artifact per workflow run is expected (not handling multi-database scenarios)

## Dependencies *(mandatory)*

- GitHub Actions workflow execution environment
- GitHub API for artifact listing and metadata retrieval
- GitHub Actions artifact download capabilities (actions/download-artifact or equivalent)
- SQLite command-line tools or library for database validation
- Sufficient workflow permissions to access repository artifacts

## Scope Boundaries *(mandatory)*

### In Scope

- Finding the most recent database artifact uploaded by the collect action
- Downloading the located artifact to a known file system location
- Validating the downloaded file is a SQLite database
- Providing clear error messages when artifacts don't exist or can't be accessed
- Outputting artifact metadata and file paths for workflow integration
- Handling standard error scenarios (no artifacts, download failures, permission issues)

### Out of Scope

- Aggregating data from multiple database artifacts (single-artifact only)
- Cross-repository artifact access
- Artifact cleanup or retention policy management
- Creating or modifying database artifacts (read-only operation)
- Downloading artifacts from forked repositories
- Handling non-standard artifact storage locations (S3, external storage)
- Performance optimization for repositories with thousands of workflow runs
- Historical artifact analysis or tracking artifact changes over time
