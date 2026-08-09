import { describe, expect, it } from "vitest";
import { getTrustedOrigins } from "./webOrigins.js";

describe("getTrustedOrigins", () => {
  it("falls back to localhost when WEB_ORIGIN is unset", () => {
    expect(getTrustedOrigins(undefined)).toEqual(["http://localhost:5173"]);
  });

  it("returns a single origin as a one-element array", () => {
    expect(getTrustedOrigins("https://notbroke.dev")).toEqual([
      "https://notbroke.dev",
    ]);
  });

  it("splits a space-separated WEB_ORIGIN value into multiple origins", () => {
    // Reproduces the reported INVALID_ORIGIN bug: WEB_ORIGIN was set to
    // "https://notbroke.dev https://www.notbroke.dev" and the old code
    // wrapped the whole string in a single-element array, so neither
    // origin ever matched the request's actual Origin header.
    expect(
      getTrustedOrigins("https://notbroke.dev https://www.notbroke.dev"),
    ).toEqual(["https://notbroke.dev", "https://www.notbroke.dev"]);
  });

  it("splits a comma-separated WEB_ORIGIN value into multiple origins", () => {
    expect(
      getTrustedOrigins("https://notbroke.dev,https://www.notbroke.dev"),
    ).toEqual(["https://notbroke.dev", "https://www.notbroke.dev"]);
  });

  it("trims whitespace and drops empty entries", () => {
    expect(
      getTrustedOrigins("  https://notbroke.dev ,  https://www.notbroke.dev  "),
    ).toEqual(["https://notbroke.dev", "https://www.notbroke.dev"]);
  });
});
