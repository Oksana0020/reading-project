import { describe, expect, it } from "vitest";
import { assessConnectionQuality } from "../shared/connectionQuality";

describe("assessConnectionQuality", () => {
  it("keeps network state as a lightweight diagnostic rather than a reading score", () => {
    expect(assessConnectionQuality({ online: false, available: true })).toBe("offline");
    expect(assessConnectionQuality({ online: true, available: false })).toBe("unknown");
    expect(assessConnectionQuality({ online: true, available: true, effectiveType: "2g" })).toBe("slow");
    expect(assessConnectionQuality({ online: true, available: true, rtt: 640 })).toBe("fair");
    expect(assessConnectionQuality({ online: true, available: true, effectiveType: "4g", downlink: 12, rtt: 40 })).toBe("good");
  });
});
