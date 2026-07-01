import express from "express";
import {
  createPaymentOrder,
  verifyPaymentStatus,
  verifyPaymentClient,
  handleRazorpayWebhook,
  getRazorpayConfig,
} from "../controller/paymentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { paymentRouteRateLimiter } from "../middleware/securityMiddlewares.js";

const paymentRoute = express.Router();

paymentRoute.get(
  "/razorpay-config",
  verifyToken,
  paymentRouteRateLimiter,
  getRazorpayConfig,
);

/**
 * Initiate a Razorpay payment order for a specific CheckoutGroupId or OrderId.
 * Auth: Required (Customer paying for their own order)
 */
paymentRoute.post(
  "/create-order",
  verifyToken,
  paymentRouteRateLimiter,
  createPaymentOrder,
);

/**
 * Verify payment with Razorpay signature from client callback.
 * Auth: Required
 */
paymentRoute.post(
  "/verify",
  verifyToken,
  paymentRouteRateLimiter,
  verifyPaymentClient,
);

/**
 * Verify payment status from client side (polling / status page).
 * Auth: Required
 */
paymentRoute.get(
  "/status/:id",
  verifyToken,
  paymentRouteRateLimiter,
  verifyPaymentStatus,
);

/**
 * Razorpay Server-to-Server Webhook.
 * Auth: None (verified via x-razorpay-signature)
 */
paymentRoute.post(
  "/webhook/razorpay",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook,
);

export default paymentRoute;
