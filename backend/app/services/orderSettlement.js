import Transaction from "../models/transaction.js";
import {
  handleCodOrderFinance,
  settleDeliveredOrder,
} from "./finance/orderFinanceService.js";
import { processOrderLevelCommissions } from "./finance/commissionService.js";

/**
 * Financial side effects when order becomes delivered (mirrors orderController).
 */
export async function applyDeliveredSettlement(order, orderIdString) {
  const settled = await settleDeliveredOrder(order._id);

  const method = (order.payment?.method || "").toLowerCase();
  const isCod = settled.paymentMode === "COD" || method === "cash" || method === "cod";
  if (isCod && settled.deliveryBoy && !settled.financeFlags?.codMarkedCollected) {
    await handleCodOrderFinance(settled._id, {
      deliveryPartnerId: settled.deliveryBoy,
    });
  }

  // Legacy transaction compatibility for existing seller/rider dashboards.
  await Transaction.findOneAndUpdate(
    { reference: orderIdString, userModel: "Seller" },
    { status: "Settled" },
  );

  if (settled.deliveryBoy) {
    const deliveryEarning = Math.round(settled.paymentBreakdown?.riderPayoutTotal || 0);
    const deliveryMeta = {
      tipAmount: Math.round(settled.paymentBreakdown?.riderTipAmount || 0),
      payoutBase: Math.round(settled.paymentBreakdown?.riderPayoutBase || 0),
      payoutDistance: Math.round(settled.paymentBreakdown?.riderPayoutDistance || 0),
      payoutBonus: Math.round(settled.paymentBreakdown?.riderPayoutBonus || 0),
    };
    await Transaction.findOneAndUpdate(
      { reference: `DEL-ERN-${orderIdString}` },
      {
        $set: {
          amount: deliveryEarning,
          status: "Settled",
          meta: deliveryMeta,
        },
        $setOnInsert: {
          user: settled.deliveryBoy,
          userModel: "Delivery",
          order: settled._id,
          type: "Delivery Earning",
          reference: `DEL-ERN-${orderIdString}`,
        },
      },
      { upsert: true, new: true },
    );

    if (isCod) {
      await Transaction.findOneAndUpdate(
        { reference: `CASH-COL-${orderIdString}` },
        {
          $setOnInsert: {
            user: settled.deliveryBoy,
            userModel: "Delivery",
            order: settled._id,
            type: "Cash Collection",
            amount: settled.paymentBreakdown?.grandTotal || settled.pricing?.total || 0,
            status: "Settled",
            reference: `CASH-COL-${orderIdString}`,
          },
        },
        { upsert: true, new: true },
      );
    }
  }

  // Credit cashback to customer wallet if applicable
  const estimatedCashback = settled.paymentBreakdown?.estimatedCashback || 0;
  if (estimatedCashback > 0 && settled.customer && !settled.financeFlags?.cashbackCredited) {
    const User = (await import("../models/customer.js")).default;
    const user = await User.findById(settled.customer);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + estimatedCashback;
      await user.save();
      
      await Transaction.findOneAndUpdate(
        { reference: `CASHBACK-${orderIdString}` },
        {
          $setOnInsert: {
            user: settled.customer,
            userModel: "User",
            order: settled._id,
            type: "Cashback",
            amount: estimatedCashback,
            status: "Settled",
            reference: `CASHBACK-${orderIdString}`,
          },
        },
        { upsert: true, new: true },
      );
      
      settled.financeFlags = {
         ...(settled.financeFlags || {}),
         cashbackCredited: true
      };
      await settled.save();
    }
  }

  // Process multi-level referral commissions
  if (!settled.financeFlags?.levelCommissionCredited) {
    await processOrderLevelCommissions(settled);
    settled.financeFlags = {
       ...(settled.financeFlags || {}),
       levelCommissionCredited: true
    };
    await settled.save();
  }

  return settled;
}
