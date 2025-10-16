import { test, expect, describe } from "bun:test";
import { greet } from "../../src/lib/greeter";

describe("greet", () => {
  test("should greet by name", () => {
    expect(greet("World")).toBe("Hello, World!");
  });

  test("should handle empty string", () => {
    expect(greet("")).toBe("Hello, !");
  });
});
