const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMongoConnected } = require('../config/db');
const { inMemoryUsers } = require('../utils/memoryStore');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const secret = process.env.JWT_SECRET || 'supersecretjwtkey12345';
            const decoded = jwt.verify(token, secret);

            if (isMongoConnected()) {
                req.user = await User.findById(decoded.id).select('-password');
            } else {
                const found = inMemoryUsers.find(u => u._id.toString() === decoded.id.toString());
                if (found) {
                    req.user = { _id: found._id, name: found.name, email: found.email };
                }
            }

            if (!req.user) {
                return res.status(401).json({ message: 'User not found or session expired' });
            }

            return next();
        } catch (error) {
            console.error('Auth error:', error.message);
            return res.status(401).json({ message: 'Not authorized, invalid token' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };
