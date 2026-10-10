const Group = require('../models/Group');
const { isMongoConnected } = require('../config/db');
const { inMemoryGroups, inMemoryUsers } = require('../utils/memoryStore');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Group name is required' });
        }

        if (isMongoConnected()) {
            const group = await Group.create({
                name: name.trim(),
                description: description || '',
                host: req.user._id,
                members: [req.user._id],
            });

            const fullGroup = await Group.findOne({ _id: group._id })
                .populate('members', '-password')
                .populate('host', '-password');

            return res.status(201).json(fullGroup);
        }

        // Fallback in-memory
        const currentUserId = req.user._id.toString();
        const hostUser = { _id: req.user._id, name: req.user.name, email: req.user.email };
        const newGroup = {
            _id: 'grp_' + Date.now(),
            name: name.trim(),
            description: description || '',
            host: hostUser,
            members: [hostUser],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        inMemoryGroups.unshift(newGroup);

        return res.status(201).json(newGroup);
    } catch (error) {
        console.error('Create group error:', error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
    try {
        if (isMongoConnected()) {
            const groups = await Group.find({ members: { $elemMatch: { $eq: req.user._id } } })
                .populate('members', '-password')
                .populate('host', '-password')
                .sort({ updatedAt: -1 });

            return res.json(groups);
        }

        // Fallback in-memory
        const currentUserId = req.user._id.toString();
        const userGroups = inMemoryGroups.filter(g =>
            g.members.some(m => (m._id || m).toString() === currentUserId) ||
            (g.host._id || g.host).toString() === currentUserId
        );

        return res.json(userGroups);
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Add member to group
// @route   PUT /api/groups/:groupId/add
// @access  Private (Host only)
const addMember = async (req, res) => {
    try {
        const { userId } = req.body;
        const { groupId } = req.params;

        if (isMongoConnected()) {
            const group = await Group.findById(groupId);

            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            if (group.host.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Only the host can add members' });
            }

            if (group.members.some(m => m.toString() === userId.toString())) {
                return res.status(400).json({ message: 'User is already a member of this group' });
            }

            group.members.push(userId);
            await group.save();

            const updatedGroup = await Group.findById(groupId)
                .populate('members', '-password')
                .populate('host', '-password');

            return res.json(updatedGroup);
        }

        // Fallback in-memory
        const group = inMemoryGroups.find(g => g._id.toString() === groupId.toString());
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const hostId = (group.host._id || group.host).toString();
        if (hostId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the host can add members' });
        }

        const targetUser = inMemoryUsers.find(u => u._id.toString() === userId.toString());
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (group.members.some(m => (m._id || m).toString() === userId.toString())) {
            return res.status(400).json({ message: 'User is already in group' });
        }

        group.members.push({ _id: targetUser._id, name: targetUser.name, email: targetUser.email });
        group.updatedAt = new Date().toISOString();

        return res.json(group);
    } catch (error) {
        console.error('Add member error:', error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = { createGroup, getGroups, addMember };
