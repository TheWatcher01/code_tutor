/**
 * @file fileUploadMiddleware.js
 * @author TheWatcher01
 * @date 10-10-2024
 * @description Middleware for handling file uploads using Multer.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Allowed file types
const allowedFileTypes = /mp3|wav|txt|pdf|mp4|avi|mov|jpeg|jpg|png|md|epub/;

// File filter function
const fileFilter = (req, file, cb) => {
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true); // Accept the file
  } else {
    logger.error(`File rejected: ${file.originalname}`);
    return cb(new Error('Invalid file type!'));
  }
};

// Storage settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
      logger.info('Uploads directory created');
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    logger.info(`File uploaded: ${uniqueFilename}`);
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

module.exports = upload;
