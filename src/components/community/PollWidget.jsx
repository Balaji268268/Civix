import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import csrfManager from '../../utils/csrfManager';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PollWidget = () => {
    const { getToken } = useAuth();
    const [polls, setPolls] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPolls = async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const res = await csrfManager.secureFetch('http://localhost:5000/api/polls', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPolls(data.slice(0, 3)); // Top 3
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchPolls();
    }, [getToken]);

    const getTotalVotes = (poll) => {
        if (!poll.options) return 0;
        return poll.options.reduce((acc, opt) => acc + (opt.votes || 0), 0);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                    Active Polls
                </h3>
                <button onClick={() => navigate('/voting-system')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                    View All
                </button>
            </div>

            <div className="space-y-4">
                {polls.map(poll => (
                    <div
                        key={poll._id}
                        onClick={() => navigate('/voting-system')}
                        className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-xl transition-colors border border-transparent hover:border-gray-100"
                    >
                        <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-2 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                            {poll.question}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                {getTotalVotes(poll)} votes
                            </span>
                            <span>{poll.category || 'General'}</span>
                        </div>
                    </div>
                ))}
                {polls.length === 0 && <div className="text-gray-400 text-sm text-center py-4">No active polls</div>}
            </div>
        </div>
    );
};

export default PollWidget;
