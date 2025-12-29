const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function checkRole() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nagarvikas';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const user = await User.findOne({ email: 'cricbalu2@gmail.com' });
        if (user) {
            console.log('User Found:', user.email);
            console.log('Role:', user.role);
            console.log('ClerkId:', user.clerkId);
        } else {
            console.log('User cricbalu2@gmail.com NOT FOUND');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

checkRole();
