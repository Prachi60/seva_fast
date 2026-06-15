import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
    createAd,
    getMyAd,
    updateMyAd,
    updateMyServices,
    payMyAd,
    searchAds,
} from "../controller/professionalAdController.js";
import { getCategories } from "../controller/admin/professionalCategoryController.js";

const router = express.Router();

// Public routes
router.get("/categories", getCategories);
router.get("/search", searchAds);

// Protected professional profile routes
router.post("/profile", verifyToken, createAd);
router.get("/profile", verifyToken, getMyAd);
router.put("/profile", verifyToken, updateMyAd);
router.put("/profile/services", verifyToken, updateMyServices);
router.post("/profile/pay", verifyToken, payMyAd);

export default router;
