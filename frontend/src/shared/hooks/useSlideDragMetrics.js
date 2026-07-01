import { useLayoutEffect, useRef, useState } from "react";

export const SLIDE_COMPLETE_RATIO = 0.88;

export function isSlideComplete(offsetX, maxDrag, ratio = SLIDE_COMPLETE_RATIO) {
  if (!Number.isFinite(offsetX) || maxDrag <= 0) return false;
  return offsetX >= maxDrag * ratio;
}

export function useSlideDragMetrics(padding = 8) {
  const containerRef = useRef(null);
  const handleRef = useRef(null);
  const [maxDrag, setMaxDrag] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const handle = handleRef.current;
      if (!container || !handle) return;
      setMaxDrag(Math.max(0, container.offsetWidth - handle.offsetWidth - padding));
    };

    measure();

    const container = containerRef.current;
    const handle = handleRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (handle) observer.observe(handle);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [padding]);

  return { containerRef, handleRef, maxDrag };
}
