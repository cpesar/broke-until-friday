import { describe, expect, it } from "vitest";
import { getSpendingAlertStatus } from "./spendingAlerts.js";

describe("getSpendingAlertStatus", () => {
  it("returns ok when there is no budget set", () => {
    expect(getSpendingAlertStatus(50, 0)).toBe("ok");
  });

  it("returns ok when spending is below the warning threshold", () => {
    expect(getSpendingAlertStatus(79, 100)).toBe("ok");
  });

  it("returns warning once spending reaches the default 80% threshold", () => {
    expect(getSpendingAlertStatus(80, 100)).toBe("warning");
  });

  it("returns warning while spending is between the threshold and the budget cap", () => {
    expect(getSpendingAlertStatus(99.99, 100)).toBe("warning");
  });

  it("returns over once spending reaches the budget cap", () => {
    expect(getSpendingAlertStatus(100, 100)).toBe("over");
  });

  it("returns over when spending exceeds the budget cap", () => {
    expect(getSpendingAlertStatus(150, 100)).toBe("over");
  });

  it("honors a custom threshold", () => {
    expect(getSpendingAlertStatus(85, 100, 0.9)).toBe("ok");
    expect(getSpendingAlertStatus(90, 100, 0.9)).toBe("warning");
  });
});
