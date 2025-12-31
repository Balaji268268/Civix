import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, MapPin, ArrowRight, Loader2 } from 'lucide-react';
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
            // Sort by Priority (High first) then Recency
            const sorted = data.sort((a, b) => {
                if (a.priority === 'High' && b.priority !== 'High') return -1;
                if (b.priority === 'High' && a.priority !== 'High') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            // Take top 5
            setIssues(sorted.slice(0, 5));
        } catch (err) {
            console.error("Failed to load trending issues", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                    <TrendingUp className="text-pink-500" />
                    Community Pulse
                </h3>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Updates</span>
            </div>

            <div className="space-y-4">
                {issues.map((issue, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={issue._id}
                        className="group relative bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer overflow-hidden"
                        onClick={() => navigate(`/issue/${issue._id}`)}
                    >
                        {/* Priority Indicator Line */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${issue.priority === 'High' ? 'bg-red-500' : 'bg-emerald-400'}`}></div>

                        <div className="flex justify-between items-start mb-2 pl-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${issue.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                                }`}>
                                {issue.priority} Priority
                            </span>
                            <span className="text-[10px] text-gray-400">{new Date(issue.createdAt).toLocaleDateString()}</span>
                        </div>

                        <h4 className="font-bold text-gray-800 dark:text-gray-100 pl-2 mb-1 group-hover:text-indigo-600 transition line-clamp-1">
                            {issue.title}
                        </h4>

                        <div className="flex items-center gap-4 text-xs text-gray-500 pl-2 mt-2">
                            <span className="flex items-center gap-1">
                                <MapPin size={12} /> {issue.location || 'Unknown Location'}
                            </span>
                            <span className="flex items-center gap-1 text-indigo-500 font-medium group-hover:underline">
                                Read More <ArrowRight size={12} />
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {issues.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                    No active issues trending right now.
                </div>
            )}
        </div>
    );
};

export default TrendingFeed;
