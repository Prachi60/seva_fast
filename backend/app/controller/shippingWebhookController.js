import Order from "../models/order.js";
import { WORKFLOW_STATUS, legacyStatusFromWorkflow } from "../constants/orderWorkflow.js";
import { applyDeliveredSettlement } from "../services/orderSettlement.js";
import { emitOrderStatusUpdate } from "../services/orderSocketEmitter.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";
import * as logger from "../services/logger.js";

/**
 * Handles incoming status update webhooks from Shiprocket.
 * Maps courier stages (shipped, out_for_delivery, delivered) to our internal order states.
 */
export async function handleShiprocketWebhook(req, res) {
  try {
    const payload = req.body || {};
    const awbCode = payload.awb || payload.awb_code;
    const shiprocketOrderId = payload.order_id;
    const rawStatus = (payload.current_status || "").trim().toUpperCase();

    logger.info(`[Shiprocket Webhook] Received webhook update: AWB=${awbCode}, OrderID=${shiprocketOrderId}, Status=${rawStatus}`);

    if (!awbCode && !shiprocketOrderId) {
      return res.status(400).json({ success: false, message: "Missing AWB or Order ID in payload" });
    }

    // Find the order
    let order = null;
    if (shiprocketOrderId) {
      order = await Order.findOne({ orderId: shiprocketOrderId });
    }
    if (!order && awbCode) {
      order = await Order.findOne({ "shipmentDetails.awbCode": awbCode });
    }

    if (!order) {
      logger.warn(`[Shiprocket Webhook] Order not found for AWB: ${awbCode} / OrderID: ${shiprocketOrderId}`);
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Update courier status in shipmentDetails
    order.shipmentDetails = {
      ...(order.shipmentDetails || {}),
      status: rawStatus,
      updatedAt: new Date(),
    };

    const oldStatus = order.status;
    let newStatus = null;
    let newWorkflowStatus = null;

    // Map Shiprocket status to internal status
    // Common Shiprocket statuses: NEW, PICKED UP, IN TRANSIT, OUT FOR DELIVERY, DELIVERED, CANCELLED, RTO INITIATED, RTO DELIVERED
    if (["PICKED UP", "IN TRANSIT", "SHIPPED"].includes(rawStatus)) {
      newStatus = "out_for_delivery";
      newWorkflowStatus = WORKFLOW_STATUS.OUT_FOR_DELIVERY;
    } else if (rawStatus === "OUT FOR DELIVERY") {
      newStatus = "out_for_delivery";
      newWorkflowStatus = WORKFLOW_STATUS.OUT_FOR_DELIVERY;
    } else if (rawStatus === "DELIVERED") {
      newStatus = "delivered";
      newWorkflowStatus = WORKFLOW_STATUS.DELIVERED;
    } else if (["CANCELLED", "RTO INITIATED", "RTO DELIVERED"].includes(rawStatus)) {
      newStatus = "cancelled";
      newWorkflowStatus = WORKFLOW_STATUS.CANCELLED;
    }

    if (newStatus && oldStatus !== newStatus) {
      order.status = newStatus;
      order.orderStatus = newStatus;
      order.workflowStatus = newWorkflowStatus;

      if (newStatus === "delivered") {
        order.deliveredAt = new Date();
        await order.save();

        // Perform financial settlement
        try {
          await applyDeliveredSettlement(order, order.orderId);
        } catch (settlementErr) {
          logger.error(`[Shiprocket Webhook] Financial settlement failed for Order ${order.orderId}:`, settlementErr.message);
        }

        // Emit notification
        emitNotificationEvent(NOTIFICATION_EVENTS.ORDER_DELIVERED, {
          orderId: order.orderId,
          customerId: order.customer,
          userId: order.customer,
          sellerId: order.seller,
        });
      } else {
        await order.save();
      }

      // Sockets
      emitOrderStatusUpdate(
        order.orderId,
        {
          workflowStatus: order.workflowStatus,
          status: order.status,
        },
        order.customer,
        order.seller,
        order._id,
      );

      // Event notification for other statuses
      if (newStatus === "out_for_delivery") {
        emitNotificationEvent(NOTIFICATION_EVENTS.OUT_FOR_DELIVERY, {
          orderId: order.orderId,
          customerId: order.customer,
          userId: order.customer,
          sellerId: order.seller,
        });
      } else if (newStatus === "cancelled") {
        emitNotificationEvent(NOTIFICATION_EVENTS.ORDER_CANCELLED, {
          orderId: order.orderId,
          customerId: order.customer,
          userId: order.customer,
          sellerId: order.seller,
        });
      }
    } else {
      await order.save();
    }

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    logger.error("[Shiprocket Webhook Error] Failed to process webhook:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
