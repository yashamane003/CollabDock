const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB, isMongoConnected } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');
const Message = require('./models/Message');
const { inMemoryMessages } = require('./utils/memoryStore');

dotenv.config();

// Attempt Database Connection
connectDB();

const app = express();

app.use(express.json());
app.use(cors());

// Health Check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'Real-Time Chat API is operational',
        mongoConnected: isMongoConnected(),
    });
});

// --- API ROUTES ---
app.use('/api/users', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);

// --- HTTP & SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow frontend connections
        methods: ["GET", "POST", "PUT", "DELETE"],
    },
});

// Online users map: socket.id -> { userId, userName }
const onlineUsers = new Map();

io.on('connection', (socket) => {
    // 1. User Online Setup
    socket.on('setup', (userData) => {
        if (userData && (userData._id || userData.id)) {
            const userId = (userData._id || userData.id).toString();
            socket.userId = userId;
            socket.userName = userData.name || 'Anonymous';
            onlineUsers.set(socket.id, { userId, name: socket.userName });
            
            // Broadcast active user IDs to all clients
            const uniqueOnlineUserIds = Array.from(new Set(Array.from(onlineUsers.values()).map(u => u.userId)));
            io.emit('online_users', uniqueOnlineUserIds);
        }
    });

    // 2. Room Join & Leave
    socket.on('join_room', (roomId) => {
        if (!roomId) return;
        socket.join(roomId);
    });

    socket.on('leave_room', (roomId) => {
        if (!roomId) return;
        socket.leave(roomId);
    });

    // 3. Typing Indicators
    socket.on('typing', ({ roomId, userName }) => {
        if (roomId) {
            socket.to(roomId).emit('user_typing', { roomId, userName });
        }
    });

    socket.on('stop_typing', ({ roomId, userName }) => {
        if (roomId) {
            socket.to(roomId).emit('user_stop_typing', { roomId, userName });
        }
    });

    // 4. Send Message Event
    socket.on('send_message', async (data) => {
        // data: { roomId, sender, senderName, content }
        if (!data || !data.content || !data.roomId) return;

        const timestamp = new Date().toISOString();
        let savedMessageId = 'msg_' + Date.now();

        if (isMongoConnected()) {
            try {
                const created = await Message.create({
                    roomId: data.roomId,
                    sender: data.sender,
                    senderName: data.senderName,
                    content: data.content,
                });
                savedMessageId = created._id;
            } catch (err) {
                console.error('[Message Error] MongoDB save error:', err.message);
            }
        } else {
            // Save in memory store
            inMemoryMessages.push({
                _id: savedMessageId,
                roomId: data.roomId,
                sender: data.sender,
                senderName: data.senderName,
                content: data.content,
                timestamp: timestamp
            });
        }

        const messagePayload = {
            _id: savedMessageId,
            roomId: data.roomId,
            sender: data.sender,
            senderName: data.senderName,
            content: data.content,
            timestamp: timestamp,
        };

        // Broadcast to all sockets in the room except sender
        socket.to(data.roomId).emit('receive_message', messagePayload);
    });

    // 5. Disconnect Cleanup
    socket.on('disconnect', () => {
        if (onlineUsers.has(socket.id)) {
            onlineUsers.delete(socket.id);
            const uniqueOnlineUserIds = Array.from(new Set(Array.from(onlineUsers.values()).map(u => u.userId)));
            io.emit('online_users', uniqueOnlineUserIds);
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`[Chat Server] Running at http://localhost:${PORT}`);
});
