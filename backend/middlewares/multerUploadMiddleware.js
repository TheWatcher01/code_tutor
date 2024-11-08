/**
 * @file multerUploadMiddleware.js
 * @description Advanced file upload handling with validation
 * @author TheWatcher01
 * @date 2024-11-08
 */

import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import backendLogger from "../config/backendLogger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File type configurations
const FILE_TYPE_CONFIG = {
  audio: {
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg"],
    extensions: [".mp3", ".wav", ".ogg"],
    maxSize: 50 * 1024 * 1024,
    directory: "audio",
  },
  video: {
    mimeTypes: ["video/mp4", "video/avi", "video/quicktime"],
    extensions: [".mp4", ".avi", ".mov"],
    maxSize: 200 * 1024 * 1024,
    directory: "video",
  },
  document: {
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/epub+zip",
    ],
    extensions: [".pdf", ".txt", ".md", ".epub"],
    maxSize: 20 * 1024 * 1024,
    directory: "documents",
  },
  image: {
    mimeTypes: ["image/jpeg", "image/png", "image/gif"],
    extensions: [".jpg", ".jpeg", ".png", ".gif"],
    maxSize: 10 * 1024 * 1024,
    directory: "images",
  },
};

// Initialize upload directories
const initializeUploadDirectories = async () => {
  const baseUploadDir = path.join(__dirname, "../../uploads");

  try {
    await fs.mkdir(baseUploadDir, { recursive: true });

    for (const type of Object.values(FILE_TYPE_CONFIG)) {
      const typeDir = path.join(baseUploadDir, type.directory);
      await fs.mkdir(typeDir, { recursive: true });
    }

    backendLogger.info("Upload directories initialized successfully");
  } catch (error) {
    backendLogger.error("Error initializing upload directories:", error);
    throw error;
  }
};

// Initialize directories
try {
  await initializeUploadDirectories();
} catch (error) {
  backendLogger.error("Failed to initialize upload directories:", error);
  // Don't exit process, just log error
}

// Determine file type from mimetype and extension
const getFileType = (mimetype, extension) => {
  for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
    if (
      config.mimeTypes.includes(mimetype) &&
      config.extensions.includes(extension.toLowerCase())
    ) {
      return type;
    }
  }
  return null;
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const fileType = getFileType(
        file.mimetype,
        path.extname(file.originalname)
      );
      if (!fileType) {
        return cb(new Error(`Invalid file type: ${file.originalname}`));
      }

      const uploadDir = path.join(
        __dirname,
        `../../uploads/${FILE_TYPE_CONFIG[fileType].directory}`
      );

      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const extension = path.extname(file.originalname).toLowerCase();
      const fileType = getFileType(file.mimetype, extension);
      if (!fileType) {
        return cb(new Error(`Invalid file type: ${file.originalname}`));
      }

      const filename = `${fileType}-${Date.now()}-${uuidv4()}${extension}`;
      backendLogger.debug("Generated filename:", {
        original: file.originalname,
        generated: filename,
      });
      cb(null, filename);
    } catch (error) {
      cb(error);
    }
  },
});

// Format bytes to human readable string
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Get list of allowed extensions
const getAllowedExtensions = () => {
  return Object.entries(FILE_TYPE_CONFIG)
    .map(([type, config]) => `${type}: ${config.extensions.join(", ")}`)
    .join("; ");
};

// File filter configuration
const fileFilter = (req, file, cb) => {
  try {
    const extension = path.extname(file.originalname).toLowerCase();
    const fileType = getFileType(file.mimetype, extension);
    const fileSize = parseInt(req.headers["content-length"] || "0");

    if (!fileType) {
      backendLogger.warn(
        `Rejected file: ${file.originalname} (unsupported type)`
      );
      return cb(
        new Error(`Unsupported file type. Allowed: ${getAllowedExtensions()}`)
      );
    }

    if (fileSize > FILE_TYPE_CONFIG[fileType].maxSize) {
      return cb(
        new Error(
          `File too large. Max size: ${formatBytes(FILE_TYPE_CONFIG[fileType].maxSize)}`
        )
      );
    }

    if (!req.fileMetadata) req.fileMetadata = [];
    req.fileMetadata.push({
      originalName: file.originalname,
      fileType,
      extension,
      mimeType: file.mimetype,
      timestamp: Date.now(),
      size: fileSize,
    });

    cb(null, true);
  } catch (error) {
    cb(error);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(
      ...Object.values(FILE_TYPE_CONFIG).map((c) => c.maxSize)
    ),
    files: 10,
  },
}).array("files", 10);

// Translate Multer errors to user-friendly messages
const translateMulterError = (err) => {
  const errorMessages = {
    LIMIT_FILE_SIZE: `File too large. Maximum size: ${formatBytes(Math.max(...Object.values(FILE_TYPE_CONFIG).map((c) => c.maxSize)))}`,
    LIMIT_FILE_COUNT: "Too many files. Maximum 10 files allowed",
    LIMIT_UNEXPECTED_FILE: "Unexpected field name. Use 'files' field",
    default: `Upload error: ${err.message}`,
  };

  return errorMessages[err.code] || errorMessages.default;
};

// Enhanced upload middleware
const multerUploadMiddleware = async (req, res, next) => {
  // Handle CORS
  res.header(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_URL || "http://localhost:5173"
  );
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  try {
    const isFileUpload = (req.headers["content-type"] || "").includes(
      "multipart/form-data"
    );
    if (!isFileUpload) {
      return next();
    }

    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        backendLogger.error("Multer error:", err);
        return res.status(400).json({
          success: false,
          error: translateMulterError(err),
        });
      }

      if (err) {
        backendLogger.error("Upload error:", err);
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }

      if (req.files?.length > 0) {
        req.files = req.files.map((file, index) => ({
          ...file,
          metadata: req.fileMetadata[index],
        }));

        backendLogger.info("Files processed:", {
          count: req.files.length,
          types: req.files.map((f) => f.metadata.fileType),
        });
      }

      next();
    });
  } catch (error) {
    backendLogger.error("Unexpected upload error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during upload",
    });
  }
};

export default multerUploadMiddleware;
