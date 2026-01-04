import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Vote, ChevronRight, CheckCircle2 } from 'lucide-react';
import csrfManager from '../../utils/csrfManager';
import { toast } from 'react-hot-toast';

const PollFeed = () => {
    const { getToken, isSignedIn } = useAuth();
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [votingId, setVotingId] = useState(null);

    useEffect(() => {
        const fetchPolls = async () => {
            try {
                const token = await getToken();
                // Secure fetch automatically handles headers if integrated well, but explicit token ensures auth context for 'hasVoted'
                const response = await csrfManager.secureFetch('/api/polls', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (response.ok) {
                    const data = await response.json();
                    // Sanitize Legacy Data (Fix for: TypeError on string options)
                    const sanitizedData = data.map(poll => ({
                        ...poll,
                        options: poll.options.map(opt =>
                            typeof opt === 'string' ? { text: opt, votes: 0 } : opt
                        ),
                        // Recalculate totalVotes if it was NaN due to bad data
                        totalVotes: typeof poll.totalVotes === 'number' && !isNaN(poll.totalVotes)
                            ? poll.totalVotes
                            : (Array.isArray(poll.options)
                                ? poll.options.reduce((acc, curr) => acc + (typeof curr === 'object' ? curr.votes : 0), 0)
                                : 0)
                    }));
                    setPolls(sanitizedData);
                }
            } catch (error) {
                console.error("Polls fetch error", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPolls();
    }, [isSignedIn]); // Refetch on sign-in status change

    const handleVote = async (pollId, optionIndex) => {
        if (!isSignedIn) {
            toast.error("Please login to vote!");
            return;
        }

        setVotingId(pollId);
        try {
            const token = await getToken();
            const response = await csrfManager.secureFetch(`/api/polls/${pollId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ optionIndex })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success("Vote recorded! +5 Points");

                // Optimistic Update
                setPolls(prev => prev.map(p => {
                    if (p._id === pollId) {
                        const newOptions = [...p.options];
                        newOptions[optionIndex].votes += 1;
                        return {
                            ...p,
                            options: newOptions,
                            hasVoted: true,
                            totalVotes: (p.totalVotes || 0) + 1
                        };
                    }
                    return p;
                }));
            } else {
                const err = await response.json();
                toast.error(err.error || "Failed to vote");
            }
        } catch (error) {
            console.error("Voting error", error);
            toast.error("Something went wrong");
        } finally {
            setVotingId(null);
        }
    };

    if (loading) return (
        <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
    );

    if (polls.length === 0) return (
        <div className="p-6 bg-white/80 dark:bg-gray-800/80 rounded-3xl border border-dashed border-gray-300 text-center text-gray-500">
            No active polls right now. Check back later!
        </div>
    );

    return (
        <div className="space-y-6">
            {polls.map((poll) => (
                <div key={poll._id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">
                            {poll.category}
                        </span>
                        <span className="text-xs text-gray-400">Ends {new Date(poll.expiresAt).toLocaleDateString()}</span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{poll.question}</h3>
                    {poll.description && <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{poll.description}</p>}

                    <div className="space-y-3">
                        {poll.options.map((opt, idx) => {
                            const percent = poll.totalVotes > 0 ? ((opt.votes / poll.totalVotes) * 100).toFixed(0) : 0;

                            return (
                                <div key={idx} className="relative group">
                                    {/* Result Bar Background (Only if voted) */}
                                    {poll.hasVoted && (
                                        <div
                                            className="absolute top-0 left-0 h-full bg-blue-100 dark:bg-blue-900/30 rounded-xl transition-all duration-1000 ease-out"
                                            style={{ width: `${percent}%` }}
                                        />
                                    )}

                                    <button
                                        onClick={() => !poll.hasVoted && handleVote(poll._id, idx)}
                                        disabled={poll.hasVoted || votingId === poll._id}
                                        className={`relative w-full p-4 rounded-xl text-left flex justify-between items-center transition-all ${poll.hasVoted
                                            ? 'cursor-default'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        <span className={`font-medium ${poll.hasVoted ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-300'}`}>
                                            {opt.text}
                                        </span>

                                        {poll.hasVoted ? (
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{percent}%</span>
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex items-center justify-between text-sm text-gray-400">
                        <span>{poll.totalVotes} votes</span>
                        {poll.hasVoted && (
                            <span className="flex items-center gap-1 text-emerald-500 font-medium">
                                <CheckCircle2 className="w-4 h-4" /> Voted
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PollFeed;
