import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowLeft, Save, Trash2, MapPin, AlertTriangle, CheckCircle, XCircle, Share2, Printer, Flag } from 'lucide-react';
import csrfManager from "../utils/csrfManager";
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/layout/AdminLayout';
import ConfirmationModal from '../components/modals/ConfirmationModal';

const AdminIssueDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [updating, setUpdating] = useState(false);
    // Review State
    const [reviewRemarks, setReviewRemarks] = useState("");
    const [reviewing, setReviewing] = useState(false);

    // Feedback/Rating State
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    const submitFeedback = async () => {
        if (rating === 0) return;
        setSubmitting(true);
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`/api/issues/add-feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    issueId: id,
                    rating,
                    comment: feedbackComment
                })
            });

            if (res.ok) {
                setFeedbackSubmitted(true);
                toast.success("Officer evaluation submitted");
            } else {
                toast.error("Failed to submit evaluation");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error submitting evaluation");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchIssue = async () => {
            try {
                // Determine if we need token for GET (public in routes/issues.js, but good practice to include if avail)
                // Actually GET /:id is public, so no token strictly needed, but let's be safe.
                const response = await csrfManager.secureFetch(`/api/issues/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setIssue(data);
                    setStatus(data.status);
                    setPriority(data.priority);
                } else {
                    toast.error("Failed to fetch issue details");
                }
            } catch (error) {
                console.error("Error fetching issue:", error);
                toast.error("Error fetching issue");
            } finally {
                setLoading(false);
            }
        };
        fetchIssue();
    }, [id]);

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            const token = await getToken();
            if (!token) { toast.error("Authentication required"); return; }
            if (status !== issue.status) {
                await csrfManager.secureFetch(`/api/issues/${id}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ newStatus: status })
                });
            }
            // For now, priority update is simulated or requires a different endpoint if distinct
            toast.success("Issue updated successfully");
            setIssue(prev => ({ ...prev, status, priority }));
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Update failed");
        } finally {
            setUpdating(false);
        }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleReviewResolution = async (isApproved) => {
        if (!isApproved && !reviewRemarks) {
            toast.error("Please provide remarks for rejection.");
            return;
        }
        setReviewing(true);
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`/api/issues/${id}/review-resolution`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    isApproved,
                    remarks: reviewRemarks || (isApproved ? "Approved by Moderator" : "Rejected"),
                    reviewedBy: "Admin"
                })
            });

            if (res.ok) {
                toast.success(isApproved ? "Resolution Approved!" : "Resolution Rejected.");
                // Refetch to update UI
                const updated = await res.json();
                setIssue(updated);
                setStatus(updated.status);
            } else {
                toast.error("Review action failed.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error submitting review.");
        } finally {
            setReviewing(false);
        }
    };



    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const response = await csrfManager.secureFetch(`/api/issues/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Issue deleted");
                navigate('/admin');
            } else {
                toast.error("Failed to delete issue");
            }
        } catch (error) {
            toast.error("Error clicking delete");
        } finally {
            setShowDeleteModal(false);
        }
    };

    if (loading) return (
        <AdminLayout>
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        </AdminLayout>
    );

    if (!issue) return (
        <AdminLayout>
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <AlertTriangle className="w-12 h-12 mb-4 text-red-400" />
                <p className="text-xl font-medium">Issue not found</p>
                <button onClick={() => navigate('/admin')} className="mt-4 text-emerald-600 hover:underline">
                    Return to Dashboard
                </button>
            </div>
        </AdminLayout>
    );

    return (
        <AdminLayout title="Issue Detail" subtitle={`Reference ID: ${issue.complaintId || issue._id}`}>

            <button onClick={() => navigate('/admin')} className="flex items-center text-sm text-gray-500 hover:text-emerald-600 mb-6 transition-colors group">
                <div className="p-1 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 mr-2 group-hover:border-emerald-200">
                    <ArrowLeft className="w-4 h-4" />
                </div>
                Back to Dashboard
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Issue Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Flag className="w-32 h-32" />
                        </div>

                        <div className="flex flex-wrap gap-3 mb-6 relative z-10">
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${issue.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-100' :
                                issue.priority === 'Medium' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                    'bg-green-50 text-green-700 border border-green-100'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${issue.priority === 'High' ? 'bg-red-500 animate-pulse' :
                                    issue.priority === 'Medium' ? 'bg-orange-500' :
                                        'bg-green-500'
                                    }`} />
                                {issue.priority} Priority
                            </div>
                            <div className="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                                {issue.category}
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${issue.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                issue.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                {issue.status}
                            </div>
                        </div>

                        <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight relative z-10">
                            {issue.title}
                        </h1>

                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 relative z-10 mb-8">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Description</h3>
                            <p className="whitespace-pre-wrap text-lg leading-relaxed bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                                {issue.description}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 relative z-10">
                            {issue.location && (
                                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 pr-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-medium truncate max-w-xs">{issue.location}</span>
                                </div>
                            )}
                            {issue.fileUrl && (
                                <a href={issue.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 pr-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                        <Share2 className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-medium">View Attachment</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Resolution Proof Section (Visible if Pending Review or Resolved) */}
                    {issue.resolution && issue.resolution.proofUrl && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                                Resolution Proof
                            </h3>

                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-full md:w-1/2">
                                    <img
                                        src={issue.resolution.proofUrl}
                                        alt="Resolution Proof"
                                        className="w-full h-64 object-cover rounded-2xl shadow-md border border-gray-100 dark:border-gray-700"
                                    />
                                    <p className="mt-2 text-xs text-gray-400 text-center">Submitted on {new Date(issue.resolution.submittedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="w-full md:w-1/2 space-y-4">
                                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Officer Notes</span>
                                        <p className="text-gray-700 dark:text-gray-300 italic">"{issue.resolution.officerNotes}"</p>
                                    </div>

                                    {/* Action Buttons for Pending Review */}
                                    {issue.status === 'Pending Review' && (
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Moderator Action Required</p>

                                            <textarea
                                                value={reviewRemarks}
                                                onChange={(e) => setReviewRemarks(e.target.value)}
                                                placeholder="Add remarks (required for rejection)..."
                                                className="w-full p-3 mb-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                                rows="2"
                                            />

                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleReviewResolution(true)}
                                                    disabled={reviewing}
                                                    className="py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition"
                                                >
                                                    Approve & Resolve
                                                </button>
                                                <button
                                                    onClick={() => handleReviewResolution(false)}
                                                    disabled={reviewing}
                                                    className="py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-red-200 dark:shadow-red-900/20 transition"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show Verdict if already reviewed */}
                                    {issue.resolution.moderatorApproval && issue.resolution.moderatorApproval.reviewedAt && (
                                        <div className={`p-4 rounded-xl border ${issue.resolution.moderatorApproval.isApproved ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                            <p className="font-bold text-sm mb-1">
                                                {issue.resolution.moderatorApproval.isApproved ? "Approved by Moderator" : "Rejected by Moderator"}
                                            </p>
                                            <p className="text-xs opacity-80">{issue.resolution.moderatorApproval.remarks}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Officer Performance Rating (Moderator Only) - Hides after submission */}
                    {!feedbackSubmitted && (issue.status === 'Resolved' || issue.status === 'Closed') && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                Rate Officer Performance
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-500 uppercase">Quality:</span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className={`transition-colors duration-200 ${(hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                                                    }`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea
                                    value={feedbackComment}
                                    onChange={(e) => setFeedbackComment(e.target.value)}
                                    placeholder="Internal notes on officer performance..."
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    rows="2"
                                />

                                <button
                                    onClick={submitFeedback}
                                    disabled={submitting || rating === 0}
                                    className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Evaluation'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Actions & Intelligence */}
                <div className="space-y-6">
                    {/* Actions Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-gray-400" />
                            Management
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update Status</label>
                                <div className="relative">
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full appearance-none rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 py-3 pl-4 pr-10 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    >
                                        <option value="Pending">Pending Review</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Priority Level</label>
                                <div className="relative">
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="w-full appearance-none rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 py-3 pl-4 pr-10 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    >
                                        <option value="High">High Urgency</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpdate}
                                disabled={updating}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 group"
                            >
                                {updating ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                {updating ? 'Saving...' : 'Save Changes'}
                            </button>

                            <button
                                onClick={handleDeleteClick}
                                className="w-full py-3 bg-white dark:bg-gray-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 rounded-xl font-bold transition-all flex justify-center items-center gap-2"
                            >
                                <Trash2 className="w-5 h-5" />
                                Delete Issue
                            </button>
                        </div>
                    </div>

                    {/* AI Insights Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-3xl p-6 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
                        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            AI Intelligence
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-2xl flex items-center justify-between border border-white/50 dark:border-white/10">
                                <span className="text-indigo-800/70 dark:text-indigo-300 text-sm font-medium">Confidence Score</span>
                                <span className="text-xl font-black text-indigo-700 dark:text-indigo-400">{(issue.fakeConfidence * 100).toFixed(0)}%</span>
                            </div>

                            <div className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-2xl flex items-center justify-between border border-white/50 dark:border-white/10">
                                <span className="text-indigo-800/70 dark:text-indigo-300 text-sm font-medium">Predicted Category</span>
                                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold uppercase">
                                    {issue.category}
                                </span>
                            </div>

                            <div className={`p-4 rounded-2xl text-center border ${issue.isFake ? 'bg-red-100 border-red-200 text-red-800' : 'bg-emerald-100 border-emerald-200 text-emerald-800'}`}>
                                <p className="text-xs font-bold uppercase tracking-wider mb-1">Authenticity Check</p>
                                <p className="text-lg font-black flex justify-center items-center gap-2">
                                    {issue.isFake ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                    {issue.isFake ? 'POTENTIAL FAKE' : 'VERIFIED REAL'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Issue"
                message="Are you sure you want to delete this issue? This action cannot be undone."
                confirmText="Delete Issue"
                isDanger={true}
            />
        </AdminLayout >
    );
};

// Helper Icon since lucide Settings isn't imported as SettingsIcon usually
const SettingsIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);

export default AdminIssueDetail;
