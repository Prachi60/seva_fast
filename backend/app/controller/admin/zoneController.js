import Zone from "../../models/zone.js";
import handleResponse from "../../utils/helper.js";

export const getZones = async (req, res) => {
  try {
    const zones = await Zone.find({}).sort({ name: 1 });
    return handleResponse(res, 200, "Zones retrieved successfully", { zones });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const createZone = async (req, res) => {
  try {
    const { name, description, coordinates } = req.body;
    if (!name) {
      return handleResponse(res, 400, "Zone name is required");
    }

    const existing = await Zone.findOne({ name });
    if (existing) {
      return handleResponse(res, 409, "Zone with this name already exists");
    }

    const zone = await Zone.create({
      name,
      description,
      coordinates: coordinates ? { type: "Polygon", coordinates } : undefined,
    });

    return handleResponse(res, 201, "Zone created successfully", { zone });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, coordinates, status } = req.body;

    const zone = await Zone.findById(id);
    if (!zone) {
      return handleResponse(res, 404, "Zone not found");
    }

    if (name && name !== zone.name) {
      const existing = await Zone.findOne({ name });
      if (existing) {
        return handleResponse(res, 409, "Zone with this name already exists");
      }
      zone.name = name;
    }

    if (description !== undefined) zone.description = description;
    if (coordinates !== undefined) {
      zone.coordinates = { type: "Polygon", coordinates };
    }
    if (status !== undefined) zone.status = status;

    await zone.save();
    return handleResponse(res, 200, "Zone updated successfully", { zone });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const deleteZone = async (req, res) => {
  try {
    const { id } = req.params;
    const zone = await Zone.findByIdAndDelete(id);
    if (!zone) {
      return handleResponse(res, 404, "Zone not found");
    }
    return handleResponse(res, 200, "Zone deleted successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
