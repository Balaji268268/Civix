const mongoose = require('mongoose');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const seedOfficers = async () => {
    try {
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nagarvikas";
        console.log("Connecting to DB at:", uri);
        await mongoose.connect(uri);
        console.log("DB Connected");

        // 1. Promote cricbalu2@gmail.com
        const specificUser = await User.findOne({ email: 'cricbalu2@gmail.com' });
        if (specificUser) {
            specificUser.role = 'officer';
            if (!specificUser.department) specificUser.department = 'Roads'; // Default if none
            await specificUser.save();
            console.log("Promoted cricbalu2@gmail.com to Officer");
        } else {
            console.log("User cricbalu2@gmail.com not found. Creating...");
            const hashedPassword = await bcrypt.hash('password123', 10);
            await User.create({
                name: 'Cricbalu Officer',
                email: 'cricbalu2@gmail.com',
                password: hashedPassword,
                role: 'officer',
                department: 'Roads',
                location: 'City Center'
            });
            console.log("Created cricbalu2@gmail.com as Officer");
        }

        // 2. Seed 5 Officers per Dept
        const departments = ['Roads', 'Sanitation', 'Electricity', 'Water', 'General'];

        for (const dept of departments) {
            const count = await User.countDocuments({ role: 'officer', department: dept });
            console.log(`${dept}: Found ${count} officers.`);

            if (count < 5) {
                const toCreate = 5 - count;
                console.log(`Creating ${toCreate} officers for ${dept}...`);

                const officers = [];
                for (let i = 0; i < toCreate; i++) {
                    const hashedPassword = await bcrypt.hash('password123', 10);
                    officers.push({
                        name: `${dept} Officer ${count + i + 1}`,
                        email: `officer.${dept.toLowerCase()}.${Date.now() + i}@civix.com`,
                        password: hashedPassword,
                        role: 'officer',
                        department: dept,
                        activeTasks: Math.floor(Math.random() * 5),
                        trustScore: 100
                    });
                }
                await User.insertMany(officers);
                console.log(`Added ${toCreate} officers to ${dept}`);
            }
        }
        console.log("Seeding Complete");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedOfficers();
