import React, { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Clock, CheckCircle, XCircle, AlertTriangle, MapPin, Loader2, ArrowRight, User } from "lucide-react";
import csrfManager from "../utils/csrfManager";
import { toast } from 'react-hot-toast';
import OfficerLayout from "../components/layout/OfficerLayout";

/**
 * Field Officer Dashboard
 * Features:
 * - View assigned tasks
 * - Update status (Resolve/Reject)
 * - Timeline tracking
 */
import PollCreation from "../components/voting/PollCreation";
import ResolutionAssistant from "../components/ai/ResolutionAssistant";
import { PlusCircle } from "lucide-react";

export default function OfficerDashboard() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [showPollModal, setShowPollModal] = useState(false);
    // Resolution Modal State
    const [showResolutionModal, setShowResolutionModal] = useState(false);
    const [resolutionNote, setResolutionNote] = useState("");
    const [proofFile, setProofFile] = useState(null);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!user) return;
            try {
                // Fetch tasks assigned to this officer
                const token = await getToken();
                const email = user.primaryEmailAddress.emailAddress;
                const res = await csrfManager.secureFetch(`http://localhost:5000/api/issues/assigned?email=${email}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setTasks(data);
                }
            } catch (err) {
                console.error("Failed to fetch tasks", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [user]);

    const handleSubmitResolution = async () => {
        if (!proofFile || !resolutionNote) {
            toast.error("Please provide both proof image and notes.");
            return;
        }

        setStatusUpdating(true);
        const formData = new FormData();
        formData.append('proof', proofFile);
        formData.append('officerNotes', resolutionNote);

        try {
            const token = await getToken();
            const res = await fetch(`http://localhost:5000/api/issues/${selectedTask._id}/submit-resolution`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                toast.success("Resolution proof submitted for review!");
                setTasks(prev => prev.filter(t => t._id !== selectedTask._id)); // Remove from active list
                setSelectedTask(null);
                setShowResolutionModal(false);
            } else {
                toast.error("Failed to submit resolution.");
            }
        } catch (e) {
            console.error("Submission error", e);
            toast.error("Error submitting proof.");
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleUpdateStatus = async (issueId, newStatus) => {
        setStatusUpdating(true);
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`http://localhost:5000/api/issues/${issueId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newStatus: newStatus,
                    remarks: `Officer marked as ${newStatus}`
                })
            });

            if (res.ok) {
                toast.success(`Task marked as ${newStatus}`);
                setTasks(prev => prev.filter(t => t._id !== issueId)); // Remove from active list if resolved/rejected
                setSelectedTask(null);
            }
        } catch (e) {
            console.error("Status update failed", e);
            toast.error("Failed to update status");
        } finally {
            setStatusUpdating(false);
        }
    };

    return (
        <OfficerLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Field Operations</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage assigned tasks and civic engagement</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.href = '/officer/settings'}
                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                        title="Settings"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                    <button
                        onClick={() => setShowPollModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-transform hover:scale-105"
                    >
                        <PlusCircle className="w-5 h-5" />
                        Create Poll
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Task List */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" /> Active Assignments
                    </h3>

                    {loading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : tasks.length === 0 ? (
                        <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                            No active tasks assigned. Good job!
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div
                                key={task._id}
                                onClick={() => setSelectedTask(task)}
                                className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${selectedTask?._id === task._id ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200 dark:border-gray-700"}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold uppercase">{task.priority} Priority</span>
                                    <span className="text-xs text-gray-400">#{task.complaintId || task._id.slice(-6)}</span>
                                </div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">{task.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <MapPin className="w-4 h-4" /> {task.location || "Location N/A"}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Task Details & Action */}
                <div className="lg:sticky lg:top-8 h-fit">
                    {selectedTask ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTask.title}</h2>
                                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">{selectedTask.description}</p>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex gap-4">
                                    <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Reporter</div>
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <User className="w-4 h-4 text-gray-400" />
                                            {selectedTask.isPrivate ? "Anonymous" : "Public User"}
                                        </div>
                                    </div>
                                    <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Date</div>
                                        <div className="text-sm font-medium">{new Date(selectedTask.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                                    {/* AI Assistant */}
                                    <ResolutionAssistant issue={selectedTask} />

                                    <button
                                        onClick={() => setShowResolutionModal(true)}
                                        disabled={statusUpdating}
                                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition flex items-center justify-center gap-2"
                                    >
                                        {statusUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                        Submit Resolution Proof
                                    </button>

                                    <button
                                        onClick={() => handleUpdateStatus(selectedTask._id, 'Rejected')}
                                        disabled={statusUpdating}
                                        className="w-full py-3 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-xl font-bold transition flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        Reject as Invalid
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
                            <ArrowRight className="w-8 h-8 mb-2 opacity-50" />
                            <p>Select a task to take action</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Poll Modal */}
            {showPollModal && (
                <PollCreation
                    onClose={() => setShowPollModal(false)}
                    onPollCreated={() => {
                        toast.success("Poll published to citizens!");
                    }}
                />
            )}

            {/* Resolution Proof Modal */}
            {showResolutionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                                Submit Resolution
                            </h3>
                            <button onClick={() => setShowResolutionModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                                <XCircle className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <p className="text-gray-500 text-sm mb-6">
                            Upload a photo proof and add notes to verify this issue has been resolved. This will be sent to a moderator for approval.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Proof Image (Required)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setProofFile(e.target.files[0])}
                                    className="w-full block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Officer Notes</label>
                                <textarea
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                    placeholder="Describe the action taken..."
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                    rows="3"
                                />
                            </div>

                            <button
                                onClick={handleSubmitResolution}
                                disabled={statusUpdating || !proofFile}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition flex items-center justify-center gap-2 mt-2"
                            >
                                {statusUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                Submit for Review
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </OfficerLayout>
    );
}
