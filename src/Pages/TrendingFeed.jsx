import React, { useState, useEffect } from 'react';
import { TrendingUp, MapPin, ArrowRight, Loader2, Zap, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import csrfManager from '../utils/csrfManager';

const TrendingFeed = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTrendingIssues();
    }, []);

    const fetchTrendingIssues = async () => {
        try {
            const res = await csrfManager.secureFetch('/api/issues');
            const data = await res.json();

            // Sort by Recency (Latest created or Latest Resolved) - prioritizing UpdatedAt to show activity
            const sorted = data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            setIssues(sorted.slice(0, 15)); // Take top 15
        } catch (err) {
            console.error("Failed to load live issues", err);
        } finally {
            setLoading(false);
        }
    };

    const getTimeToResolve = (created, resolved) => {
        if (!resolved) return "";
        const diff = new Date(resolved) - new Date(created);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return "Resolved in <1 hr";
        if (hours < 24) return `Resolved in ${hours} hrs`;
        return `Resolved in ${Math.floor(hours / 24)} days`;
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-500" /></div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-0 border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden h-full flex flex-col relative w-full h-[500px]">
            {/* Live Header */}
            <div className="bg-red-600 p-4 flex items-center justify-between text-white shadow-md z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <h3 className="text-lg font-black uppercase tracking-wider">Live Updates</h3>
                </div>
                <div className="text-xs font-mono bg-red-700 px-2 py-1 rounded">
                    {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Scrolling Ticker Area */}
            <div className="flex-1 relative overflow-hidden bg-gray-50 dark:bg-gray-900/50">
                {issues.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        No active alerts.
                    </div>
                ) : (
                    /* Marquee Animation */
                    <div className="absolute w-full">
                        <motion.div
                            animate={{ y: [0, -100 * issues.length] }}
                            transition={{
                                repeat: Infinity,
                                duration: Math.max(issues.length * 5, 10),
                                ease: "linear",
                                repeatType: "loop"
                            }}
                            className="space-y-0"
                        >
                            {[...issues, ...issues].map((issue, index) => (
                                <div
                                    key={`${issue._id}-${index}`}
                                    onClick={() => navigate(`/issues/${issue._id}`)}
                                    className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-colors group relative"
                                >
                                    {/* Priority / Status Badge */}
                                    <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
                                        {issue.status === 'Resolved' ? (
                                            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Solved
                                            </span>
                                        ) : issue.priority === 'High' && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase animate-pulse">
                                                <Zap className="w-3 h-3" /> Urgent
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-mono text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                            {new Date(issue.updatedAt || issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                                            {issue.category || 'General'}
                                        </span>
                                    </div>

                                    <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {issue.title}
                                    </h4>

                                    {/* Resolution Insight */}
                                    {issue.status === 'Resolved' && (
                                        <div className="mb-2 text-xs text-green-700 font-medium bg-green-50 px-2 py-1 rounded border border-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                                            🚀 {getTimeToResolve(issue.createdAt, issue.updatedAt)}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <MapPin className="w-3 h-3" />
                                            <span className="truncate max-w-[150px]">{issue.location || "Bangalore"}</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Footer / Gradient Cover for visual polish */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none z-10" />
        </div>
    );
};

export default TrendingFeed;
