import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Trophy, Star, Medal } from 'lucide-react';
import csrfManager from '../utils/csrfManager';

const GamificationStats = () => {
    const { getToken } = useAuth();
    const [stats, setStats] = useState({ xp: 0, level: 1, badges: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = await getToken();
                const res = await csrfManager.secureFetch('/api/gamification/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to load stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="animate-pulse h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>;

    // Calculate progress to next level (Simple 100 XP per level model)
    const xpForNextLevel = stats.level * 100;
    const currentLevelBaseXp = (stats.level - 1) * 100;
    const progress = ((stats.xp - currentLevelBaseXp) / 100) * 100;

    return (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-32 h-32" />
            </div>

            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h3 className="text-emerald-100 font-medium text-sm uppercase tracking-wide">Current Level</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black">{stats.level}</span>
                        <span className="text-emerald-100">Citizen</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1 justify-end text-emerald-100 text-sm mb-1">
                        <Star className="w-4 h-4 fill-current" />
                        <span>{stats.xp} XP</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
                <div className="flex justify-between text-xs text-emerald-100 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white/90 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, progress)}%` }}
                    ></div>
                </div>
            </div>

            {/* Badges Preview */}
            {stats.badges?.length > 0 && (
                <div className="mt-4 flex gap-2">
                    {stats.badges.map((badge, i) => (
                        <div key={i} className="p-1.5 bg-white/20 rounded-lg" title={badge.name || badge}>
                            <Medal className="w-4 h-4 text-white" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GamificationStats;
