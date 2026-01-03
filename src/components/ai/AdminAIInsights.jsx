import React, { useState } from 'react';
import { RefreshCw, Zap, Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminAIInsights = () => {
    const [insight, setInsight] = useState("Water supply resolution time has improved by 15% this week.");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const insightsPool = [
        "Traffic reports in Downtown have decreased by 20% since the last signal update.",
        "78% of users are happy with the new 'Report Pothole' feature.",
        "Sanitation department efficiency is up by 12% this month.",
        "Most reported issue today: Street Light malfunction in Sector 4.",
        "User engagement on community polls has doubled!",
        "Tip: Assign more pending road issues to Officer Sharma, he's free.",
        "AI Prediction: High likelihood of waterlogging in Zone B tomorrow.",
        "Data Trend: Weekend complaints are down by 5%. Great job!",
    ];

    const generateInsight = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setInsight(insightsPool[Math.floor(Math.random() * insightsPool.length)]);
            setIsRefreshing(false);
        }, 1500);
    };

    return (
        // Replaced gradient bg with standard card bg to match dashboard
        <div className="relative w-full overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 group">

            <div className="relative flex items-center gap-6 p-6 h-full z-10">

                {/* Subtle nice gradients for 'Pro' feel without changing base color too much */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                {/* Robot Section */}
                <div className="relative z-10 flex-shrink-0">
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="relative w-28 h-28 flex items-center justify-center"
                    >
                        {/* 
                 Robot Container matches background so white image blends in. 
                 In dark mode, we add a white glowing backdrop so the robot (if it has white bg) 
                 looks like it's in a spotlight (intentional), or use multiply if possible.
             */}
                        <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-full blur-xl opacity-80"></div>

                        {/* Glow */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-200 to-blue-200 rounded-full blur-2xl opacity-40 animate-pulse dark:opacity-20"></div>

                        <img
                            src="/assets/cute_friendly_robot.png"
                            alt="Civix AI"
                            className="w-full h-full object-contain relative z-10"
                            style={{ mixBlendMode: 'multiply' }} // Blends perfectly on white!
                        />
                    </motion.div>

                    {/* Status Badge */}
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900/90 backdrop-blur rounded-full px-2.5 py-1 shadow-sm border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-1.5 z-20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">AI Live</span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 relative z-10 pl-2">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    Civix Intelligence
                                </h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                                    AI-POWERED INSIGHTS
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={generateInsight}
                            disabled={isRefreshing}
                            className="group/btn p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                            title="Generate New Insight"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-all ${isRefreshing ? 'animate-spin text-emerald-600' : 'group-hover/btn:rotate-180 group-hover/btn:text-gray-600 dark:group-hover/btn:text-gray-300'}`} />
                        </button>
                    </div>

                    <div className="relative min-h-[64px] bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 flex items-center">
                        {/* Quote Icon Background */}
                        <div className="absolute top-2 left-2 text-4xl text-emerald-500/10 font-serif leading-none">“</div>

                        <AnimatePresence mode='wait'>
                            {isRefreshing ? (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="w-full flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm"
                                >
                                    <Zap className="w-4 h-4 animate-bounce" /> Processing...
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="content"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full"
                                >
                                    <p className="text-gray-700 dark:text-gray-300 font-medium text-sm leading-relaxed pl-2 relative z-10">
                                        {insight}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAIInsights;
