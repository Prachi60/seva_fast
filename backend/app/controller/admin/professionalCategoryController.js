import ProfessionalCategory from "../../models/professionalCategory.js";
import handleResponse from "../../utils/helper.js";

export const createCategory = async (req, res) => {
    try {
        const { name, description, icon, priceType, price } = req.body;
        if (!name) {
            return handleResponse(res, 400, "Category name is required");
        }

        const existing = await ProfessionalCategory.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
        if (existing) {
            return handleResponse(res, 400, "Category name already exists");
        }

        const category = await ProfessionalCategory.create({
            name: name.trim(),
            description: description?.trim() || "",
            icon: icon?.trim() || "",
            priceType: priceType || "free",
            price: priceType === "paid" ? Number(price) || 0 : 0,
        });

        return handleResponse(res, 201, "Professional category created successfully", category);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const getCategories = async (req, res) => {
    try {
        const categories = await ProfessionalCategory.find({}).sort({ name: 1 }).lean();
        return handleResponse(res, 200, "Professional categories fetched successfully", categories);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, isActive, priceType, price } = req.body;

        const category = await ProfessionalCategory.findById(id);
        if (!category) {
            return handleResponse(res, 404, "Professional category not found");
        }

        if (name) {
            const existing = await ProfessionalCategory.findOne({
                _id: { $ne: id },
                name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
            });
            if (existing) {
                return handleResponse(res, 400, "Category name already exists");
            }
            category.name = name.trim();
        }

        if (description !== undefined) category.description = description.trim();
        if (icon !== undefined) category.icon = icon.trim();
        if (isActive !== undefined) category.isActive = isActive;
        if (priceType !== undefined) category.priceType = priceType;
        if (price !== undefined) category.price = priceType === "paid" ? Number(price) || 0 : 0;

        await category.save();

        return handleResponse(res, 200, "Professional category updated successfully", category);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await ProfessionalCategory.findById(id);
        if (!category) {
            return handleResponse(res, 404, "Professional category not found");
        }

        await ProfessionalCategory.findByIdAndDelete(id);
        return handleResponse(res, 200, "Professional category deleted successfully");
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
