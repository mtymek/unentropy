#!/usr/bin/env bun

/**
 * MinIO S3 Test Setup
 *
 * Starts MinIO container for S3 testing and provides configuration
 */

import { exec } from "child_process";

const MINIO_PORT = 9000;
const MINIO_CONSOLE_PORT = 9001;
const MINIO_ACCESS_KEY = "minioadmin";
const MINIO_SECRET_KEY = "minioadmin";
const MINIO_BUCKET = "unentropy-test";
const MINIO_CONTAINER_NAME = "unentropy-test-storage";

async function startMinIO() {
  console.log("🚀 Starting MinIO container...");
  // Generate unique container name
  // Start MinIO container
  const dockerCmd = [
    "docker",
    "run",
    "--rm",
    "-d",
    "--name",
    MINIO_CONTAINER_NAME,
    "-p",
    `${MINIO_PORT}:9000`,
    "-p",
    `${MINIO_CONSOLE_PORT}:9001`,
    "-e",
    `MINIO_ROOT_USER=${MINIO_ACCESS_KEY}`,
    "-e",
    `MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}`,
    "minio/minio:latest",
    "server",
    "/data",
    "--console-address",
    "':9001'",
  ];

  try {
    console.log(dockerCmd.join(" "));
    const { stdout } = await execAsync(dockerCmd.join(" "));
    console.log(`✅ MinIO container started: ${stdout.trim()}`);

    // Wait for MinIO to be ready
    console.log("⏳ Waiting for MinIO to be ready...");
    await waitForMinIO();

    // Create test bucket
    console.log("🪣 Creating test bucket...");
    await createBucket();

    // Print configuration for tests
    printTestConfig();
  } catch (error) {
    console.error("❌ Failed to start MinIO:", error);
    process.exit(1);
  }
}

async function waitForMinIO() {
  const maxAttempts = 30;
  const delay = 2000; // 2 seconds

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${MINIO_PORT}/minio/health/live`);
      if (response.ok) {
        console.log("✅ MinIO is ready!");
        return;
      }
    } catch {
      // MinIO not ready yet
    }

    console.log(`⏳ Waiting for MinIO... (${i + 1}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error("MinIO failed to start after maximum attempts");
}

async function createBucket() {
  // Use MinIO client directly instead of mc
  const mcCmd = ["docker", "exec", MINIO_CONTAINER_NAME, "mc", "mb", `data/${MINIO_BUCKET}`];

  try {
    await execAsync(mcCmd.join(" "));
    console.log(`✅ Created bucket: ${MINIO_BUCKET}`);
  } catch {
    // Bucket might already exist, that's ok
    console.log(`ℹ️ Bucket might already exist: ${MINIO_BUCKET}`);
  }
}

function printTestConfig() {
  console.log("\n📋 Test Configuration:");
  console.log("========================");
  console.log(`S3_ENDPOINT: http://localhost:${MINIO_PORT}`);
  console.log(`S3_ACCESS_KEY_ID: ${MINIO_ACCESS_KEY}`);
  console.log(`S3_SECRET_ACCESS_KEY: ${MINIO_SECRET_KEY}`);
  console.log(`S3_BUCKET: ${MINIO_BUCKET}`);
  console.log(`S3_REGION: us-east-1`);
  console.log(`CONTAINER_NAME: ${MINIO_CONTAINER_NAME}`);
  console.log("\n🧪 Test Commands:");
  console.log("===================");
  console.log("# Start MinIO:");
  console.log("bun run scripts/setup-minio.ts start");
  console.log("\n# Stop MinIO:");
  console.log(`docker stop ${MINIO_CONTAINER_NAME}`);
  console.log("\n# View logs:");
  console.log(`docker logs -f ${MINIO_CONTAINER_NAME}`);
  console.log("\n# Access MinIO Console:");
  console.log(`http://localhost:${MINIO_CONSOLE_PORT}`);
  console.log(`User: ${MINIO_ACCESS_KEY}`);
  console.log(`Password: ${MINIO_SECRET_KEY}`);
}

function execAsync(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout: stdout || "", stderr: stderr || "" });
      }
    });
  });
}

// CLI interface
const command = process.argv[2];

if (command === "start") {
  startMinIO();
} else if (command === "stop") {
  await execAsync(`docker stop ${MINIO_CONTAINER_NAME}`);
  console.log("✅ MinIO container stopped and removed");
} else {
  console.log("Usage:");
  console.log("  bun run scripts/setup-minio.ts start   # Start MinIO container");
  console.log("  bun run scripts/setup-minio.ts stop    # Stop MinIO container");
  process.exit(1);
}
