import React, { useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deliveryApi } from "../services/deliveryApi";
import {
  isSlideComplete,
  useSlideDragMetrics,
} from "@/shared/hooks/useSlideDragMetrics";

const DeliverySlideButton = ({
  orderId,
  onSuccess,
  onError,
  isReturn = false,
  isReturnDrop = false,
  label = "SLIDE TO GENERATE OTP",
  bgColor = "bg-black ",
  bgColorLight = "bg-brand-50",
}) => {
  const [isSlideCompleteState, setIsSlideCompleteState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const controls = useAnimation();
  const { containerRef, handleRef, maxDrag } = useSlideDragMetrics(8);

  const resetSlide = async () => {
    setIsSlideCompleteState(false);
    await controls.start({ x: 0 });
  };

  useEffect(() => {
    resetSlide();
    setIsLoading(false);
  }, [orderId]);

  const handleSlideCompleteAction = async () => {
    setIsLoading(true);

    try {
      const response = isReturnDrop
        ? await deliveryApi.requestReturnDropOtp(orderId, {})
        : isReturn
          ? await deliveryApi.requestReturnOtp(orderId, {})
          : await deliveryApi.generateDeliveryOtp(orderId);

      toast.success(response.data?.message || "OTP generated and sent to customer");

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      const errorPayload = error.response?.data?.result?.error || error.response?.data?.error;
      const errorMessage =
        errorPayload?.message || error.response?.data?.message || error.message || "Failed to generate OTP";
      const errorCode = errorPayload?.code;

      if (errorCode === "PROXIMITY_OUT_OF_RANGE") {
        const details = errorPayload?.details;
        const distance = details?.currentDistance;
        const range = details?.requiredRange || "0-300m";

        toast.error(
          `You are too ${distance > 300 ? "far" : "close"}. You must be within ${range} of the delivery location. (Current: ${distance ? `${distance}m` : "Unknown"})`,
          { duration: 5000 },
        );
      } else if (errorCode === "LOCATION_REQUIRED" || errorCode === "LOCATION_STALE") {
        toast.error(errorMessage || "Location data is not available. Please ensure location tracking is enabled.");
      } else if (errorCode === "ORDER_NOT_FOUND") {
        toast.error("Order not found. Please refresh and try again.");
      } else if (errorCode === "UNAUTHORIZED_DELIVERY") {
        toast.error("This order is not assigned to you.");
      } else {
        toast.error(errorMessage);
      }

      if (onError) {
        onError(error);
      }

      await resetSlide();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (_, info) => {
    if (isLoading) return;

    if (isSlideComplete(info.offset.x, maxDrag)) {
      setIsSlideCompleteState(true);
      await controls.start({ x: maxDrag });
      await handleSlideCompleteAction();
      await resetSlide();
    } else {
      await resetSlide();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-16 bg-gray-100 rounded-full overflow-hidden select-none touch-manipulation"
      style={{ WebkitTouchCallout: "none" }}
    >
      <motion.div
        className={`absolute inset-0 flex items-center justify-center text-gray-400 font-bold text-xs sm:text-sm pointer-events-none transition-opacity duration-300 ${
          isSlideCompleteState || isLoading ? "opacity-0" : "opacity-100"
        }`}
        animate={{ x: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <span className="px-16 text-center">{label}</span>
        <ChevronRight className="ml-1 inline shrink-0" />
      </motion.div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <Loader2 className="animate-spin text-primary" size={24} />
          <span className="ml-2 text-sm font-medium text-gray-600">
            {isReturn ? "Requesting OTP..." : "Generating OTP..."}
          </span>
        </div>
      )}

      <motion.div
        ref={handleRef}
        className={`absolute top-1 bottom-1 left-1 w-14 rounded-full flex items-center justify-center shadow-md z-20 touch-none ${bgColor} ${
          isLoading ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"
        }`}
        drag={!isLoading ? "x" : false}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={!isLoading ? { scale: 0.95 } : undefined}
        whileHover={!isLoading ? { scale: 1.05 } : undefined}
      >
        <ChevronRight className="text-white" size={24} />
      </motion.div>
    </div>
  );
};

export default DeliverySlideButton;
