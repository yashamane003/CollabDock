const express = require('express');
const router = express.Router();
const { registerUser, authUser, getAllUsers, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validateAuthInput, sanitizeNoSql } = require('../middleware/security');

// Rate limited authentication routes (Strict 5 attempts per 5 minutes per IP)
router.post('/', authRateLimiter, sanitizeNoSql, validateAuthInput, registerUser);
router.post('/login', authRateLimiter, sanitizeNoSql, validateAuthInput, authUser);

// Protected authenticated routes
router.get('/', protect, sanitizeNoSql, getAllUsers);
router.get('/me', protect, getMe);

module.exports = router;
