const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { connectDB, isMongoConnected } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');
const Message = require('./models/Message');
const Group = require('./models/Group');
const { inMemoryMessages, inMemoryGroups } = require('./utils/memoryStore');
const { sanitizeNoSql, escapeHtml } = require('./middleware/security');
const { apiRateLimiter } = require('./middleware/rateLimiter');

dotenv.config();

// Attempt Database Connection
connectDB();

const app = express();

// --- CYBER SECURITY HEADERS & DEFENSES ---
// 1. Hide Express signature to prevent fingerprinting
app.disable('x-powered-by');

// 2. HTTP Security Headers with Helmet
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow frontend cross-origin socket & assets
        contentSecurityPolicy: false, // Managed on frontend/reverse proxy
    })
);

// 3. Prevent Buffer Overflow & Payload Denial-of-Service attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. Strict CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, postman) or matching whitelist
            if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
                return callback(null, true);
            }
            return callback(new Error('Blocked by CORS security policy'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// 5. Global NoSQL Injection Sanitizer
app.use(sanitizeNoSql);

// 6. General API Rate Limiting (Protects endpoints against DoS scraping)
app.use('/api', apiRateLimiter);

// Health Check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'PulseChat Secure Real-Time API is operational',
        mongoConnected: isMongoConnected(),
        security: {
            rateLimiting: 'active (5 req/5 min on auth)',
            noSqlSanitization: 'active',
            payloadLimit: '10kb',
        },
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
        origin: '*', // Socket.IO CORS
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    maxHttpBufferSize: 1e5, // 100 KB max socket frame size (prevents socket DoS)
});

// Online users map: socket.id -> { userId, userName }
const onlineUsers = new Map();

// Socket Rate Limiting Map: socket.id -> { count, lastReset }
const socketMessageCounts = new Map();

io.on('connection', (socket) => {
    // 1. User Online Setup
    socket.on('setup', (userData) => {
        if (userData && (userData._id || userData.id)) {
            const userId = (userData._id || userData.id).toString();
            socket.userId = userId;
            socket.userName = userData.name || userData.username || 'Anonymous';
            onlineUsers.set(socket.id, { userId, name: socket.userName });

            // Automatically join personal notification room
            socket.join(`user_${userId}`);

            // Automatically join community channels so notifications propagate
            socket.join('general');
            socket.join('random');
            socket.join('announcements');
            socket.join('tech-talk');

            // Broadcast active user IDs to all clients
            const uniqueOnlineUserIds = Array.from(new Set(Array.from(onlineUsers.values()).map((u) => u.userId)));
            io.emit('online_users', uniqueOnlineUserIds);
        }
    });

    // 2. Room Join & Leave
    socket.on('join_room', (roomId) => {
        if (!roomId || typeof roomId !== 'string') return;
        socket.join(roomId);
    });

    socket.on('leave_room', (roomId) => {
        if (!roomId || typeof roomId !== 'string') return;
        socket.leave(roomId);
    });

    // 3. Typing Indicators
    socket.on('typing', ({ roomId, userName }) => {
        if (roomId && typeof roomId === 'string') {
            socket.to(roomId).emit('user_typing', { roomId, userName: escapeHtml(userName) });
        }
    });

    socket.on('stop_typing', ({ roomId, userName }) => {
        if (roomId && typeof roomId === 'string') {
            socket.to(roomId).emit('user_stop_typing', { roomId, userName: escapeHtml(userName) });
        }
    });

    // 4. Send Message Event with Anti-Spam & XSS Sanitization
    socket.on('send_message', async (data) => {
        // Defensive validation
        if (!data || typeof data !== 'object') return;
        if (!data.content || typeof data.content !== 'string' || !data.roomId || typeof data.roomId !== 'string') return;

        // Message Size Protection: Max 3,000 characters
        if (data.content.length > 3000) {
            socket.emit('error_message', { message: 'Message exceeds maximum length of 3000 characters.' });
            return;
        }

        // Socket Rate Limiting: Max 5 messages per 2 seconds
        const now = Date.now();
        const tracker = socketMessageCounts.get(socket.id) || { count: 0, lastReset: now };

        if (now - tracker.lastReset > 2000) {
            tracker.count = 1;
            tracker.lastReset = now;
        } else {
            tracker.count += 1;
        }
        socketMessageCounts.set(socket.id, tracker);

        if (tracker.count > 5) {
            socket.emit('error_message', { message: 'You are sending messages too quickly. Please slow down.' });
            return;
        }

        // XSS Sanitization
        const sanitizedContent = escapeHtml(data.content.trim());
        const senderName = escapeHtml(data.senderName || 'Anonymous');
        const timestamp = new Date().toISOString();
        let savedMessageId = 'msg_' + Date.now();

        if (isMongoConnected()) {
            try {
                const created = await Message.create({
                    roomId: data.roomId,
                    sender: data.sender,
                    senderName: senderName,
                    content: sanitizedContent,
                });
                savedMessageId = created._id;
            } catch (err) {
                console.error('[Message Error] MongoDB save error:', err.message);
            }
        } else {
            // Save in memory store fallback
            inMemoryMessages.push({
                _id: savedMessageId,
                roomId: data.roomId,
                sender: data.sender,
                senderName: senderName,
                content: sanitizedContent,
                timestamp: timestamp,
            });
        }

        const messagePayload = {
            _id: savedMessageId,
            roomId: data.roomId,
            sender: data.sender,
            senderName: senderName,
            content: sanitizedContent,
            timestamp: timestamp,
        };

        // Broadcast to all sockets in the target room and member notification rooms
        const targetRooms = new Set([data.roomId]);

        // Direct Messages: ensure recipient personal room receives the notification
        if (data.roomId.includes('_')) {
            const participants = data.roomId.split('_');
            const senderIdStr = (data.sender || '').toString();
            participants.forEach((recipientId) => {
                if (recipientId && recipientId !== senderIdStr) {
                    targetRooms.add(`user_${recipientId}`);
                }
            });
        } else if (!['general', 'random', 'announcements', 'tech-talk'].includes(data.roomId)) {
            // Group chat: also notify members via their personal rooms
            try {
                let memberIds = [];
                if (isMongoConnected()) {
                    const group = await Group.findById(data.roomId).select('members').lean();
                    if (group && Array.isArray(group.members)) {
                        memberIds = group.members.map((m) => m.toString());
                    }
                } else {
                    const group = inMemoryGroups.find((g) => g._id.toString() === data.roomId.toString());
                    if (group && Array.isArray(group.members)) {
                        memberIds = group.members.map((m) => (m._id || m).toString());
                    }
                }
                const senderIdStr = (data.sender || '').toString();
                memberIds.forEach((mId) => {
                    if (mId && mId !== senderIdStr) {
                        targetRooms.add(`user_${mId}`);
                    }
                });
            } catch (err) {
                // Ignore group lookup error
            }
        }

        let emitter = socket;
        targetRooms.forEach((r) => {
            emitter = emitter.to(r);
        });
        emitter.emit('receive_message', messagePayload);
    });

    // 5. Disconnect Cleanup
    socket.on('disconnect', () => {
        socketMessageCounts.delete(socket.id);
        if (onlineUsers.has(socket.id)) {
            onlineUsers.delete(socket.id);
            const uniqueOnlineUserIds = Array.from(new Set(Array.from(onlineUsers.values()).map((u) => u.userId)));
            io.emit('online_users', uniqueOnlineUserIds);
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`[PulseChat Secure Server] Running at http://localhost:${PORT}`);
});
