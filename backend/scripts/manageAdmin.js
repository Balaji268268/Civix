const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/userModel');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const manageAdmin = async () => {
    await connectDB();

    const email = process.argv[2];

    if (!email) {
        console.log('\n--- Registered Users ---');
        const users = await User.find({});
        if (users.length === 0) {
            console.log("No users found in database.");
        }
        users.forEach(user => {
            console.log(`- ${user.email} [${user.role}]`);
        });
        console.log('\nUsage: node scripts/manageAdmin.js <email_to_promote>');
        console.log('------------------------\n');
        process.exit(0);
    }

    const user = await User.findOne({ email });

    if (!user) {
        console.log(`User with email "${email}" not found.`);
        process.exit(1);
    }

    user.role = 'admin';
    await user.save();
    console.log(`\nSUCCESS: User ${user.email} is now an ADMIN.`);
    process.exit(0);
};

manageAdmin();
