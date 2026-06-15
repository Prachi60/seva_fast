import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Optional GeoJSON polygon coordinates to define geographic boundaries
    coordinates: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon",
      },
      coordinates: {
        type: [[[Number]]], // array of arrays of [lng, lat]
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Geo-index for spatial queries
zoneSchema.index({ coordinates: "2dsphere" });

export default mongoose.model("Zone", zoneSchema);
