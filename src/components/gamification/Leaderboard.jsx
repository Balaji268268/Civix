import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Trophy, Medal, Crown, Star } from 'lucide-react';
import csrfManager from '../../utils/csrfManager';

const Leaderboard = () => {
    // Correct variable naming: 'leaderboard' matches the usage in the render method
    const { getToken, isSignedIn } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!isSignedIn) {
                setLoading(false);
                return;
            }

            try {
                // Get Token securely
                const token = await getToken();
                if (!token) {
                    // console.log("No token for leaderboard fetch");
                    setLoading(false);
                    return;
                }

                const response = await csrfManager.secureFetch('/api/gamification/leaderboard', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setLeaderboard(data);
                } else {
                    console.warn(`Leaderboard fetch failed: ${response.status}`);
                }
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [isSignedIn, getToken]);

    const getRankIcon = (index) => {
        switch (index) {
            case 0: return <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500 animate-bounce" />;
            case 1: return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
            case 2: return <Medal className="w-6 h-6 text-amber-700 fill-amber-700" />;
            default: return <span className="font-bold text-gray-500 w-6 text-center">{index + 1}</span>;
        }
    };

    if (loading) return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-white/20 h-full min-h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
    );

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-700 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg shadow-orange-200 dark:shadow-none text-white">
                    <Trophy className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Civic Heroes</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Top contributors this month</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {leaderboard.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No heroes yet. Be the first!</div>
                ) : (
                    leaderboard.map((user, index) => (
                        <div
                            key={index}
                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02] ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-100 dark:border-yellow-900/30' :
                                'bg-gray-50 dark:bg-gray-700/30 hover:bg-white dark:hover:bg-gray-700 border border-transparent'
                                }`}
                        >
                            <div className="flex-shrink-0 w-8 flex justify-center">
                                {getRankIcon(index)}
                            </div>

                            <img
                                src={user.profilePictureUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                                alt={user.name}
                                className={`w-12 h-12 rounded-full object-cover border-2 shadow-sm ${index === 0 ? 'border-yellow-400' : 'border-white dark:border-gray-600'
                                    }`}
                            />

                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold truncate ${index === 0 ? 'text-gray-900 dark:text-white text-lg' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {user.name || 'Anonymous Citizen'}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                        {user.gamification?.points || 0} pts
                                    </span>
                                    <span>•</span>
                                    <span>Lvl {user.gamification?.level || 1}</span>
                                </div>
                            </div>

                            {/* Badges Preview (Top 2) */}
                            <div className="flex -space-x-2">
                                {user.gamification?.badges?.slice(0, 2).map((badge, idx) => (
                                    <div key={idx} className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs" title={badge.name}>
                                        🏅
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button className="w-full mt-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                View All Rankings
            </button>
        </div>
    );
};

export default Leaderboard;
