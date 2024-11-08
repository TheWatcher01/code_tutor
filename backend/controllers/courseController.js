/**
 * @file courseController.js
 * @description Course management controller
 * @author TheWatcher01
 * @date 2024-11-08
 */

import Course from "../models/Course.js";
import { v4 as uuidv4 } from "uuid";
import backendLogger from "../config/backendLogger.js";
import config from "../config/dotenvConfig.js";
import path from "path";
import fs from "fs/promises";

// Resource type configurations
const RESOURCE_TYPES = {
  AUDIO: {
    type: "audio",
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg"],
    maxSize: config.MAX_AUDIO_SIZE || 50 * 1024 * 1024,
    allowedExtensions: [".mp3", ".wav", ".ogg"],
  },
  VIDEO: {
    type: "video",
    mimeTypes: ["video/mp4", "video/avi", "video/quicktime"],
    maxSize: config.MAX_VIDEO_SIZE || 200 * 1024 * 1024,
    allowedExtensions: [".mp4", ".avi", ".mov"],
  },
  DOCUMENT: {
    type: "document",
    mimeTypes: ["application/pdf", "text/plain", "text/markdown"],
    maxSize: config.MAX_DOCUMENT_SIZE || 20 * 1024 * 1024,
    allowedExtensions: [".pdf", ".txt", ".md", ".epub"],
  },
  IMAGE: {
    type: "image",
    mimeTypes: ["image/jpeg", "image/png", "image/gif"],
    maxSize: config.MAX_IMAGE_SIZE || 10 * 1024 * 1024,
    allowedExtensions: [".jpg", ".jpeg", ".png", ".gif"],
  },
};

// Utility functions
const processResource = (file) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const resourceType = Object.values(RESOURCE_TYPES).find(
    (type) =>
      type.mimeTypes.includes(file.mimetype) &&
      type.allowedExtensions.includes(extension)
  );

  if (!resourceType) {
    throw new Error(`Unsupported file type: ${file.mimetype}`);
  }

  if (file.size > resourceType.maxSize) {
    throw new Error(`File size exceeds limit for ${resourceType.type}`);
  }

  return {
    resourceId: uuidv4(),
    type: resourceType.type,
    url: file.path,
    filename: file.originalname,
    format: extension.slice(1),
    size: file.size,
    mimeType: file.mimetype,
  };
};

const checkCoursePermissions = (course, user) => {
  if (
    course.createdBy.toString() !== user._id.toString() &&
    !["admin", "mentor"].includes(user.role)
  ) {
    throw new Error("Unauthorized access to course");
  }
};

const handleControllerError = (error, res, message) => {
  backendLogger.error(`${message}:`, {
    error: error.message,
    stack: config.NODE_ENV === "development" ? error.stack : undefined,
  });

  let statusCode = 500;
  if (error.message.includes("not found")) statusCode = 404;
  else if (error.message.includes("Unauthorized")) statusCode = 403;
  else if (error.message.includes("validation failed")) statusCode = 400;

  res.status(statusCode).json({
    success: false,
    message: `${message}. ${error.message}`,
    error: config.NODE_ENV === "development" ? error.stack : undefined,
  });
};

// Controller functions
const addCourse = async (req, res) => {
  const session = await Course.startSession();
  session.startTransaction();

  try {
    const { title, description, category, level } = req.body;
    const files = req.files || [];

    if (!title?.trim()) {
      throw new Error("Course title is required");
    }

    const resources = await Promise.all(
      files.map(async (file) => {
        try {
          return processResource(file);
        } catch (error) {
          await fs
            .unlink(file.path)
            .catch((err) =>
              backendLogger.error("Error deleting invalid file:", err)
            );
          throw error;
        }
      })
    );

    const newCourse = new Course({
      courseId: uuidv4(),
      title,
      description,
      category,
      level,
      resources,
      createdBy: req.user._id,
      status: "draft",
      metadata: {
        resourceCount: resources.length,
        totalSize: resources.reduce((sum, r) => sum + r.size, 0),
        lastModified: new Date(),
      },
    });

    await newCourse.save({ session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: newCourse,
    });
  } catch (error) {
    await session.abortTransaction();
    handleControllerError(error, res, "Error creating course");
  } finally {
    session.endSession();
  }
};

const getAllCourses = async (req, res) => {
  try {
    const {
      status,
      search,
      category,
      level,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (level) query.level = level;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate("createdBy", "username email")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Course.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        courses,
        pagination: {
          total,
          totalPages,
          currentPage: parseInt(page),
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    handleControllerError(error, res, "Error retrieving courses");
  }
};

const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { fields } = req.query;

    const projection = fields
      ? fields.split(",").reduce((acc, field) => {
          acc[field.trim()] = 1;
          return acc;
        }, {})
      : {};

    const course = await Course.findOne({ courseId })
      .populate("createdBy", "username email")
      .select(projection)
      .lean();

    if (!course) {
      throw new Error("Course not found");
    }

    course.metadata = {
      ...course.metadata,
      resourceCount: course.resources?.length || 0,
      totalSize: course.resources?.reduce((sum, r) => sum + r.size, 0) || 0,
      lastAccessed: new Date(),
    };

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    handleControllerError(error, res, "Error retrieving course");
  }
};

const updateCourse = async (req, res) => {
  const session = await Course.startSession();
  session.startTransaction();

  try {
    const { courseId } = req.params;
    const { title, description, status, category, level } = req.body;
    const files = req.files || [];

    const course = await Course.findOne({ courseId });
    if (!course) {
      throw new Error("Course not found");
    }

    checkCoursePermissions(course, req.user);

    const newResources = await Promise.all(
      files.map(async (file) => {
        try {
          return processResource(file);
        } catch (error) {
          await fs
            .unlink(file.path)
            .catch((err) =>
              backendLogger.error("Error deleting invalid file:", err)
            );
          throw error;
        }
      })
    );

    const updates = {
      ...(title && { title }),
      ...(description && { description }),
      ...(status && { status }),
      ...(category && { category }),
      ...(level && { level }),
      "metadata.lastModified": new Date(),
      "metadata.resourceCount":
        (course.resources?.length || 0) + newResources.length,
    };

    if (newResources.length > 0) {
      updates.$push = { resources: { $each: newResources } };
    }

    const updatedCourse = await Course.findOneAndUpdate({ courseId }, updates, {
      new: true,
      runValidators: true,
      session,
    }).populate("createdBy", "username email");

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: updatedCourse,
    });
  } catch (error) {
    await session.abortTransaction();
    handleControllerError(error, res, "Error updating course");
  } finally {
    session.endSession();
  }
};

const deleteCourse = async (req, res) => {
  const session = await Course.startSession();
  session.startTransaction();

  try {
    const { courseId } = req.params;
    const course = await Course.findOne({ courseId });

    if (!course) {
      throw new Error("Course not found");
    }

    checkCoursePermissions(course, req.user);

    await Promise.all(
      course.resources.map(async (resource) => {
        try {
          await fs.unlink(resource.url);
        } catch (err) {
          backendLogger.warn(
            `Failed to delete resource file: ${resource.url}`,
            err
          );
        }
      })
    );

    await Course.deleteOne({ courseId }, { session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Course and associated resources deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    handleControllerError(error, res, "Error deleting course");
  } finally {
    session.endSession();
  }
};

const getCourseResources = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { type, format } = req.query;

    const course = await Course.findOne({ courseId })
      .select("resources")
      .lean();

    if (!course) {
      throw new Error("Course not found");
    }

    let resources = course.resources;
    if (type) {
      resources = resources.filter((r) => r.type === type);
    }
    if (format) {
      resources = resources.filter((r) => r.format === format);
    }

    const metadata = {
      totalCount: resources.length,
      totalSize: resources.reduce((sum, r) => sum + r.size, 0),
      typeBreakdown: resources.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {}),
    };

    res.status(200).json({
      success: true,
      data: {
        resources,
        metadata,
      },
    });
  } catch (error) {
    handleControllerError(error, res, "Error retrieving course resources");
  }
};

const addCourseResource = async (req, res) => {
  const session = await Course.startSession();
  session.startTransaction();

  try {
    const { courseId } = req.params;
    const files = req.files || [];

    if (!files.length) {
      throw new Error("No files provided");
    }

    const course = await Course.findOne({ courseId });
    if (!course) {
      throw new Error("Course not found");
    }

    checkCoursePermissions(course, req.user);

    const newResources = await Promise.all(files.map(processResource));

    const updatedCourse = await Course.findOneAndUpdate(
      { courseId },
      {
        $push: { resources: { $each: newResources } },
        $set: {
          "metadata.lastModified": new Date(),
          "metadata.resourceCount":
            course.resources.length + newResources.length,
        },
      },
      { new: true, session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: {
        newResources,
        course: updatedCourse,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    handleControllerError(error, res, "Error adding course resources");
  } finally {
    session.endSession();
  }
};

export default {
  addCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseResources,
  addCourseResource,
};
