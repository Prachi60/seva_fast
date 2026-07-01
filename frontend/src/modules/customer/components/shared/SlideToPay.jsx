import React, { useState, useEffect } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { ChevronRight, Check } from "lucide-react";
import {
  isSlideComplete,
  useSlideDragMetrics,
} from "@/shared/hooks/useSlideDragMetrics";

const SlideToPay = ({
  onSuccess,
  amount,
  isLoading = false,
  disabled = false,
  text = "Slide to Pay",
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const { containerRef, handleRef, maxDrag } = useSlideDragMetrics(8);

  const isInteractive = !isCompleted && !isLoading && !disabled && maxDrag > 0;

  const textOpacity = useTransform(x, [0, Math.max(maxDrag * 0.5, 1)], [1, 0]);
  const shimmerOpacity = useTransform(x, [0, Math.max(maxDrag * 0.3, 1)], [1, 0]);
  const rotate = useTransform(x, [0, Math.max(maxDrag, 1)], [0, 360]);
  const arrowsOpacity = useTransform(x, [0, Math.max(maxDrag * 0.8, 1)], [1, 0]);
  const checkOpacity = useTransform(x, [maxDrag * 0.5, maxDrag], [0, 1]);
  const fillWidth = useTransform(x, [0, Math.max(maxDrag, 1)], [0, maxDrag]);

  const handleDragEnd = async () => {
    const currentX = x.get();
    if (isSlideComplete(currentX, maxDrag)) {
      setIsCompleted(true);
      await controls.start({ x: maxDrag });
      try {
        if (onSuccess) await onSuccess();
      } finally {
        setIsCompleted(false);
        x.set(0);
        await controls.start({ x: 0 });
      }
    } else {
      x.set(0);
      await controls.start({ x: 0 });
    }
  };

  useEffect(() => {
    if (!isInteractive) {
      x.set(0);
      controls.set({ x: 0 });
    }
  }, [isInteractive, controls, x]);

  return (
    <div
      ref={containerRef}
      className={`relative h-16 w-full rounded-full overflow-hidden select-none bg-linear-to-r from-primary via-primary to-primary shadow-[0_18px_45px_rgba(4,120,87,0.35)] border border-white/10 touch-manipulation ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
      style={{ WebkitTouchCallout: "none" }}
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-white/15"
        style={{ width: fillWidth }}
      />

      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ opacity: shimmerOpacity }}
      >
        <motion.div
          className="absolute inset-y-0 -inset-x-1 bg-linear-to-r from-transparent via-white/35 to-transparent skew-x-[-20deg]"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      <motion.div
        className="absolute inset-0 z-10 flex items-center pointer-events-none pl-16 pr-10"
        style={{ opacity: textOpacity }}
      >
        <span className="min-w-0 flex-1 truncate text-white font-black text-[11px] sm:text-sm uppercase tracking-wide">
          {text}
        </span>
        <span className="shrink-0 pl-2 text-sm font-extrabold text-brand-50 sm:text-base">
          ₹{amount}
        </span>
      </motion.div>

      {isCompleted && (
        <motion.div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-white font-black text-lg tracking-wide uppercase flex items-center gap-2">
            Processing <span className="animate-pulse">...</span>
          </span>
        </motion.div>
      )}

      <motion.div
        ref={handleRef}
        className="absolute left-1 top-1 bottom-1 w-14 bg-white rounded-full flex items-center justify-center z-20 shadow-[0_6px_18px_rgba(15,118,110,0.35)] border border-brand-100 touch-none"
        style={{
          x,
          cursor: isInteractive ? "grab" : "default",
        }}
        drag={isInteractive ? "x" : false}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={isInteractive ? { scale: 0.95 } : undefined}
      >
        {isLoading || isCompleted ? (
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <motion.div
            className="relative w-full h-full flex items-center justify-center"
            style={{ rotate }}
          >
            <motion.div className="text-primary" style={{ opacity: arrowsOpacity }}>
              <ChevronRight size={28} strokeWidth={3} />
            </motion.div>
            <motion.div
              className="absolute inset-0 flex items-center justify-center text-primary"
              style={{ opacity: checkOpacity }}
            >
              <Check size={24} strokeWidth={3} />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default SlideToPay;
