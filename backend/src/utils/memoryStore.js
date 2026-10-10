// In-memory fallback store when MongoDB is not running locally
const bcrypt = require('bcryptjs');

const inMemoryUsers = [
    {
        _id: '64f000000000000000000001',
        name: 'Alice Johnson',
        email: 'alice@test.com',
        password: '$2a$10$wN0o5YF4N9v0V5jFqJ1bDeX9G.bY6m7bZ8xI6W7Z4dK2eQ9X5xG.a' // 'password123'
    },
    {
        _id: '64f000000000000000000002',
        name: 'Bob Smith',
        email: 'bob@test.com',
        password: '$2a$10$wN0o5YF4N9v0V5jFqJ1bDeX9G.bY6m7bZ8xI6W7Z4dK2eQ9X5xG.a' // 'password123'
    }
];

const inMemoryGroups = [];
const inMemoryMessages = [
    {
        _id: 'msg_sample_1',
        roomId: 'general',
        sender: '64f000000000000000000001',
        senderName: 'Alice Johnson',
        content: 'Welcome to Pulse Real-Time Chat! 🚀',
        timestamp: new Date().toISOString()
    }
];

// Seed hashed password for demo users
bcrypt.hash('password123', 10).then(hash => {
    inMemoryUsers[0].password = hash;
    inMemoryUsers[1].password = hash;
});

module.exports = {
    inMemoryUsers,
    inMemoryGroups,
    inMemoryMessages,
};
