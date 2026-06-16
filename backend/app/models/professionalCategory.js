import mongoose from "mongoose";

const professionalCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        icon: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        priceType: {
            type: String,
            enum: ["free", "paid"],
            default: "free",
        },
        price: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("ProfessionalCategory", professionalCategorySchema);
