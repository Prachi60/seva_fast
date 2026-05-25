import express from "express";
import { 
    getReceivedPhotoOrders,
    updatePhotoOrderStatus
} from "../controller/photoOrderController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken, allowRoles("seller"));
router.get("/", getReceivedPhotoOrders);
router.put("/:id/status", updatePhotoOrderStatus);

export default router;
