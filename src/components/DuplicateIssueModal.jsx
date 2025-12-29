import React from 'react';
import { AlertTriangle, X, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DuplicateIssueModal = ({ isOpen, onClose, duplicateData }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">

                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <AlertTriangle className="w-32 h-32 -mr-8 -mt-8 rotate-12" />
                    </div>

                    <div className="relative z-10 flex items-start gap-4">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
                            <AlertTriangle className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Duplicate Issue Detected</h2>
                            <p className="text-amber-100 font-medium">Similar report already exists</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-auto p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg leading-relaxed">
                        Our AI analysis indicates this issue might be a duplicate of an existing report.
                        Merging duplicates helps us resolve problems faster.
                    </p>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-4 mb-8">

                        {duplicateData?.message && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                "{duplicateData.message}"
                            </p>
                        )}
                        <div className="mt-3 flex items-center text-sm text-amber-700 dark:text-amber-400 font-medium">
                            <span className="flex items-center gap-1">
                                Confidence Score: {(duplicateData?.confidence * 100).toFixed(0)}% Match
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Edit My Report
                        </button>
                        <button
                            onClick={() => navigate('/user/dashboard')}
                            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            Go to Dashboard <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                    <button className="text-sm text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                        <ExternalLink className="w-3 h-3" /> View Existing Issue Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateIssueModal;
