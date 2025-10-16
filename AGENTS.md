# AGENTS.md

## Project Summary

Unentropy is a serverless tool for tracking custom code metrics in CI/CD pipelines via GitHub Actions, using Node.js/TypeScript, SQLite, and Chart.js to generate trend reports without external servers.

## Build/Lint/Test Commands

- Build: bun run build
- Lint: bun run lint
- Test: bun test
- Single test: bun test --testNamePattern="<test name>"
- Type check: bun run typecheck

## Code Style Guidelines

- Language: TypeScript/Node.js
- Formatting: Use Prettier for code formatting
- Imports: Use ES6 imports; group by external, then internal modules
- Naming: camelCase for variables/functions; PascalCase for classes/types
- Types: Strict TypeScript; prefer interfaces for object types
- Error handling: Use try/catch; throw custom Error subclasses
- No comments unless requested; follow existing patterns from codebase

## Additional Notes

- Project uses Bun as the package manager and runtime (NOT npm)
- Project uses GitHub Actions for CI; no serverless setup needed
- Follow security best practices; avoid logging secrets
- Mimic existing code style from src/ and tests/ directories
- When working on tasks from spec/\*/tasks.md, make sure to update the status after completion in that file
