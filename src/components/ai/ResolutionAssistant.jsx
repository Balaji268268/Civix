import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Hammer, Loader2 } from 'lucide-react';
import csrfManager from '../../utils/csrfManager';
import { toast } from 'react-hot-toast';

const ResolutionAssistant = ({ issue }) => {
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState(null);

    const fetchInsights = async () => {
        setLoading(true);
        try {
            const res = await csrfManager.secureFetch('http://localhost:5000/api/ai/suggest-resolution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: issue.title,
                    description: issue.description,
                    category: issue.category
                })
            });

            if (res.ok) {
                const data = await res.json();
                setInsights(data);
                toast.success("AI Insights Generated!");
            } else {
                toast.error("Failed to generate insights");
            }
        } catch (error) {
            console.error("AI Fetch Error", error);
            toast.error("AI Service Unavailable");
        } finally {
            setLoading(false);
        }
    };

    if (insights) {
        return (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-200">Civix AI Advisor</h3>
                    <span className="text-xs font-mono ml-auto bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">
                        {Math.round(insights.confidence * 100)}% Confidence
                    </span>
                </div>

                <div className="space-y-4">
                    <div>
                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Suggested Resolution Plan</h4>
                        <ul className="space-y-2">
                            {insights.steps.map((step, idx) => (
                                <li key={idx} className="flex gap-2 text-sm text-gray-800 dark:text-gray-200">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Recommended Resources</h4>
                        <div className="flex flex-wrap gap-2">
                            {insights.resources.map((res, idx) => (
                                <span key={idx} className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                    <Hammer className="w-3 h-3" /> {res}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={fetchInsights}
            disabled={loading}
            className="w-full mb-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 group"
        >
            {loading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Issue...
                </>
            ) : (
                <>
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Ask Civix AI for Help
                </>
            )}
        </button>
    );
};

export default ResolutionAssistant;
