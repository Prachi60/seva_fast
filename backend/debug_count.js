import mongoose from 'mongoose';
import Order from './app/models/order.js';
import User from './app/models/customer.js';
import dotenv from 'dotenv';

dotenv.config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const CheckoutGroup = (await import('./app/models/checkoutGroup.js')).default;
        const groups = await CheckoutGroup.countDocuments({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });
        console.log(`CheckoutGroups created this month: ${groups}`);
        for (const o of orders) {
             console.log(`Order: ${o.orderId}, Status: ${o.status}, Phone: ${o.customer?.phone}, Date: ${o.createdAt}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
});
