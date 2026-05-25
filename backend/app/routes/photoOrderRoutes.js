import express from "express";
import { 
    createPhotoOrder, 
    getMyPhotoOrders, 
    getSellersByCity 
} from "../controller/photoOrderController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/sellers", getSellersByCity);

router.use(verifyToken, allowRoles("customer", "user"));
router.post("/", createPhotoOrder);
router.get("/", getMyPhotoOrders);

export default router;
