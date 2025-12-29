const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/userModel');

console.log("Starting script...");

// Hardcode local URI as fallback if env fails
const MONGO_URI_FALLBACK = 'mongodb://localhost:27017/civix';

// Load env vars
const envPath = path.join(__dirname, '..', '.env');
console.log(`Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

const connectDB = async () => {
    const uri = process.env.MONGO_URI || MONGO_URI_FALLBACK;
    console.log(`Connecting to DB at: ${uri}`);
    try {
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.log(`Connection Error: ${err.message}`);
        process.exit(1);
    }
};

const setModerator = async () => {
    console.log("Setting moderator...");
    await connectDB();

    const email = 'cricb468@gmail.com';
    console.log(`Looking for user: ${email}`);

    try {
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`User with email ${email} not found.`);

            // OPTIONAL: Create the user if missing (for testing)
            // await User.create({ email, password: 'password', role: 'moderator' });
            // console.log("Created temp user.");

            process.exit(1);
        }

        console.log(`Found user: ${user.name} (${user.role})`);
        user.role = 'moderator';
        await user.save();

        console.log(`SUCCESS: User ${user.email} is now a ${user.role}.`);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

setModerator();
