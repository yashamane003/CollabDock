const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Group = require('../models/Group');
const { protect } = require('../middleware/authMiddleware');
const { isMongoConnected } = require('../config/db');
const { inMemoryMessages, inMemoryGroups } = require('../utils/memoryStore');

// @desc    Get all messages for a room
// @route   GET /api/messages/:roomId
// @access  Private
router.get('/:roomId', protect, async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user._id.toString();

        // 1. Access Control Logic
        if (roomId === 'general' || roomId === 'random' || roomId === 'announcements' || roomId === 'tech-talk') {
            // Public room - Allow all authenticated users
        } else if (roomId.includes('_')) {
            // Direct Message: Ensure user is one of the participants
            const participants = roomId.split('_');
            if (!participants.includes(userId)) {
                return res.status(403).json({ message: 'Not authorized to view this private chat' });
            }
        } else {
            // Group Chat: Check membership
            if (isMongoConnected() && mongoose.Types.ObjectId.isValid(roomId)) {
                const group = await Group.findById(roomId);
                if (group) {
                    const isMember = group.members.some(id => id.toString() === userId);
                    const isHost = group.host.toString() === userId;

                    if (!isMember && !isHost) {
                        return res.status(403).json({ message: 'Not authorized to access this group' });
                    }
                }
            } else {
                const group = inMemoryGroups.find(g => g._id.toString() === roomId.toString());
                if (group) {
                    const isMember = group.members.some(m => (m._id || m).toString() === userId);
                    const isHost = (group.host._id || group.host).toString() === userId;
                    if (!isMember && !isHost) {
                        return res.status(403).json({ message: 'Not authorized to access this group' });
                    }
                }
            }
        }

        // 2. Fetch Messages
        if (isMongoConnected()) {
            const populatedMessages = await Message.find({ roomId })
                .populate('sender', 'name email')
                .sort({ createdAt: 1 })
                .limit(100);

            const formattedMessages = populatedMessages.map(msg => ({
                _id: msg._id,
                roomId: msg.roomId,
                sender: msg.sender ? msg.sender._id : 'unknown',
                senderName: msg.sender ? msg.sender.name : (msg.senderName || 'Anonymous'),
                content: msg.content,
                timestamp: msg.createdAt
            }));

            return res.json(formattedMessages);
        }

        // Fallback in-memory messages
        const roomMessages = inMemoryMessages
            .filter(m => m.roomId === roomId)
            .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));

        return res.json(roomMessages);
    } catch (error) {
        console.error('Fetch messages error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
