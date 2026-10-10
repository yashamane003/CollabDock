const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        senderName: {
            type: String,
            default: 'Anonymous',
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        roomId: {
            type: String,
            required: true,
            default: 'general',
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
