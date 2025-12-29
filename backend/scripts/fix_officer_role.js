const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function fixOfficerRole() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nagarvikas';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const result = await User.updateOne(
            { email: 'cricbalu2@gmail.com' },
            { $set: { role: 'officer', department: 'Roads' } } // Force role, assign dept
        );

        console.log('Update Result:', result);

        const updatedUser = await User.findOne({ email: 'cricbalu2@gmail.com' });
        console.log('Updated User Role:', updatedUser?.role);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

fixOfficerRole();
