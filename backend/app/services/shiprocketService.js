import axios from "axios";
import * as logger from "./logger.js";

let cachedToken = null;
let tokenExpiry = null;

const SHIPROCKET_API_URL = "https://apiv2.shiprocket.in/v1/external";

/**
 * Retrieves a valid Shiprocket authentication token.
 * Uses cached token if not expired.
 */
export async function getShiprocketToken() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const isSandbox = process.env.SHIPROCKET_SANDBOX !== "false";

  // If credentials are missing, we run in mock mode
  if (!email || !password) {
    if (isSandbox) {
      return "mock-sandbox-token";
    }
    throw new Error("Shiprocket credentials (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD) are missing.");
  }

  // Check cache
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await axios.post(`${SHIPROCKET_API_URL}/auth/login`, {
      email,
      password,
    });

    if (response.data && response.data.token) {
      cachedToken = response.data.token;
      // Tokens are typically valid for 10 days; we expire cache in 9 days
      tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
      return cachedToken;
    } else {
      throw new Error("Invalid response format during Shiprocket login");
    }
  } catch (error) {
    logger.error("Shiprocket login failed:", error.message);
    throw new Error(`Shiprocket Auth Error: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Creates an order/shipment in Shiprocket.
 * If credentials are not set or sandbox is active, returns simulated shipment details.
 */
export async function createShiprocketOrder(order) {
  const isSandbox = process.env.SHIPROCKET_SANDBOX !== "false";
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  const orderItems = Array.isArray(order.items) ? order.items : [];
  
  // Calculate shipment parameters
  let totalWeight = 0;
  orderItems.forEach(item => {
    let wVal = parseFloat(String(item.weight || "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(wVal) || wVal <= 0) wVal = 0.5; // default 500g
    if (String(item.weight || "").toLowerCase().includes("gm") || String(item.weight || "").toLowerCase().includes("gram")) {
      wVal = wVal / 1000;
    }
    totalWeight += wVal * (item.quantity || 1);
  });

  // Normalize details
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || order.seller?.shopName || "Primary";
  const address = order.address || {};
  const customer = order.customer || {};

  const orderPayload = {
    order_id: order.orderId,
    order_date: new Date(order.createdAt || Date.now()).toISOString().slice(0, 16).replace("T", " "),
    pickup_location: pickupLocation,
    billing_customer_name: customer.name || "Customer",
    billing_last_name: "",
    billing_address: address.address || "No Address Provided",
    billing_address_2: "",
    billing_city: address.city || "Unknown City",
    billing_pincode: String(address.pincode || address.zip || ""),
    billing_state: address.state || "State",
    billing_country: "India",
    billing_email: customer.email || "customer@example.com",
    billing_phone: customer.phone || "9999999999",
    shipping_is_billing: true,
    order_items: orderItems.map((item, index) => ({
      name: item.name || `Item ${index + 1}`,
      sku: item.variantSku || item.product?.toString() || `SKU-${index}`,
      units: item.quantity || 1,
      selling_price: item.price || 0,
      discount: 0,
      tax: 0,
      hsn: "",
    })),
    payment_method: order.paymentMode === "COD" ? "COD" : "Prepaid",
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: order.pricing?.productSubtotal || 0,
    length: 15,
    width: 15,
    height: 15,
    weight: totalWeight,
  };

  if (isSandbox || !email || !password) {
    logger.info(`[Shiprocket Mock] Creating mock shipment for Order: ${order.orderId}`);
    return {
      success: true,
      order_id: order.orderId,
      shipment_id: `MOCK-SHIP-${Date.now()}`,
      awb_code: `MOCK-AWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      courier_name: "Mock Fast Courier V2",
      status: "NEW",
    };
  }

  try {
    const token = await getShiprocketToken();
    const response = await axios.post(`${SHIPROCKET_API_URL}/orders/create/adhoc`, orderPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data && response.data.shipment_id) {
      return {
        success: true,
        order_id: response.data.order_id,
        shipment_id: response.data.shipment_id,
        awb_code: response.data.awb_code || "",
        courier_name: response.data.courier_name || "",
        status: "NEW",
      };
    } else {
      throw new Error(`Shiprocket order creation failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logger.error("Shiprocket order creation failed:", error.message);
    throw new Error(`Shiprocket Order Error: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Cancels a shipment in Shiprocket.
 */
export async function cancelShiprocketOrder(orderId) {
  const isSandbox = process.env.SHIPROCKET_SANDBOX !== "false";
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (isSandbox || !email || !password) {
    logger.info(`[Shiprocket Mock] Cancelling mock shipment for Order: ${orderId}`);
    return { success: true };
  }

  try {
    const token = await getShiprocketToken();
    const response = await axios.post(`${SHIPROCKET_API_URL}/orders/cancel`, {
      ids: [orderId],
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return { success: true, response: response.data };
  } catch (error) {
    logger.error("Shiprocket cancel failed:", error.message);
    return { success: false, error: error.message };
  }
}

export default {
  getShiprocketToken,
  createShiprocketOrder,
  cancelShiprocketOrder,
};
