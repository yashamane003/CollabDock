const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/collaborative_platform';
    try {
        mongoose.set('strictQuery', false);
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 2500,
        });
        isConnected = true;
        console.log(`[MongoDB] Connected Successfully: ${conn.connection.host}`);

        // Clean up legacy indexes if they exist to prevent duplicate key errors on null fields
        try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            const hasUsers = collections.some(c => c.name === 'users');
            if (hasUsers) {
                const indexes = await mongoose.connection.db.collection('users').indexes();
                const staleUsernameIndex = indexes.find(i => i.name === 'username_1');
                if (staleUsernameIndex) {
                    await mongoose.connection.db.collection('users').dropIndex('username_1');
                    console.log('[MongoDB] Dropped legacy username_1 index');
                }
            }
        } catch (idxErr) {
            // Non-critical index cleanup ignore
        }
    } catch (error) {
        isConnected = false;
        console.warn(`[MongoDB Warning] Could not connect to MongoDB (${error.message}).`);
        console.warn(`[MongoDB Warning] The server will keep running with in-memory persistence fallback for real-time messaging.`);
    }
};

const isMongoConnected = () => isConnected;

module.exports = { connectDB, isMongoConnected };
