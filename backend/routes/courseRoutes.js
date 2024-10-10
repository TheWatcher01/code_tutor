/**
 * @file courseRoutes.js
 * @author TheWatcher01
 * @date 10-10-2024
 * @description This file contains the routes for adding courses with multiple formats.
 */

const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const upload = require('../middlewares/fileUploadMiddleware');
const verifyRole = require('../middlewares/checkRoleMiddleware');
const logger = require('../config/logger');

// Route to add a course with multiple formats
router.post('/add', verifyRole(['admin', 'mentor']), upload.array('files'), async (req, res) => {
  const { title, description } = req.body;
  const files = req.files; // Array of uploaded files

  let filePaths = {};

  files.forEach(file => {
    const fileType = path.extname(file.originalname).toLowerCase();
    if (/mp3|wav/.test(fileType)) {
      filePaths.audio = file.path;
    } else if (/mp4|avi|mov/.test(fileType)) {
      filePaths.video = file.path;
    } else if (/txt|md|pdf|epub/.test(fileType)) {
      filePaths.text = file.path;
    } else {
      logger.warn(`Unsupported file format: ${file.originalname}`);
    }
  });

  const course = new Course({
    title,
    description,
    content: filePaths.text || '', // Default to text content if available
    audioURL: filePaths.audio || '',
    videoURL: filePaths.video || '',
  });

  try {
    const savedCourse = await course.save();
    logger.info(`Course added: ${savedCourse.title}`);
    res.status(201).json({ message: 'Course added successfully', course: savedCourse });
  } catch (err) {
    logger.error('Error adding course:', err);
    res.status(500).json({ error: 'Failed to add course. Please try again.' });
  }
});

module.exports = router;
