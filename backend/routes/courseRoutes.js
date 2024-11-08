/**
 * @file courseRoutes.js
 * @author TheWatcher
 * @date 10-10-2024
 * @description Routes for handling course-related operations including creation, update, deletion, and retrieval.
 */

import express from "express";
import courseController from "../controllers/courseController.js";
import verifyToken from "../auth/authMiddleware.js";
import { verifyRole } from "../middlewares/checkRoleMiddleware.js";
import multerUploadMiddleware from "../middlewares/multerUploadMiddleware.js";
import backendLogger from "../config/backendLogger.js";

// Initialize router
const router = express.Router();

// Development debug middleware with enhanced logging
const debugRequestMiddleware = (req, res, next) => {
  try {
    // Ne pas logger les fichiers pour éviter de surcharger les logs
    const { files, ...reqWithoutFiles } = req.body;

    backendLogger.debug("Incoming course request:", {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? "[REDACTED]" : undefined,
      },
      body: reqWithoutFiles,
      filesCount: files ? "Present" : "None",
      timestamp: new Date().toISOString(),
    });
    next();
  } catch (error) {
    backendLogger.error("Error in debug middleware:", error);
    next(error);
  }
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  backendLogger.error("Route error:", {
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

// Middleware composition helper
const composeMiddleware = (middlewares) => {
  return (req, res, next) => {
    let idx = 0;
    const run = (i) => {
      if (i === middlewares.length) {
        return next();
      }
      middlewares[i](req, res, (err) => {
        if (err) return next(err);
        run(i + 1);
      });
    };
    run(idx);
  };
};

// Apply debug middleware in development environment
if (process.env.NODE_ENV === "development") {
  router.use(debugRequestMiddleware);
}

// Define middleware stacks
const baseAuthStack = [verifyToken];
const teacherAuthStack = [verifyToken, verifyRole(['admin', 'mentor'])];
const adminAuthStack = [verifyToken, verifyRole(['admin'])];

// Course Routes
router
  // Course creation
  .post(
    "/add-course",
    composeMiddleware([
      ...teacherAuthStack,
      multerUploadMiddleware,
      debugRequestMiddleware,
    ]),
    courseController.addCourse
  )

  // Get all courses (with optional filters)
  .get("/", composeMiddleware(baseAuthStack), courseController.getAllCourses)

  // Get single course
  .get(
    "/:courseId",
    composeMiddleware(baseAuthStack),
    courseController.getCourseById
  )

  // Update course
  .put(
    "/:courseId",
    composeMiddleware([...teacherAuthStack, multerUploadMiddleware]),
    courseController.updateCourse
  )

  // Delete course (admin only)
  .delete(
    "/:courseId",
    composeMiddleware(adminAuthStack),
    courseController.deleteCourse
  );

// Course Resources Routes
router
  // Get course resources
  .get(
    "/:courseId/resources",
    composeMiddleware(baseAuthStack),
    courseController.getCourseResources
  )

  // Add resources to course
  .post(
    "/:courseId/resources",
    composeMiddleware([...teacherAuthStack, multerUploadMiddleware]),
    courseController.addCourseResource
  );

// Apply error handling middleware last
router.use(errorHandler);

// Export router with type checking
export default router;
