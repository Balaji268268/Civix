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
export default function OfficerDashboard() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!user) return;
            try {
                // Fetch tasks assigned to this officer
                const token = await getToken();
                const res = await csrfManager.secureFetch('/api/issues/assigned', {
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

    const handleUpdateStatus = async (issueId, newStatus) => {
        setStatusUpdating(true);
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`/api/issues/${issueId}/status`, {
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

                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => handleUpdateStatus(selectedTask._id, 'Resolved')}
                                        disabled={statusUpdating}
                                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition flex items-center justify-center gap-2"
                                    >
                                        {statusUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                        Mark as Resolved
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
        </OfficerLayout>
    );
}
