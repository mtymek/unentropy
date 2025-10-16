import { describe, expect, test } from "bun:test";
import { add, multiply } from "../../src/lib/sample.js";

describe("add", () => {
  test("should add two positive numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  test("should handle negative numbers", () => {
    expect(add(-1, 5)).toBe(4);
  });

  test("should handle zero", () => {
    expect(add(0, 0)).toBe(0);
  });
});

describe("multiply", () => {
  test("should multiply two numbers", () => {
    expect(multiply(3, 4)).toBe(12);
  });

  test("should handle zero", () => {
    expect(multiply(5, 0)).toBe(0);
  });
});
