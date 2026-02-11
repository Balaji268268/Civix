require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/userModel');

// Use environment variable - NEVER hardcode credentials
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!uri) {
    console.error('❌ ERROR: MONGO_URI not found in environment variables!');
    console.log('Please set MONGO_URI in backend/.env file');
    process.exit(1);
}

async function fixRole() {
    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB.");

        const email = "cricbalu2@gmail.com";
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`User ${email} not found.`);
            return;
        }

        console.log(`Current Role: ${user.role}`);

        // Always update to officer if not already
        if (user.role !== 'officer') {
            user.role = 'officer';
            await user.save();
            console.log(`SUCCESS: Updated ${email} to 'officer'.`);
        } else {
            console.log("User is already an officer.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
        process.exit();
    }
}

fixRole();
