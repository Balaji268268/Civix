import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sun, Moon, Shield, Save, User,
    Bell, Smartphone, Power, ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from "@clerk/clerk-react";

const OfficerSettings = () => {
    const navigate = useNavigate();
    const { userId } = useAuth();

    // --- State Management ---
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [loading, setLoading] = useState(false);

    const [settings, setSettings] = useState({
        isOnDuty: true,
        notifications: true,
        autoAccept: false
    });

    const [profile, setProfile] = useState({
        name: "Officer John Doe",
        badgeId: "OFF-2024-001",
        department: "Public Works"
    });

    // --- Effects ---
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // --- Handlers ---
    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleSave = () => {
        setLoading(true);
        // Simulate API Call
        setTimeout(() => {
            setLoading(false);
            toast.success("Officer preferences saved!");
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 font-sans">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-500 hover:text-emerald-600 transition"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Officer Settings</h1>
                </div>

                {/* 1. Status & Availability */}
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Power className="w-5 h-5 text-blue-500" />
                        Duty Status
                    </h3>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">Active Duty Status</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Toggle your availability for new assignments.</p>
                        </div>

                        <button
                            onClick={() => handleToggle('isOnDuty')}
                            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${settings.isOnDuty ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                            <div className={`w-3 h-3 rounded-full ${settings.isOnDuty ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                            {settings.isOnDuty ? "ON DUTY" : "OFF DUTY"}
                        </button>
                    </div>
                </section>

                {/* 2. Appearance */}
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                        {theme === 'light' ? <Sun className="w-5 h-5 text-orange-500" /> : <Moon className="w-5 h-5 text-purple-500" />}
                        Appearance
                    </h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Interface Theme</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred visual style.</p>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${theme === 'dark' ? 'bg-emerald-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm ${theme === 'dark' ? 'translate-x-9' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </section>

                {/* 3. Helper Configuration */}
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        System Preferences
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Urgent Alerts</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive high-priority assignment alerts.</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.notifications}
                                onChange={() => handleToggle('notifications')}
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                            />
                        </div>
                    </div>
                </section>

                {/* 4. Profile Information (ReadOnly) */}
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 opacity-80">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                        <User className="w-5 h-5 text-indigo-500" />
                        Officer Profile (Read Only)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Badge ID</p>
                            <p className="font-mono text-gray-900 dark:text-gray-200">{profile.badgeId}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Department</p>
                            <p className="font-medium text-gray-900 dark:text-gray-200">{profile.department}</p>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-700 transition transform hover:scale-105"
                    >
                        <Save className="w-5 h-5" />
                        {loading ? "Saving..." : "Save Preferences"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default OfficerSettings;
