import React, { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import {
    LayoutDashboard, Shield, AlertTriangle, CheckCircle, XCircle,
    MapPin, Calendar, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, Loader2,
    ArrowUpRight, Clock, AlignLeft, UserPlus, ClipboardList, CheckSquare, Cpu, TrendingUp
} from "lucide-react";
import { toast } from 'react-hot-toast';
import ModeratorLayout from "../components/layout/ModeratorLayout";
import csrfManager from "../utils/csrfManager";
import { useLocation } from "react-router-dom";
import TrendingFeed from "./TrendingFeed";

/**
 * Moderator Dashboard (Refactored)
 * Layout: 2-Panel (List | Detail)
 * Features:
 * - Tabbed Lists: "In Queue" vs "Analyzed/Ready"
 * - Persistent AI Analysis Display
 * - Working "Assign Officer" Modal
 * - Escalate / Reject Actions
 */
export default function ModeratorDashboard() {
    const { getToken } = useAuth();
    const location = useLocation();

    // UI View State (Managed by Sidebar URL internally, but local tabs for lists)
    const isInsightsView = location.pathname.includes("insights");

    // Data State
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI Selection State
    const [activeListTab, setActiveListTab] = useState("queue"); // 'queue' | 'analyzed'
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Modal & Action State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [availableOfficers, setAvailableOfficers] = useState([]);
    const [loadingOfficers, setLoadingOfficers] = useState(false);

    const [statusAction, setStatusAction] = useState(null); // { id, status }
    const [actionRemarks, setActionRemarks] = useState("");

    // Initial Fetch
    useEffect(() => {
        if (!isInsightsView) fetchIssues();
    }, [isInsightsView]);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const res = await csrfManager.secureFetch('/api/issues');
            const data = await res.json();
            // Filter relevant: Pending, Open, In Progress
            const activeIssues = data.filter(i =>
                ['Pending', 'Open', 'In Progress', 'Assigned'].includes(i.status)
            );
            setIssues(activeIssues);

            // Re-select selected issue if it still exists (to keep detail view open)
            if (selectedIssue) {
                const stillExists = activeIssues.find(i => i._id === selectedIssue._id);
                if (stillExists) setSelectedIssue(stillExists);
            }
        } catch (err) {
            console.error("Fetch error", err);
            toast.error("Failed to refresh issues");
        } finally {
            setLoading(false);
        }
    };

    // Derived Lists based on explicit "isAnalyzed" flag AND fallback legacy check
    // "Queue" = Pending Status AND Not Analyzed
    // We strictly check if it lacks BOTH the flag and the object data to be safe
    const queueList = issues.filter(i =>
        i.status === 'Pending' && !i.isAnalyzed && !i.aiAnalysis?.analyzedAt
    );

    // "Analyzed" = Explicitly Analyzed OR Has Analysis Data OR Status moved beyond Pending
    const analyzedList = issues.filter(i =>
        i.isAnalyzed || !!i.aiAnalysis?.analyzedAt || (i.status !== 'Pending')
    );

    const currentList = activeListTab === 'queue' ? queueList : analyzedList;

    // --- Actions ---

    // 1. Run AI
    const runAiAnalysis = async (issue) => {
        setAnalyzing(true);
        try {
            const response = await csrfManager.secureFetch('/api/moderator/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: issue.title,
                    description: issue.description,
                    issueId: issue._id
                })
            });
            const data = await response.json();

            // Update local state immediately with Auto-Shift Category
            const updatedIssue = {
                ...issue,
                isAnalyzed: true, // Optimistic update
                category: data.category || issue.category, // Automatically apply AI category
                aiAnalysis: { ...data, analyzedAt: new Date() }
            };
            setIssues(prev => prev.map(i => i._id === issue._id ? updatedIssue : i));
            setSelectedIssue(updatedIssue);
            toast.success("Analysis Complete & Category Updated");

            // Auto-switch tab if in queue to show it moved? 
            // Better UX: Keep selection but maybe highlight "Moved to Processed"
            if (activeListTab === 'queue') setActiveListTab('analyzed');

        } catch (err) {
            console.error("AI Error", err);
            toast.error("AI Analysis Failed");
        } finally {
            setAnalyzing(false);
        }
    };

    // 2. Fetch Officers for Modal (Enhanced with AI Suggestions)
    const openAssignModal = async () => {
        if (!selectedIssue) return;
        setShowAssignModal(true);
        setLoadingOfficers(true);
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`/api/issues/ai-suggest/${selectedIssue._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setAvailableOfficers(data.suggestions || []);
        } catch (err) {
            console.error("Fetch officers error:", err);
            toast.error("Could not fetch officers");
        } finally {
            setLoadingOfficers(false);
        }
    };

    // 3. Confirm Assignment
    const handleAssignOfficer = async (officerId) => {
        if (!selectedIssue) return;
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch('/api/issues/assign-manual', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token} `
                },
                body: JSON.stringify({
                    issueId: selectedIssue._id,
                    officerId: officerId
                })
            });

            if (res.ok) {
                toast.success("Officer Assigned Successfully");
                setShowAssignModal(false);
                fetchIssues(); // Refresh to update status/timeline
            } else {
                toast.error("Assignment Failed");
            }
        } catch (err) {
            toast.error("Error assigning officer");
        }
    };

    // 4. Update Status (Reject/Escalate)
    const confirmStatusUpdate = async () => {
        if (!statusAction) return;
        const { id, status } = statusAction;

        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`/ api / issues / ${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newStatus: status, remarks: actionRemarks })
            });

            if (res.ok) {
                toast.success(`Marked as ${status}`);
                fetchIssues();
                setSelectedIssue(null); // Deselect on resolve/reject
            }
        } catch (e) {
            toast.error("Status update failed");
        } finally {
            setStatusAction(null);
            setActionRemarks("");
        }
    };


    // --- View Components ---

    if (isInsightsView) {
        return (
            <ModeratorLayout>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Community Intelligence</h2>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-bold uppercase">Pending Review</h3>
                            <p className="text-3xl font-extrabold text-orange-500 mt-2">{queueList.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-bold uppercase">Processed Today</h3>
                            <p className="text-3xl font-extrabold text-emerald-500 mt-2">{analyzedList.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-bold uppercase">Avg. Confidence</h3>
                            <p className="text-3xl font-extrabold text-indigo-500 mt-2">
                                {analyzedList.length > 0 ? '92%' : '-'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Trending Feed */} //
                        <div className="flex-1">
                            <TrendingFeed />
                        </div>

                        {/* Recent Activity / Logs Placeholder */}
                        <div className="lg:w-80 bg-white rounded-2xl border border-gray-100 p-4 h-fit">
                            <h4 className="font-bold text-gray-700 mb-4">System Alerts</h4>
                            <div className="text-sm text-gray-400 text-center py-8">
                                No critical system alerts.
                            </div>
                        </div>
                    </div>
                </div>
            </ModeratorLayout>
        );
    }

    return (
        <ModeratorLayout>
            <div className="flex flex-col h-[calc(100vh-120px)]">
                {/* Top Toolbar */}
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex gap-1">
                        <button
                            onClick={() => { setActiveListTab('queue'); setSelectedIssue(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeListTab === 'queue' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ClipboardList className="w-4 h-4 text-orange-500" />
                            In Queue
                            <span className="bg-orange-100 text-orange-700 px-1.5 rounded-md text-xs">{queueList.length}</span>
                        </button>
                        <button
                            onClick={() => { setActiveListTab('analyzed'); setSelectedIssue(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeListTab === 'analyzed' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                            Processed & Ready
                            <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded-md text-xs">{analyzedList.length}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.location.href = '/moderator/settings'}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                            title="Moderator Settings"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <button
                            onClick={fetchIssues}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                            title="Refresh List"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Main 2-Panel Grid */}
                <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">

                    {/* Left Panel: List */}
                    <div className="w-1/3 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                                {activeListTab === 'queue' ? "Pending Verification" : "Ready for Assignment"}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {currentList.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-xs">No issues found in this list.</div>
                            ) : (
                                currentList.map(issue => (
                                    <div
                                        key={issue._id}
                                        onClick={() => setSelectedIssue(issue)}
                                        className={`p-4 rounded-xl cursor-pointer border transition-all hover:bg-gray-50 ${selectedIssue?._id === issue._id
                                            ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50"
                                            : "border-gray-100 dark:border-gray-700"
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] px-1.5 rounded font-bold uppercase ${issue.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {issue.priority || 'Normal'}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(issue.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-800 line-clamp-1 mb-1">{issue.title}</h4>
                                        <p className="text-xs text-gray-500 line-clamp-2">{issue.description}</p>

                                        {/* Status Tag if Processed */}
                                        {activeListTab === 'analyzed' && (
                                            <div className="mt-2 flex gap-2">
                                                {issue.aiAnalysis?.isFake ? (
                                                    <span className="text-[10px] text-red-600 flex items-center gap-1"><XCircle size={10} /> Detected Fake</span>
                                                ) : (
                                                    <span className="text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle size={10} /> Verified</span>
                                                )}
                                                <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">
                                                    {issue.category}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Detail Inspector */}
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col">
                        {selectedIssue ? (
                            <>
                                {/* Detail Header & Actions */}
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50/30">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedIssue.title}</h2>
                                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                                            <span className="flex items-center gap-1"><MapPin size={14} /> {selectedIssue.location || "Unknown Location"}</span>
                                            <span>•</span>
                                            <span className="font-mono">#{selectedIssue.complaintId || selectedIssue._id.slice(-6)}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setStatusAction({ id: selectedIssue._id, status: 'Escalated' })}
                                            className="px-3 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-sm font-semibold hover:bg-orange-100 flex items-center gap-2"
                                        >
                                            <ArrowUpRight size={16} /> Escalate
                                        </button>

                                        <button
                                            onClick={() => setStatusAction({ id: selectedIssue._id, status: 'Rejected' })}
                                            className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 flex items-center gap-2"
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>

                                        <button
                                            onClick={openAssignModal}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2 transition"
                                        >
                                            <UserPlus size={16} /> Assign Officer
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Description */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <h4 className="text-xs font-bold uppercase text-gray-400 mb-2 flex items-center gap-2">
                                            <AlignLeft size={12} /> Description
                                        </h4>
                                        <p className="text-gray-700 leading-relaxed">{selectedIssue.description}</p>
                                    </div>

                                    {/* AI Analysis Section */}
                                    <div className="border border-indigo-100 rounded-xl overflow-hidden">
                                        <div className="bg-indigo-50/50 p-3 border-b border-indigo-100 flex justify-between items-center">
                                            <h4 className="text-indigo-900 font-bold flex items-center gap-2">
                                                <Cpu className="text-indigo-500" size={18} />
                                                AI Diagnosis
                                            </h4>
                                            {selectedIssue.aiAnalysis?.analyzedAt && (
                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                                    Analyzed {new Date(selectedIssue.aiAnalysis.analyzedAt).toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-4 bg-white">
                                            {!selectedIssue.aiAnalysis?.analyzedAt ? (
                                                <div className="text-center py-8">
                                                    <p className="text-gray-500 text-sm mb-4">No analysis data available yet.</p>
                                                    <button
                                                        onClick={() => runAiAnalysis(selectedIssue)}
                                                        disabled={analyzing}
                                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
                                                    >
                                                        {analyzing ? "Running..." : "Run Global Analysis"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className={`p-3 rounded-lg border ${selectedIssue.aiAnalysis.isFake ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                                                        <div className="text-xs font-bold uppercase opacity-70 mb-1">Authenticity</div>
                                                        <div className="font-bold flex items-center gap-2">
                                                            {selectedIssue.aiAnalysis.isFake ? <XCircle className="text-red-500" size={16} /> : <CheckCircle className="text-emerald-500" size={16} />}
                                                            {selectedIssue.aiAnalysis.isFake ? "Likely Spam/Fake" : "Verified Authentic"}
                                                        </div>
                                                        <div className="text-[10px] mt-1 opacity-60">Confidence Score: {selectedIssue.aiAnalysis.fakeConfidence}</div>
                                                    </div>

                                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                        <div className="text-xs font-bold uppercase opacity-70 mb-1">Assessment</div>
                                                        <div className="text-sm">
                                                            <span className="font-bold">Priority:</span> {selectedIssue.aiAnalysis.priority} <br />
                                                            <span className="font-bold">Category:</span> {selectedIssue.aiAnalysis.category}
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2 p-3 bg-indigo-50/30 rounded-lg border border-indigo-100 text-sm text-indigo-900">
                                                        <span className="font-bold mr-1">Reasoning:</span>
                                                        {selectedIssue.aiAnalysis.reasoning}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* AI Action Recommendations */}
                                    {selectedIssue.aiAnalysis?.analyzedAt && (
                                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 mt-4">
                                            <h4 className="text-xs font-bold uppercase text-indigo-400 mb-3 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                                                AI Recommended Actions
                                            </h4>

                                            <div className="flex gap-3 flex-wrap">
                                                {selectedIssue.aiAnalysis.isFake ? (
                                                    <button
                                                        onClick={() => setStatusAction({ id: selectedIssue._id, status: 'Rejected' })}
                                                        className="flex items-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-600 rounded-lg shadow-sm hover:shadow-md hover:border-red-300 transition text-sm font-bold"
                                                    >
                                                        <XCircle size={16} />
                                                        Detected Fake: Reject
                                                    </button>
                                                ) : selectedIssue.aiAnalysis.priority === 'High' ? (
                                                    <button
                                                        onClick={() => setStatusAction({ id: selectedIssue._id, status: 'Escalated' })}
                                                        className="flex items-center gap-2 px-4 py-3 bg-white border border-orange-200 text-orange-600 rounded-lg shadow-sm hover:shadow-md hover:border-orange-300 transition text-sm font-bold"
                                                    >
                                                        <AlertTriangle size={16} />
                                                        High Priority: Escalate
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={openAssignModal}
                                                        className="flex items-center gap-2 px-4 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-lg shadow-sm hover:shadow-md hover:border-indigo-300 transition text-sm font-bold"
                                                    >
                                                        <UserPlus size={16} />
                                                        Assign to {selectedIssue.aiAnalysis.category}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Image Attachment */}
                                    {selectedIssue.fileUrl && (
                                        <div className="mt-4">
                                            <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Attachment</h4>
                                            <img src={selectedIssue.fileUrl} alt="Evidence" className="rounded-xl border border-gray-200 max-h-64 object-cover" />
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-50">
                                <Search size={64} className="mb-4 stroke-1" />
                                <p className="text-lg font-medium">Select an issue to investigate</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MODALS --- */}

                {/* 1. Status Confirmation Modal (Reject/Escalate) */}
                {statusAction && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Confirm {statusAction.status}</h3>
                                    <p className="text-sm text-gray-500 mt-1">Please provide a reason/response.</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        setAnalyzing(true); // Reuse analyzing state or local
                                        try {
                                            const res = await csrfManager.secureFetch('http://localhost:5000/api/ml/generate-reply/', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    description: selectedIssue.description,
                                                    status: statusAction.status,
                                                    severity: selectedIssue.priority || 'Medium'
                                                })
                                            });
                                            const data = await res.json();
                                            setActionRemarks(data.reply);
                                        } catch (e) { toast.error("AI Draft Failed"); }
                                        finally { setAnalyzing(false); }
                                    }}
                                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-200 font-bold flex items-center gap-1 hover:bg-indigo-100 transition"
                                >
                                    {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Cpu size={12} />}
                                    AI Auto-Draft
                                </button>
                            </div>
                            <div className="p-6">
                                <textarea
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-32 text-sm"
                                    placeholder="Enter remarks here..."
                                    value={actionRemarks}
                                    onChange={e => setActionRemarks(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="p-4 bg-gray-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setStatusAction(null)}
                                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmStatusUpdate}
                                    className={`px-4 py-2 text-white font-bold rounded-lg shadow-lg transition ${statusAction.status === 'Rejected' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                                        }`}
                                >
                                    Confirm Action
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Assign Officer Modal */}
                {showAssignModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Assign Officer</h3>
                                    <p className="text-sm text-gray-500">Department: {selectedIssue?.category || 'General'}</p>
                                </div>
                                <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <XCircle size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2">
                                {loadingOfficers ? (
                                    <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
                                ) : availableOfficers.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">No officers found for this department.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {availableOfficers.map((officer, idx) => (
                                            <button
                                                key={officer._id}
                                                onClick={() => handleAssignOfficer(officer._id)}
                                                className={`w-full p-4 flex justify-between items-center rounded-xl transition group border text-left relative overflow-hidden ${idx === 0 ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {/* Best Fit Badge */}
                                                {idx === 0 && (
                                                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                                        AI RECOMMENDED
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {officer.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                            {officer.name}
                                                            {officer.score > 80 && <span className="text-xs text-green-600 font-normal">({officer.score}% Match)</span>}
                                                        </h4>
                                                        <p className="text-xs text-gray-500">{officer.reason || (officer.activeTasks === 0 ? "Idle" : "Active")}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${officer.isOverloaded || officer.activeTasks > 5 ? 'bg-red-100 text-red-700 font-bold' : 'bg-green-100 text-green-700'}`}>
                                                        {officer.activeTasks} Active Tasks
                                                    </span>
                                                    {officer.activeTasks > 5 && (
                                                        <div className="text-[10px] text-red-500 font-bold mt-1 flex items-center justify-end gap-1">
                                                            <AlertTriangle size={10} /> HIGH LOAD
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </ModeratorLayout>
    );
}
