import Admin from "../../models/admin.js";
import handleResponse from "../../utils/helper.js";

export const getSubadmins = async (req, res) => {
  try {
    const subadmins = await Admin.find({ role: "sub-admin" })
      .populate("assignedZones")
      .sort({ name: 1 });
    return handleResponse(res, 200, "Sub-admins retrieved successfully", { subadmins });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const createSubadmin = async (req, res) => {
  try {
    const { name, email, password, phone, assignedZones, allowedPermissions } = req.body;
    if (!name || !email || !password) {
      return handleResponse(res, 400, "Name, email and password are required");
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return handleResponse(res, 409, "User with this email already exists");
    }

    const subadmin = await Admin.create({
      name,
      email,
      password,
      phone,
      role: "sub-admin",
      assignedZones: assignedZones || [],
      allowedPermissions: allowedPermissions || [],
      isVerified: true,
    });

    const sanitized = subadmin.toObject();
    delete sanitized.password;

    return handleResponse(res, 201, "Sub-admin created successfully", { subadmin: sanitized });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const updateSubadmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, assignedZones, allowedPermissions } = req.body;

    const subadmin = await Admin.findById(id);
    if (!subadmin || subadmin.role !== "sub-admin") {
      return handleResponse(res, 404, "Sub-admin not found");
    }

    if (email && email !== subadmin.email) {
      const existing = await Admin.findOne({ email });
      if (existing) {
        return handleResponse(res, 409, "User with this email already exists");
      }
      subadmin.email = email;
    }

    if (name) subadmin.name = name;
    if (phone) subadmin.phone = phone;
    if (assignedZones) subadmin.assignedZones = assignedZones;
    if (allowedPermissions) subadmin.allowedPermissions = allowedPermissions;
    if (password) subadmin.password = password;

    await subadmin.save();

    const sanitized = subadmin.toObject();
    delete sanitized.password;

    return handleResponse(res, 200, "Sub-admin updated successfully", { subadmin: sanitized });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const deleteSubadmin = async (req, res) => {
  try {
    const { id } = req.params;
    const subadmin = await Admin.findOneAndDelete({ _id: id, role: "sub-admin" });
    if (!subadmin) {
      return handleResponse(res, 404, "Sub-admin not found");
    }
    return handleResponse(res, 200, "Sub-admin deleted successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
