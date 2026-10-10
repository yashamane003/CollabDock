const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { isMongoConnected } = require('../config/db');
const { inMemoryUsers } = require('../utils/memoryStore');

const getDisplayName = (user) => {
    if (!user) return 'User';
    return user.name || user.username || (user.email ? user.email.split('@')[0] : 'User');
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const displayName = name ? name.trim() : normalizedEmail.split('@')[0];

        if (isMongoConnected()) {
            const userExists = await User.findOne({ email: normalizedEmail });
            if (userExists) {
                return res.status(400).json({ message: 'User already exists' });
            }

            const user = await User.create({
                name: displayName,
                username: displayName.toLowerCase().replace(/\s+/g, '_'),
                email: normalizedEmail,
                password,
            });

            return res.status(201).json({
                _id: user._id,
                name: getDisplayName(user),
                email: user.email,
                token: generateToken(user._id),
            });
        }

        // Fallback in-memory
        const exists = inMemoryUsers.some(u => u.email.toLowerCase() === normalizedEmail);
        if (exists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = {
            _id: 'user_' + Date.now(),
            name: displayName,
            email: normalizedEmail,
            password: hashedPassword
        };
        inMemoryUsers.push(newUser);

        return res.status(201).json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            token: generateToken(newUser._id),
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (isMongoConnected()) {
            const user = await User.findOne({ email: normalizedEmail });
            if (user && (await user.matchPassword(password))) {
                return res.json({
                    _id: user._id,
                    name: getDisplayName(user),
                    email: user.email,
                    token: generateToken(user._id),
                });
            }
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Fallback in-memory
        const user = inMemoryUsers.find(u => u.email.toLowerCase() === normalizedEmail);
        if (user && (await bcrypt.compare(password, user.password))) {
            return res.json({
                _id: user._id,
                name: getDisplayName(user),
                email: user.email,
                token: generateToken(user._id),
            });
        }

        return res.status(401).json({ message: 'Invalid email or password' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users except current user
// @route   GET /api/users
// @access  Private
const getAllUsers = async (req, res) => {
    try {
        const search = req.query.search ? req.query.search.toLowerCase().trim() : '';

        if (isMongoConnected()) {
            const keyword = search
                ? {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { username: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                    ],
                }
                : {};

            const users = await User.find(keyword)
                .find({ _id: { $ne: req.user._id } })
                .select('-password');

            const formatted = users.map(u => ({
                _id: u._id,
                name: getDisplayName(u),
                email: u.email,
            }));

            return res.json(formatted);
        }

        // Fallback in-memory
        const currentUserId = req.user._id.toString();
        const users = inMemoryUsers
            .filter(u => u._id.toString() !== currentUserId)
            .filter(u => {
                if (!search) return true;
                const dName = getDisplayName(u).toLowerCase();
                const dEmail = (u.email || '').toLowerCase();
                return dName.includes(search) || dEmail.includes(search);
            })
            .map(u => ({ _id: u._id, name: getDisplayName(u), email: u.email }));

        return res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
    res.json({
        _id: req.user._id,
        name: getDisplayName(req.user),
        email: req.user.email,
    });
};

module.exports = { registerUser, authUser, getAllUsers, getMe };
