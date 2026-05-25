import Plan from "../models/plan.js";
import User from "../models/customer.js";
import handleResponse from "../utils/helper.js";
import mongoose from "mongoose";
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';
import crypto from "crypto";

function getPhonePeClient() {
    const clientId = String(process.env.PHONEPE_CLIENT_ID || "").trim();
    const clientSecret = String(process.env.PHONEPE_CLIENT_SECRET || "").trim();
    const clientVersion = parseInt(process.env.PHONEPE_CLIENT_VERSION || "1", 10);
    const isProd = String(process.env.PHONEPE_ENV || "").toUpperCase() === "PRODUCTION";

    return StandardCheckoutClient.getInstance(
        clientId,
        clientSecret,
        clientVersion,
        isProd ? Env.PRODUCTION : Env.SANDBOX
    );
}

/* ===============================
   ADMIN: CREATE PLAN
 ================================ */
export const createPlan = async (req, res) => {
    try {
        const plan = await Plan.create(req.body);
        return handleResponse(res, 201, "Plan created successfully", plan);
    } catch (error) {
        if (error.code === 11000) return handleResponse(res, 400, "Plan name must be unique");
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   ADMIN: UPDATE PLAN
 ================================ */
export const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await Plan.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!plan) return handleResponse(res, 404, "Plan not found");
        return handleResponse(res, 200, "Plan updated successfully", plan);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   ADMIN: DELETE PLAN
 ================================ */
export const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await Plan.findByIdAndDelete(id);
        if (!plan) return handleResponse(res, 404, "Plan not found");
        return handleResponse(res, 200, "Plan deleted successfully");
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   GET ALL PLANS
 ================================ */
export const getPlans = async (req, res) => {
    try {
        const query = req.user?.role === "admin" ? {} : { isActive: true };
        const plans = await Plan.find(query).sort({ sortOrder: 1, createdAt: -1 });
        return handleResponse(res, 200, "Plans fetched successfully", plans);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   USER: INITIATE SUBSCRIPTION
 ================================ */
export const createPlanOrder = async (req, res) => {
    try {
        const { planId, referralCode } = req.body;
        const userId = req.user.id;

        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return handleResponse(res, 404, "Plan not found or inactive");
        }

        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
            if (referrer) referredBy = referrer._id;
            else return handleResponse(res, 400, "Invalid Referral Code");
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (plan.validityDays || 365));

        const permissions = plan.features
            .filter(f => f.unit === "Boolean" && f.value === true)
            .map(f => f.key);

        const updateData = {
            currentPlan: plan._id,
            planExpiry: expiryDate,
            permissions: permissions
        };

        if (referredBy) {
            updateData.referredBy = referredBy;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).populate("currentPlan");

        return handleResponse(res, 200, "Plan activated successfully (Bypass Mode)", { success: true, user: updatedUser });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   USER: VERIFY AND SUBSCRIBE
 ================================ */
export const verifyPlanPayment = async (req, res) => {
    try {
        const { merchantOrderId, planId, referredBy } = req.body;
        const userId = req.user.id;

        const client = getPhonePeClient();
        const response = await client.getOrderStatus(merchantOrderId);
        const state = String(response.state || "").toUpperCase();

        if (state !== "COMPLETED") {
            return handleResponse(res, 400, `Payment not completed. Current state: ${state}`);
        }

        const plan = await Plan.findById(planId);
        if (!plan) return handleResponse(res, 404, "Plan not found");

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (plan.validityDays || 365));

        const permissions = plan.features
            .filter(f => f.unit === "Boolean" && f.value === true)
            .map(f => f.key);

        const updateData = {
            currentPlan: plan._id,
            planExpiry: expiryDate,
            permissions: permissions
        };

        if (referredBy) {
            updateData.referredBy = referredBy;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).populate("currentPlan");

        return handleResponse(res, 200, "Subscribed to plan successfully", updatedUser);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
