# AGENTS.md

## SDD Principles

This project follows Specification-Driven Development (SDD) principles as defined in `.specify/memory/constitution.md`:

- **Serverless Architecture**: All components operate within GitHub Actions workflows
- **Technology Stack Consistency**: Bun runtime with TypeScript, SQLite, Chart.js
- **Code Quality Standards**: Strict TypeScript, Prettier formatting, minimal comments
- **Security Best Practices**: Never log/expose secrets, follow security guidelines
- **Testing Discipline**: Comprehensive unit, integration, and contract tests

_Use read tool on need-to-know basis to reference `.specify/memory/constitution.md` for full details_

## Development Workflow

- All changes require code review
- Run build, lint, typecheck, and tests before merging
- Follow semantic versioning for releases
- Compliance verified in all PRs

## Project Summary

Unentropy is a serverless tool for tracking custom code metrics in CI/CD pipelines via GitHub Actions, using Node.js/TypeScript, SQLite, and Chart.js to generate trend reports without external servers.

## Build/Lint/Test Commands

- Build: bun run build
- Lint: bun lint
- Test: bun test
- Single test: bun test --testNamePattern="<test name>"
- Type check: bun run typecheck
- Generate visual test fixtures: bun run generate-fixtures
- Visual review (generate + open in browser): bun run visual-review

## Code Style Guidelines

- Language: TypeScript/Node.js
- Formatting: Use Prettier for code formatting
- Imports: Use ES6 imports; group by external, then internal modules
- Naming: camelCase for variables/functions; PascalCase for classes/types
- Types: Strict TypeScript; prefer interfaces for object types
- Error handling: Use try/catch; throw custom Error subclasses
- No comments unless requested; follow existing patterns from codebase

## Additional Notes

- Project uses Bun as the package manager and runtime
- Project uses GitHub Actions for CI; no serverless setup needed
- Follow security best practices; avoid logging secrets
- Mimic existing code style from src/ and tests/ directories
- When working on tasks from spec/\*/tasks.md, make sure to update the status after completion in that file

## Visual Testing

- Test fixtures are located in tests/fixtures/visual-review/ with 4 scenarios: minimal, full-featured, sparse-data, edge-cases
- Each fixture contains unentropy.json config, generated .db database, and report.html output
- SQLite databases (.db, .db-journal) are gitignored and regenerated on each run
- Run `bun run visual-review` to regenerate all fixtures and open HTML reports in browser
- Visual acceptance criteria checklist is in specs/003-mvp-metrics-tracking/contracts/visual-acceptance-criteria.md
