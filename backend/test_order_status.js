import mongoose from 'mongoose';
import Order from './app/models/order.js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
    try {
        console.log("Connecting to", process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sevafast', {
            serverSelectionTimeoutMS: 5000
        });
        console.log("Connected!");
        const order = await Order.findOne({ status: 'confirmed' });
        if (!order) {
            console.log("No confirmed order found");
            process.exit(0);
        }
        console.log("Found order:", order.orderId, order.status, order.workflowVersion);
        
        // Simulate updating status
        order.status = "packed";
        order.orderStatus = "packed";
        await order.save();
        console.log("Successfully saved order as packed!");
    } catch (e) {
        console.log("Error:", e);
    }
    process.exit(0);
}
run();
