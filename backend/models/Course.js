/**
 * @file Course.js
 * @author TheWatcher01
 * @date 10-10-2024
 * @description Model for the Course and Resources collection, including status tracking and metadata.
 */

import mongoose from "mongoose";

// Schema for metadata about resources (size, duration, etc.)
const ResourceMetadataSchema = new mongoose.Schema({
  fileSize: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    // Duration in seconds for audio/video
  },
  dimensions: {
    width: Number,
    height: Number,
    // For images and videos
  },
});

// Schema for resources associated with courses
const ResourceSchema = new mongoose.Schema({
  resourceId: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ["audio", "video", "text", "pdf", "image"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  format: {
    type: String,
    required: true,
  },
  metadata: ResourceMetadataSchema,
  order: {
    type: Number,
    default: 0,
    // For ordering resources within a course
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

// Schema for the Course collection
const CourseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      // Will be auto-generated from title
    },
    description: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      // Main course content or overview
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    category: {
      type: String,
      required: true,
      // Main category of the course
    },
    tags: [
      {
        type: String,
        // For better searchability
      },
    ],
    resources: [ResourceSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    duration: {
      type: Number,
      // Estimated duration in minutes
    },
    prerequisites: [
      {
        type: String,
        // Required knowledge or courses
      },
    ],
    visibility: {
      type: String,
      enum: ["public", "private", "restricted"],
      default: "private",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for improved search performance
CourseSchema.index({ title: "text", description: "text", tags: "text" });

// Pre-save middleware to generate slug
CourseSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

// Virtual for resource count
CourseSchema.virtual("resourceCount").get(function () {
  return this.resources.length;
});

// Static method to find courses by category
CourseSchema.statics.findByCategory = function (category) {
  return this.find({ category, status: "published" });
};

// Method to check if course is publishable
CourseSchema.methods.isPublishable = function () {
  return (
    this.title &&
    this.description &&
    this.resources.length > 0 &&
    this.level &&
    this.category
  );
};

// Compound index for efficient filtering
CourseSchema.index({ status: 1, category: 1, level: 1 });

export default mongoose.model("Course", CourseSchema);
