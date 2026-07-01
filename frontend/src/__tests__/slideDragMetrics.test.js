import {
  isSlideComplete,
  SLIDE_COMPLETE_RATIO,
} from "../shared/hooks/useSlideDragMetrics.js";

describe("slide drag metrics", () => {
  it("requires a positive drag distance before completion can trigger", () => {
    expect(isSlideComplete(100, 0)).toBe(false);
    expect(isSlideComplete(100, -10)).toBe(false);
  });

  it("completes near the end of the track on narrow screens", () => {
    const maxDrag = 180;
    const threshold = maxDrag * SLIDE_COMPLETE_RATIO;

    expect(isSlideComplete(threshold - 1, maxDrag)).toBe(false);
    expect(isSlideComplete(threshold, maxDrag)).toBe(true);
    expect(isSlideComplete(179, maxDrag)).toBe(true);
  });
});
