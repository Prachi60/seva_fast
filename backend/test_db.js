import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
  dotenv.config();
}

mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 10 })
  .then(async () => {
    const orderSchema = new mongoose.Schema({}, { strict: false });
    const Order = mongoose.model("Order", orderSchema, "orders");
    
    const customerSchema = new mongoose.Schema({}, { strict: false });
    const Customer = mongoose.model("Customer", customerSchema, "users");

    const customers = await Customer.find({}).lean();
    for (const c of customers) {
       const count = await Order.countDocuments({ customer: c._id });
       console.log(`Phone: ${c.phone}, ID: ${c._id}, Orders: ${count}`);
    }

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
