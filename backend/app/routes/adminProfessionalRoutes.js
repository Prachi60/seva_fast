import express from "express";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory,
} from "../controller/admin/professionalCategoryController.js";
import {
    adminGetAds,
    adminApproveAd,
    adminRejectAd,
} from "../controller/professionalAdController.js";

const router = express.Router();

// Apply auth middleware to all admin professional routes
router.use(verifyToken);
router.use(allowRoles("admin"));

// Category management routes
router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// Advertisement moderation routes
router.get("/ads", adminGetAds);
router.patch("/ads/:id/approve", adminApproveAd);
router.patch("/ads/:id/reject", adminRejectAd);

export default router;
