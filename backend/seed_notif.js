const mongoose = require('mongoose');
const Notification = require('./models/notification');
require('dotenv').config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        await Notification.create({
            recipient: 'admin',
            title: 'System Test Notification',
            message: 'If you see this, the notification system is WORKING.',
            type: 'success',
            createdAt: new Date()
        });

        console.log("Test Notification Created");
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

seed();
