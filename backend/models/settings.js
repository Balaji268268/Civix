const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    newRegistrations: {
        type: Boolean,
        default: true
    },
    emailAlerts: {
        type: Boolean,
        default: true
    },
    pushNotifications: {
        type: Boolean,
        default: false
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create a singleton-like behavior where we only ever have one settings document
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
