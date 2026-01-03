import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sun, Moon, Shield, Save,
    Bell, FileText, ArrowLeft, Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ModeratorSettings = () => {
    const navigate = useNavigate();

    // --- State Management ---
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [loading, setLoading] = useState(false);

    const [settings, setSettings] = useState({
        emailDigest: true,
        realTimeAlerts: true,
        autoFilterSpam: true,
        showResolved: false
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
            toast.success("Moderation settings updated.");
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moderator Settings</h1>
                </div>

                {/* 1. Review Preferences */}
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Filter className="w-5 h-5 text-blue-500" />
                        Review Queue
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition">
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-emerald-500" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Auto-Filter Spam</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Use AI to auto-hide high confidence spam reports.</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.autoFilterSpam}
                                onChange={() => handleToggle('autoFilterSpam')}
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-purple-500" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Show Resolved History</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Include resolved items in main feed.</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.showResolved}
                                onChange={() => handleToggle('showResolved')}
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                            />
                        </div>
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

                {/* 3. Notifications */}
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Bell className="w-5 h-5 text-yellow-500" />
                        Notifications
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Real-time Analysis Alerts</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when AI flags potential issues.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.realTimeAlerts}
                                onChange={() => handleToggle('realTimeAlerts')}
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                            />
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

export default ModeratorSettings;
