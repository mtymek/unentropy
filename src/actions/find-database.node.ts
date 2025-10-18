#!/usr/bin/env node

// Node.js entrypoint for GitHub Actions
// This file handles the Node.js-specific runtime environment

// Import the main action implementation
import { run } from "./find-database";

// Run the action
run().catch((error: unknown) => {
  console.error("Action failed:", error);
  process.exit(1);
});
