const mongoose = require('mongoose');
const User = require('../models/userModel');

// Hardcoded URI for reliability
const uri = "mongodb+srv://Balaji_268:Balaji%402005@cluster0.xspucdi.mongodb.net/?appName=Cluster0";

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
