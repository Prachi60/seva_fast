import mongoose from "mongoose";

const planFeatureSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        enum: ["FREE_DELIVERY", "FREE_HANDLING", "CASHBACK", "VENDOR_ONBOARDING", "REFERRAL_REWARD", "TURNOVER_COMMISSION", "ORDER_COMMISSION", "REFERRAL_LEVELS", "LEVEL_COMMISSION"],
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
    unit: {
        type: String,
        enum: ["%", "₹", "Boolean", "Count"],
        default: "Boolean",
    },
});

const planSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        description: {
            type: String,
            trim: true,
        },
        features: [planFeatureSchema],
        isActive: {
            type: Boolean,
            default: true,
        },
        displayColor: {
            type: String,
            default: "#0ea5e9",
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        validityDays: {
            type: Number,
            default: 365, // Yearly by default
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Plan", planSchema);
