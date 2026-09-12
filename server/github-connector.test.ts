import { describe, expect, it } from "vitest";

const connectorTestLabel = "GitHub connector write operation";

describe("GitHub connector write test", () => {
  it("uses a descriptive label for connector-generated changes", () => {
    expect(connectorTestLabel).toContain("GitHub connector");
    expect(connectorTestLabel).toContain("write operation");
  });
});