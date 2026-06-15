import ProfessionalAd from "../models/professionalAd.js";
import ProfessionalCategory from "../models/professionalCategory.js";
import Setting from "../models/setting.js";
import User from "../models/customer.js";
import Transaction from "../models/transaction.js";
import handleResponse from "../utils/helper.js";

export const createAd = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const { name, phone, email, profession, categoryId, experienceYears, description, address, city, lat, lng } = req.body;

        if (!name || !phone || !profession || !categoryId || !description || !address || !city || lat === undefined || lng === undefined) {
            return handleResponse(res, 400, "All fields (name, phone, profession, categoryId, description, address, city, lat, lng) are required");
        }

        // Validate category exists
        const categoryExists = await ProfessionalCategory.findOne({ _id: categoryId, isActive: true });
        if (!categoryExists) {
            return handleResponse(res, 400, "Invalid or inactive professional category");
        }

        // Only one ad profile per user
        const existing = await ProfessionalAd.findOne({ owner: ownerId });
        if (existing) {
            return handleResponse(res, 400, "You already have a professional profile listing");
        }

        const newAd = await ProfessionalAd.create({
            owner: ownerId,
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || "",
            profession: profession.trim(),
            category: categoryId,
            experienceYears: Number(experienceYears) || 0,
            description: description.trim(),
            address: address.trim(),
            city: city.trim(),
            location: {
                type: "Point",
                coordinates: [Number(lng), Number(lat)],
            },
            approvalStatus: "pending",
            paymentStatus: "unpaid",
            isPublished: false,
        });

        return handleResponse(res, 201, "Professional profile listing created successfully. Please complete the listing payment to make it active.", newAd);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const getMyAd = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const ad = await ProfessionalAd.findOne({ owner: ownerId }).populate("category", "name").lean();
        if (!ad) {
            return handleResponse(res, 404, "Professional profile not found");
        }
        return handleResponse(res, 200, "Professional profile fetched successfully", ad);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const updateMyAd = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const { name, phone, email, profession, categoryId, experienceYears, description, address, city, lat, lng } = req.body;

        const ad = await ProfessionalAd.findOne({ owner: ownerId });
        if (!ad) {
            return handleResponse(res, 404, "Professional profile not found");
        }

        if (categoryId) {
            const categoryExists = await ProfessionalCategory.findOne({ _id: categoryId, isActive: true });
            if (!categoryExists) {
                return handleResponse(res, 400, "Invalid or inactive professional category");
            }
            ad.category = categoryId;
        }

        if (name) ad.name = name.trim();
        if (phone) ad.phone = phone.trim();
        if (email !== undefined) ad.email = email.trim();
        if (profession) ad.profession = profession.trim();
        if (experienceYears !== undefined) ad.experienceYears = Number(experienceYears) || 0;
        if (description) ad.description = description.trim();
        if (address) ad.address = address.trim();
        if (city) ad.city = city.trim();
        if (lat !== undefined && lng !== undefined) {
            ad.location = {
                type: "Point",
                coordinates: [Number(lng), Number(lat)],
            };
        }

        // Updating resets approval state to pending
        ad.approvalStatus = "pending";
        ad.isPublished = false;

        await ad.save();

        return handleResponse(res, 200, "Professional profile updated successfully and is pending admin approval", ad);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const updateMyServices = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const { services } = req.body; // Array of { name, description, price, durationMinutes }

        if (!Array.isArray(services)) {
            return handleResponse(res, 400, "Services must be an array of items");
        }

        const ad = await ProfessionalAd.findOne({ owner: ownerId });
        if (!ad) {
            return handleResponse(res, 404, "Professional profile not found");
        }

        ad.services = services.map(s => ({
            name: s.name?.trim() || "",
            description: s.description?.trim() || "",
            price: Number(s.price) || 0,
            durationMinutes: Number(s.durationMinutes) || 30,
        }));

        // Updating catalog resets approval state
        ad.approvalStatus = "pending";
        ad.isPublished = false;

        await ad.save();

        return handleResponse(res, 200, "Service catalog updated successfully and is pending admin approval", ad);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const payMyAd = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const ad = await ProfessionalAd.findOne({ owner: ownerId });
        if (!ad) {
            return handleResponse(res, 404, "Professional profile not found");
        }

        if (ad.paymentStatus === "paid" && ad.expiresAt && ad.expiresAt > new Date()) {
            return handleResponse(res, 400, "Listing is already active and paid");
        }

        const settings = await Setting.findOne({}) || {};
        const fee = settings.professionalAdListingFee ?? 499;
        const validityDays = settings.professionalAdValidityDays ?? 30;

        // Fetch user wallet
        const user = await User.findById(ownerId);
        if (!user) {
            return handleResponse(res, 404, "User account not found");
        }

        if ((user.walletBalance || 0) < fee) {
            return handleResponse(res, 400, `Insufficient wallet balance. You need ₹${fee} but have ₹${user.walletBalance || 0}`);
        }

        // Deduct wallet balance
        user.walletBalance = (user.walletBalance || 0) - fee;
        await user.save();

        // Create transaction history record
        const txnId = `TXN-AD-${Date.now()}`;
        await Transaction.create({
            user: ownerId,
            type: "Wallet Payment",
            amount: -fee,
            status: "success",
            reference: txnId,
            description: `Professional Listing Advertisement Fee for ${ad.profession}`,
        });

        // Update ad profile listing status
        ad.paymentStatus = "paid";
        ad.paymentDetails = {
            transactionId: txnId,
            amountPaid: fee,
            paidAt: new Date(),
        };

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + validityDays);
        ad.expiresAt = expiryDate;

        // Auto-publish if already approved
        if (ad.approvalStatus === "approved") {
            ad.isPublished = true;
        }

        await ad.save();

        return handleResponse(res, 200, "Listing payment successful! Your advertisement is now active.", ad);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const searchAds = async (req, res) => {
    try {
        const { categoryId, city, q, lat, lng } = req.query;
        const settings = await Setting.findOne({}) || {};
        const maxRadiusKm = settings.professionalAdSearchRadiusKm ?? 15;

        const query = {
            approvalStatus: "approved",
            paymentStatus: "paid",
            expiresAt: { $gt: new Date() },
            isPublished: true,
        };

        if (categoryId) {
            query.category = categoryId;
        }

        if (city) {
            query.city = { $regex: new RegExp(`^${city.trim()}$`, "i") };
        }

        if (q) {
            const searchRegex = new RegExp(q.trim(), "i");
            query.$or = [
                { name: searchRegex },
                { profession: searchRegex },
                { description: searchRegex },
                { "services.name": searchRegex },
            ];
        }

        if (lat !== undefined && lng !== undefined) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            if (!isNaN(latitude) && !isNaN(longitude)) {
                query.location = {
                    $near: {
                        $geometry: { type: "Point", coordinates: [longitude, latitude] },
                        $maxDistance: maxRadiusKm * 1000,
                    },
                };
            }
        }

        const ads = await ProfessionalAd.find(query)
            .populate("category", "name")
            .lean();

        return handleResponse(res, 200, "Advertisements fetched successfully", ads);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Admin Moderation Endpoints
export const adminGetAds = async (req, res) => {
    try {
        const { status, paymentStatus } = req.query;
        const query = {};

        if (status) query.approvalStatus = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        const ads = await ProfessionalAd.find(query)
            .populate("owner", "name phone email")
            .populate("category", "name")
            .sort({ createdAt: -1 })
            .lean();

        return handleResponse(res, 200, "All advertisements fetched successfully", ads);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const adminApproveAd = async (req, res) => {
    try {
        const { id } = req.params;
        const ad = await ProfessionalAd.findById(id);
        if (!ad) {
            return handleResponse(res, 404, "Advertisement listing not found");
        }

        ad.approvalStatus = "approved";
        ad.rejectionReason = null;

        // Auto publish if payment is complete
        if (ad.paymentStatus === "paid" && ad.expiresAt > new Date()) {
            ad.isPublished = true;
        }

        await ad.save();

        return handleResponse(res, 200, "Advertisement approved successfully", ad);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const adminRejectAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return handleResponse(res, 400, "Rejection reason is required");
        }

        const ad = await ProfessionalAd.findById(id);
        if (!ad) {
            return handleResponse(res, 404, "Advertisement listing not found");
        }

        ad.approvalStatus = "rejected";
        ad.rejectionReason = reason;
        ad.isPublished = false;

        await ad.save();

        return handleResponse(res, 200, "Advertisement rejected successfully", ad);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
