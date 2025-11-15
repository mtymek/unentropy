<!-- Sync Impact Report
Version change: N/A → 1.0.0 (Initial version)
Modified principles: All principles added (I. Serverless Architecture, II. Technology Stack Consistency, III. Code Quality Standards, IV. Security Best Practices, V. Testing Discipline)
Added sections: Additional Constraints, Development Workflow
Removed sections: None
Templates requiring updates: None (templates are generic and will reference updated constitution)
Follow-up TODOs: RATIFICATION_DATE (original adoption date unknown)
-->

# Unentropy Constitution

## Core Principles

### I. Serverless Architecture
All components must be serverless and operate within GitHub Actions workflows. No external servers or cloud services required for core functionality.

### II. Technology Stack Consistency
Use Bun runtime with TypeScript for implementation, SQLite for data storage, and Chart.js for report generation. Use Bun as the package manager (NOT npm). Maintain consistency across the project.

### III. Code Quality Standards
Enforce strict TypeScript types, use Prettier for formatting, and avoid unnecessary comments unless explicitly requested. Follow existing code conventions.

### IV. Security Best Practices
Never log or expose secrets and keys. Follow security guidelines to prevent vulnerabilities.

### V. Testing Discipline
Implement comprehensive tests including unit, integration, and contract tests. Run lint, typecheck, and tests in CI pipeline.

## Additional Constraints

The project must remain lightweight and self-contained while running entirely within GitHub Actions. Features may integrate with external, user-managed services (e.g., S3-compatible storage) when explicitly required, provided Unentropy does not operate persistent servers and GitHub Actions remains the orchestration environment. Ensure compatibility with CI/CD environments.

## Development Workflow

All changes require code review. Run build, lint, typecheck, and tests before merging. Follow semantic versioning for releases.

## Governance

Amendments to this constitution require consensus from maintainers. Version increments follow semantic versioning rules. Compliance must be verified in all PRs.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): Original adoption date unknown | **Last Amended**: 2025-10-16
